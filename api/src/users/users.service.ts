import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../projects/ai.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';

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
                candidateProfile: true
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
                image: true,
                role: true,
                founderProfile: true,
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

    async getCandidatesFeed(
        firebaseUid: string | null,
        cursor: string | null,
        limit: number = 7,
        filters?: { city?: string; skills?: string[]; sector?: string },
    ) {
        const take = Math.min(limit, 100);

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
            include: {
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
            await this.prisma.$executeRaw`
                UPDATE candidate_profiles
                SET bio_embedding = ${bioVector}::vector,
                    embedding_model = 'text-embedding-3-small',
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
}
