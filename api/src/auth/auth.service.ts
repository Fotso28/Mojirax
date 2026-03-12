import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email/email.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    async syncUser(firebaseUser: any) {
        const { uid, email, name, picture } = firebaseUser;

        if (!email) {
            throw new Error('Email is required from Firebase Provider');
        }

        // Look up by firebaseUid first, then by email
        const existingByUid = await this.prisma.user.findUnique({
            where: { firebaseUid: uid },
            select: { id: true, image: true, firstName: true, lastName: true, email: true },
        });

        const existing = existingByUid || await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, image: true, firstName: true, lastName: true, email: true },
        });

        const hasCustomAvatar = existing?.image?.includes('/avatars/');

        if (existing) {
            // Update existing user
            const user = await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    firebaseUid: uid,
                    // Update email if changed in Firebase
                    ...(existing.email !== email ? { email } : {}),
                    // Fill firstName/lastName if missing in DB but available from Firebase
                    ...(name && !existing.firstName ? { firstName: name.split(' ')[0] } : {}),
                    ...(name && !existing.lastName ? { lastName: name.split(' ').slice(1).join(' ') || undefined } : {}),
                    // Don't overwrite custom avatar with Google photo
                    ...(hasCustomAvatar ? {} : { image: picture }),
                },
            });
            return user;
        }

        // Create new user
        const user = await this.prisma.user.create({
            data: {
                email,
                firebaseUid: uid,
                firstName: name ? name.split(' ')[0] : undefined,
                lastName: name ? name.split(' ').slice(1).join(' ') : undefined,
                image: picture,
                role: 'USER',
            },
        });

        // Send welcome email (fire & forget)
        this.emailService.sendWelcome(user.id).catch((e) =>
            this.logger.warn('Welcome email failed', e),
        );

        return user;
    }
}
