import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingGateway } from '../messaging/messaging.gateway';
import {
  ListUsersDto,
  ListModerationDto,
  ModerationActionDto,
  ChangeRoleDto,
  ListTransactionsDto,
  ListLogsDto,
  ListProjectsDto,
  BanUserDto,
  UnbanUserDto,
  ArchiveProjectDto,
} from './dto/admin.dto';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { CreatePlanDto, UpdatePlanDto, ReorderPlansDto } from './dto/plan.dto';
import { CreateFaqDto, UpdateFaqDto, ReorderFaqsDto } from './dto/faq.dto';
import { CreateTestimonialDto, UpdateTestimonialDto, ReorderTestimonialsDto } from './dto/testimonial.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  // ─── KPIs ──────────────────────────────────────────────

  async getKpis() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      // Users — tous les rôles
      totalUsers,
      adminsCount,
      foundersCount,
      candidatesCount,
      usersCount,
      newThisWeek,
      // Projects — tous les statuts
      totalProjects,
      publishedProjects,
      draftProjects,
      pendingAiProjects,
      analyzingProjects,
      rejectedProjects,
      // Applications — tous les statuts
      totalApplications,
      pendingApplications,
      acceptedApplications,
      rejectedApplications,
      ignoredApplications,
      // Transactions — tous les statuts
      totalTransactions,
      paidCount,
      pendingTxCount,
      failedTxCount,
      refundedTxCount,
      paidSum,
      thisMonthSum,
      totalUnlocks,
      // Moderation
      pendingProfiles,
      pendingProjectsMod,
      rejectedToday,
      // Engagement
      totalInteractions,
      interactionsThisWeek,
      activeUsersThisWeek,
      totalSearches,
      searchesThisWeek,
      // Visits
      totalVisits,
      visitsThisWeek,
      visitsToday,
      uniqueVisitorsThisWeek,
      deviceStats,
      // Ban / Archive
      bannedUsersCount,
      archivedByAdminCount,
    ] = await Promise.all([
      // Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'FOUNDER' } }),
      this.prisma.user.count({ where: { role: 'CANDIDATE' } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // Projects
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.project.count({ where: { status: 'DRAFT' } }),
      this.prisma.project.count({ where: { status: 'PENDING_AI' } }),
      this.prisma.project.count({ where: { status: 'ANALYZING' } }),
      this.prisma.project.count({ where: { status: 'REJECTED' } }),
      // Applications
      this.prisma.application.count(),
      this.prisma.application.count({ where: { status: 'PENDING' } }),
      this.prisma.application.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.application.count({ where: { status: 'REJECTED' } }),
      this.prisma.application.count({ where: { status: 'IGNORED' } }),
      // Transactions
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'PAID' } }),
      this.prisma.transaction.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { status: 'FAILED' } }),
      this.prisma.transaction.count({ where: { status: 'REFUNDED' } }),
      this.prisma.transaction.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.unlock.count(),
      // Moderation
      this.prisma.candidateProfile.count({ where: { status: 'PENDING_AI' } }),
      this.prisma.project.count({ where: { status: 'PENDING_AI' } }),
      this.prisma.moderationLog.count({
        where: {
          status: 'REJECTED',
          reviewedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      }),
      // Engagement
      this.prisma.userProjectInteraction.count(),
      this.prisma.userProjectInteraction.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      this.prisma.userProjectInteraction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: oneWeekAgo } },
        _count: true,
      }),
      this.prisma.searchLog.count(),
      this.prisma.searchLog.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // Visits
      this.prisma.userVisit.count(),
      this.prisma.userVisit.count({ where: { loginAt: { gte: oneWeekAgo } } }),
      this.prisma.userVisit.count({
        where: { loginAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      }),
      this.prisma.userVisit.groupBy({
        by: ['userId'],
        where: { loginAt: { gte: oneWeekAgo } },
        _count: true,
      }),
      this.prisma.userVisit.groupBy({
        by: ['device'],
        _count: true,
      }),
      // Ban / Archive
      this.prisma.user.count({ where: { status: 'BANNED' } }),
      this.prisma.project.count({ where: { status: 'REMOVED_BY_ADMIN' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        admins: adminsCount,
        founders: foundersCount,
        candidates: candidatesCount,
        unassigned: usersCount,
        banned: bannedUsersCount,
        newThisWeek,
      },
      projects: {
        total: totalProjects,
        published: publishedProjects,
        draft: draftProjects,
        pendingAi: pendingAiProjects,
        analyzingDoc: analyzingProjects,
        rejected: rejectedProjects,
        archivedByAdmin: archivedByAdminCount,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
        ignored: ignoredApplications,
      },
      revenue: {
        totalXAF: Number(paidSum._sum.amount ?? 0),
        thisMonthXAF: Number(thisMonthSum._sum.amount ?? 0),
        transactions: {
          total: totalTransactions,
          paid: paidCount,
          pending: pendingTxCount,
          failed: failedTxCount,
          refunded: refundedTxCount,
        },
        unlockCount: totalUnlocks,
      },
      moderation: {
        pendingProfiles,
        pendingProjects: pendingProjectsMod,
        rejectedToday,
      },
      engagement: {
        totalInteractions,
        interactionsThisWeek,
        activeUsersThisWeek: activeUsersThisWeek.length,
        totalSearches,
        searchesThisWeek,
      },
      visits: {
        total: totalVisits,
        thisWeek: visitsThisWeek,
        today: visitsToday,
        uniqueVisitorsThisWeek: uniqueVisitorsThisWeek.length,
        byDevice: deviceStats.reduce((acc, d) => {
          acc[d.device || 'UNKNOWN'] = d._count;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  // ─── Users ─────────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.role) {
      where.role = dto.role;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          image: true,
          createdAt: true,
          _count: {
            select: {
              projects: true,
              transactions: true,
              notifications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, take, skip: dto.skip ?? 0 };
  }

  async getUserDetail(userId: string) {
    const [user, interactionStats, recentViews, recentSearches, lastActivity, visitStats, recentVisits] = await Promise.all([
      // User de base
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          candidateProfile: {
            select: {
              id: true,
              title: true,
              status: true,
              skills: true,
              qualityScore: true,
              createdAt: true,
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              sector: true,
              qualityScore: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              transactions: true,
              unlocks: true,
              notifications: true,
            },
          },
        },
      }),

      // Stats d'interactions agrégées par action
      this.prisma.userProjectInteraction.groupBy({
        by: ['action'],
        where: { userId },
        _count: true,
      }),

      // Derniers projets consultés (VIEW/CLICK) — 20 max, dédupliqués par projet
      this.prisma.userProjectInteraction.findMany({
        where: { userId, action: { in: ['VIEW', 'CLICK'] } },
        select: {
          projectId: true,
          action: true,
          dwellTimeMs: true,
          source: true,
          createdAt: true,
          project: {
            select: { id: true, name: true, sector: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Dernières recherches
      this.prisma.searchLog.findMany({
        where: { userId },
        select: {
          id: true,
          query: true,
          searchType: true,
          resultsCount: true,
          clickedResultId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Dernière activité (interaction la plus récente)
      this.prisma.userProjectInteraction.findFirst({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),

      // Visites : total
      this.prisma.userVisit.count({ where: { userId } }),

      // Dernières visites
      this.prisma.userVisit.findMany({
        where: { userId },
        select: {
          id: true,
          device: true,
          browser: true,
          os: true,
          loginAt: true,
          lastSeenAt: true,
        },
        orderBy: { loginAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Dédupliquer les projets vus (garder la dernière visite par projet)
    const seenProjects = new Map<string, typeof recentViews[0]>();
    for (const view of recentViews) {
      if (!seenProjects.has(view.projectId)) {
        seenProjects.set(view.projectId, view);
      }
    }

    // Formater les stats d'interaction
    const engagementByAction: Record<string, number> = {};
    let totalInteractions = 0;
    for (const stat of interactionStats) {
      engagementByAction[stat.action] = stat._count;
      totalInteractions += stat._count;
    }

    return {
      ...user,
      engagement: {
        totalInteractions,
        byAction: engagementByAction,
        lastActivityAt: lastActivity?.createdAt || null,
        recentProjectViews: [...seenProjects.values()].slice(0, 20).map((v) => ({
          projectId: v.project.id,
          projectName: v.project.name,
          sector: v.project.sector,
          status: v.project.status,
          action: v.action,
          dwellTimeMs: v.dwellTimeMs,
          source: v.source,
          viewedAt: v.createdAt,
        })),
        recentSearches: recentSearches.map((s) => ({
          query: s.query,
          type: s.searchType,
          resultsCount: s.resultsCount,
          clickedResult: s.clickedResultId,
          searchedAt: s.createdAt,
        })),
      },
      visits: {
        totalVisits: visitStats,
        recentVisits: recentVisits.map((v) => ({
          device: v.device,
          browser: v.browser,
          os: v.os,
          loginAt: v.loginAt,
          lastSeenAt: v.lastSeenAt,
          durationMin: Math.round((v.lastSeenAt.getTime() - v.loginAt.getTime()) / 60000),
        })),
      },
    };
  }

  async changeUserRole(adminId: string, userId: string, dto: ChangeRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.role === dto.role) {
      throw new BadRequestException(`L'utilisateur a déjà le rôle ${dto.role}`);
    }

    const oldRole = user.role;

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role as any },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CHANGE_ROLE',
        targetId: userId,
        details: { oldRole, newRole: dto.role, userName: user.name },
      },
    });

    this.logger.log(`Admin ${adminId} changed role of user ${userId}: ${oldRole} → ${dto.role}`);

    return { success: true, oldRole, newRole: dto.role };
  }

  async banUser(adminId: string, userId: string, dto: BanUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true, name: true, email: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (target.role === 'ADMIN') throw new BadRequestException('Impossible de bannir un administrateur');
    if (target.status === 'BANNED') throw new BadRequestException('Utilisateur déjà banni');

    const publishedProjects = await this.prisma.project.findMany({
      where: { founderId: userId, status: 'PUBLISHED' },
      select: { id: true },
    });
    const archivedProjectIds = publishedProjects.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'BANNED' },
      }),
      ...(archivedProjectIds.length > 0
        ? [this.prisma.project.updateMany({
            where: { id: { in: archivedProjectIds } },
            data: { status: 'REMOVED_BY_ADMIN' },
          })]
        : []),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'BAN_USER',
          targetId: userId,
          details: { reason: dto.reason, archivedProjectIds },
        },
      }),
    ]);

    this.logger.warn(`User banned: userId=${userId} by adminId=${adminId}, reason="${dto.reason}", archivedProjects=${archivedProjectIds.length}`);

    // Disconnect active WebSocket sessions
    await this.messagingGateway.disconnectUser(userId);

    return { id: target.id, name: target.name, email: target.email, role: target.role, status: 'BANNED' as const, archivedProjects: archivedProjectIds.length };
  }

  async unbanUser(adminId: string, userId: string, dto: UnbanUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, name: true, email: true, role: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (target.status !== 'BANNED') throw new BadRequestException('Utilisateur non banni');

    const banLog = await this.prisma.adminLog.findFirst({
      where: { targetId: userId, action: 'BAN_USER' },
      orderBy: { createdAt: 'desc' },
      select: { details: true },
    });

    const archivedProjectIds: string[] = (banLog?.details as any)?.archivedProjectIds ?? [];

    const projectsToRestore = archivedProjectIds.length > 0
      ? await this.prisma.project.findMany({
          where: { id: { in: archivedProjectIds }, status: 'REMOVED_BY_ADMIN' },
          select: { id: true },
        })
      : [];
    const restoredProjectIds = projectsToRestore.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      }),
      ...(restoredProjectIds.length > 0
        ? [this.prisma.project.updateMany({
            where: { id: { in: restoredProjectIds } },
            data: { status: 'PUBLISHED' },
          })]
        : []),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'UNBAN_USER',
          targetId: userId,
          details: { reason: dto.reason ?? null, restoredProjectIds },
        },
      }),
    ]);

    this.logger.log(`User unbanned: userId=${userId} by adminId=${adminId}, restoredProjects=${restoredProjectIds.length}`);
    return { id: target.id, name: target.name, email: target.email, role: target.role, status: 'ACTIVE' as const, restoredProjects: restoredProjectIds.length };
  }

  // ─── Modération ────────────────────────────────────────

  async listModeration(dto: ListModerationDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const skip = dto.skip ?? 0;

    const items: any[] = [];
    let total = 0;

    const statusFilter = dto.status
      ? { status: dto.status as any }
      : { status: { in: ['PENDING_AI', 'REJECTED'] as any } };

    if (!dto.type || dto.type === 'project') {
      const [projects, projectCount] = await Promise.all([
        this.prisma.project.findMany({
          where: statusFilter,
          take,
          skip,
          select: {
            id: true,
            name: true,
            pitch: true,
            status: true,
            sector: true,
            qualityScore: true,
            createdAt: true,
            founder: {
              select: { id: true, name: true, email: true, image: true },
            },
            moderationLogs: {
              orderBy: { reviewedAt: 'desc' },
              take: 3,
              select: {
                id: true,
                aiScore: true,
                aiReason: true,
                status: true,
                reviewedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.project.count({ where: statusFilter }),
      ]);

      items.push(
        ...projects.map((p) => ({
          ...p,
          entityType: 'project' as const,
        })),
      );
      total += projectCount;
    }

    if (!dto.type || dto.type === 'candidate') {
      const [candidates, candidateCount] = await Promise.all([
        this.prisma.candidateProfile.findMany({
          where: statusFilter,
          take,
          skip,
          select: {
            id: true,
            title: true,
            bio: true,
            status: true,
            skills: true,
            qualityScore: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            moderationLogs: {
              orderBy: { reviewedAt: 'desc' },
              take: 3,
              select: {
                id: true,
                aiScore: true,
                aiReason: true,
                status: true,
                reviewedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.candidateProfile.count({ where: statusFilter }),
      ]);

      items.push(
        ...candidates.map((c) => ({
          ...c,
          entityType: 'candidate' as const,
        })),
      );
      total += candidateCount;
    }

    return { items, total, take, skip };
  }

  async moderateItem(adminId: string, itemId: string, dto: ModerationActionDto) {
    // Try project first
    const project = await this.prisma.project.findUnique({
      where: { id: itemId },
      select: { id: true, founderId: true, name: true, status: true },
    });

    if (project) {
      return this.moderateProject(adminId, project, dto);
    }

    // Try candidate profile
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: itemId },
      select: { id: true, userId: true, title: true, status: true },
    });

    if (candidate) {
      return this.moderateCandidate(adminId, candidate, dto);
    }

    throw new NotFoundException('Élément introuvable (ni projet ni profil candidat)');
  }

  private async moderateProject(
    adminId: string,
    project: { id: string; founderId: string; name: string; status: any },
    dto: ModerationActionDto,
  ) {
    await this.prisma.project.update({
      where: { id: project.id },
      data: { status: dto.action as any },
    });

    // Create moderation log
    await this.prisma.moderationLog.create({
      data: {
        projectId: project.id,
        aiScore: dto.action === 'PUBLISHED' ? 1.0 : 0.0,
        aiReason: dto.reason || `Décision manuelle admin: ${dto.action}`,
        aiPayload: { adminId, action: dto.action, manual: true },
        status: dto.action as any,
      },
    });

    // Admin log
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'MODERATE_PROJECT',
        targetId: project.id,
        details: {
          projectName: project.name,
          previousStatus: project.status,
          newStatus: dto.action,
          reason: dto.reason,
        },
      },
    });

    // Notify founder
    const notifTitle = dto.action === 'PUBLISHED' ? 'Projet approuvé' : 'Projet rejeté';
    const notifMessage =
      dto.action === 'PUBLISHED'
        ? `Votre projet "${project.name}" a été approuvé par un administrateur.`
        : `Votre projet "${project.name}" a été rejeté. ${dto.reason ? `Raison : ${dto.reason}` : ''}`;

    await this.notifications.notify(
      project.founderId,
      'MODERATION_ALERT',
      notifTitle,
      notifMessage,
      { projectId: project.id, action: dto.action },
    );

    this.logger.log(`Admin ${adminId} moderated project ${project.id} → ${dto.action}`);

    return { success: true, entityType: 'project', id: project.id, newStatus: dto.action };
  }

  private async moderateCandidate(
    adminId: string,
    candidate: { id: string; userId: string; title: string; status: any },
    dto: ModerationActionDto,
  ) {
    await this.prisma.candidateProfile.update({
      where: { id: candidate.id },
      data: { status: dto.action as any },
    });

    // Create moderation log
    await this.prisma.moderationLog.create({
      data: {
        candidateProfileId: candidate.id,
        aiScore: dto.action === 'PUBLISHED' ? 1.0 : 0.0,
        aiReason: dto.reason || `Décision manuelle admin: ${dto.action}`,
        aiPayload: { adminId, action: dto.action, manual: true },
        status: dto.action as any,
      },
    });

    // Admin log
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'MODERATE_CANDIDATE',
        targetId: candidate.id,
        details: {
          candidateTitle: candidate.title,
          previousStatus: candidate.status,
          newStatus: dto.action,
          reason: dto.reason,
        },
      },
    });

    // Notify candidate
    const notifType = dto.action === 'PUBLISHED' ? 'PROFILE_PUBLISHED' : 'PROFILE_REVIEW';
    const notifTitle = dto.action === 'PUBLISHED' ? 'Profil approuvé' : 'Profil rejeté';
    const notifMessage =
      dto.action === 'PUBLISHED'
        ? 'Votre profil candidat a été approuvé par un administrateur et est maintenant visible.'
        : `Votre profil candidat a été rejeté. ${dto.reason ? `Raison : ${dto.reason}` : ''}`;

    await this.notifications.notify(candidate.userId, notifType, notifTitle, notifMessage, {
      candidateProfileId: candidate.id,
      action: dto.action,
    });

    this.logger.log(`Admin ${adminId} moderated candidate ${candidate.id} → ${dto.action}`);

    return { success: true, entityType: 'candidate', id: candidate.id, newStatus: dto.action };
  }

  // ─── Transactions ──────────────────────────────────────

  async listTransactions(dto: ListTransactionsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.status) {
      where.status = dto.status;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          externalId: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          _count: { select: { unlocks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total, take, skip: dto.skip ?? 0 };
  }

  // ─── Logs ──────────────────────────────────────────────

  async listLogs(dto: ListLogsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.action) {
      where.action = dto.action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        select: {
          id: true,
          action: true,
          targetId: true,
          details: true,
          createdAt: true,
          admin: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return { logs, total, take, skip: dto.skip ?? 0 };
  }

  // ─── Projects ────────────────────────────────────────

  async listProjects(dto: ListProjectsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.status) where.status = dto.status;
    if (dto.sector) where.sector = dto.sector;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { pitch: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        select: {
          id: true,
          name: true,
          sector: true,
          stage: true,
          status: true,
          qualityScore: true,
          createdAt: true,
          founder: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: {
              applications: true,
              userInteractions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    // Agréger les interactions par type pour chaque projet
    const projectIds = projects.map((p) => p.id);

    const interactionStats = projectIds.length > 0
      ? await this.prisma.userProjectInteraction.groupBy({
          by: ['projectId', 'action'],
          where: { projectId: { in: projectIds } },
          _count: true,
        })
      : [];

    // Construire un map projectId → { views, clicks, saves, shares }
    const statsMap: Record<string, { views: number; clicks: number; saves: number; shares: number }> = {};
    for (const projectId of projectIds) {
      statsMap[projectId] = { views: 0, clicks: 0, saves: 0, shares: 0 };
    }
    for (const row of interactionStats) {
      const s = statsMap[row.projectId];
      if (!s) continue;
      switch (row.action) {
        case 'VIEW': s.views = row._count; break;
        case 'CLICK': s.clicks = row._count; break;
        case 'SAVE': s.saves = row._count; break;
        case 'SHARE': s.shares = row._count; break;
      }
    }

    const enriched = projects.map((p) => ({
      ...p,
      interactions: statsMap[p.id] || { views: 0, clicks: 0, saves: 0, shares: 0 },
    }));

    return { projects: enriched, total, take, skip: dto.skip ?? 0 };
  }

  // ─── Archive / Restore Projects ────────────────────

  async archiveProject(adminId: string, projectId: string, dto: ArchiveProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, founderId: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status === 'REMOVED_BY_ADMIN') throw new BadRequestException('Projet déjà archivé');
    if (project.status !== 'PUBLISHED') throw new BadRequestException('Seuls les projets publiés peuvent être archivés');

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'REMOVED_BY_ADMIN' },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'ARCHIVE_PROJECT',
          targetId: projectId,
          details: { reason: dto.reason, projectName: project.name },
        },
      }),
    ]);

    this.logger.warn(`Project archived: projectId=${projectId} by adminId=${adminId}, reason="${dto.reason}"`);
    return { id: project.id, name: project.name, status: 'REMOVED_BY_ADMIN' as const, founderId: project.founderId };
  }

  async restoreProject(adminId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, founderId: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status !== 'REMOVED_BY_ADMIN') throw new BadRequestException('Seuls les projets archivés par admin peuvent être restaurés');

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'PUBLISHED' },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'RESTORE_PROJECT',
          targetId: projectId,
          details: { projectName: project.name },
        },
      }),
    ]);

    this.logger.log(`Project restored: projectId=${projectId} by adminId=${adminId}`);
    return { id: project.id, name: project.name, status: 'PUBLISHED' as const, founderId: project.founderId };
  }

  // ─── Push Config ────────────────────────────────────

  async getPushConfig() {
    let config = await this.prisma.pushConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await this.prisma.pushConfig.create({
        data: { id: 'singleton' },
      });
    }

    // Nombre de tokens enregistrés
    const tokenCount = await this.prisma.fcmToken.count();

    return { ...config, tokenCount };
  }

  async updatePushConfig(data: { enabled?: boolean; enabledTypes?: string[] }) {
    const updateData: any = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.enabledTypes) updateData.enabledTypes = data.enabledTypes;

    const config = await this.prisma.pushConfig.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData },
    });

    this.logger.log(`Push config updated: enabled=${config.enabled}, types=${config.enabledTypes.length}`);

    return config;
  }

  // ─── Email Config ────────────────────────────────────

  async getEmailConfig() {
    let config = await this.prisma.emailConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await this.prisma.emailConfig.create({
        data: { id: 'singleton' },
      });
    }

    const emailCount = await this.prisma.emailLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return { ...config, emailsSentLast24h: emailCount };
  }

  async updateEmailConfig(data: UpdateEmailConfigDto) {
    const config = await this.prisma.emailConfig.upsert({
      where: { id: 'singleton' },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.enabledTypes && { enabledTypes: data.enabledTypes }),
        ...(data.fromName && { fromName: data.fromName }),
        ...(data.fromEmail && { fromEmail: data.fromEmail }),
      },
      create: { id: 'singleton' },
    });

    this.logger.log('Email config updated');
    return config;
  }

  // ─── Pricing Plans CRUD ────────────────────────────

  async listPlans() {
    return this.prisma.pricingPlan.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto, adminId: string) {
    const plan = await this.prisma.pricingPlan.create({
      data: {
        name: dto.name,
        price: dto.price,
        period: dto.period ?? 'mois',
        currency: dto.currency ?? 'EUR',
        description: dto.description,
        features: dto.features,
        isPopular: dto.isPopular ?? false,
        isActive: dto.isActive ?? true,
        ctaLabel: dto.ctaLabel ?? 'Commencer',
        order: dto.order ?? 0,
      },
    });

    if (plan.isPopular) {
      await this.prisma.pricingPlan.updateMany({
        where: { id: { not: plan.id }, isPopular: true },
        data: { isPopular: false },
      });
    }

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_PLAN',
        targetId: plan.id,
        details: { name: plan.name, price: Number(plan.price) },
      },
    });

    this.logger.log(`Plan created: ${plan.name} (${plan.id})`);
    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto, adminId: string) {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    const plan = await this.prisma.pricingPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.isPopular !== undefined && { isPopular: dto.isPopular }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.ctaLabel !== undefined && { ctaLabel: dto.ctaLabel }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    if (dto.isPopular === true) {
      await this.prisma.pricingPlan.updateMany({
        where: { id: { not: id }, isPopular: true },
        data: { isPopular: false },
      });
    }

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_PLAN',
        targetId: id,
        details: { name: plan.name, changes: JSON.parse(JSON.stringify(dto)) },
      },
    });

    this.logger.log(`Plan updated: ${plan.name} (${id})`);
    return plan;
  }

  async deletePlan(id: string, adminId: string) {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    await this.prisma.pricingPlan.delete({ where: { id } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_PLAN',
        targetId: id,
        details: { name: existing.name },
      },
    });

    this.logger.log(`Plan deleted: ${existing.name} (${id})`);
    return { success: true };
  }

  async reorderPlans(dto: ReorderPlansDto, adminId: string) {
    await this.prisma.$transaction(
      dto.plans.map((item) =>
        this.prisma.pricingPlan.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'REORDER_PLANS',
        targetId: 'reorder',
        details: { plans: JSON.parse(JSON.stringify(dto.plans)) },
      },
    });

    this.logger.log('Plans reordered');
    return this.listPlans();
  }

  // ─── FAQ CRUD ────────────────────────────────────────

  async listFaqs() {
    return this.prisma.faq.findMany({ orderBy: { order: 'asc' } });
  }

  async createFaq(dto: CreateFaqDto, adminId: string) {
    const faq = await this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_FAQ',
        targetId: faq.id,
        details: { question: faq.question },
      },
    });

    this.logger.log(`FAQ created: ${faq.id}`);
    return faq;
  }

  async updateFaq(id: string, dto: UpdateFaqDto, adminId: string) {
    const existing = await this.prisma.faq.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FAQ not found');

    const faq = await this.prisma.faq.update({
      where: { id },
      data: {
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_FAQ',
        targetId: id,
        details: { question: faq.question, changes: JSON.parse(JSON.stringify(dto)) },
      },
    });

    this.logger.log(`FAQ updated: ${id}`);
    return faq;
  }

  async deleteFaq(id: string, adminId: string) {
    const existing = await this.prisma.faq.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FAQ not found');

    await this.prisma.faq.delete({ where: { id } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_FAQ',
        targetId: id,
        details: { question: existing.question },
      },
    });

    this.logger.log(`FAQ deleted: ${id}`);
    return { success: true };
  }

  async reorderFaqs(dto: ReorderFaqsDto, adminId: string) {
    await this.prisma.$transaction(
      dto.faqs.map((item) =>
        this.prisma.faq.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'REORDER_FAQS',
        targetId: 'reorder',
        details: { faqs: JSON.parse(JSON.stringify(dto.faqs)) },
      },
    });

    this.logger.log('FAQs reordered');
    return this.listFaqs();
  }

  // ─── Testimonials CRUD ───────────────────────────────

  async listTestimonials() {
    return this.prisma.testimonial.findMany({ orderBy: { order: 'asc' } });
  }

  async createTestimonial(dto: CreateTestimonialDto, adminId: string) {
    const testimonial = await this.prisma.testimonial.create({
      data: {
        name: dto.name,
        role: dto.role,
        location: dto.location,
        quote: dto.quote,
        imageUrl: dto.imageUrl ?? '',
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_TESTIMONIAL',
        targetId: testimonial.id,
        details: { name: testimonial.name },
      },
    });

    this.logger.log(`Testimonial created: ${testimonial.id}`);
    return testimonial;
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto, adminId: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');

    const testimonial = await this.prisma.testimonial.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.quote !== undefined && { quote: dto.quote }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_TESTIMONIAL',
        targetId: id,
        details: { name: testimonial.name, changes: JSON.parse(JSON.stringify(dto)) },
      },
    });

    this.logger.log(`Testimonial updated: ${id}`);
    return testimonial;
  }

  async deleteTestimonial(id: string, adminId: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');

    await this.prisma.testimonial.delete({ where: { id } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_TESTIMONIAL',
        targetId: id,
        details: { name: existing.name },
      },
    });

    this.logger.log(`Testimonial deleted: ${id}`);
    return { success: true };
  }

  async reorderTestimonials(dto: ReorderTestimonialsDto, adminId: string) {
    await this.prisma.$transaction(
      dto.testimonials.map((item) =>
        this.prisma.testimonial.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'REORDER_TESTIMONIALS',
        targetId: 'reorder',
        details: { testimonials: JSON.parse(JSON.stringify(dto.testimonials)) },
      },
    });

    this.logger.log('Testimonials reordered');
    return this.listTestimonials();
  }
}
