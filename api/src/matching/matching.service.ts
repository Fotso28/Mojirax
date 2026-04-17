import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Stage → minimum experience mapping ──────────────
const STAGE_EXP_MAP: Record<string, number> = {
    IDEA: 0,
    PROTOTYPE: 1,
    MVP_BUILD: 2,
    MVP_LIVE: 3,
    TRACTION: 4,
    SCALE: 5,
};

interface CandidateRow {
    id: string;
    skills: string[];
    yearsOfExperience: number | null;
    city: string | null;
    country: string | null;
    remoteOnly: boolean;
    willingToRelocate: boolean;
    desiredSectors: string[];
    desiredStage: string[];
    availability: string | null;
    commitmentType: string | null;
}

interface ProjectRow {
    id: string;
    requiredSkills: string[];
    niceToHaveSkills: string[];
    stage: string | null;
    sector: string | null;
    location: string | null;
    city: string | null;
    country: string | null;
    isRemote: boolean;
    commitment: string | null;
}

interface VectorSimilarity {
    candidateId: string;
    projectId: string;
    bioSim: number;
    skillsSim: number;
}

@Injectable()
export class MatchingService {
    private readonly logger = new Logger(MatchingService.name);

    constructor(private prisma: PrismaService) {}

    // ─── Core: calculate a single score ──────────────────

    calculateScoreFromData(
        candidate: CandidateRow,
        project: ProjectRow,
        bioSim: number,
        skillsSim: number,
    ): {
        overallScore: number;
        skillsMatch: number;
        experienceMatch: number;
        locationMatch: number;
        culturalFit: number;
    } {
        // 1. Skills Match (40%)
        const skillsMatch = this.computeSkillsMatch(
            candidate.skills,
            project.requiredSkills,
            project.niceToHaveSkills,
            skillsSim,
        );

        // 2. Experience Match (20%)
        const experienceMatch = this.computeExperienceMatch(
            candidate.yearsOfExperience,
            project.stage,
        );

        // 3. Location Match (15%)
        const locationMatch = this.computeLocationMatch(
            candidate,
            project,
        );

        // 4. Cultural Fit (25%)
        const culturalFit = this.computeCulturalFit(
            candidate,
            project,
            bioSim,
        );

        const overallScore = Math.round(
            skillsMatch * 0.4 +
            experienceMatch * 0.2 +
            locationMatch * 0.15 +
            culturalFit * 0.25,
        );

        return {
            overallScore: Math.min(100, Math.max(0, overallScore)),
            skillsMatch: Math.round(skillsMatch),
            experienceMatch: Math.round(experienceMatch),
            locationMatch: Math.round(locationMatch),
            culturalFit: Math.round(culturalFit),
        };
    }

    // ─── Batch: calculate for a newly published project ──

    async calculateForProject(projectId: string): Promise<number> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                requiredSkills: true,
                niceToHaveSkills: true,
                stage: true,
                sector: true,
                location: true,
                city: true,
                country: true,
                isRemote: true,
                commitment: true,
            },
        });

        if (!project) return 0;

        // Get all PUBLISHED candidates with their structured data
        const rawCandidates = await this.prisma.candidateProfile.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                id: true,
                remoteOnly: true,
                willingToRelocate: true,
                desiredSectors: true,
                desiredStage: true,
                availability: true,
                commitmentType: true,
                user: {
                    select: {
                        skills: true,
                        yearsOfExperience: true,
                        city: true,
                        country: true,
                    },
                },
            },
        });

        if (rawCandidates.length === 0) return 0;

        // Flatten user fields into CandidateRow
        const candidates: CandidateRow[] = rawCandidates.map(c => ({
            id: c.id,
            skills: c.user.skills,
            yearsOfExperience: c.user.yearsOfExperience,
            city: c.user.city,
            country: c.user.country,
            remoteOnly: c.remoteOnly,
            willingToRelocate: c.willingToRelocate,
            desiredSectors: c.desiredSectors,
            desiredStage: c.desiredStage,
            availability: c.availability,
            commitmentType: c.commitmentType,
        }));

        // Batch vector similarities via pgvector (single query)
        const similarities = await this.getVectorSimilaritiesForProject(projectId);
        const simMap = new Map(similarities.map(s => [s.candidateId, s]));

        // Calculate scores and batch upsert
        const upserts = candidates.map(candidate => {
            const sim = simMap.get(candidate.id);
            const scores = this.calculateScoreFromData(
                candidate,
                project,
                sim?.bioSim ?? 0,
                sim?.skillsSim ?? 0,
            );

            return this.prisma.matchScore.upsert({
                where: {
                    candidateId_projectId: {
                        candidateId: candidate.id,
                        projectId: project.id,
                    },
                },
                create: {
                    candidateId: candidate.id,
                    projectId: project.id,
                    ...scores,
                    aiConfidence: sim ? 0.85 : 0.6,
                    modelVersion: 'structured-v1',
                    calculatedAt: new Date(),
                },
                update: {
                    ...scores,
                    aiConfidence: sim ? 0.85 : 0.6,
                    modelVersion: 'structured-v1',
                    calculatedAt: new Date(),
                },
            });
        });

        // Execute in batches of 20 to avoid connection pool exhaustion
        for (let i = 0; i < upserts.length; i += 20) {
            await this.prisma.$transaction(upserts.slice(i, i + 20));
        }

        this.logger.log(
            `Calculated ${candidates.length} match scores for project ${projectId}`,
        );

        return candidates.length;
    }

    // ─── Batch: calculate for a newly published candidate ──

    async calculateForCandidate(candidateProfileId: string): Promise<number> {
        const rawCandidate = await this.prisma.candidateProfile.findUnique({
            where: { id: candidateProfileId },
            select: {
                id: true,
                remoteOnly: true,
                willingToRelocate: true,
                desiredSectors: true,
                desiredStage: true,
                availability: true,
                commitmentType: true,
                user: {
                    select: {
                        skills: true,
                        yearsOfExperience: true,
                        city: true,
                        country: true,
                    },
                },
            },
        });

        if (!rawCandidate) return 0;

        const candidate: CandidateRow = {
            id: rawCandidate.id,
            skills: rawCandidate.user.skills,
            yearsOfExperience: rawCandidate.user.yearsOfExperience,
            city: rawCandidate.user.city,
            country: rawCandidate.user.country,
            remoteOnly: rawCandidate.remoteOnly,
            willingToRelocate: rawCandidate.willingToRelocate,
            desiredSectors: rawCandidate.desiredSectors,
            desiredStage: rawCandidate.desiredStage,
            availability: rawCandidate.availability,
            commitmentType: rawCandidate.commitmentType,
        };

        const projects = await this.prisma.project.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                id: true,
                requiredSkills: true,
                niceToHaveSkills: true,
                stage: true,
                sector: true,
                location: true,
                city: true,
                country: true,
                isRemote: true,
                commitment: true,
            },
        });

        if (projects.length === 0) return 0;

        // Batch vector similarities
        const similarities = await this.getVectorSimilaritiesForCandidate(candidateProfileId);
        const simMap = new Map(similarities.map(s => [s.projectId, s]));

        const upserts = projects.map(project => {
            const sim = simMap.get(project.id);
            const scores = this.calculateScoreFromData(
                candidate,
                project,
                sim?.bioSim ?? 0,
                sim?.skillsSim ?? 0,
            );

            return this.prisma.matchScore.upsert({
                where: {
                    candidateId_projectId: {
                        candidateId: candidate.id,
                        projectId: project.id,
                    },
                },
                create: {
                    candidateId: candidate.id,
                    projectId: project.id,
                    ...scores,
                    aiConfidence: sim ? 0.85 : 0.6,
                    modelVersion: 'structured-v1',
                    calculatedAt: new Date(),
                },
                update: {
                    ...scores,
                    aiConfidence: sim ? 0.85 : 0.6,
                    modelVersion: 'structured-v1',
                    calculatedAt: new Date(),
                },
            });
        });

        for (let i = 0; i < upserts.length; i += 20) {
            await this.prisma.$transaction(upserts.slice(i, i + 20));
        }

        this.logger.log(
            `Calculated ${projects.length} match scores for candidate ${candidateProfileId}`,
        );

        return projects.length;
    }

    // ─── Queries: top matches ────────────────────────────

    async getTopMatchesForProject(projectId: string, limit = 10) {
        const take = Math.min(limit, 20);

        return this.prisma.matchScore.findMany({
            where: { projectId },
            orderBy: { overallScore: 'desc' },
            take,
            include: {
                candidate: {
                    select: {
                        id: true,
                        shortPitch: true,
                        availability: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
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
                                country: true,
                                yearsOfExperience: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getTopMatchesForCandidate(candidateProfileId: string, limit = 10) {
        const take = Math.min(limit, 20);

        return this.prisma.matchScore.findMany({
            where: { candidateId: candidateProfileId },
            orderBy: { overallScore: 'desc' },
            take,
            include: {
                project: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        city: true,
                        country: true,
                        isRemote: true,
                        lookingForRole: true,
                        collabType: true,
                        requiredSkills: true,
                    },
                },
            },
        });
    }

    // ─── Private: Skills Match ───────────────────────────

    private computeSkillsMatch(
        candidateSkills: string[],
        requiredSkills: string[],
        niceToHaveSkills: string[],
        skillsSimilarity: number,
    ): number {
        // Embedding similarity component (0-50)
        const embeddingScore = skillsSimilarity * 50;

        // Explicit skills intersection
        const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());
        const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
        const normalizedNice = niceToHaveSkills.map(s => s.toLowerCase().trim());

        const requiredMatches = normalizedRequired.filter(s =>
            normalizedCandidate.some(c => c.includes(s) || s.includes(c)),
        ).length;

        const niceMatches = normalizedNice.filter(s =>
            normalizedCandidate.some(c => c.includes(s) || s.includes(c)),
        ).length;

        // +10 per required skill match (max 50), +5 per nice-to-have (max 20)
        const explicitScore = Math.min(requiredMatches * 10, 50) + Math.min(niceMatches * 5, 20);

        // Combine: embedding (0-50) + explicit (0-70), normalize to 0-100
        return Math.min(100, embeddingScore + explicitScore);
    }

    // ─── Private: Experience Match ──────────────────────

    private computeExperienceMatch(
        yearsOfExperience: number | null,
        projectStage: string | null,
    ): number {
        const threshold = STAGE_EXP_MAP[projectStage ?? 'IDEA'] ?? 0;

        if (threshold === 0) return 100; // Any experience fits IDEA stage

        const years = yearsOfExperience ?? 0;
        if (years >= threshold) return 100;

        return Math.round((years / threshold) * 100);
    }

    // ─── Private: Location Match ────────────────────────

    private computeLocationMatch(
        candidate: CandidateRow,
        project: ProjectRow,
    ): number {
        // Both remote → perfect match
        if (project.isRemote && candidate.remoteOnly) return 100;
        if (project.isRemote) return 90; // Project accepts remote

        // Same city
        if (candidate.city && project.city) {
            const candCity = candidate.city.toLowerCase();
            const projCity = project.city.toLowerCase();
            if (candCity.includes(projCity) || projCity.includes(candCity)) return 100;
        }

        // Same country
        if (candidate.country && project.country) {
            const candCountry = candidate.country.toLowerCase();
            const projCountry = project.country.toLowerCase();
            if (candCountry === projCountry) return 70;
        }

        // Willing to relocate
        if (candidate.willingToRelocate) return 50;

        // Candidate prefers remote but project isn't
        if (candidate.remoteOnly && !project.isRemote) return 15;

        return 20;
    }

    // ─── Private: Cultural Fit ──────────────────────────

    private computeCulturalFit(
        candidate: CandidateRow,
        project: ProjectRow,
        bioSimilarity: number,
    ): number {
        let score = 0;

        // Sector match (+40)
        if (
            project.sector &&
            candidate.desiredSectors.some(
                s => s.toLowerCase() === project.sector!.toLowerCase(),
            )
        ) {
            score += 40;
        }

        // Stage match (+30)
        if (
            project.stage &&
            candidate.desiredStage.some(
                s => s.toLowerCase() === project.stage!.toLowerCase(),
            )
        ) {
            score += 30;
        }

        // Bio/description semantic similarity (+30)
        score += bioSimilarity * 30;

        // Commitment compatibility bonus (+10)
        if (this.commitmentCompatible(candidate, project)) {
            score += 10;
        }

        return Math.min(100, score);
    }

    private commitmentCompatible(candidate: CandidateRow, project: ProjectRow): boolean {
        if (!candidate.commitmentType || !project.commitment) return true; // No data → assume compatible

        const map: Record<string, string[]> = {
            FULLTIME: ['FULL_TIME'],
            SERIOUS: ['FULL_TIME', 'PART_TIME'],
            SIDE: ['PART_TIME', 'FREELANCE'],
        };

        return (map[candidate.commitmentType] ?? []).includes(project.commitment);
    }

    // ─── Private: pgvector batch similarity queries ─────

    private async getVectorSimilaritiesForProject(
        projectId: string,
    ): Promise<VectorSimilarity[]> {
        return this.prisma.$queryRaw<VectorSimilarity[]>`
            SELECT
                cp.id AS "candidateId",
                ${projectId} AS "projectId",
                COALESCE(1 - (cp.bio_embedding <=> p.description_embedding), 0) AS "bioSim",
                COALESCE(1 - (cp.skills_embedding <=> p.description_embedding), 0) AS "skillsSim"
            FROM candidate_profiles cp
            CROSS JOIN projects p
            WHERE p.id = ${projectId}
              AND cp.status = 'PUBLISHED'
              AND cp.bio_embedding IS NOT NULL
              AND p.description_embedding IS NOT NULL
        `;
    }

    private async getVectorSimilaritiesForCandidate(
        candidateProfileId: string,
    ): Promise<VectorSimilarity[]> {
        return this.prisma.$queryRaw<VectorSimilarity[]>`
            SELECT
                ${candidateProfileId} AS "candidateId",
                p.id AS "projectId",
                COALESCE(1 - (cp.bio_embedding <=> p.description_embedding), 0) AS "bioSim",
                COALESCE(1 - (cp.skills_embedding <=> p.description_embedding), 0) AS "skillsSim"
            FROM projects p
            CROSS JOIN candidate_profiles cp
            WHERE cp.id = ${candidateProfileId}
              AND p.status = 'PUBLISHED'
              AND p.description_embedding IS NOT NULL
              AND cp.bio_embedding IS NOT NULL
        `;
    }
}
