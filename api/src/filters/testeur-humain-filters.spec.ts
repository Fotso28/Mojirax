/**
 * TESTEURS HUMAINS — Module Filters
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - FiltersService.getPopularSkills (top N skills)
 *   - FiltersService.getSkillEmbedding (cache embeddings via $queryRaw)
 *   - FiltersService.refreshSkillEmbeddings (aggregation projets + candidats)
 *
 * NB : Le service n'expose PAS de search/filter par ville/secteur (c'est fait
 * côté MatchingService / projects). On teste donc ce que FiltersService EXPOSE
 * réellement : agrégation + cache embeddings.
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FiltersService } from './filters.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

// ─── Helpers ─────────────────────────────────────────────
function createMockPrisma() {
    return {
        filterEmbedding: {
            findMany: jest.fn(),
            upsert: jest.fn().mockResolvedValue({}),
        },
        project: { findMany: jest.fn() },
        user: { findMany: jest.fn() },
        $queryRaw: jest.fn(),
        $executeRaw: jest.fn().mockResolvedValue(1),
    };
}

function makeModule(prisma: any, ai: any): Promise<TestingModule> {
    return Test.createTestingModule({
        providers: [
            FiltersService,
            { provide: PrismaService, useValue: prisma },
            { provide: AiService, useValue: ai },
        ],
    }).compile();
}

// ════════════════════════════════════════════════════════════
//  FiltersService — testeurs humains
// ════════════════════════════════════════════════════════════

describe('FiltersService — testeurs humains', () => {
    let service: FiltersService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let ai: any;

    beforeEach(async () => {
        prisma = createMockPrisma();
        ai = {
            getEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)),
            getEmbeddingModel: jest.fn().mockReturnValue('jina-v3'),
        };
        const module = await makeModule(prisma, ai);
        service = module.get(FiltersService);
        // Stopper le timer programmé par onModuleInit s'il existait
        // (on n'appelle pas onModuleInit ici donc rien à nettoyer)
    });

    // ─── Testeur 1 — Amadou : top skills nominal ───
    test('Amadou — getPopularSkills retourne top N triés par usageCount desc', async () => {
        prisma.filterEmbedding.findMany.mockResolvedValue([
            { value: 'React', label: 'React', usageCount: 42 },
            { value: 'Node.js', label: 'Node.js', usageCount: 30 },
            { value: 'Python', label: 'Python', usageCount: 18 },
        ]);

        const result = await service.getPopularSkills(3);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ value: 'React', label: 'React', count: 42 });
        expect(prisma.filterEmbedding.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { type: 'SKILL' },
                orderBy: { usageCount: 'desc' },
                take: 3,
            }),
        );
    });

    // ─── Testeur 2 — Fatou : limit par défaut = 20 ───
    test('Fatou — getPopularSkills sans paramètre → take=20 par défaut', async () => {
        prisma.filterEmbedding.findMany.mockResolvedValue([]);

        await service.getPopularSkills();

        expect(prisma.filterEmbedding.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 20 }),
        );
    });

    // ─── Testeur 3 — Jean (comptable) : liste vide ───
    test('Jean — aucun skill en BD → tableau vide retourné', async () => {
        prisma.filterEmbedding.findMany.mockResolvedValue([]);

        const result = await service.getPopularSkills(10);

        expect(result).toEqual([]);
    });

    // ─── Testeur 4 — Moussa : getSkillEmbedding trouvé ───
    test('Moussa — getSkillEmbedding trouve le cache → parse le JSON array', async () => {
        const vector = [0.1, 0.2, 0.3, 0.4];
        prisma.$queryRaw.mockResolvedValue([{ embedding: JSON.stringify(vector) }]);

        const result = await service.getSkillEmbedding('React');

        expect(result).toEqual(vector);
        expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    // ─── Testeur 5 — Aisha : getSkillEmbedding absent → null ───
    test('Aisha — getSkillEmbedding sans résultat → retourne null', async () => {
        prisma.$queryRaw.mockResolvedValue([]);

        const result = await service.getSkillEmbedding('SkillInconnu');

        expect(result).toBeNull();
    });

    // ─── Testeur 6 — Paul (doublons) : aggregation compte 2x ───
    test('Paul — refreshSkillEmbeddings aggrege skills projets + candidats', async () => {
        prisma.project.findMany.mockResolvedValue([
            { requiredSkills: ['React', 'Node'] },
            { requiredSkills: ['React'] }, // React compté 2x
        ]);
        prisma.user.findMany.mockResolvedValue([
            { skills: ['React', 'Python'] }, // React devient 3x
        ]);
        // Embedding déjà présent → pas de call AI
        prisma.$queryRaw.mockResolvedValue([{ embedding: JSON.stringify([0.1]) }]);

        await service.refreshSkillEmbeddings();

        // Upsert appelé pour chaque skill unique
        const upsertCalls = prisma.filterEmbedding.upsert.mock.calls;
        const reactCall = upsertCalls.find(
            (c: any) => c[0].where.type_value.value === 'React',
        );
        expect(reactCall).toBeDefined();
        // React apparait 3 fois → usageCount = 3
        expect(reactCall[0].create.usageCount).toBe(3);
    });

    // ─── Testeur 7 — Marie (valeurs extrêmes) : skill vide ignoré ───
    test('Marie — skills avec espaces/vides sont ignorés après trim', async () => {
        prisma.project.findMany.mockResolvedValue([
            { requiredSkills: ['   ', '', 'Vue.js'] },
        ]);
        prisma.user.findMany.mockResolvedValue([]);
        prisma.$queryRaw.mockResolvedValue([{ embedding: JSON.stringify([0.1]) }]);

        await service.refreshSkillEmbeddings();

        // Seul Vue.js a été upsert (les vides sont filtrés)
        const upsertCalls = prisma.filterEmbedding.upsert.mock.calls;
        expect(upsertCalls.length).toBe(1);
        expect(upsertCalls[0][0].where.type_value.value).toBe('Vue.js');
    });

    // ─── Testeur 8 — Olivier : generation d'embedding si manquant ───
    test('Olivier — embedding absent → appel AI + $executeRaw UPDATE', async () => {
        prisma.project.findMany.mockResolvedValue([{ requiredSkills: ['Rust'] }]);
        prisma.user.findMany.mockResolvedValue([]);
        // Premier call = verif embedding existant → null (pas en cache)
        prisma.$queryRaw.mockResolvedValue([]);

        await service.refreshSkillEmbeddings();

        expect(ai.getEmbedding).toHaveBeenCalledWith('Rust');
        expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    // ─── Testeur 9 — Sandrine : top 50 maximum ───
    test('Sandrine — plus de 50 skills uniques → seuls top 50 traités', async () => {
        const manySkills = Array.from({ length: 60 }, (_, i) => `Skill${i}`);
        prisma.project.findMany.mockResolvedValue([{ requiredSkills: manySkills }]);
        prisma.user.findMany.mockResolvedValue([]);
        prisma.$queryRaw.mockResolvedValue([{ embedding: JSON.stringify([0.1]) }]);

        await service.refreshSkillEmbeddings();

        expect(prisma.filterEmbedding.upsert.mock.calls.length).toBeLessThanOrEqual(50);
    });

    // ─── Testeur 10 — Ibrahim : AI crash ne casse pas le refresh ───
    test('Ibrahim — AI crash sur 1 skill → warn mais continue les autres', async () => {
        prisma.project.findMany.mockResolvedValue([{ requiredSkills: ['Go', 'Ruby'] }]);
        prisma.user.findMany.mockResolvedValue([]);
        // Aucun embedding en cache → tente de les générer tous
        prisma.$queryRaw.mockResolvedValue([]);
        ai.getEmbedding
            .mockRejectedValueOnce(new Error('Jina timeout'))
            .mockResolvedValueOnce([0.9, 0.8]);

        await expect(service.refreshSkillEmbeddings()).resolves.not.toThrow();

        // Les 2 upsert ont bien eu lieu malgré le crash sur l'un
        expect(prisma.filterEmbedding.upsert).toHaveBeenCalledTimes(2);
    });
});
