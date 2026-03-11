import {
    Injectable,
    Logger,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class UnlockService {
    private readonly logger = new Logger(UnlockService.name);

    // In-memory cache: Map<"userId:targetId", { unlocked: boolean; expiresAt: number }>
    private cache = new Map<string, { unlocked: boolean; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    /**
     * Vérifie si un utilisateur a débloqué un profil/projet.
     */
    async hasUnlock(userId: string, targetId: string): Promise<boolean> {
        const cacheKey = `${userId}:${targetId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            return cached.unlocked;
        }

        const unlock = await this.prisma.unlock.findFirst({
            where: {
                userId,
                OR: [
                    { targetCandidateId: targetId },
                    { targetProjectId: targetId },
                ],
            },
            select: { id: true },
        });

        const unlocked = !!unlock;

        this.cache.set(cacheKey, {
            unlocked,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });

        return unlocked;
    }

    /**
     * Crée un unlock UNIQUEMENT si la transaction est PAID et appartient au user.
     */
    async createUnlockFromTransaction(
        userId: string,
        transactionId: string,
        targetId: string,
        type: 'candidate' | 'project',
    ) {
        // 1. Vérifier que la transaction existe et est PAID
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            select: { id: true, userId: true, status: true },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction introuvable');
        }

        // 2. Vérifier que la transaction appartient au userId
        if (transaction.userId !== userId) {
            this.logger.warn(`Unlock attempt with foreign transaction: user=${userId} tx=${transactionId}`);
            throw new ForbiddenException('Cette transaction ne vous appartient pas');
        }

        // 3. Vérifier que le statut est PAID
        if (transaction.status !== 'PAID') {
            throw new BadRequestException(`Transaction non payée (statut: ${transaction.status})`);
        }

        // 4. Vérifier que l'utilisateur ne débloque pas son propre profil
        await this.checkNotSelfUnlock(userId, targetId, type);

        // 5. Créer l'unlock (la contrainte @@unique empêche les doublons)
        let unlock;
        try {
            unlock = await this.prisma.unlock.create({
                data: {
                    userId,
                    transactionId,
                    ...(type === 'candidate'
                        ? { targetCandidateId: targetId }
                        : { targetProjectId: targetId }),
                },
            });
        } catch (e: any) {
            if (e.code === 'P2002') {
                throw new ConflictException('Ce profil est déjà débloqué');
            }
            throw e;
        }

        // 7. Invalider le cache
        this.cache.delete(`${userId}:${targetId}`);

        // 8. Créer une notification
        const targetName = await this.resolveTargetName(targetId, type);
        await this.notifications.notify(
            userId,
            NotificationType.PROFILE_UNLOCKED,
            'Profil débloqué',
            `Vous avez débloqué le profil de ${targetName}`,
            { unlockId: unlock.id, targetId, targetType: type },
        );

        this.logger.log(`Unlock created: user=${userId} → ${type} ${targetId}`);

        return unlock;
    }

    /**
     * Révoque un unlock suite à un remboursement.
     */
    async revokeUnlockOnRefund(transactionId: string) {
        const unlocks = await this.prisma.unlock.findMany({
            where: { transactionId },
            select: { id: true, userId: true, targetCandidateId: true, targetProjectId: true },
        });

        if (unlocks.length === 0) {
            this.logger.log(`No unlocks to revoke for transaction ${transactionId}`);
            return;
        }

        for (const unlock of unlocks) {
            // Supprimer l'unlock
            await this.prisma.unlock.delete({ where: { id: unlock.id } });

            // Invalider le cache
            const targetId = unlock.targetCandidateId || unlock.targetProjectId;
            if (targetId) {
                this.cache.delete(`${unlock.userId}:${targetId}`);
            }

            this.logger.log(`Unlock revoked: id=${unlock.id} tx=${transactionId}`);
        }
    }

    /**
     * Liste les unlocks d'un utilisateur avec les infos de la cible.
     */
    async listMyUnlocks(userId: string, take = 20, skip = 0) {
        const limit = Math.min(take, 100);
        const unlocks = await this.prisma.unlock.findMany({
            where: { userId },
            take: limit,
            skip,
            select: {
                id: true,
                targetCandidateId: true,
                targetProjectId: true,
                createdAt: true,
                candidate: {
                    select: {
                        id: true,
                        user: {
                            select: { name: true, image: true },
                        },
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        founder: {
                            select: { name: true, image: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return unlocks.map((u) => {
            if (u.targetCandidateId && u.candidate) {
                return {
                    id: u.id,
                    targetType: 'candidate',
                    targetId: u.targetCandidateId,
                    targetName: u.candidate.user?.name || 'Candidat',
                    targetImage: u.candidate.user?.image || null,
                    unlockedAt: u.createdAt,
                };
            }
            return {
                id: u.id,
                targetType: 'project',
                targetId: u.targetProjectId,
                targetName: u.project?.name || 'Projet',
                targetImage: u.project?.logoUrl || u.project?.founder?.image || null,
                unlockedAt: u.createdAt,
            };
        });
    }

    /**
     * Invalide le cache pour un utilisateur/cible.
     */
    invalidateCache(userId: string, targetId: string): void {
        this.cache.delete(`${userId}:${targetId}`);
    }

    /**
     * Vérifie qu'un utilisateur ne débloque pas son propre profil.
     */
    private async checkNotSelfUnlock(userId: string, targetId: string, type: 'candidate' | 'project') {
        if (type === 'candidate') {
            const candidate = await this.prisma.candidateProfile.findUnique({
                where: { id: targetId },
                select: { userId: true },
            });
            if (candidate?.userId === userId) {
                throw new BadRequestException('Impossible de débloquer votre propre profil');
            }
        } else {
            const project = await this.prisma.project.findUnique({
                where: { id: targetId },
                select: { founderId: true },
            });
            if (project?.founderId === userId) {
                throw new BadRequestException('Impossible de débloquer votre propre projet');
            }
        }
    }

    /**
     * Résout le nom d'une cible pour la notification.
     */
    private async resolveTargetName(targetId: string, type: 'candidate' | 'project'): Promise<string> {
        if (type === 'candidate') {
            const candidate = await this.prisma.candidateProfile.findUnique({
                where: { id: targetId },
                select: { user: { select: { name: true } } },
            });
            return candidate?.user?.name || 'un candidat';
        }
        const project = await this.prisma.project.findUnique({
            where: { id: targetId },
            select: { name: true },
        });
        return project?.name || 'un projet';
    }
}
