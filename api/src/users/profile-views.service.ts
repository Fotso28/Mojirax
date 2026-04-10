import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPlan } from '@prisma/client';

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

@Injectable()
export class ProfileViewsService {
  private readonly logger = new Logger(ProfileViewsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Track a profile view — debounce: upsert per viewer/viewed pair (updates createdAt).
   */
  async trackView(viewerId: string, viewedId: string): Promise<void> {
    if (viewerId === viewedId) return; // don't track self-views

    // Check if viewer is in invisible mode — skip tracking silently
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { isInvisible: true },
    });
    if (viewer?.isInvisible) return;

    try {
      await this.prisma.profileView.upsert({
        where: { viewerId_viewedId: { viewerId, viewedId } },
        update: { createdAt: new Date() },
        create: { viewerId, viewedId },
      });
    } catch (e) {
      this.logger.warn(`Failed to track profile view: ${e.message}`);
    }
  }

  /**
   * Get viewers of my profile — PLUS+ gets full list, FREE gets count only.
   */
  async getViewers(userId: string, plan: UserPlan) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY.PLUS) {
      const viewers = await this.prisma.profileView.findMany({
        where: { viewedId: userId, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          createdAt: true,
          viewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              image: true,
              role: true,
              plan: true,
            },
          },
        },
      });
      return { viewers, count: viewers.length };
    }

    // FREE users get count only
    const count = await this.prisma.profileView.count({
      where: { viewedId: userId, createdAt: { gte: thirtyDaysAgo } },
    });
    return { viewers: [], count };
  }

  /**
   * Get view count for the last 30 days.
   */
  async getViewCount(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.prisma.profileView.count({
      where: { viewedId: userId, createdAt: { gte: thirtyDaysAgo } },
    });
  }
}
