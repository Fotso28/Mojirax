import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../projects/ai.service';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) { }

    async search(query: string, userId?: string, filters?: { sector?: string; city?: string }) {
        this.logger.log(`Performing semantic search for: "${query}"`);

        const queryEmbedding = await this.aiService.getEmbedding(query);
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // Build dynamic WHERE fragments
        const sectorFilter = filters?.sector
            ? Prisma.sql`AND p.sector = ${filters.sector}`
            : Prisma.empty;
        const cityFilter = filters?.city
            ? Prisma.sql`AND LOWER(p.city) LIKE LOWER(${'%' + filters.city + '%'})`
            : Prisma.empty;

        const projects = await this.prisma.$queryRaw`
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
        `;

        const candidates = await this.prisma.$queryRaw`
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
        `;

        await this.prisma.searchLog.create({
            data: {
                query,
                userId,
                searchType: 'SEMANTIC_HYBRID',
                filters: filters ? (filters as any) : undefined,
                resultsCount: (projects as any[]).length + (candidates as any[]).length,
                topResultIds: [
                    ...(projects as any[]).map(p => p.id),
                    ...(candidates as any[]).map(c => c.id)
                ],
            }
        });

        return { projects, candidates };
    }

    async getHistory(userId: string) {
        return this.prisma.searchLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                query: true,
                createdAt: true,
            }
        });
    }

    async clearHistory(userId: string) {
        const result = await this.prisma.searchLog.deleteMany({
            where: { userId },
        });
        this.logger.log(`Cleared ${result.count} search logs for user ${userId}`);
        return { deleted: result.count };
    }
}
