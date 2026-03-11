import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAdDto, UpdateAdDto, ListAdsDto, UpdateAdConfigDto,
  TrackAdEventDto, AdPlacementEnum,
} from './dto/ads.dto';

interface VisitorProfile {
  userId: string | null;
  role: string | null;
  sectors: string[];
  city: string | null;
  stage: string | null;
  skills: string[];
}

interface ScoredAdInternal {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaText: string | null;
  placement: string;
  score: number;
}

// Réponse publique sans le score interne
type ScoredAd = Omit<ScoredAdInternal, 'score'>;

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public : récupérer les pubs scorées ───────────────

  async getAdsForPlacement(
    placement: AdPlacementEnum,
    visitor: VisitorProfile,
    limit: number = 5,
  ): Promise<ScoredAd[]> {
    const now = new Date();

    // 1. Récupérer les pubs actives pour ce placement
    const ads = await this.prisma.ad.findMany({
      where: {
        placement,
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        linkUrl: true,
        ctaText: true,
        placement: true,
        priority: true,
        targetRoles: true,
        targetSectors: true,
        targetCities: true,
        targetStages: true,
        targetSkills: true,
        maxImpressionsPerUserPerDay: true,
        totalImpressions: true,
      },
    });

    if (ads.length === 0) return [];

    // 2. Frequency capping — compter les impressions aujourd'hui par user
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let userImpressions: Record<string, number> = {};

    if (visitor.userId) {
      const impressions = await this.prisma.adEvent.groupBy({
        by: ['adId'],
        where: {
          userId: visitor.userId,
          type: 'IMPRESSION',
          createdAt: { gte: todayStart },
          adId: { in: ads.map((a) => a.id) },
        },
        _count: true,
      });

      userImpressions = Object.fromEntries(
        impressions.map((i) => [i.adId, i._count]),
      );
    }

    // 3. Filtrer + scorer
    const scored: ScoredAdInternal[] = [];

    for (const ad of ads) {
      // Filtre rôle
      if (ad.targetRoles.length > 0 && visitor.role && !ad.targetRoles.includes(visitor.role)) {
        continue;
      }

      // Frequency capping
      if (visitor.userId) {
        const todayCount = userImpressions[ad.id] || 0;
        if (todayCount >= ad.maxImpressionsPerUserPerDay) {
          continue;
        }
      }

      // Scoring
      let score = 0;

      // Rôle matché
      if (ad.targetRoles.length > 0 && visitor.role && ad.targetRoles.includes(visitor.role)) {
        score += 20;
      }

      // Secteurs en commun
      if (ad.targetSectors.length > 0 && visitor.sectors.length > 0) {
        const matches = ad.targetSectors.filter((s) => visitor.sectors.includes(s));
        score += matches.length * 30;
      }

      // Ville matchée
      if (ad.targetCities.length > 0 && visitor.city && ad.targetCities.includes(visitor.city)) {
        score += 20;
      }

      // Stage matché
      if (ad.targetStages.length > 0 && visitor.stage && ad.targetStages.includes(visitor.stage)) {
        score += 15;
      }

      // Skills en commun
      if (ad.targetSkills.length > 0 && visitor.skills.length > 0) {
        const matches = ad.targetSkills.filter((s) => visitor.skills.includes(s));
        score += matches.length * 5;
      }

      // Priority multiplicateur
      score *= (ad.priority / 5); // priority 5 = ×1, priority 10 = ×2

      // Anti-fatigue bonus : moins d'impressions = bonus
      const avgImpressions = ads.reduce((sum, a) => sum + a.totalImpressions, 0) / ads.length;
      if (ad.totalImpressions < avgImpressions) {
        score += 10;
      }

      // Si aucun ciblage, score de base = priority
      if (score === 0) {
        score = ad.priority * 2;
      }

      scored.push({
        id: ad.id,
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl,
        ctaText: ad.ctaText,
        placement: ad.placement,
        score,
      });
    }

    // 4. Tri + randomize
    const config = await this.getConfig();

    let sorted: ScoredAdInternal[];
    if (config.feedRandomize && placement === 'FEED') {
      sorted = this.weightedShuffle(scored).slice(0, limit);
    } else {
      scored.sort((a, b) => b.score - a.score);
      sorted = scored.slice(0, limit);
    }

    // Strip le score interne avant de retourner
    return sorted.map(({ score, ...rest }) => rest);
  }

  async getFeedAds(visitor: VisitorProfile): Promise<{ ads: ScoredAd[]; insertEvery: number }> {
    const config = await this.getConfig();
    const ads = await this.getAdsForPlacement(AdPlacementEnum.FEED, visitor, 10);
    return { ads, insertEvery: config.feedInsertEvery };
  }

  async getSidebarAds(visitor: VisitorProfile): Promise<ScoredAd[]> {
    const config = await this.getConfig();
    return this.getAdsForPlacement(AdPlacementEnum.SIDEBAR, visitor, config.sidebarMaxAds);
  }

  async getBannerAd(visitor: VisitorProfile): Promise<ScoredAd | null> {
    const config = await this.getConfig();
    if (!config.bannerEnabled) return null;
    const ads = await this.getAdsForPlacement(AdPlacementEnum.BANNER, visitor, 1);
    return ads[0] || null;
  }

  async getSearchAds(visitor: VisitorProfile): Promise<{ ads: ScoredAd[]; insertPosition: number }> {
    const config = await this.getConfig();
    const ads = await this.getAdsForPlacement(AdPlacementEnum.SEARCH, visitor, 2);
    return { ads, insertPosition: config.searchInsertPosition };
  }

  // ─── Event tracking ────────────────────────────────────

  async trackEvent(dto: TrackAdEventDto, userId: string | null) {
    // Vérifier que la pub existe
    const ad = await this.prisma.ad.findUnique({
      where: { id: dto.adId },
      select: { id: true },
    });

    if (!ad) return;

    // Dédoublonnage impression : 1 par user/pub/5min
    if (dto.type === 'IMPRESSION' && userId) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = await this.prisma.adEvent.findFirst({
        where: {
          adId: dto.adId,
          userId,
          type: 'IMPRESSION',
          createdAt: { gte: fiveMinAgo },
        },
        select: { id: true },
      });
      if (recent) return;
    }

    // Créer l'event
    await this.prisma.adEvent.create({
      data: {
        adId: dto.adId,
        userId,
        type: dto.type as any,
        placement: dto.placement as any,
        position: dto.position,
        viewportMs: dto.viewportMs,
        source: dto.source,
      },
    });

    // Incrémenter les stats dénormalisées
    const field = dto.type === 'IMPRESSION' ? 'totalImpressions' : 'totalClicks';
    await this.prisma.ad.update({
      where: { id: dto.adId },
      data: { [field]: { increment: 1 } },
    });
  }

  // ─── Admin CRUD ────────────────────────────────────────

  async createAd(adminId: string, dto: CreateAdDto) {
    const ad = await this.prisma.ad.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        ctaText: dto.ctaText,
        placement: dto.placement as any,
        priority: dto.priority ?? 5,
        targetRoles: dto.targetRoles ?? [],
        targetSectors: dto.targetSectors ?? [],
        targetCities: dto.targetCities ?? [],
        targetStages: dto.targetStages ?? [],
        targetSkills: dto.targetSkills ?? [],
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        maxImpressionsPerUserPerDay: dto.maxImpressionsPerUserPerDay ?? 3,
      },
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_AD',
        targetId: ad.id,
        details: { title: ad.title, placement: ad.placement },
      },
    });

    this.logger.log(`Admin ${adminId} created ad ${ad.id} (${ad.placement})`);
    return ad;
  }

  async updateAd(adminId: string, adId: string, dto: UpdateAdDto) {
    const existing = await this.prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException('Publicité introuvable');

    // Mapping explicite des champs autorisés
    const data: Record<string, any> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.linkUrl !== undefined) data.linkUrl = dto.linkUrl;
    if (dto.ctaText !== undefined) data.ctaText = dto.ctaText;
    if (dto.placement !== undefined) data.placement = dto.placement;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.targetRoles !== undefined) data.targetRoles = dto.targetRoles;
    if (dto.targetSectors !== undefined) data.targetSectors = dto.targetSectors;
    if (dto.targetCities !== undefined) data.targetCities = dto.targetCities;
    if (dto.targetStages !== undefined) data.targetStages = dto.targetStages;
    if (dto.targetSkills !== undefined) data.targetSkills = dto.targetSkills;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxImpressionsPerUserPerDay !== undefined) data.maxImpressionsPerUserPerDay = dto.maxImpressionsPerUserPerDay;
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const ad = await this.prisma.ad.update({
      where: { id: adId },
      data,
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_AD',
        targetId: adId,
        details: { changes: Object.keys(dto) },
      },
    });

    this.logger.log(`Admin ${adminId} updated ad ${adId}`);
    return ad;
  }

  async deleteAd(adminId: string, adId: string) {
    const existing = await this.prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, title: true },
    });

    if (!existing) throw new NotFoundException('Publicité introuvable');

    await this.prisma.ad.delete({ where: { id: adId } });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_AD',
        targetId: adId,
        details: { title: existing.title },
      },
    });

    this.logger.log(`Admin ${adminId} deleted ad ${adId}`);
    return { success: true };
  }

  async listAds(dto: ListAdsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.placement) where.placement = dto.placement;
    if (dto.active === 'true') where.isActive = true;
    if (dto.active === 'false') where.isActive = false;

    const [ads, total] = await Promise.all([
      this.prisma.ad.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          linkUrl: true,
          ctaText: true,
          placement: true,
          priority: true,
          targetRoles: true,
          targetSectors: true,
          targetCities: true,
          targetStages: true,
          targetSkills: true,
          isActive: true,
          startDate: true,
          endDate: true,
          maxImpressionsPerUserPerDay: true,
          totalImpressions: true,
          totalClicks: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ad.count({ where }),
    ]);

    return { ads, total, take, skip: dto.skip ?? 0 };
  }

  // ─── Stats détaillées ──────────────────────────────────

  async getAdStats(adId: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        title: true,
        placement: true,
        totalImpressions: true,
        totalClicks: true,
        createdAt: true,
      },
    });

    if (!ad) throw new NotFoundException('Publicité introuvable');

    // CTR
    const ctr = ad.totalImpressions > 0
      ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2)
      : '0.00';

    // Stats par jour (7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dailyStats = await this.prisma.adEvent.groupBy({
      by: ['type'],
      where: {
        adId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    // Stats par placement
    const placementStats = await this.prisma.adEvent.groupBy({
      by: ['placement', 'type'],
      where: { adId },
      _count: true,
    });

    // Unique users
    const uniqueUsersResult = await this.prisma.adEvent.groupBy({
      by: ['userId'],
      where: { adId, userId: { not: null } },
      _count: true,
    });

    return {
      ad: {
        id: ad.id,
        title: ad.title,
        placement: ad.placement,
        createdAt: ad.createdAt,
      },
      metrics: {
        totalImpressions: ad.totalImpressions,
        totalClicks: ad.totalClicks,
        ctr: `${ctr}%`,
        uniqueUsers: uniqueUsersResult.length,
      },
      last7Days: dailyStats.map((s) => ({
        type: s.type,
        count: s._count,
      })),
      byPlacement: placementStats.map((s) => ({
        placement: s.placement,
        type: s.type,
        count: s._count,
      })),
    };
  }

  // ─── Config ────────────────────────────────────────────

  async getConfig() {
    const select = {
      id: true,
      feedInsertEvery: true,
      feedRandomize: true,
      sidebarMaxAds: true,
      bannerEnabled: true,
      searchInsertPosition: true,
    };

    let config = await this.prisma.adConfig.findUnique({
      where: { id: 'singleton' },
      select,
    });

    if (!config) {
      config = await this.prisma.adConfig.create({
        data: { id: 'singleton' },
        select,
      });
    }

    return config;
  }

  async updateConfig(adminId: string, dto: UpdateAdConfigDto) {
    const config = await this.prisma.adConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...dto },
      update: dto,
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_AD_CONFIG',
        targetId: 'ad_config',
        details: JSON.parse(JSON.stringify(dto)),
      },
    });

    this.logger.log(`Admin ${adminId} updated ad config`);
    return config;
  }

  // ─── Helpers ───────────────────────────────────────────

  /**
   * Construit le profil visiteur à partir du firebaseUid.
   */
  async buildVisitorProfile(firebaseUid: string | null): Promise<VisitorProfile> {
    if (!firebaseUid) {
      return { userId: null, role: null, sectors: [], city: null, stage: null, skills: [] };
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        role: true,
        candidateProfile: {
          select: {
            skills: true,
            location: true,
            desiredSectors: true,
          },
        },
        projects: {
          where: { status: 'PUBLISHED' },
          select: {
            sector: true,
            city: true,
            stage: true,
            requiredSkills: true,
          },
          take: 5,
        },
      },
    });

    if (!user) {
      return { userId: null, role: null, sectors: [], city: null, stage: null, skills: [] };
    }

    // Agréger les données du profil
    const sectors = new Set<string>();
    const skills = new Set<string>();
    let city: string | null = null;
    let stage: string | null = null;

    // Depuis le profil candidat
    if (user.candidateProfile) {
      user.candidateProfile.skills.forEach((s) => skills.add(s));
      user.candidateProfile.desiredSectors.forEach((s) => sectors.add(s));
      city = user.candidateProfile.location;
    }

    // Depuis les projets
    for (const p of user.projects) {
      if (p.sector) sectors.add(p.sector);
      if (p.city && !city) city = p.city;
      if (p.stage && !stage) stage = p.stage;
      p.requiredSkills.forEach((s) => skills.add(s));
    }

    return {
      userId: user.id,
      role: user.role,
      sectors: [...sectors],
      city,
      stage,
      skills: [...skills],
    };
  }

  /**
   * Shuffle pondéré : les items avec un score élevé ont plus de chances
   * d'être en haut, mais avec de la variance.
   */
  private weightedShuffle(items: ScoredAdInternal[]): ScoredAdInternal[] {
    const result: ScoredAdInternal[] = [];
    const pool = [...items];

    while (pool.length > 0) {
      const rand = Math.random() * pool.reduce((sum, i) => sum + Math.max(i.score, 1), 0);
      let cumulative = 0;

      for (let j = 0; j < pool.length; j++) {
        cumulative += Math.max(pool[j].score, 1);
        if (cumulative >= rand) {
          result.push(pool[j]);
          pool.splice(j, 1);
          break;
        }
      }
    }

    return result;
  }
}
