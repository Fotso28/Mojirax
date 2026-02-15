import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { UploadService } from '../upload/upload.service';
import { CreateProjectDto } from './dto/create-project.dto';

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
    constructor(
        private prisma: PrismaService,
        private interactionsService: InteractionsService,
        private uploadService: UploadService,
    ) { }

    // =============================================
    // FEED : Algorithme de recommandation
    // =============================================

    async getFeed(firebaseUid: string | null, cursor: string | null, limit: number = 7) {
        // 1. Get user context (if authenticated)
        let user: any = null;
        let candidateProfile: any = null;
        let userSignals: any = null;

        if (firebaseUid) {
            user = await this.prisma.user.findUnique({
                where: { firebaseUid },
                include: { candidateProfile: true }
            });
            candidateProfile = user?.candidateProfile;

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

        const projects = await this.prisma.project.findMany({
            where: {
                ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
                status: { not: 'REJECTED' },
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
    // CRUD
    // =============================================

    async create(founderUid: string, dto: CreateProjectDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const project = await this.prisma.project.create({
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
            },
        });

        await this.prisma.user.update({
            where: { id: user.id },
            data: { projectDraft: Prisma.JsonNull }
        });

        return project;
    }

    async findOne(idOrSlug: string) {
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
                        email: true,
                    }
                },
                _count: {
                    select: { applications: true }
                }
            }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    async findAll() {
        return this.prisma.project.findMany({
            include: { founder: true }
        });
    }

    async updateLogo(founderUid: string, projectId: string, buffer: Buffer) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid },
        });
        if (!user) throw new NotFoundException('User not found');

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException('Project not found');
        if (project.founderId !== user.id) throw new ForbiddenException('Not your project');

        const logoUrl = await this.uploadService.uploadProjectLogo(projectId, buffer);

        return this.prisma.project.update({
            where: { id: projectId },
            data: { logoUrl },
        });
    }
}
