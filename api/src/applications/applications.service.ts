import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CandidateModerationService } from '../users/candidate-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { I18nService, Locale } from '../i18n/i18n.service';

@Injectable()
export class ApplicationsService {
    private readonly logger = new Logger(ApplicationsService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => CandidateModerationService))
        private candidateModerationService: CandidateModerationService,
        private notificationsService: NotificationsService,
        private i18n: I18nService,
    ) { }

    async apply(firebaseUid: string, dto: CreateApplicationDto, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                title: true,
                bio: true,
                skills: true,
                candidateProfile: { select: { id: true } },
            },
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        // Validate profile completeness before applying
        const missingFields: string[] = [];
        if (!user.firstName) missingFields.push('Prénom');
        if (!user.lastName) missingFields.push('Nom');
        if (!user.title) missingFields.push('Titre professionnel');
        if (!user.bio) missingFields.push('Bio');
        if (!user.skills || user.skills.length === 0) missingFields.push('Compétences');

        if (missingFields.length > 0) {
            throw new BadRequestException({
                message: this.i18n.t('user.complete_profile_before_applying', locale),
                missingFields,
                code: 'INCOMPLETE_PROFILE',
            });
        }

        // Auto-create candidateProfile if needed
        if (!user.candidateProfile) {
            const profile = await this.prisma.candidateProfile.create({
                data: {
                    userId: user.id,
                    status: 'ANALYZING',
                },
                select: { id: true },
            });
            user.candidateProfile = profile;
            this.logger.log(`Auto-created candidate profile for user ${user.id}`);

            // Lancer la modération IA en fire-and-forget
            this.candidateModerationService.moderateProfile(profile.id, locale).catch(() => {});
        }

        const project = await this.prisma.project.findUnique({
            where: { id: dto.projectId },
            select: { id: true, name: true, slug: true, status: true, founderId: true },
        });

        if (!project || project.status !== 'PUBLISHED') {
            throw new NotFoundException(this.i18n.t('application.project_unavailable', locale));
        }

        if (project.founderId === user.id) {
            this.logger.warn(`Self-application attempt: user=${user.id} project=${dto.projectId}`);
            throw new ForbiddenException(this.i18n.t('application.cannot_apply_own', locale));
        }

        // Wrap in transaction for atomicity
        const application = await this.prisma.$transaction(async (tx) => {
            let created;
            try {
                created = await tx.application.create({
                    data: {
                        candidateId: user.candidateProfile!.id,
                        projectId: dto.projectId,
                        status: 'PENDING',
                        message: dto.message,
                    },
                    select: { id: true, status: true, createdAt: true },
                });
            } catch (error: any) {
                if (error.code === 'P2002') {
                    throw new ConflictException(this.i18n.t('application.already_applied', locale));
                }
                throw error;
            }

            // Track interaction
            await tx.userProjectInteraction.create({
                data: {
                    userId: user.id,
                    projectId: dto.projectId,
                    action: 'APPLY',
                    source: 'DIRECT',
                },
            });

            return created;
        });

        this.logger.log(`Application created: user=${user.id} project=${dto.projectId}`);

        // Notify founder (outside transaction so push FCM fires)
        const userName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user.name || 'Un candidat';

        // Use the founder's locale for the notification, not the applicant's
        this.notificationsService.getUserLocale(project.founderId).then((founderLocale) => {
            return this.notificationsService.notify(
                project.founderId,
                'APPLICATION_RECEIVED',
                this.i18n.t('notification.new_application_title', founderLocale),
                this.i18n.t('notification.new_application_body', founderLocale, { applicantName: userName, projectName: project.name }),
                { applicationId: application.id, projectId: project.id, projectSlug: project.slug, candidateName: userName },
            );
        }).catch((err) => {
            this.logger.warn(`Failed to notify founder: ${err?.message}`);
        });

        return application;
    }

    async findMine(firebaseUid: string, take?: number, skip?: number) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { candidateProfile: { select: { id: true } } },
        });

        if (!user?.candidateProfile) {
            return [];
        }

        const limit = Math.min(take || 20, 20);
        const offset = Math.max(skip || 0, 0);

        return this.prisma.application.findMany({
            where: { candidateId: user.candidateProfile.id },
            select: {
                id: true,
                status: true,
                message: true,
                createdAt: true,
                project: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        location: true,
                        status: true,
                        founder: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                image: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async findByProject(firebaseUid: string, projectId: string, take?: number, skip?: number, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, founderId: true },
        });

        if (!project) {
            throw new NotFoundException(this.i18n.t('project.not_found', locale));
        }

        if (project.founderId !== user.id) {
            this.logger.warn(`Unauthorized project applications access: user=${user.id} project=${projectId}`);
            throw new ForbiddenException(this.i18n.t('application.not_project_owner', locale));
        }

        const limit = Math.min(take || 20, 20);
        const offset = Math.max(skip || 0, 0);

        return this.prisma.application.findMany({
            where: { projectId },
            select: {
                id: true,
                status: true,
                message: true,
                createdAt: true,
                candidate: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                name: true,
                                image: true,
                                title: true,
                                bio: true,
                                skills: true,
                                city: true,
                                country: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async updateStatus(firebaseUid: string, applicationId: string, status: 'ACCEPTED' | 'REJECTED', locale: Locale = 'fr') {
        const application = await this.prisma.application.findUnique({
            where: { id: applicationId },
            select: {
                id: true,
                status: true,
                project: { select: { id: true, name: true, slug: true, founderId: true } },
                candidate: {
                    select: {
                        id: true,
                        user: { select: { id: true } },
                    },
                },
            },
        });

        if (!application) {
            throw new NotFoundException(this.i18n.t('application.not_found', locale));
        }

        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        if (application.project.founderId !== user.id) {
            this.logger.warn(`Unauthorized status update: user=${user.id} application=${applicationId}`);
            throw new ForbiddenException(this.i18n.t('application.not_project_owner', locale));
        }

        // Atomic update + conversation creation in transaction
        await this.prisma.$transaction(async (tx) => {
            // Atomic update: only update if still PENDING (prevents TOCTOU race condition)
            const result = await tx.application.updateMany({
                where: { id: applicationId, status: 'PENDING' },
                data: { status },
            });

            if (result.count === 0) {
                throw new BadRequestException(
                    this.i18n.t('application.already_processed', locale, { status: application.status }),
                );
            }

            // Auto-create conversation when application is accepted
            if (status === 'ACCEPTED') {
                try {
                    await tx.conversation.create({
                        data: {
                            applicationId,
                            founderId: application.project.founderId,
                            candidateId: application.candidate.user.id,
                        },
                    });
                    this.logger.log(`Conversation created for application ${applicationId} (founder=${application.project.founderId}, candidate=${application.candidate.user.id})`);
                } catch (err: any) {
                    // Unique constraint on applicationId — conversation already exists, ignore
                    if (err?.code !== 'P2002') {
                        throw err;
                    }
                    this.logger.warn(`Conversation already exists for application ${applicationId}`);
                }
            }
        });

        // Notify candidate (with push FCM) — use candidate's locale, not caller's
        const candidateLocale = await this.notificationsService.getUserLocale(application.candidate.user.id);
        const notificationType = status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
        const notificationTitle = status === 'ACCEPTED'
            ? this.i18n.t('notification.application_accepted_title', candidateLocale)
            : this.i18n.t('notification.application_rejected_title', candidateLocale);
        const notificationMessage = status === 'ACCEPTED'
            ? this.i18n.t('notification.application_accepted_body', candidateLocale, { projectName: application.project.name })
            : this.i18n.t('notification.application_rejected_body', candidateLocale, { projectName: application.project.name });

        this.notificationsService.notify(
            application.candidate.user.id,
            notificationType as any,
            notificationTitle,
            notificationMessage,
            { applicationId: application.id, projectId: application.project.id, projectSlug: application.project.slug },
        ).catch((err) => {
            this.logger.warn(`Failed to notify candidate: ${err?.message}`);
        });

        this.logger.log(`Application ${applicationId} updated to ${status} by user ${user.id}`);

        return { id: applicationId, status };
    }

    async hasApplied(firebaseUid: string, projectId: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { candidateProfile: { select: { id: true } } },
        });

        if (!user?.candidateProfile) {
            return { hasApplied: false };
        }

        const application = await this.prisma.application.findUnique({
            where: {
                candidateId_projectId: {
                    candidateId: user.candidateProfile.id,
                    projectId,
                },
            },
            select: { id: true, status: true },
        });

        if (!application) {
            return { hasApplied: false };
        }

        return { hasApplied: true, status: application.status };
    }
}
