import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../ai/ai.service';
import { ModerationService } from '../moderation/moderation.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { MatchingService } from '../matching/matching.service';
import { FiltersService } from '../filters/filters.service';
import { I18nService, Locale } from '../i18n/i18n.service';

function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')     // Non-alphanumeric → dash
        .replace(/^-+|-+$/g, '')          // Trim leading/trailing dashes
        .substring(0, 60);                // Limit length
}

function generateSlug(name: string): string {
    const base = slugify(name);
    const suffix = Math.random().toString(36).substring(2, 6); // 4 random chars
    return `${base}-${suffix}`;
}

interface ScoredProject {
    project: any;
    score: number;
    breakdown: {
        explicit: number;
        implicit: number;
        quality: number;
    };
}

@Injectable()
export class ProjectsService {
    private readonly logger = new Logger(ProjectsService.name);

    constructor(
        private prisma: PrismaService,
        private interactionsService: InteractionsService,
        private uploadService: UploadService,
        private aiService: AiService,
        private matchingService: MatchingService,
        private moderationService: ModerationService,
        private filtersService: FiltersService,
        private i18n: I18nService,
    ) { }

    // =============================================
    // FEED : Algorithme de recommandation
    // =============================================

    async getFeed(
        firebaseUid: string | null,
        cursor: string | null,
        limit: number = 7,
        filters?: { city?: string; skills?: string[]; sector?: string }
    ) {
        // 1. Get user context (if authenticated)
        let user: any = null;
        let candidateProfile: any = null;
        let userSignals: any = null;

        if (firebaseUid) {
            user = await this.prisma.user.findUnique({
                where: { firebaseUid },
                include: { candidateProfile: true }
            });
            candidateProfile = user?.candidateProfile
                ? { ...user.candidateProfile, skills: user.skills, city: user.city, country: user.country }
                : null;

            if (user) {
                userSignals = await this.interactionsService.getUserSignals(user.id);
            }
        }

        // 2. PASSE 1 — Retrieval: fetch candidate projects
        const excludeIds: string[] = [];

        // Exclude user's own projects
        if (user) {
            const ownProjects = await this.prisma.project.findMany({
                where: { founderId: user.id },
                select: { id: true }
            });
            excludeIds.push(...ownProjects.map(p => p.id));
        }

        // Semantic skill matching: try vector search, fallback to exact
        let semanticProjectIds: string[] | null = null;

        if (filters?.skills && filters.skills.length > 0) {
            const allSemanticIds = new Set<string>();
            let hasSemanticMatch = false;

            for (const skill of filters.skills) {
                const skillEmbedding = await this.filtersService.getSkillEmbedding(skill);
                if (!skillEmbedding) continue;

                hasSemanticMatch = true;
                const vectorString = `[${skillEmbedding.join(',')}]`;
                const matches: any[] = await this.prisma.$queryRaw`
                    SELECT id FROM projects
                    WHERE status = 'PUBLISHED'
                      AND description_embedding IS NOT NULL
                      AND 1 - (description_embedding <=> ${vectorString}::vector) > 0.65
                `;
                for (const m of matches) allSemanticIds.add(m.id);
            }

            if (hasSemanticMatch) {
                // Fallback exact pour projets sans embedding
                const exactMatches: any[] = await this.prisma.$queryRaw`
                    SELECT id FROM projects
                    WHERE status = 'PUBLISHED'
                      AND description_embedding IS NULL
                      AND required_skills && ${filters.skills}::text[]
                `;
                for (const m of exactMatches) allSemanticIds.add(m.id);
                semanticProjectIds = [...allSemanticIds];
            }
        }

        const projects = await this.prisma.project.findMany({
            where: {
                ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
                status: 'PUBLISHED',
                ...(filters?.sector ? { sector: { equals: filters.sector, mode: 'insensitive' as Prisma.QueryMode } } : {}),
                ...(filters?.city ? { city: { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode } } : {}),
                // Skills : sémantique si dispo, sinon exact
                ...(semanticProjectIds !== null
                    ? { id: { in: semanticProjectIds } }
                    : filters?.skills && filters.skills.length > 0
                        ? { requiredSkills: { hasSome: filters.skills } }
                        : {}
                ),
            },
            distinct: ['id'],
            include: {
                founder: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        plan: true,
                    }
                },
                _count: {
                    select: { applications: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // 3. PASSE 2 — Scoring
        const scored: ScoredProject[] = projects.map(project => {
            const explicit = this.scoreExplicit(project, candidateProfile);
            const implicit = this.scoreImplicit(project, userSignals);
            const quality = this.scoreQuality(project);

            // Weighted: explicit 30%, implicit 50%, quality 20%
            // If no user signals, rebalance: explicit 50%, quality 50%
            let score: number;
            if (userSignals && Object.keys(userSignals.sectorEngagement).length > 0) {
                score = (explicit * 0.30) + (implicit * 0.50) + (quality * 0.20);
            } else if (candidateProfile) {
                score = (explicit * 0.60) + (quality * 0.40);
            } else {
                // No profile, no signals → pure quality + freshness
                score = quality;
            }

            // Penalty: already viewed → slight penalty to promote discovery
            if (userSignals?.viewedProjectIds?.has(project.id)) {
                score *= 0.7;
            }

            return {
                project,
                score,
                breakdown: { explicit, implicit, quality }
            };
        });

        // 4. Sort by score DESC
        scored.sort((a, b) => b.score - a.score);

        // 5. Cursor-based pagination
        let startIndex = 0;
        if (cursor) {
            const cursorIndex = scored.findIndex(s => s.project.id === cursor);
            if (cursorIndex !== -1) {
                startIndex = cursorIndex + 1;
            }
        }

        const page = scored.slice(startIndex, startIndex + limit);
        const nextCursor = page.length === limit ? page[page.length - 1].project.id : null;

        return {
            projects: page.map(s => ({
                ...s.project,
                _score: s.score,
                _breakdown: s.breakdown,
            })),
            nextCursor,
            total: scored.length,
        };
    }

    // =============================================
    // SCORING — Couche Explicite (profil déclaré)
    // =============================================

    private scoreExplicit(project: any, profile: any): number {
        if (!profile) return 0;

        let score = 0;
        const maxScore = 30;

        // A. Sector match (0-10)
        if (project.sector && profile.desiredSectors?.length > 0) {
            const sectorMatch = profile.desiredSectors.some(
                (s: string) => s.toUpperCase() === project.sector?.toUpperCase()
            );
            if (sectorMatch) score += 10;
        }

        // B. Skills match (0-8) — % intersection
        if (project.requiredSkills?.length > 0 && profile.skills?.length > 0) {
            const projectSkills = new Set(project.requiredSkills.map((s: string) => s.toLowerCase()));
            const matchCount = profile.skills.filter(
                (s: string) => projectSkills.has(s.toLowerCase())
            ).length;
            const ratio = matchCount / project.requiredSkills.length;
            score += Math.round(ratio * 8);
        }

        // C. Location match (0-5)
        if (project.location && profile.desiredLocation?.length > 0) {
            const locationMatch = profile.desiredLocation.some(
                (loc: string) => project.location?.toLowerCase().includes(loc.toLowerCase())
            );
            if (locationMatch) score += 5;
        }
        // Bonus: remote match
        if (profile.remoteOnly && project.isRemote) {
            score += 3;
        }

        // D. Stage match (0-4)
        if (project.stage && profile.desiredStage?.length > 0) {
            const stageMatch = profile.desiredStage.some(
                (s: string) => s.toUpperCase() === project.stage?.toUpperCase()
            );
            if (stageMatch) score += 4;
        }

        // Normalize to 0-100 scale
        return (score / maxScore) * 100;
    }

    // =============================================
    // SCORING — Couche Implicite (comportement)
    // =============================================

    private scoreImplicit(project: any, signals: any): number {
        if (!signals) return 0;

        let score = 0;
        const maxScore = 50;

        // A. Sector engagement (0-15)
        if (project.sector && signals.sectorEngagement[project.sector]) {
            const engagement = signals.sectorEngagement[project.sector];
            // Normalize: cap at 30 engagement points → 15 score points
            score += Math.min(15, Math.round((engagement / 30) * 15));
        }

        // B. Stage engagement (0-10)
        if (project.stage && signals.stageEngagement[project.stage]) {
            const engagement = signals.stageEngagement[project.stage];
            score += Math.min(10, Math.round((engagement / 20) * 10));
        }

        // C. Role engagement (0-10)
        if (project.lookingForRole && signals.roleEngagement[project.lookingForRole]) {
            const engagement = signals.roleEngagement[project.lookingForRole];
            score += Math.min(10, Math.round((engagement / 20) * 10));
        }

        // D. Saved similar projects bonus (0-10)
        // If user saved projects in same sector, boost
        if (project.sector && signals.savedProjectIds?.size > 0) {
            // We already factored saves into sectorEngagement, add small extra
            score += Math.min(5, signals.savedProjectIds.size * 2);
        }

        // E. Diversity bonus (0-5) — promote unseen sectors
        if (project.sector && !signals.sectorEngagement[project.sector]) {
            score += 5; // Explore something new
        }

        // Normalize to 0-100 scale
        return (score / maxScore) * 100;
    }

    // =============================================
    // SCORING — Couche Qualité (contenu)
    // =============================================

    private scoreQuality(project: any): number {
        let score = 0;
        const maxScore = 20;

        // A. Completeness (0-5) — how many key fields are filled
        const keyFields = [
            project.pitch, project.problem, project.solutionDesc,
            project.uvp, project.sector, project.stage,
            project.lookingForRole, project.collabType, project.vision,
            project.target, project.businessModel,
        ];
        const filled = keyFields.filter(Boolean).length;
        score += Math.round((filled / keyFields.length) * 5);

        // B. Freshness (0-5) — newer = better
        const ageInDays = (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 3) score += 5;
        else if (ageInDays < 7) score += 4;
        else if (ageInDays < 14) score += 3;
        else if (ageInDays < 30) score += 2;
        else score += 1;

        // C. Urgency (0-3)
        if (project.isUrgent) score += 3;

        // D. Social proof (0-4) — applications received
        const appCount = project._count?.applications ?? 0;
        if (appCount >= 5) score += 4;
        else if (appCount >= 3) score += 3;
        else if (appCount >= 1) score += 2;

        // E. Diversity / Cold start boost (0-3)
        // Projects with 0 applications get a boost (need visibility)
        if (appCount === 0) score += 3;

        // Normalize to 0-100 scale
        return (score / maxScore) * 100;
    }

    // =============================================
    // ARCHIVAL — Single published project per founder
    // =============================================

    /**
     * Archive all PUBLISHED projects for a founder: set them to DRAFT,
     * reject pending applications, and notify affected candidates.
     * Must be called within a Prisma transaction.
     * @returns Number of projects archived
     */
    async archivePublishedProjects(
        tx: Prisma.TransactionClient,
        founderId: string,
        locale: Locale = 'fr',
    ): Promise<number> {
        const publishedProjects = await tx.project.findMany({
            where: { founderId, status: 'PUBLISHED' },
            select: { id: true, name: true },
        });

        if (publishedProjects.length === 0) return 0;

        const publishedIds = publishedProjects.map(p => p.id);

        // Set all published projects to DRAFT
        await tx.project.updateMany({
            where: { id: { in: publishedIds } },
            data: { status: 'DRAFT' },
        });

        // Find all PENDING applications on those projects
        const pendingApplications = await tx.application.findMany({
            where: {
                projectId: { in: publishedIds },
                status: 'PENDING',
            },
            include: {
                project: { select: { name: true } },
                candidate: {
                    select: {
                        user: { select: { id: true } },
                    },
                },
            },
        });

        if (pendingApplications.length > 0) {
            // Reject all pending applications
            await tx.application.updateMany({
                where: {
                    projectId: { in: publishedIds },
                    status: 'PENDING',
                },
                data: { status: 'REJECTED' },
            });

            // Create notifications for each affected candidate
            const notifications = pendingApplications.map(app => ({
                userId: app.candidate.user.id,
                type: 'SYSTEM' as const,
                title: this.i18n.t('notification.project_archived_title', locale),
                message: this.i18n.t('notification.project_archived_message', locale, { projectName: app.project.name }),
                data: { applicationId: app.id, projectId: app.projectId },
            }));

            await tx.notification.createMany({ data: notifications });

            this.logger.log(`Archived ${publishedProjects.length} projects and rejected ${pendingApplications.length} pending applications for founder ${founderId}`);
        } else {
            this.logger.log(`Archived ${publishedProjects.length} projects (no pending applications) for founder ${founderId}`);
        }

        return publishedProjects.length;
    }

    // =============================================
    // CRUD
    // =============================================

    async create(founderUid: string, dto: CreateProjectDto, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid }
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        if (!dto.name || !dto.pitch) {
            throw new BadRequestException(this.i18n.t('project.name_pitch_required', locale));
        }

        const project = await this.prisma.$transaction(async (tx) => {
            // One-project-per-founder: archive existing PUBLISHED projects
            await this.archivePublishedProjects(tx, user.id, locale);

            // Create the new project
            return tx.project.create({
                data: {
                    founder: { connect: { id: user.id } },
                    name: dto.name,
                    slug: generateSlug(dto.name),
                    pitch: dto.pitch,
                    country: dto.country,
                    city: dto.city,
                    location: dto.location,
                    scope: dto.scope,
                    sector: dto.sector,
                    stage: dto.stage,
                    problem: dto.problem,
                    target: dto.target,
                    solutionCurrent: dto.solution_current,
                    solutionDesc: dto.solution_desc,
                    uvp: dto.uvp,
                    antiScope: dto.anti_scope,
                    marketType: dto.market_type,
                    businessModel: dto.business_model,
                    competitors: dto.competitors,
                    founderRole: dto.founder_role,
                    timeAvailability: dto.time_availability,
                    traction: dto.traction,
                    lookingForRole: dto.looking_for_role,
                    collabType: dto.collab_type,
                    vision: dto.vision,
                    description: dto.description,
                    requiredSkills: dto.requiredSkills || [],
                    status: 'PENDING_AI',
                },
            });
        });

        await this.prisma.user.update({
            where: { id: user.id },
            data: { projectDraft: Prisma.JsonNull }
        });

        // Generate embedding asynchronously (non-blocking)
        this.generateProjectEmbedding(project.id, dto).catch(err =>
            this.logger.warn(`Embedding generation failed for project ${project.id}: ${err.message}`)
        );

        // Moderation IA asynchrone (fire-and-forget)
        this.moderationService.moderateProject(project.id).then(() => {
            // Si le projet est publie apres moderation, calculer les match scores
            this.matchingService.calculateForProject(project.id).catch(err =>
                this.logger.warn(`Match scores failed for project ${project.id}: ${err.message}`)
            );
        }).catch(err =>
            this.logger.warn(`Moderation failed for project ${project.id}: ${err.message}`)
        );

        return project;
    }

    /**
     * Create a project with a specific initial status (used for document-based creation).
     * Only stores minimal fields — the rest will be filled by async AI analysis.
     */
    async createWithStatus(
        founderUid: string,
        data: { name: string; pitch: string; country?: string; city?: string; location?: string },
        status: string,
        locale: Locale = 'fr',
    ) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid },
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        const project = await this.prisma.$transaction(async (tx) => {
            // Only archive existing PUBLISHED projects if the new one will be published immediately
            // For ANALYZING status (document-based flow), archival happens later when analysis completes
            if (status === 'PUBLISHED') {
                await this.archivePublishedProjects(tx, user.id, locale);
            }

            return tx.project.create({
                data: {
                    founder: { connect: { id: user.id } },
                    name: data.name,
                    slug: generateSlug(data.name),
                    pitch: data.pitch,
                    country: data.country,
                    city: data.city,
                    location: data.location,
                    status: status as any,
                },
            });
        });

        await this.prisma.user.update({
            where: { id: user.id },
            data: { projectDraft: Prisma.JsonNull },
        });

        this.logger.log(`Project ${project.id} created with status ${status}`);
        return project;
    }

    async findOne(idOrSlug: string, locale: Locale = 'fr') {
        // Try by slug first, then fall back to id
        const project = await this.prisma.project.findFirst({
            where: {
                OR: [
                    { slug: idOrSlug },
                    { id: idOrSlug },
                ],
            },
            include: {
                founder: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        plan: true,
                        title: true,
                        bio: true,
                        country: true,
                        city: true,
                        linkedinUrl: true,
                        websiteUrl: true,
                        skills: true,
                        languages: true,
                        yearsOfExperience: true,
                        experience: true,
                        education: true,
                        createdAt: true,
                    }
                },
                _count: {
                    select: { applications: true }
                }
            }
        });

        if (!project) {
            throw new NotFoundException(this.i18n.t('project.not_found', locale));
        }

        return project;
    }

    async findAll(take: number = 20, skip: number = 0) {
        const limit = Math.min(take, 100);
        return this.prisma.project.findMany({
            take: limit,
            skip,
            where: { status: 'PUBLISHED' },
            include: {
                founder: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        plan: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async generateProjectEmbedding(projectId: string, dto: CreateProjectDto) {
        const text = [dto.name, dto.pitch, dto.problem, dto.solution_desc].filter(Boolean).join(' ');
        if (!text || text.length < 10) return;

        const embedding = await this.aiService.getEmbedding(text);
        const vectorString = `[${embedding.join(',')}]`;

        await this.prisma.$executeRaw`
            UPDATE projects
            SET description_embedding = ${vectorString}::vector,
                embedding_model = 'text-embedding-3-small',
                last_embedded_at = NOW()
            WHERE id = ${projectId}
        `;
        this.logger.log(`Embedding generated for project ${projectId}`);
    }

    async updateLogo(founderUid: string, projectId: string, buffer: Buffer, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid },
        });
        if (!user) throw new NotFoundException(this.i18n.t('user.not_found', locale));

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException(this.i18n.t('project.not_found', locale));
        if (project.founderId !== user.id) throw new ForbiddenException(this.i18n.t('project.not_owner', locale));

        if (!this.uploadService.isAvailable()) {
            this.logger.warn(`Logo upload skipped for project ${projectId}: storage service unavailable`);
            throw new ServiceUnavailableException(this.i18n.t('upload.storage_unavailable', locale));
        }

        try {
            const logoUrl = await this.uploadService.uploadProjectLogo(projectId, buffer);
            return this.prisma.project.update({
                where: { id: projectId },
                data: { logoUrl },
            });
        } catch (error) {
            this.logger.warn(`Logo upload failed for project ${projectId}: ${error.message}`);
            throw new ServiceUnavailableException(this.i18n.t('upload.storage_unavailable', locale));
        }
    }

    async update(firebaseUid: string, projectId: string, dto: UpdateProjectDto, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException(this.i18n.t('user.not_found', locale));

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException(this.i18n.t('project.not_found', locale));
        if (project.founderId !== user.id) throw new ForbiddenException(this.i18n.t('project.not_owner', locale));

        const data: Record<string, any> = {};

        if (dto.name !== undefined) {
            data.name = dto.name;
            data.slug = generateSlug(dto.name);
        }
        if (dto.pitch !== undefined) data.pitch = dto.pitch;
        if (dto.country !== undefined) data.country = dto.country;
        if (dto.city !== undefined) data.city = dto.city;
        if (dto.location !== undefined) data.location = dto.location;
        if (dto.scope !== undefined) data.scope = dto.scope;
        if (dto.sector !== undefined) data.sector = dto.sector;
        if (dto.stage !== undefined) data.stage = dto.stage;
        if (dto.problem !== undefined) data.problem = dto.problem;
        if (dto.target !== undefined) data.target = dto.target;
        if (dto.solution_current !== undefined) data.solutionCurrent = dto.solution_current;
        if (dto.solution_desc !== undefined) data.solutionDesc = dto.solution_desc;
        if (dto.uvp !== undefined) data.uvp = dto.uvp;
        if (dto.anti_scope !== undefined) data.antiScope = dto.anti_scope;
        if (dto.market_type !== undefined) data.marketType = dto.market_type;
        if (dto.business_model !== undefined) data.businessModel = dto.business_model;
        if (dto.competitors !== undefined) data.competitors = dto.competitors;
        if (dto.founder_role !== undefined) data.founderRole = dto.founder_role;
        if (dto.time_availability !== undefined) data.timeAvailability = dto.time_availability;
        if (dto.traction !== undefined) data.traction = dto.traction;
        if (dto.looking_for_role !== undefined) data.lookingForRole = dto.looking_for_role;
        if (dto.collab_type !== undefined) data.collabType = dto.collab_type;
        if (dto.vision !== undefined) data.vision = dto.vision;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.requiredSkills !== undefined) data.requiredSkills = dto.requiredSkills;

        const updated = await this.prisma.project.update({
            where: { id: projectId },
            data,
            select: {
                id: true,
                slug: true,
                name: true,
                pitch: true,
                status: true,
                sector: true,
                stage: true,
                updatedAt: true,
            },
        });

        this.logger.log(`Project ${projectId} updated by user ${user.id}`);
        return updated;
    }

    async remove(firebaseUid: string, projectId: string, locale: Locale = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException(this.i18n.t('user.not_found', locale));

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException(this.i18n.t('project.not_found', locale));
        if (project.founderId !== user.id) throw new ForbiddenException(this.i18n.t('project.not_owner', locale));

        // Log logo cleanup note (deleteProjectLogo not yet implemented on UploadService)
        if (project.logoUrl) {
            this.logger.warn(`Project ${projectId} has a logo that should be cleaned up: ${project.logoUrl}`);
        }

        await this.prisma.project.delete({ where: { id: projectId } });

        this.logger.log(`Project ${projectId} deleted by user ${user.id}`);
        return { deleted: true };
    }

    // ─── Trending ──────────────────────────────────────
    /**
     * Top 5 projets publiés classés par score composite :
     * qualité (40%) + récence (30%) + vues (30%)
     */
    async getTrending() {
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        // Projets publiés récents (< 60 jours) avec leur qualityScore
        const projects = await this.prisma.project.findMany({
            where: {
                status: 'PUBLISHED',
                createdAt: { gte: new Date(now - 60 * 24 * 60 * 60 * 1000) },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                sector: true,
                stage: true,
                logoUrl: true,
                qualityScore: true,
                createdAt: true,
                founder: {
                    select: { id: true, name: true, image: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        if (projects.length === 0) return [];

        // Compter les vues par projet
        const viewCounts = await this.prisma.userProjectInteraction.groupBy({
            by: ['projectId'],
            where: {
                projectId: { in: projects.map((p) => p.id) },
                action: 'VIEW',
            },
            _count: true,
        });

        const viewMap = new Map(viewCounts.map((v) => [v.projectId, v._count]));
        const maxViews = Math.max(1, ...viewCounts.map((v) => v._count));

        // Calculer le score composite
        const scored = projects.map((p) => {
            const qualityNorm = (p.qualityScore || 0) / 100; // 0-1
            const ageMs = now - new Date(p.createdAt).getTime();
            const freshnessNorm = Math.max(0, 1 - ageMs / thirtyDaysMs); // 1=nouveau, 0=vieux
            const viewsNorm = (viewMap.get(p.id) || 0) / maxViews; // 0-1

            const score = qualityNorm * 0.4 + freshnessNorm * 0.3 + viewsNorm * 0.3;

            return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                sector: p.sector,
                stage: p.stage,
                logoUrl: p.logoUrl,
                qualityScore: p.qualityScore,
                founder: p.founder,
                views: viewMap.get(p.id) || 0,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, 5);
    }
}
