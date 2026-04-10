import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS } from '../common/config/plan-limits.config';

@Injectable()
export class BoostService {
  private readonly logger = new Logger(BoostService.name);

  constructor(private prisma: PrismaService) {}

  async activateBoost(firebaseUid: string, projectId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, plan: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Check plan allows boosts
    const limits = PLAN_LIMITS[user.plan];
    if (limits.boostsPerMonth <= 0) {
      throw new ForbiddenException('Les boosts nécessitent le plan Pro ou supérieur.');
    }

    // Verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, founderId: user.id },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable ou non autorisé');

    // Check monthly quota
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usedThisMonth = await this.prisma.boost.count({
      where: { userId: user.id, startedAt: { gte: startOfMonth } },
    });

    if (usedThisMonth >= limits.boostsPerMonth) {
      throw new ForbiddenException(
        `Quota de boosts atteint (${usedThisMonth}/${limits.boostsPerMonth} ce mois). ${
          user.plan === 'PRO' ? 'Passez au plan Elite pour plus de boosts.' : ''
        }`,
      );
    }

    // Check no active boost on this project
    const activeBoost = await this.prisma.boost.findFirst({
      where: { projectId, expiresAt: { gt: new Date() } },
    });
    if (activeBoost) {
      throw new ForbiddenException('Ce projet a déjà un boost actif.');
    }

    // Create 24h boost
    const boost = await this.prisma.boost.create({
      data: {
        userId: user.id,
        projectId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Boost activated: user=${user.id} project=${projectId} expires=${boost.expiresAt}`);
    return boost;
  }

  async getRemainingBoosts(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, plan: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const limits = PLAN_LIMITS[user.plan];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const used = await this.prisma.boost.count({
      where: { userId: user.id, startedAt: { gte: startOfMonth } },
    });

    return {
      used,
      remaining: Math.max(0, limits.boostsPerMonth - used),
      total: limits.boostsPerMonth,
      plan: user.plan,
    };
  }

  async getActiveBoostProjectIds(): Promise<string[]> {
    const boosts = await this.prisma.boost.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { projectId: true },
      distinct: ['projectId'],
    });
    return boosts.map((b) => b.projectId);
  }
}
