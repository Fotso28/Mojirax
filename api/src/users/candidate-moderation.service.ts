import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from './users.service';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class CandidateModerationService {
    private readonly logger = new Logger(CandidateModerationService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private usersService: UsersService,
        private matchingService: MatchingService,
    ) {}

    /**
     * Calcule la complétude du profil en comptant les champs remplis.
     * Chaque champ a un poids selon son importance.
     */
    private calculateCompleteness(profile: any): number {
        const fields = [
            // Essentiels (poids 15 chacun)
            { key: 'title', weight: 15, filled: !!profile.title?.trim() },
            { key: 'bio', weight: 15, filled: !!profile.bio && profile.bio.trim().length >= 20 },
            { key: 'skills', weight: 15, filled: profile.skills?.length > 0 },
            // Importants (poids 10 chacun)
            { key: 'shortPitch', weight: 10, filled: !!profile.shortPitch?.trim() },
            { key: 'roleType', weight: 10, filled: !!profile.roleType },
            { key: 'yearsOfExperience', weight: 5, filled: profile.yearsOfExperience != null },
            { key: 'availability', weight: 5, filled: !!profile.availability },
            { key: 'commitmentType', weight: 5, filled: !!profile.commitmentType },
            // Bonus (poids 5 chacun)
            { key: 'vision', weight: 5, filled: !!profile.vision?.trim() },
            { key: 'longPitch', weight: 5, filled: !!profile.longPitch?.trim() },
            { key: 'collabPref', weight: 3, filled: !!profile.collabPref },
            { key: 'locationPref', weight: 3, filled: !!profile.locationPref },
            { key: 'desiredSectors', weight: 2, filled: profile.desiredSectors?.length > 0 },
            { key: 'hasCofounded', weight: 2, filled: profile.hasCofounded != null },
        ];

        const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
        const filledWeight = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);

        return Math.round((filledWeight / totalWeight) * 100);
    }

    /**
     * Modère un profil candidat de manière asynchrone (fire-and-forget).
     * Met le status à PUBLISHED si valide, PENDING_AI si suspect.
     */
    async moderateProfile(candidateProfileId: string): Promise<void> {
        try {
            const profile = await this.prisma.candidateProfile.findUnique({
                where: { id: candidateProfileId },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                },
            });

            if (!profile) {
                this.logger.warn(`Candidate profile ${candidateProfileId} not found for moderation`);
                return;
            }

            // Calculer la complétude nous-mêmes (pas l'IA)
            const completeness = this.calculateCompleteness(profile);

            // Appeler la validation IA (qualité + légitimité uniquement)
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

            // Créer le ModerationLog
            await this.prisma.moderationLog.create({
                data: {
                    candidateProfileId,
                    aiScore: result.qualityScore / 100,
                    aiReason: result.reason || null,
                    aiPayload: result as any,
                    status: result.isValid ? 'PUBLISHED' : 'PENDING_AI',
                },
            });

            if (result.isValid) {
                // Profil valide → publier
                await this.prisma.candidateProfile.update({
                    where: { id: candidateProfileId },
                    data: {
                        status: 'PUBLISHED',
                        qualityScore: result.qualityScore,
                        profileCompleteness: completeness,
                    },
                });

                // Générer les embeddings (fire-and-forget)
                this.usersService.generateCandidateEmbeddings(candidateProfileId).catch((err) => {
                    this.logger.warn(`Embeddings generation failed for ${candidateProfileId}: ${err.message}`);
                });

                // Calculer les match scores (delayed pour laisser les embeddings se générer)
                setTimeout(() => {
                    this.matchingService.calculateForCandidate(candidateProfileId).catch((err) => {
                        this.logger.warn(`Match scores failed for candidate ${candidateProfileId}: ${err.message}`);
                    });
                }, 5000);

                // Notification : profil publié
                await this.prisma.notification.create({
                    data: {
                        userId: profile.user.id,
                        type: 'PROFILE_PUBLISHED',
                        title: 'Profil publié',
                        message: 'Votre profil candidat est maintenant visible dans le feed.',
                    },
                });

                this.logger.log(`Candidate profile ${candidateProfileId} → PUBLISHED (quality: ${result.qualityScore}, legitimacy: ${result.legitimacyScore})`);
            } else {
                // Profil suspect → en attente de revue
                await this.prisma.candidateProfile.update({
                    where: { id: candidateProfileId },
                    data: {
                        status: 'PENDING_AI',
                        qualityScore: result.qualityScore,
                        profileCompleteness: completeness,
                    },
                });

                // Notification : profil en cours de vérification
                await this.prisma.notification.create({
                    data: {
                        userId: profile.user.id,
                        type: 'PROFILE_REVIEW',
                        title: 'Profil en cours de vérification',
                        message: 'Votre profil est en cours de vérification par notre équipe. Vous serez notifié une fois la vérification terminée.',
                    },
                });

                this.logger.log(`Candidate profile ${candidateProfileId} → PENDING_AI (quality: ${result.qualityScore}, legitimacy: ${result.legitimacyScore}, reason: ${result.reason})`);
            }
        } catch (error) {
            this.logger.error(`Moderation failed for candidate ${candidateProfileId}: ${error.message}`, error.stack);

            // En cas d'erreur, publier par défaut pour ne pas bloquer l'utilisateur
            try {
                await this.prisma.candidateProfile.update({
                    where: { id: candidateProfileId },
                    data: { status: 'PUBLISHED' },
                });

                const profile = await this.prisma.candidateProfile.findUnique({
                    where: { id: candidateProfileId },
                    select: { userId: true },
                });

                if (profile) {
                    await this.prisma.notification.create({
                        data: {
                            userId: profile.userId,
                            type: 'PROFILE_PUBLISHED',
                            title: 'Profil publié',
                            message: 'Votre profil candidat est maintenant visible dans le feed.',
                        },
                    });
                }

                this.logger.warn(`Candidate profile ${candidateProfileId} → PUBLISHED (fallback after moderation error)`);
            } catch (fallbackError) {
                this.logger.error(`Fallback publish also failed for ${candidateProfileId}: ${fallbackError.message}`);
            }
        }
    }
}
