import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS } from '../common/config/plan-limits.config';
import { I18nService, Locale } from '../i18n/i18n.service';

@Injectable()
export class BoostService {
  private readonly logger = new Logger(BoostService.name);

  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async activateBoost(firebaseUid: string, projectId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, plan: true, preferredLang: true },
    });
    if (!user) throw new NotFoundException(this.i18n.t('user.not_found'));

    const locale = (user.preferredLang === 'en' ? 'en' : 'fr') as Locale;

    // Check plan allows boosts
    const limits = PLAN_LIMITS[user.plan];
    if (limits.boostsPerMonth <= 0) {
      throw new ForbiddenException(this.i18n.t('boost.plan_required', locale));
    }

    // Verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, founderId: user.id },
      select: { id: true },
    });
    if (!project) throw new NotFoundException(this.i18n.t('project.not_found', locale));

    // Check monthly quota
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usedThisMonth = await this.prisma.boost.count({
      where: { userId: user.id, startedAt: { gte: startOfMonth } },
    });

    if (usedThisMonth >= limits.boostsPerMonth) {
      const key = user.plan === 'PRO' ? 'boost.quota_reached_upgrade' : 'boost.quota_reached';
      throw new ForbiddenException(
        this.i18n.t(key, locale, { used: String(usedThisMonth), total: String(limits.boostsPerMonth) }),
      );
    }

    // Check no active boost on this project
    const activeBoost = await this.prisma.boost.findFirst({
      where: { projectId, expiresAt: { gt: new Date() } },
    });
    if (activeBoost) {
      throw new ForbiddenException(this.i18n.t('boost.already_active', locale));
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
    if (!user) throw new NotFoundException(this.i18n.t('user.not_found'));

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
