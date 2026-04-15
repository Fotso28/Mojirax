import { Injectable, Inject, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, UserPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../ai/ai.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
        private aiService: AiService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) { }

    async getUserIdAndPlan(firebaseUid: string): Promise<{ id: string; plan: UserPlan }> {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, plan: true },
        });
        if (!user) throw new NotFoundException('Utilisateur introuvable');
        return user;
    }

    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                phone: true,
                address: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                linkedinUrl: true,
                websiteUrl: true,
                githubUrl: true,
                portfolioUrl: true,
                skills: true,
                languages: true,
                certifications: true,
                yearsOfExperience: true,
                experience: true,
                education: true,
                isInvisible: true,
                createdAt: true,
                projects: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        status: true,
                        location: true,
                        createdAt: true,
                    },
                },
                candidateProfile: {
                    select: {
                        id: true,
                        shortPitch: true,
                        longPitch: true,
                        vision: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
                        locationPref: true,
                        desiredSectors: true,
                        remoteOnly: true,
                        resumeUrl: true,
                        hasCofounded: true,
                        availability: true,
                        qualityScore: true,
                        profileCompleteness: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
    }

    /**
     * Retourne le profil public d'un utilisateur.
     * IMPORTANT: Cette méthode retourne email/phone pour le masquage par PrivacyInterceptor.
     * Ne JAMAIS appeler depuis un endpoint sans @UseInterceptors(PrivacyInterceptor).
     */
    async findPublicProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
                phone: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                linkedinUrl: true,
                websiteUrl: true,
                githubUrl: true,
                portfolioUrl: true,
                skills: true,
                languages: true,
                certifications: true,
                yearsOfExperience: true,
                experience: true,
                education: true,
                candidateProfile: {
                    select: {
                        id: true,
                        shortPitch: true,
                        longPitch: true,
                        vision: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
                        locationPref: true,
                        desiredSectors: true,
                        remoteOnly: true,
                        resumeUrl: true,
                        hasCofounded: true,
                        availability: true,
                        qualityScore: true,
                        profileCompleteness: true,
                        status: true,
                        createdAt: true,
                    },
                },
                createdAt: true,
                projects: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        location: true,
                        lookingForRole: true,
                        collabType: true,
                        createdAt: true,
                        _count: { select: { applications: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur introuvable');
        }

        return user;
    }

    async toggleInvisible(firebaseUid: string, invisible: boolean) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { isInvisible: invisible },
            select: { isInvisible: true },
        });
    }

    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        const urlFields = ['linkedinUrl', 'websiteUrl', 'githubUrl', 'portfolioUrl'] as const;
        const data: Record<string, any> = { ...dto };
        for (const field of urlFields) {
            if (data[field] === '') data[field] = null;
        }
        if (data.phone === '') data.phone = null;

        return this.prisma.user.update({
            where: { firebaseUid },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                address: true,
                skills: true,
                languages: true,
                yearsOfExperience: true,
            },
        });
    }

    async saveOnboardingState(firebaseUid: string, state: any) {
        // Protection JSON bomb (max 100KB)
        const jsonSize = JSON.stringify(state).length;
        if (jsonSize > 100_000) {
            throw new BadRequestException('Données d\'onboarding trop volumineuses (max 100KB)');
        }

        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                onboardingState: state
            },
            select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
        });
    }

    async getOnboardingState(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { onboardingState: true }
        });
        return user?.onboardingState || {};
    }

    async saveProjectDraft(firebaseUid: string, draft: any) {
        // Protection JSON bomb (max 100KB)
        const jsonSize = JSON.stringify(draft).length;
        if (jsonSize > 100_000) {
            throw new BadRequestException('Brouillon de projet trop volumineux (max 100KB)');
        }

        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                projectDraft: draft
            },
            select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
        });
    }

    async getProjectDraft(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { projectDraft: true }
        });
        return user?.projectDraft || {};
    }

    async clearProjectDraft(firebaseUid: string) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { projectDraft: Prisma.JsonNull },
            select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
        });
    }

    async updateAvatar(firebaseUid: string, buffer: Buffer) {
        const user = await this.prisma.user.findUnique({ where: { firebaseUid } });
        if (!user) throw new NotFoundException('User not found');

        // Delete old avatar from S3 if it's a MinIO URL
        if (user.image?.includes('/avatars/')) {
            const key = user.image.split('/').slice(-2).join('/');
            await this.uploadService.deleteFile(key);
        }

        const imageUrl = await this.uploadService.uploadAvatar(user.id, buffer);

        return this.prisma.user.update({
            where: { firebaseUid },
            data: { image: imageUrl },
            select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
        });
    }

    /**
     * Crée un CandidateProfile à partir des données du wizard d'onboarding.
     */
    async createCandidateProfile(firebaseUid: string, dto: CreateCandidateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, candidateProfile: { select: { id: true } } },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        if (user.candidateProfile) {
            throw new ConflictException('Vous avez déjà un profil candidat');
        }

        const profile = await this.prisma.candidateProfile.create({
            data: {
                userId: user.id,
                shortPitch: dto.shortPitch || null,
                longPitch: dto.longPitch || null,
                vision: dto.vision || null,
                roleType: dto.roleType || null,
                commitmentType: dto.commitmentType || null,
                collabPref: dto.collabPref || null,
                locationPref: dto.locationPref || null,
                hasCofounded: dto.hasCofounded ?? null,
                availability: dto.availability || null,
                desiredSectors: dto.projectPref?.length ? dto.projectPref : [],
                remoteOnly: dto.locationPref === 'REMOTE',
                resumeUrl: dto.resumeUrl || null,
                status: 'ANALYZING',
            },
            select: { id: true, status: true },
        });

        // Effacer le brouillon
        await this.prisma.user.update({
            where: { firebaseUid },
            data: { projectDraft: Prisma.JsonNull },
        });

        this.logger.log(`Candidate profile created: ${profile.id} for user ${user.id}`);

        return profile;
    }

    /**
     * Met à jour un CandidateProfile existant et relance la modération.
     */
    async updateCandidateProfile(firebaseUid: string, dto: CreateCandidateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, candidateProfile: { select: { id: true } } },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        if (!user.candidateProfile) {
            throw new NotFoundException('Profil candidat introuvable');
        }

        const updateData: Record<string, any> = { status: 'ANALYZING' };

        if (dto.shortPitch !== undefined) updateData.shortPitch = dto.shortPitch || null;
        if (dto.longPitch !== undefined) updateData.longPitch = dto.longPitch || null;
        if (dto.vision !== undefined) updateData.vision = dto.vision || null;
        if (dto.roleType !== undefined) updateData.roleType = dto.roleType || null;
        if (dto.commitmentType !== undefined) updateData.commitmentType = dto.commitmentType || null;
        if (dto.collabPref !== undefined) updateData.collabPref = dto.collabPref || null;
        if (dto.locationPref !== undefined) {
            updateData.remoteOnly = dto.locationPref === 'REMOTE';
            updateData.locationPref = dto.locationPref || null;
        }
        if (dto.hasCofounded !== undefined) updateData.hasCofounded = dto.hasCofounded ?? null;
        if (dto.availability !== undefined) updateData.availability = dto.availability || null;
        if (dto.projectPref !== undefined) updateData.desiredSectors = dto.projectPref?.length ? dto.projectPref : [];
        if (dto.resumeUrl !== undefined) updateData.resumeUrl = dto.resumeUrl || null;

        const profile = await this.prisma.candidateProfile.update({
            where: { id: user.candidateProfile.id },
            data: updateData,
            select: { id: true, status: true },
        });

        this.logger.log(`Candidate profile updated: ${profile.id} → ANALYZING`);

        return profile;
    }

    async getCandidatesFeed(
        firebaseUid: string | null,
        cursor: string | null,
        limit: number = 7,
        filters?: { city?: string; skills?: string[]; sector?: string },
    ) {
        const take = Math.min(limit, 20);

        // Build user filter as single object to avoid spread overwrite
        const userFilter: Record<string, any> = {};
        if (filters?.city) {
            userFilter.city = { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode };
        }
        if (filters?.skills && filters.skills.length > 0) {
            userFilter.skills = { hasSome: filters.skills };
        }

        const where: Prisma.CandidateProfileWhereInput = {
            status: 'PUBLISHED',
            ...(Object.keys(userFilter).length > 0 ? { user: userFilter } : {}),
            ...(filters?.sector ? {
                desiredSectors: { has: filters.sector }
            } : {}),
        };

        // Fetch a larger pool for smart ranking (3x requested to allow good sort)
        const poolSize = Math.min(take * 3, 60);
        const candidates = await this.prisma.candidateProfile.findMany({
            where,
            take: poolSize + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            select: {
                id: true,
                availability: true,
                shortPitch: true,
                roleType: true,
                commitmentType: true,
                collabPref: true,
                locationPref: true,
                desiredSectors: true,
                remoteOnly: true,
                qualityScore: true,
                profileCompleteness: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        title: true,
                        bio: true,
                        skills: true,
                        city: true,
                        yearsOfExperience: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        if (candidates.length === 0) {
            return { candidates: [], nextCursor: null };
        }

        // Smart ranking: qualityScore * 0.6 + activityScore * 0.4
        // activityScore = candidatures envoyées (30j) normalisées sur 0-100
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const candidateIds = candidates.map(c => c.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: candidateIds }, createdAt: { gte: thirtyDaysAgo } },
            _count: true,
        });

        const appMap = new Map(applicationCounts.map(a => [a.candidateId, a._count]));

        const scored = candidates.map(c => {
            const apps = appMap.get(c.id) ?? 0;
            const activityScore = Math.min(apps / 5, 1) * 100;
            const feedScore = (c.qualityScore ?? 50) * 0.6 + activityScore * 0.4;
            return { ...c, _feedScore: feedScore };
        });

        scored.sort((a, b) => b._feedScore - a._feedScore);

        // Paginate from sorted results
        const page = scored.slice(0, take);
        const nextCursor = scored.length > take ? scored[take].id : null;

        // Strip internal _feedScore before returning
        const result = page.map(({ _feedScore, ...rest }) => rest);

        return { candidates: result, nextCursor };
    }

    /**
     * Generate bio + skills embeddings for a candidate profile (non-blocking).
     */
    async generateCandidateEmbeddings(candidateProfileId: string) {
        const profile = await this.prisma.candidateProfile.findUnique({
            where: { id: candidateProfileId },
            select: {
                user: { select: { title: true, bio: true, skills: true } },
            },
        });
        if (!profile) return;

        // Bio embedding
        const bioText = [profile.user.title, profile.user.bio].filter(Boolean).join(' ');
        if (bioText.length >= 10) {
            const bioEmbedding = await this.aiService.getEmbedding(bioText);
            const bioVector = `[${bioEmbedding.join(',')}]`;
            const embeddingModel = this.aiService.getEmbeddingModel();
            await this.prisma.$executeRaw`
                UPDATE candidate_profiles
                SET bio_embedding = ${bioVector}::vector,
                    embedding_model = ${embeddingModel},
                    last_embedded_at = NOW()
                WHERE id = ${candidateProfileId}
            `;
        }

        // Skills embedding
        if (profile.user.skills.length > 0) {
            const skillsText = profile.user.skills.join(', ');
            const skillsEmbedding = await this.aiService.getEmbedding(skillsText);
            const skillsVector = `[${skillsEmbedding.join(',')}]`;
            await this.prisma.$executeRaw`
                UPDATE candidate_profiles
                SET skills_embedding = ${skillsVector}::vector
                WHERE id = ${candidateProfileId}
            `;
        }

        this.logger.log(`Embeddings generated for candidate ${candidateProfileId}`);
    }

    // ─── Trending Candidates ───────────────────────────
    /**
     * Top 5 candidats publiés classés par score composite :
     * qualité (40%) + récence (30%) + vues profil (30%)
     */
    async getTrendingCandidates() {
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        const candidates = await this.prisma.candidateProfile.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                id: true,
                qualityScore: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true, title: true, skills: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        if (candidates.length === 0) return [];

        // Compter les vues de profil (interactions VIEW sur les projets des candidats n'existe pas
        // mais on peut compter les applications reçues ou vues du profil via SearchLog clickedResultId)
        // Pour l'instant, on utilise le nombre d'applications reçues comme proxy de popularité
        const candidateProfileIds = candidates.map((c) => c.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: candidateProfileIds } },
            _count: true,
        });

        const appMap = new Map(applicationCounts.map((a) => [a.candidateId, a._count]));
        const maxApps = Math.max(1, ...applicationCounts.map((a) => a._count));

        const scored = candidates.map((c) => {
            const qualityNorm = (c.qualityScore || 0) / 100;
            const ageMs = now - new Date(c.createdAt).getTime();
            const freshnessNorm = Math.max(0, 1 - ageMs / thirtyDaysMs);
            const popularityNorm = (appMap.get(c.id) || 0) / maxApps;

            const score = qualityNorm * 0.4 + freshnessNorm * 0.3 + popularityNorm * 0.3;

            return {
                id: c.id,
                userId: c.user.id,
                name: c.user.name,
                image: c.user.image,
                title: c.user.title,
                skills: c.user.skills?.slice(0, 3) || [],
                qualityScore: c.qualityScore,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, 5);
    }

    /**
     * Top 10 candidats les plus actifs de la semaine.
     * Cached Redis 1h. Gated PRO+ côté controller.
     */
    async getTopActiveCandidates(limit = 10) {
        const take = Math.min(limit, 10);
        const cacheKey = 'top_active_candidates';

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            this.logger.debug('Top active candidates served from cache');
            return JSON.parse(cached);
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Candidats avec le plus de candidatures cette semaine
        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { createdAt: { gte: sevenDaysAgo } },
            _count: true,
            orderBy: { _count: { candidateId: 'desc' } },
            take: 50,
        });

        if (applicationCounts.length === 0) return [];

        const activeCandidateIds = applicationCounts.map(a => a.candidateId);

        const candidates = await this.prisma.candidateProfile.findMany({
            where: {
                status: 'PUBLISHED',
                id: { in: activeCandidateIds },
            },
            select: {
                id: true,
                shortPitch: true,
                roleType: true,
                qualityScore: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        title: true,
                        skills: true,
                        city: true,
                    },
                },
            },
        });

        const appMap = new Map(applicationCounts.map(a => [a.candidateId, a._count]));
        const scored = candidates.map(c => ({
            ...c,
            weeklyActivity: (appMap.get(c.id) ?? 0) * 3,
        }));
        scored.sort((a, b) => b.weeklyActivity - a.weeklyActivity);

        const result = scored.slice(0, take);

        try {
            await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
            this.logger.log(`Top active candidates cached (${result.length} results)`);
        } catch (e) {
            this.logger.warn(`Failed to cache top active candidates: ${(e as Error).message}`);
        }

        return result;
    }
}
