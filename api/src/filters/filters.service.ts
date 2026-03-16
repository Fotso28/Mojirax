import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class FiltersService implements OnModuleInit {
    private readonly logger = new Logger(FiltersService.name);
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) {}

    async onModuleInit() {
        // Pré-calcul au démarrage (non bloquant)
        this.refreshSkillEmbeddings().catch(err =>
            this.logger.warn(`Initial skill embedding refresh failed: ${err.message}`)
        );

        // Rafraîchir toutes les 24h
        this.refreshTimer = setInterval(
            () => this.refreshSkillEmbeddings().catch(err =>
                this.logger.warn(`Scheduled skill embedding refresh failed: ${err.message}`)
            ),
            24 * 60 * 60 * 1000,
        );
    }

    /**
     * Retourne les top N skills les plus utilisés
     */
    async getPopularSkills(limit = 20): Promise<{ value: string; label: string; count: number }[]> {
        const skills = await this.prisma.filterEmbedding.findMany({
            where: { type: 'SKILL' },
            orderBy: { usageCount: 'desc' },
            take: limit,
            select: { value: true, label: true, usageCount: true },
        });

        return skills.map(s => ({ value: s.value, label: s.label, count: s.usageCount }));
    }

    /**
     * Récupère l'embedding d'un skill depuis le cache FilterEmbedding
     */
    async getSkillEmbedding(skillValue: string): Promise<number[] | null> {
        const rows: any[] = await this.prisma.$queryRaw`
            SELECT embedding::text
            FROM filter_embeddings
            WHERE type = 'SKILL' AND value = ${skillValue}
            AND embedding IS NOT NULL
            LIMIT 1;
        `;
        if (rows.length === 0) return null;

        const raw = rows[0].embedding; // "[0.1,0.2,...]"
        return JSON.parse(raw);
    }

    /**
     * Agrège les skills depuis projets + candidats, calcule les embeddings manquants
     */
    async refreshSkillEmbeddings(): Promise<void> {
        this.logger.log('Refreshing skill embeddings...');

        // 1. Agrèger tous les skills depuis les projets publiés
        const projects = await this.prisma.project.findMany({
            where: { status: 'PUBLISHED', requiredSkills: { isEmpty: false } },
            select: { requiredSkills: true },
        });

        // 2. Agrèger depuis les candidats publiés
        const candidates = await this.prisma.candidateProfile.findMany({
            where: { status: 'PUBLISHED' },
            select: { skills: true },
        });

        // 3. Compter les occurrences
        const counts = new Map<string, number>();
        for (const p of projects) {
            for (const skill of p.requiredSkills) {
                const normalized = skill.trim();
                if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
        }
        for (const c of candidates) {
            for (const skill of (c.skills || [])) {
                const normalized = skill.trim();
                if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
        }

        // 4. Prendre le top 50
        const sorted = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);

        this.logger.log(`Found ${sorted.length} unique skills to process`);

        // 5. Upsert chaque skill + générer l'embedding si manquant
        for (const [skillValue, count] of sorted) {
            // Upsert le record
            await this.prisma.filterEmbedding.upsert({
                where: { type_value: { type: 'SKILL', value: skillValue } },
                create: { type: 'SKILL', value: skillValue, label: skillValue, usageCount: count },
                update: { usageCount: count },
            });

            // Vérifier si l'embedding existe déjà
            const existing = await this.getSkillEmbedding(skillValue);
            if (existing) continue;

            // Générer l'embedding
            try {
                const embedding = await this.aiService.getEmbedding(skillValue);
                const vectorString = `[${embedding.join(',')}]`;
                await this.prisma.$executeRaw`
                    UPDATE filter_embeddings
                    SET embedding = ${vectorString}::vector
                    WHERE type = 'SKILL' AND value = ${skillValue};
                `;
                this.logger.log(`Generated embedding for skill: ${skillValue}`);
            } catch (err) {
                this.logger.warn(`Failed to generate embedding for "${skillValue}": ${err.message}`);
            }
        }

        this.logger.log('Skill embeddings refresh complete');
    }
}
