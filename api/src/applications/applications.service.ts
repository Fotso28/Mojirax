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

@Injectable()
export class ApplicationsService {
    private readonly logger = new Logger(ApplicationsService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => CandidateModerationService))
        private candidateModerationService: CandidateModerationService,
        private notificationsService: NotificationsService,
    ) { }

    async apply(firebaseUid: string, dto: CreateApplicationDto) {
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
            throw new NotFoundException('Utilisateur non trouvé');
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
                message: 'Veuillez compléter votre profil avant de postuler',
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
            this.candidateModerationService.moderateProfile(profile.id).catch(() => {});
        }

        const project = await this.prisma.project.findUnique({
            where: { id: dto.projectId },
            select: { id: true, name: true, slug: true, status: true, founderId: true },
        });

        if (!project || project.status !== 'PUBLISHED') {
            throw new NotFoundException('Projet non trouvé ou non disponible');
        }

        if (project.founderId === user.id) {
            this.logger.warn(`Self-application attempt: user=${user.id} project=${dto.projectId}`);
            throw new ForbiddenException('Vous ne pouvez pas postuler à votre propre projet');
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
                    throw new ConflictException('Vous avez déjà postulé à ce projet');
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

        this.notificationsService.notify(
            project.founderId,
            'APPLICATION_RECEIVED',
            'Nouvelle candidature',
            `${userName} a postulé à ${project.name}`,
            { applicationId: application.id, projectId: project.id, projectSlug: project.slug, candidateName: userName },
        ).catch((err) => {
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

    async findByProject(firebaseUid: string, projectId: string, take?: number, skip?: number) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, founderId: true },
        });

        if (!project) {
            throw new NotFoundException('Projet non trouvé');
        }

        if (project.founderId !== user.id) {
            this.logger.warn(`Unauthorized project applications access: user=${user.id} project=${projectId}`);
            throw new ForbiddenException('Vous n\'êtes pas le fondateur de ce projet');
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
                        title: true,
                        bio: true,
                        skills: true,
                        location: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                name: true,
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

    async updateStatus(firebaseUid: string, applicationId: string, status: 'ACCEPTED' | 'REJECTED') {
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
            throw new NotFoundException('Candidature non trouvée');
        }

        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        if (application.project.founderId !== user.id) {
            this.logger.warn(`Unauthorized status update: user=${user.id} application=${applicationId}`);
            throw new ForbiddenException('Vous n\'êtes pas le fondateur de ce projet');
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
                    `Cette candidature a déjà été traitée (statut: ${application.status})`,
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

        // Notify candidate (with push FCM)
        const notificationType = status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
        const notificationTitle = status === 'ACCEPTED' ? 'Candidature acceptée !' : 'Candidature refusée';
        const notificationMessage = status === 'ACCEPTED'
            ? `Votre candidature à ${application.project.name} a été acceptée`
            : `Votre candidature à ${application.project.name} n'a pas été retenue`;

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
