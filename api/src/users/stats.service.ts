import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getProfileStats(userId: string) {
    // Get all projects owned by this user
    const projects = await this.prisma.project.findMany({
      where: { founderId: userId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) return { projects: [], totals: this.emptyTotals() };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate interactions per project
    const stats = await Promise.all(
      projects.map(async (project) => {
        const [views, clicks, saves, likes, applications, views7d, views30d] =
          await Promise.all([
            this.countAction(project.id, 'VIEW'),
            this.countAction(project.id, 'CLICK'),
            this.countAction(project.id, 'SAVE'),
            this.countAction(project.id, 'LIKE'),
            this.prisma.application.count({ where: { projectId: project.id } }),
            this.countAction(project.id, 'VIEW', sevenDaysAgo),
            this.countAction(project.id, 'VIEW', thirtyDaysAgo),
          ]);

        return {
          projectId: project.id,
          projectName: project.name,
          views, clicks, saves, likes, applications,
          trend7d: views7d,
          trend30d: views30d,
        };
      }),
    );

    const totals = stats.reduce(
      (acc, s) => ({
        views: acc.views + s.views,
        clicks: acc.clicks + s.clicks,
        saves: acc.saves + s.saves,
        likes: acc.likes + s.likes,
        applications: acc.applications + s.applications,
      }),
      { views: 0, clicks: 0, saves: 0, likes: 0, applications: 0 },
    );

    return { projects: stats, totals };
  }

  private async countAction(projectId: string, action: string, since?: Date) {
    return this.prisma.userProjectInteraction.count({
      where: {
        projectId,
        action,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    });
  }

  private emptyTotals() {
    return { views: 0, clicks: 0, saves: 0, likes: 0, applications: 0 };
  }
}
