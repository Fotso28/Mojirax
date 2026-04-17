import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email/email.service';
import { I18nService, Locale } from '../i18n/i18n.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (!domain) return '***';
        return `${local[0]}***@${domain[0]}***`;
    }

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private i18n: I18nService,
    ) { }

    async syncUser(firebaseUser: any, locale: Locale = 'fr') {
        const { uid, email, name, picture } = firebaseUser;

        if (!email) {
            throw new BadRequestException(this.i18n.t('auth.email_required', locale));
        }

        const safeSelect = {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            role: true,
            plan: true,
            title: true,
            bio: true,
            country: true,
            city: true,
            skills: true,
            languages: true,
        };

        const userSelect = { id: true, firebaseUid: true, image: true, firstName: true, lastName: true, email: true };

        const existingByUid = await this.prisma.user.findUnique({
            where: { firebaseUid: uid },
            select: userSelect,
        });

        const existing = existingByUid || await this.prisma.user.findUnique({
            where: { email },
            select: userSelect,
        });

        const hasCustomAvatar = existing?.image?.includes('/avatars/');

        if (existing) {
            if (existingByUid === null && existing.firebaseUid && existing.firebaseUid !== uid) {
                this.logger.warn(
                    `Blocked account takeover: email=${this.maskEmail(email)}, existingUid=${existing.firebaseUid}, newUid=${uid}`,
                );
                throw new ConflictException(this.i18n.t('auth.account_linked_other_provider', locale));
            }

            this.logger.log(`User synced: id=${existing.id}`);

            // Check if email changed and new email is available
            let emailUpdate = {};
            if (existing.email !== email) {
                const emailTaken = await this.prisma.user.findUnique({
                    where: { email },
                    select: { id: true },
                });
                if (emailTaken && emailTaken.id !== existing.id) {
                    this.logger.warn(`Email change blocked: new email already in use, userId=${existing.id}`);
                } else {
                    emailUpdate = { email };
                }
            }

            const user = await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    firebaseUid: uid,
                    ...emailUpdate,
                    ...(name && !existing.firstName ? { firstName: name.split(' ')[0] } : {}),
                    ...(name && !existing.lastName ? { lastName: name.split(' ').slice(1).join(' ') || undefined } : {}),
                    ...(name && !existing.firstName ? { name } : {}),
                    ...(hasCustomAvatar ? {} : { image: picture }),
                },
                select: safeSelect,
            });
            return user;
        }

        try {
            const user = await this.prisma.user.create({
                data: {
                    email,
                    firebaseUid: uid,
                    firstName: name ? name.split(' ')[0] : undefined,
                    lastName: name ? name.split(' ').slice(1).join(' ') : undefined,
                    name: name || undefined,
                    image: picture,
                    role: 'USER',
                },
                select: safeSelect,
            });

            this.logger.log(`New user created: id=${user.id}, email=${this.maskEmail(email)}`);

            this.emailService.sendWelcome(user.id).catch((e) =>
                this.logger.warn('Welcome email failed', e),
            );

            return user;
        } catch (error: any) {
            if (error?.code === 'P2002') {
                this.logger.warn(`Race condition on syncUser for email=${this.maskEmail(email)}, retrying lookup`);
                const retryUser = await this.prisma.user.findUnique({
                    where: { firebaseUid: uid },
                    select: safeSelect,
                })
                    || await this.prisma.user.findUnique({
                        where: { email },
                        select: safeSelect,
                    });
                if (retryUser) return retryUser;
            }
            throw error;
        }
    }
}
