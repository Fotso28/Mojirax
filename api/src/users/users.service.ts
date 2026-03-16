import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../ai/ai.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
        private aiService: AiService,
    ) { }

    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
            include: {
                projects: true,
                candidateProfile: {
                    select: {
                        id: true,
                        title: true,
                        bio: true,
                        skills: true,
                        location: true,
                        yearsOfExperience: true,
                        availability: true,
                        shortPitch: true,
                        longPitch: true,
                        vision: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
                        locationPref: true,
                        desiredSectors: true,
                        remoteOnly: true,
                        linkedinUrl: true,
                        resumeUrl: true,
                        githubUrl: true,
                        portfolioUrl: true,
                        languages: true,
                        certifications: true,
                        hasCofounded: true,
                        qualityScore: true,
                        profileCompleteness: true,
                        status: true,
                        createdAt: true,
                    },
                },
            }
        });
    }

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
                founderProfile: true,
                candidateProfile: {
                    select: {
                        id: true,
                        title: true,
                        bio: true,
                        skills: true,
                        location: true,
                        yearsOfExperience: true,
                        availability: true,
                        shortPitch: true,
                        longPitch: true,
                        vision: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
                        locationPref: true,
                        desiredSectors: true,
                        remoteOnly: true,
                        linkedinUrl: true,
                        resumeUrl: true,
                        githubUrl: true,
                        portfolioUrl: true,
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

    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                ...dto,
            },
        });
    }

    async saveOnboardingState(firebaseUid: string, state: any) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                onboardingState: state
            }
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
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                projectDraft: draft
            }
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
            data: { projectDraft: Prisma.JsonNull }
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

        // Mapper les champs du DTO vers CandidateProfile
        const yearsMap: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '10+': 12 };

        const bio = [dto.shortPitch, dto.longPitch, dto.vision, dto.achievements]
            .filter(Boolean)
            .join('\n\n');

        const profile = await this.prisma.candidateProfile.create({
            data: {
                userId: user.id,
                title: dto.title,
                bio: bio || '',
                skills: dto.skills && dto.skills.length > 0 ? dto.skills : (dto.mainCompetence ? [dto.mainCompetence] : []),
                languages: dto.languages || [],
                certifications: dto.certifications || [],
                location: dto.location || null,
                linkedinUrl: dto.linkedinUrl || null,
                githubUrl: dto.githubUrl || null,
                portfolioUrl: dto.portfolioUrl || null,
                yearsOfExperience: dto.yearsExp ? (yearsMap[dto.yearsExp] ?? 0) : null,
                remoteOnly: dto.locationPref === 'REMOTE',
                desiredSectors: dto.projectPref ? [dto.projectPref] : [],
                availability: dto.availability || null,
                shortPitch: dto.shortPitch || null,
                longPitch: dto.longPitch || null,
                vision: dto.vision || null,
                roleType: dto.roleType || null,
                commitmentType: dto.commitmentType || null,
                collabPref: dto.collabPref || null,
                locationPref: dto.locationPref || null,
                hasCofounded: dto.hasCofounded || null,
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

        const yearsMap: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '10+': 12 };

        const updateData: Record<string, any> = { status: 'ANALYZING' };

        if (dto.title !== undefined) updateData.title = dto.title || '';
        if (dto.bio !== undefined) updateData.bio = dto.bio || '';
        if (dto.shortPitch || dto.longPitch || dto.vision || dto.achievements) {
            // Recalculate bio from pitch fields only if no explicit bio provided
            if (dto.bio === undefined) {
                updateData.bio = [dto.shortPitch, dto.longPitch, dto.vision, dto.achievements]
                    .filter(Boolean)
                    .join('\n\n');
            }
        }
        // Full skills array takes priority over legacy mainCompetence
        if (dto.skills !== undefined) {
            updateData.skills = dto.skills.length > 0 ? dto.skills : [];
        } else if (dto.mainCompetence) {
            updateData.skills = [dto.mainCompetence];
        }
        if (dto.languages !== undefined) updateData.languages = dto.languages;
        if (dto.certifications !== undefined) updateData.certifications = dto.certifications;
        if (dto.location !== undefined) updateData.location = dto.location || null;
        if (dto.linkedinUrl !== undefined) updateData.linkedinUrl = dto.linkedinUrl || null;
        if (dto.githubUrl !== undefined) updateData.githubUrl = dto.githubUrl || null;
        if (dto.portfolioUrl !== undefined) updateData.portfolioUrl = dto.portfolioUrl || null;
        if (dto.yearsExp !== undefined) updateData.yearsOfExperience = dto.yearsExp ? (yearsMap[dto.yearsExp] ?? 0) : null;
        if (dto.locationPref !== undefined) {
            updateData.remoteOnly = dto.locationPref === 'REMOTE';
            updateData.locationPref = dto.locationPref || null;
        }
        if (dto.projectPref !== undefined) updateData.desiredSectors = dto.projectPref ? [dto.projectPref] : [];
        if (dto.availability !== undefined) updateData.availability = dto.availability || null;
        // Wizard-sourced fields
        if (dto.shortPitch !== undefined) updateData.shortPitch = dto.shortPitch || null;
        if (dto.longPitch !== undefined) updateData.longPitch = dto.longPitch || null;
        if (dto.vision !== undefined) updateData.vision = dto.vision || null;
        if (dto.roleType !== undefined) updateData.roleType = dto.roleType || null;
        if (dto.commitmentType !== undefined) updateData.commitmentType = dto.commitmentType || null;
        if (dto.collabPref !== undefined) updateData.collabPref = dto.collabPref || null;
        if (dto.hasCofounded !== undefined) updateData.hasCofounded = dto.hasCofounded || null;

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

        const where: Prisma.CandidateProfileWhereInput = {
            status: 'PUBLISHED',
            ...(filters?.city ? {
                location: { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode }
            } : {}),
            ...(filters?.skills && filters.skills.length > 0 ? {
                skills: { hasSome: filters.skills }
            } : {}),
            ...(filters?.sector ? {
                desiredSectors: { has: filters.sector }
            } : {}),
        };

        const candidates = await this.prisma.candidateProfile.findMany({
            where,
            take: take + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            select: {
                id: true,
                title: true,
                bio: true,
                skills: true,
                location: true,
                yearsOfExperience: true,
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
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const nextCursor = candidates.length > take ? candidates[take].id : null;
        const page = candidates.slice(0, take);

        return {
            candidates: page,
            nextCursor,
        };
    }

    /**
     * Generate bio + skills embeddings for a candidate profile (non-blocking).
     */
    async generateCandidateEmbeddings(candidateProfileId: string) {
        const profile = await this.prisma.candidateProfile.findUnique({
            where: { id: candidateProfileId },
            select: { bio: true, skills: true, title: true },
        });
        if (!profile) return;

        // Bio embedding
        const bioText = [profile.title, profile.bio].filter(Boolean).join(' ');
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
        if (profile.skills.length > 0) {
            const skillsText = profile.skills.join(', ');
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
                title: true,
                skills: true,
                qualityScore: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        if (candidates.length === 0) return [];

        // Compter les vues de profil (interactions VIEW sur les projets des candidats n'existe pas
        // mais on peut compter les applications reçues ou vues du profil via SearchLog clickedResultId)
        // Pour l'instant, on utilise le nombre d'applications reçues comme proxy de popularité
        const userIds = candidates.map((c) => c.user.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: userIds } },
            _count: true,
        });

        const appMap = new Map(applicationCounts.map((a) => [a.candidateId, a._count]));
        const maxApps = Math.max(1, ...applicationCounts.map((a) => a._count));

        const scored = candidates.map((c) => {
            const qualityNorm = (c.qualityScore || 0) / 100;
            const ageMs = now - new Date(c.createdAt).getTime();
            const freshnessNorm = Math.max(0, 1 - ageMs / thirtyDaysMs);
            const popularityNorm = (appMap.get(c.user.id) || 0) / maxApps;

            const score = qualityNorm * 0.4 + freshnessNorm * 0.3 + popularityNorm * 0.3;

            return {
                id: c.id,
                userId: c.user.id,
                name: c.user.name,
                image: c.user.image,
                title: c.title,
                skills: c.skills?.slice(0, 3) || [],
                qualityScore: c.qualityScore,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, 5);
    }
}
