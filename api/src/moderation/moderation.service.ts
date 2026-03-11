import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ModerationService {
    private readonly logger = new Logger(ModerationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly notificationsService: NotificationsService,
    ) {}

    /**
     * Modere un projet de maniere asynchrone.
     * Combine checkLegality (ethique/legalite) et validateProject (qualite du contenu).
     * Score > 0.7 → PUBLISHED, < 0.3 → REJECTED, entre les deux → PENDING_AI.
     */
    async moderateProject(projectId: string): Promise<void> {
        try {
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    founderId: true,
                    name: true,
                    pitch: true,
                    problem: true,
                    solutionDesc: true,
                    uvp: true,
                    sector: true,
                    stage: true,
                    vision: true,
                    target: true,
                    businessModel: true,
                },
            });

            if (!project) {
                this.logger.warn(`Project ${projectId} not found for moderation`);
                return;
            }

            const projectData = {
                name: project.name,
                pitch: project.pitch,
                problem: project.problem,
                solution_desc: project.solutionDesc,
                uvp: project.uvp,
                sector: project.sector,
                stage: project.stage,
                vision: project.vision,
                target: project.target,
                business_model: project.businessModel,
            };

            // 1. Verification de legalite
            const legalityResult = await this.aiService.checkLegality(projectData);

            // Si clairement illegal, rejeter immediatement
            if (!legalityResult.isLegal && legalityResult.confidence >= 0.7) {
                const score = 0.1;
                const reason = legalityResult.reason || 'Projet non conforme aux conditions de la plateforme';

                await this.createModerationLog(projectId, null, score, reason, {
                    legality: legalityResult,
                    decision: 'REJECTED_ILLEGAL',
                });

                await this.prisma.project.update({
                    where: { id: projectId },
                    data: { status: 'REJECTED' },
                });

                await this.notificationsService.notify(
                    project.founderId,
                    'MODERATION_ALERT',
                    'Projet rejete',
                    `Votre projet "${project.name}" n'est pas conforme : ${reason}`,
                    { projectId, reason },
                );

                this.logger.log(`Project ${projectId} → REJECTED (illegal, confidence: ${legalityResult.confidence})`);
                return;
            }

            // 2. Validation qualite du contenu
            const validationResult = await this.aiService.validateProject(projectData);

            // 3. Calculer le score combine (0-1)
            // legalite = 40%, qualite contenu = 60%
            const legalityScore = legalityResult.isLegal ? legalityResult.confidence : (1 - legalityResult.confidence);
            const qualityScore = validationResult.score / 100; // validateProject retourne 0-100
            const combinedScore = (legalityScore * 0.4) + (qualityScore * 0.6);

            // 4. Determiner le statut
            let newStatus: 'PUBLISHED' | 'PENDING_AI' | 'REJECTED';
            if (combinedScore > 0.7) {
                newStatus = 'PUBLISHED';
            } else if (combinedScore < 0.3) {
                newStatus = 'REJECTED';
            } else {
                newStatus = 'PENDING_AI';
            }

            const reason = validationResult.summary || 'Analyse completee';

            // 5. Creer le ModerationLog
            await this.createModerationLog(projectId, null, combinedScore, reason, {
                legality: legalityResult,
                validation: validationResult,
                combinedScore,
            });

            // 6. Mettre a jour le statut du projet
            await this.prisma.project.update({
                where: { id: projectId },
                data: {
                    status: newStatus,
                    qualityScore: validationResult.score,
                },
            });

            // 7. Notifier le fondateur
            if (newStatus === 'PUBLISHED') {
                await this.notificationsService.notify(
                    project.founderId,
                    'MODERATION_ALERT',
                    'Projet publie',
                    `Votre projet "${project.name}" a ete verifie et publie avec succes.`,
                    { projectId },
                );
            } else if (newStatus === 'REJECTED') {
                await this.notificationsService.notify(
                    project.founderId,
                    'MODERATION_ALERT',
                    'Projet rejete',
                    `Votre projet "${project.name}" a ete rejete : ${reason}`,
                    { projectId, reason },
                );
            } else {
                await this.notificationsService.notify(
                    project.founderId,
                    'MODERATION_ALERT',
                    'Projet en verification',
                    `Votre projet "${project.name}" est en cours de verification par notre equipe.`,
                    { projectId },
                );
            }

            this.logger.log(
                `Project ${projectId} moderated → ${newStatus} (score: ${combinedScore.toFixed(2)}, legality: ${legalityScore.toFixed(2)}, quality: ${qualityScore.toFixed(2)})`,
            );
        } catch (error) {
            this.logger.error(
                `Moderation failed for project ${projectId}: ${error.message}`,
                error.stack,
            );

            // En cas d'erreur, publier par defaut pour ne pas bloquer l'utilisateur
            try {
                await this.prisma.project.update({
                    where: { id: projectId },
                    data: { status: 'PUBLISHED' },
                });
                this.logger.warn(`Project ${projectId} → PUBLISHED (fallback after moderation error)`);
            } catch (fallbackError) {
                this.logger.error(
                    `Fallback publish also failed for project ${projectId}: ${fallbackError.message}`,
                );
            }
        }
    }

    /**
     * Modere un profil candidat de maniere asynchrone.
     * Utilise validateCandidateProfile du AiService.
     */
    async moderateCandidate(candidateProfileId: string): Promise<void> {
        try {
            const profile = await this.prisma.candidateProfile.findUnique({
                where: { id: candidateProfileId },
                select: {
                    id: true,
                    userId: true,
                    title: true,
                    bio: true,
                    skills: true,
                    yearsOfExperience: true,
                    location: true,
                    shortPitch: true,
                    vision: true,
                    roleType: true,
                },
            });

            if (!profile) {
                this.logger.warn(`Candidate profile ${candidateProfileId} not found for moderation`);
                return;
            }

            // Appeler la validation IA
            const result = await this.aiService.validateCandidateProfile({
                title: profile.title,
                bio: profile.bio,
                skills: profile.skills,
                yearsOfExperience: profile.yearsOfExperience,
                location: profile.location,
                shortPitch: profile.shortPitch,
                vision: profile.vision,
                roleType: profile.roleType,
            });

            // Determiner le statut
            const newStatus = result.isValid ? 'PUBLISHED' : 'PENDING_AI';
            const score = result.qualityScore / 100;

            // Creer le ModerationLog
            await this.createModerationLog(null, candidateProfileId, score, result.reason || null, result);

            // Mettre a jour le statut du profil
            await this.prisma.candidateProfile.update({
                where: { id: candidateProfileId },
                data: {
                    status: newStatus as any,
                    qualityScore: result.qualityScore,
                },
            });

            // Notifier le candidat
            if (newStatus === 'PUBLISHED') {
                await this.notificationsService.notify(
                    profile.userId,
                    'PROFILE_PUBLISHED',
                    'Profil publie',
                    'Votre profil candidat est maintenant visible dans le feed.',
                );
            } else {
                await this.notificationsService.notify(
                    profile.userId,
                    'PROFILE_REVIEW',
                    'Profil en verification',
                    'Votre profil est en cours de verification par notre equipe.',
                );
            }

            this.logger.log(
                `Candidate ${candidateProfileId} moderated → ${newStatus} (quality: ${result.qualityScore}, legitimacy: ${result.legitimacyScore})`,
            );
        } catch (error) {
            this.logger.error(
                `Moderation failed for candidate ${candidateProfileId}: ${error.message}`,
                error.stack,
            );

            // En cas d'erreur, publier par defaut
            try {
                await this.prisma.candidateProfile.update({
                    where: { id: candidateProfileId },
                    data: { status: 'PUBLISHED' },
                });
                this.logger.warn(
                    `Candidate ${candidateProfileId} → PUBLISHED (fallback after moderation error)`,
                );
            } catch (fallbackError) {
                this.logger.error(
                    `Fallback publish also failed for candidate ${candidateProfileId}: ${fallbackError.message}`,
                );
            }
        }
    }

    // ─── Private ────────────────────────────────────────────

    private async createModerationLog(
        projectId: string | null,
        candidateProfileId: string | null,
        score: number,
        reason: string | null,
        payload: any,
    ) {
        let status: string;
        if (score > 0.7) {
            status = 'PUBLISHED';
        } else if (score < 0.3) {
            status = 'REJECTED';
        } else {
            status = 'PENDING_AI';
        }

        await this.prisma.moderationLog.create({
            data: {
                ...(projectId ? { projectId } : {}),
                ...(candidateProfileId ? { candidateProfileId } : {}),
                aiScore: score,
                aiReason: reason,
                aiPayload: payload,
                status: status as any,
            },
        });
    }
}
