import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InteractionsService } from '../interactions/interactions.service';
import { BoostService } from '../boost/boost.service';

// Mots français courants à ignorer dans la recherche
const STOP_WORDS = new Set([
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'un', 'une', 'le', 'la', 'les', 'de', 'du', 'des', 'au', 'aux',
    'et', 'ou', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans',
    'ce', 'se', 'ne', 'pas', 'qui', 'que', 'est', 'son', 'sa', 'ses',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'votre', 'leur',
    'ai', 'as', 'suis', 'es', 'sont', 'veux', 'veut', 'faut', 'peut',
    'tout', 'tous', 'tres', 'bien', 'plus', 'moins', 'aussi', 'comme',
    'the', 'is', 'am', 'are', 'was', 'and', 'or', 'for', 'with',
    'cherche', 'recherche', 'besoin', 'vouloir', 'avoir', 'etre',
]);

/**
 * Extrait les mots significatifs d'une query (stop words filtrés, min 3 chars)
 * Tronque les mots longs pour un matching par racine (stem approximatif)
 */
function extractKeywords(query: string): string[] {
    return query
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
        .map(w => {
            if (w.length > 6) return w.slice(0, Math.max(5, Math.ceil(w.length * 0.6)));
            return w;
        });
}

// ─── SQL fragments réutilisables ────────────────────────────────────
// Mapping secteur technique → labels français + synonymes pour la recherche textuelle
// Permet de trouver "santé" → HEALTHTECH, "livraison" → LOGISTICS, etc.
const SECTOR_LABELS_SQL = Prisma.sql`
    CASE sector
        WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money'
        WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage'
        WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie'
        WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours'
        WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier'
        WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin'
        WHEN 'SAAS' THEN 'saas logiciel software service cloud application'
        WHEN 'MARKETPLACE' THEN 'marketplace place marche plateforme intermediaire'
        WHEN 'IMPACT' THEN 'impact social solidaire communautaire ong'
        WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data'
        ELSE COALESCE(sector, '')
    END
`;

// Mapping looking_for_role technique → labels français + synonymes
const ROLE_LABELS_SQL = Prisma.sql`
    CASE looking_for_role
        WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur'
        WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo'
        WHEN 'DESIGN' THEN 'design designer graphiste ux ui creatif'
        WHEN 'PRODUCT' THEN 'produit product manager chef projet gestion'
        WHEN 'MARKETING' THEN 'marketing communication publicite community manager'
        WHEN 'FINANCE' THEN 'finance comptable cfo tresorier financier'
        ELSE COALESCE(looking_for_role, '')
    END
`;

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private interactionsService: InteractionsService,
        private readonly boostService: BoostService,
    ) { }

    // =============================================
    // RECHERCHE UNIVERSELLE (header search)
    // =============================================

    async searchUniversal(query: string, firebaseUid?: string) {
        if (!query || typeof query !== 'string') return { projects: [], people: [], skills: [] };
        const safeQuery = query.replace(/\0/g, '').slice(0, 200).trim();
        if (safeQuery.length < 2) return { projects: [], people: [], skills: [] };

        // Résoudre firebaseUid → userId interne (non-bloquant si absent)
        let userId: string | undefined;
        if (firebaseUid) {
            const user = await this.prisma.user.findUnique({ where: { firebaseUid }, select: { id: true } });
            userId = user?.id;
        }

        this.logger.log(`Universal search: "${safeQuery}"`);

        const keywords = extractKeywords(safeQuery);
        const searchTerms = keywords.length > 0 ? keywords : [safeQuery];
        const wordPatterns = searchTerms.map(w => `%${w}%`);

        this.logger.debug(`Keywords: [${searchTerms.join(', ')}] → patterns: [${wordPatterns.join(', ')}]`);

        // 1. Recherche texte immédiate (rapide, <20ms)
        const textResultsPromise = this.searchTextImmediate(wordPatterns);

        // 2. Embedding en parallèle (lent, 300-800ms)
        const semanticResultsPromise = this.searchSemantic(safeQuery);

        const textResults = await textResultsPromise;

        // Attendre le sémantique avec timeout 2s
        let semanticResults: { projects: any[]; people: any[]; skills: any[] } | null = null;
        try {
            semanticResults = await Promise.race([
                semanticResultsPromise,
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
            ]);
        } catch (err) {
            this.logger.warn(`Semantic search failed: ${err?.message}`);
        }

        // Fusionner : sémantique prioritaire, texte en complément
        const mergedProjects = this.mergeResults(
            semanticResults?.projects || [],
            textResults.projects,
            5,
        );
        const mergedPeople = this.mergeResults(
            semanticResults?.people || [],
            textResults.people,
            5,
        );
        const skills = semanticResults?.skills || [];

        // Log async (non-bloquant)
        this.prisma.searchLog.create({
            data: {
                query: safeQuery,
                userId,
                searchType: semanticResults ? 'UNIVERSAL' : 'TEXT_FALLBACK',
                resultsCount: mergedProjects.length + mergedPeople.length,
                topResultIds: [
                    ...mergedProjects.map((p: any) => p.id),
                    ...mergedPeople.map((p: any) => p.id),
                ],
            },
        }).catch(e => this.logger.warn(`Failed to log search: ${e.message}`));

        // Activity-based re-ranking: boost results matching user engagement signals
        if (userId) {
            try {
                const signals = await this.interactionsService.getUserSignals(userId);
                for (const result of mergedProjects) {
                    const sectorBonus = (signals.sectorEngagement[result.sector] || 0) * 0.01;
                    const stageBonus = (signals.stageEngagement[result.stage] || 0) * 0.01;
                    result.similarity = Math.min(1, (result.similarity || 0) + Math.min(0.1, sectorBonus + stageBonus));
                }
                mergedProjects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            } catch (e) {
                // Silently fail — personalization is non-critical
            }
        }

        // Apply boost bonus to search results
        try {
            const boostedIds = await this.boostService.getActiveBoostProjectIds();
            const boostedSet = new Set(boostedIds);

            for (const result of mergedProjects) {
                // Boosted projects get +0.15 to their similarity score
                if (boostedSet.has(result.id)) {
                    result.similarity = Math.min(1, (result.similarity || 0) + 0.15);
                }
            }

            // Re-sort after boost adjustments
            mergedProjects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        } catch (e) {
            // Boost ranking is non-critical
        }

        // ELITE plan priority: boost projects owned by ELITE users in search results
        try {
            const projectIds = mergedProjects.map((p: any) => p.id);
            const peopleIds = mergedPeople.map((p: any) => p.id);

            if (projectIds.length > 0) {
                const eliteProjects = await this.prisma.project.findMany({
                    where: { id: { in: projectIds }, founder: { plan: 'ELITE' } },
                    select: { id: true },
                });
                const eliteProjectSet = new Set(eliteProjects.map(p => p.id));
                for (const result of mergedProjects) {
                    if (eliteProjectSet.has(result.id)) {
                        result.similarity = Math.min(1, (result.similarity || 0) + 0.10);
                    }
                }
            }

            if (peopleIds.length > 0) {
                const eliteCandidates = await this.prisma.candidateProfile.findMany({
                    where: { id: { in: peopleIds }, user: { plan: 'ELITE' } },
                    select: { id: true },
                });
                const elitePeopleSet = new Set(eliteCandidates.map(c => c.id));
                for (const result of mergedPeople) {
                    if (elitePeopleSet.has(result.id)) {
                        result.similarity = Math.min(1, (result.similarity || 0) + 0.10);
                    }
                }
            }

            // Final re-sort after ELITE priority adjustments
            mergedProjects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            mergedPeople.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        } catch (e) {
            // ELITE priority is non-critical
        }

        return { projects: mergedProjects, people: mergedPeople, skills };
    }

    /**
     * Recherche texte pure — très rapide (<20ms), pas d'appel réseau
     * Cherche dans : nom, pitch, description, rôle recherché (label),
     * secteur (label + synonymes), ville, pays, skills
     */
    private async searchTextImmediate(wordPatterns: string[]) {
        const [projects, people] = await Promise.all([
            this.prisma.$queryRaw`
                SELECT id, name, slug, pitch, sector, logo_url AS "logoUrl", 0.5 AS similarity
                FROM projects
                WHERE status = 'PUBLISHED'
                  AND (
                      unaccent(LOWER(
                          name || ' ' || pitch
                          || ' ' || COALESCE(description, '')
                          || ' ' || ${ROLE_LABELS_SQL}
                          || ' ' || ${SECTOR_LABELS_SQL}
                          || ' ' || COALESCE(city, '')
                          || ' ' || COALESCE(country, '')
                      )) LIKE ALL(SELECT unaccent(LOWER(unnest(${wordPatterns}::text[]))))
                      OR EXISTS (
                          SELECT 1 FROM unnest(required_skills) AS skill
                          WHERE unaccent(LOWER(skill)) LIKE ANY(
                              SELECT unaccent(LOWER(unnest(${wordPatterns}::text[])))
                          )
                      )
                  )
                LIMIT 5;
            `,
            this.prisma.$queryRaw`
                SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
                       u.name, u.image, cp.title, 0.5 AS similarity
                FROM users u
                LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
                WHERE (
                    unaccent(LOWER(
                        COALESCE(u.first_name, '') || ' ' ||
                        COALESCE(u.last_name, '') || ' ' ||
                        COALESCE(u.name, '') || ' ' ||
                        COALESCE(cp.title, '') || ' ' ||
                        COALESCE(cp.bio, '') || ' ' ||
                        COALESCE(cp.location, '')
                    )) LIKE ALL(SELECT unaccent(LOWER(unnest(${wordPatterns}::text[]))))
                    OR EXISTS (
                        SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill
                        WHERE unaccent(LOWER(skill)) LIKE ANY(
                            SELECT unaccent(LOWER(unnest(${wordPatterns}::text[])))
                        )
                    )
                )
                AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED')
                LIMIT 5;
            `,
        ]);
        return { projects: projects as any[], people: people as any[] };
    }

    /**
     * Recherche sémantique — lente (appel Jina embedding) mais comprend les synonymes
     */
    private async searchSemantic(safeQuery: string): Promise<{ projects: any[]; people: any[]; skills: any[] }> {
        const queryEmbedding = await this.aiService.getEmbedding(safeQuery);
        const vectorString = `[${queryEmbedding.join(',')}]`;

        const [projects, people, skills] = await Promise.all([
            this.prisma.$queryRaw`
                SELECT id, name, slug, pitch, sector, logo_url AS "logoUrl",
                       1 - (description_embedding <=> ${vectorString}::vector) AS similarity
                FROM projects
                WHERE status = 'PUBLISHED'
                  AND description_embedding IS NOT NULL
                  AND 1 - (description_embedding <=> ${vectorString}::vector) > 0.55
                ORDER BY description_embedding <=> ${vectorString}::vector ASC
                LIMIT 5;
            `,
            this.prisma.$queryRaw`
                SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
                       u.name, u.image, cp.title,
                       1 - (cp.bio_embedding <=> ${vectorString}::vector) AS similarity
                FROM candidate_profiles cp
                JOIN users u ON u.id = cp.user_id
                WHERE cp.status = 'PUBLISHED'
                  AND cp.bio_embedding IS NOT NULL
                  AND 1 - (cp.bio_embedding <=> ${vectorString}::vector) > 0.55
                ORDER BY cp.bio_embedding <=> ${vectorString}::vector ASC
                LIMIT 5;
            `,
            this.prisma.$queryRaw`
                SELECT value, label, usage_count AS "count",
                       1 - (embedding <=> ${vectorString}::vector) AS similarity
                FROM filter_embeddings
                WHERE type = 'SKILL'
                  AND embedding IS NOT NULL
                  AND 1 - (embedding <=> ${vectorString}::vector) > 0.55
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 5;
            `,
        ]);

        return { projects: projects as any[], people: people as any[], skills: skills as any[] };
    }

    /**
     * Fusionne résultats sémantiques (prioritaires) et texte (complément), sans doublons
     */
    private mergeResults(semantic: any[], text: any[], limit: number): any[] {
        const seen = new Set<string>();
        const merged: any[] = [];

        for (const item of semantic) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }
        for (const item of text) {
            if (!seen.has(item.id) && merged.length < limit) {
                seen.add(item.id);
                merged.push(item);
            }
        }
        return merged;
    }


    // =============================================
    // RECHERCHE SÉMANTIQUE EXISTANTE (page search)
    // =============================================

    async search(query: string, firebaseUid?: string, filters?: { sector?: string; city?: string }) {
        if (!query || typeof query !== 'string') return { projects: [], candidates: [] };
        const safeQuery = query.replace(/\0/g, '').slice(0, 200).trim();
        if (safeQuery.length < 2) return { projects: [], candidates: [] };
        this.logger.log(`Performing semantic search for: "${safeQuery}"`);

        // Résoudre firebaseUid → userId interne
        let userId: string | undefined;
        if (firebaseUid) {
            const user = await this.prisma.user.findUnique({ where: { firebaseUid }, select: { id: true } });
            userId = user?.id;
        }

        let queryEmbedding: number[];
        try {
            queryEmbedding = await Promise.race([
                this.aiService.getEmbedding(safeQuery),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 3000)),
            ]);
        } catch (err: any) {
            this.logger.warn(`Embedding failed for search, returning empty: ${err?.message}`);
            return { projects: [], candidates: [] };
        }
        const vectorString = `[${queryEmbedding.join(',')}]`;

        const sectorFilter = filters?.sector
            ? Prisma.sql`AND p.sector = ${filters.sector}`
            : Prisma.empty;
        const cityFilter = filters?.city
            ? Prisma.sql`AND LOWER(p.city) LIKE LOWER(${'%' + filters.city + '%'})`
            : Prisma.empty;

        // Timeout 3s sur les requêtes vectorielles pour éviter de bloquer le worker
        const queryTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Vector query timeout')), 3000),
        );

        let projects: any[];
        let candidates: any[];
        try {
            const results = await Promise.race([
                Promise.all([
                    this.prisma.$queryRaw`
                        SELECT
                            p.id, p.name, p.slug, p.pitch, p.sector, p.city, p.country, p.logo_url as "logoUrl",
                            1 - (p.description_embedding <=> ${vectorString}::vector) as similarity
                        FROM projects p
                        WHERE p.status = 'PUBLISHED'
                          AND p.description_embedding IS NOT NULL
                          ${sectorFilter}
                          ${cityFilter}
                        ORDER BY p.description_embedding <=> ${vectorString}::vector ASC
                        LIMIT 10;
                    `,
                    this.prisma.$queryRaw`
                        SELECT
                            cp.id, cp.title, cp.bio, cp.location, cp.skills,
                            u.first_name as "firstName", u.last_name as "lastName", u.name, u.image,
                            1 - (cp.bio_embedding <=> ${vectorString}::vector) as similarity
                        FROM candidate_profiles cp
                        JOIN users u ON u.id = cp.user_id
                        WHERE cp.status = 'PUBLISHED'
                          AND cp.bio_embedding IS NOT NULL
                        ORDER BY cp.bio_embedding <=> ${vectorString}::vector ASC
                        LIMIT 10;
                    `,
                ]),
                queryTimeout,
            ]);
            projects = results[0] as any[];
            candidates = results[1] as any[];
        } catch (err: any) {
            this.logger.warn(`Vector query failed: ${err?.message}`);
            return { projects: [], candidates: [] };
        }

        // Log async (non-bloquant — ne doit pas crasher la réponse)
        this.prisma.searchLog.create({
            data: {
                query: safeQuery,
                userId,
                searchType: 'SEMANTIC_HYBRID',
                filters: filters ? (filters as any) : undefined,
                resultsCount: (projects as any[]).length + (candidates as any[]).length,
                topResultIds: [
                    ...(projects as any[]).map(p => p.id),
                    ...(candidates as any[]).map(c => c.id)
                ],
            }
        }).catch(e => this.logger.warn(`Failed to log search: ${e.message}`));

        // ELITE plan priority: boost projects & candidates owned by ELITE users
        try {
            const projectIds = projects.map((p: any) => p.id);
            const candidateIds = candidates.map((c: any) => c.id);

            if (projectIds.length > 0) {
                const eliteProjects = await this.prisma.project.findMany({
                    where: { id: { in: projectIds }, founder: { plan: 'ELITE' } },
                    select: { id: true },
                });
                const eliteSet = new Set(eliteProjects.map(p => p.id));
                for (const p of projects) {
                    if (eliteSet.has(p.id)) {
                        p.similarity = Math.min(1, (p.similarity || 0) + 0.10);
                    }
                }
            }

            if (candidateIds.length > 0) {
                const eliteCandidates = await this.prisma.candidateProfile.findMany({
                    where: { id: { in: candidateIds }, user: { plan: 'ELITE' } },
                    select: { id: true },
                });
                const eliteSet = new Set(eliteCandidates.map(c => c.id));
                for (const c of candidates) {
                    if (eliteSet.has(c.id)) {
                        c.similarity = Math.min(1, (c.similarity || 0) + 0.10);
                    }
                }
            }

            projects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            candidates.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        } catch (e) {
            // ELITE priority is non-critical
        }

        return { projects, candidates };
    }

    async getHistory(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });
        if (!user) return [];

        return this.prisma.searchLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                query: true,
                createdAt: true,
            }
        });
    }

    async clearHistory(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });
        if (!user) return { deleted: 0 };

        const result = await this.prisma.searchLog.deleteMany({
            where: { userId: user.id },
        });
        this.logger.log(`Cleared ${result.count} search logs for user ${user.id}`);
        return { deleted: result.count };
    }
}
