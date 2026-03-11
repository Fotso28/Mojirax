import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionsService {
    constructor(private prisma: PrismaService) { }

    async create(firebaseUid: string, dto: CreateInteractionDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true }
        });

        if (!user) return null;

        // Resolve project by slug or id
        const project = await this.prisma.project.findFirst({
            where: {
                OR: [
                    { slug: dto.projectId },
                    { id: dto.projectId },
                ],
            },
            select: { id: true },
        });

        if (!project) return null;

        return this.prisma.userProjectInteraction.create({
            data: {
                userId: user.id,
                projectId: project.id,
                action: dto.action,
                dwellTimeMs: dto.dwellTimeMs,
                scrollDepth: dto.scrollDepth,
                source: dto.source,
                position: dto.position,
            }
        });
    }

    /**
     * Get the set of project IDs the user has saved (SAVE without later UNSAVE).
     */
    async getSavedProjectIds(firebaseUid: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });
        if (!user) return [];

        const interactions = await this.prisma.userProjectInteraction.findMany({
            where: {
                userId: user.id,
                action: { in: ['SAVE', 'UNSAVE'] },
            },
            select: { projectId: true, action: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const saved = new Set<string>();
        for (const i of interactions) {
            if (i.action === 'SAVE') saved.add(i.projectId);
            else saved.delete(i.projectId);
        }

        return Array.from(saved);
    }

    /**
     * Get user's interaction summary for scoring.
     * Returns aggregated signals per project for a given user.
     */
    async getUserSignals(userId: string) {
        // Get all interactions for this user in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const interactions = await this.prisma.userProjectInteraction.findMany({
            where: {
                userId,
                createdAt: { gte: thirtyDaysAgo }
            },
            select: {
                projectId: true,
                action: true,
                dwellTimeMs: true,
                scrollDepth: true,
                project: {
                    select: { sector: true, stage: true, lookingForRole: true }
                }
            }
        });

        // Aggregate: which sectors/stages does this user engage with?
        const sectorEngagement: Record<string, number> = {};
        const stageEngagement: Record<string, number> = {};
        const roleEngagement: Record<string, number> = {};
        const viewedProjectIds = new Set<string>();
        const savedProjectIds = new Set<string>();

        const actionWeights: Record<string, number> = {
            SKIP: -1,
            VIEW: 1,
            CLICK: 3,
            SAVE: 5,
            SHARE: 6,
            APPLY: 8,
            UNLOCK: 10,
            UNSAVE: -2,
        };

        for (const i of interactions) {
            const weight = actionWeights[i.action] ?? 0;

            // Dwell time bonus: +1 per 15s spent (max +5)
            const dwellBonus = i.dwellTimeMs
                ? Math.min(5, Math.floor(i.dwellTimeMs / 15000))
                : 0;

            // Scroll depth bonus: +1 per 25% scrolled (max +4)
            const scrollBonus = i.scrollDepth
                ? Math.floor(i.scrollDepth * 4)
                : 0;

            const totalWeight = weight + dwellBonus + scrollBonus;

            if (i.project.sector) {
                sectorEngagement[i.project.sector] = (sectorEngagement[i.project.sector] || 0) + totalWeight;
            }
            if (i.project.stage) {
                stageEngagement[i.project.stage] = (stageEngagement[i.project.stage] || 0) + totalWeight;
            }
            if (i.project.lookingForRole) {
                roleEngagement[i.project.lookingForRole] = (roleEngagement[i.project.lookingForRole] || 0) + totalWeight;
            }

            if (i.action === 'VIEW' || i.action === 'CLICK') {
                viewedProjectIds.add(i.projectId);
            }
            if (i.action === 'SAVE') {
                savedProjectIds.add(i.projectId);
            }
            if (i.action === 'UNSAVE') {
                savedProjectIds.delete(i.projectId);
            }
        }

        return {
            sectorEngagement,
            stageEngagement,
            roleEngagement,
            viewedProjectIds,
            savedProjectIds,
        };
    }
}
