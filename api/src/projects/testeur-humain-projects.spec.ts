/**
 * TESTEURS HUMAINS — Module Projects (Projets)
 *
 * 10 testeurs simulent des scenarios reels sur ProjectsService :
 *   - create (creation avec validation + archival)
 *   - findOne / findAll (lecture)
 *   - update (ownership)
 *   - remove (soft/hard delete)
 *   - getFeed (pagination, filtres)
 *   - archivePublishedProjects (un seul projet publié par fondateur)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts et
 * src/payment/testeur-humain-pre-prod.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../ai/ai.service';
import { MatchingService } from '../matching/matching.service';
import { ModerationService } from '../moderation/moderation.service';
import { FiltersService } from '../filters/filters.service';
import { I18nService } from '../i18n/i18n.service';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-proj-001';
const FATOU_UID = 'firebase-fatou-proj-002';
const JEAN_UID = 'firebase-jean-proj-003';
const MOUSSA_UID = 'firebase-moussa-proj-004';
const AISHA_UID = 'firebase-aisha-proj-005';
const PAUL_UID = 'firebase-paul-proj-006';
const MARIE_UID = 'firebase-marie-proj-007';
const OLIVIER_UID = 'firebase-olivier-proj-008';
const SANDRINE_UID = 'firebase-sandrine-proj-009';
const IBRAHIM_UID = 'firebase-ibrahim-proj-010';

const AMADOU_ID = 'user-amadou-proj-001';
const FATOU_ID = 'user-fatou-proj-002';
const JEAN_ID = 'user-jean-proj-003';
const AISHA_ID = 'user-aisha-proj-005';
const PAUL_ID = 'user-paul-proj-006';
const MARIE_ID = 'user-marie-proj-007';
const OLIVIER_ID = 'user-olivier-proj-008';
const SANDRINE_ID = 'user-sandrine-proj-009';
const IBRAHIM_ID = 'user-ibrahim-proj-010';

const PROJECT_ID = 'project-new-001';

// ─── Helpers ─────────────────────────────────────────────
const mockTxClientRef: { current: any } = { current: null };

function createMockPrisma() {
    return {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        project: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
        },
        application: {
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
        notification: {
            createMany: jest.fn(),
        },
        userProjectInteraction: {
            groupBy: jest.fn().mockResolvedValue([]),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
        $executeRaw: jest.fn().mockResolvedValue(1),
        $transaction: jest.fn((opsOrCb: any) => {
            if (typeof opsOrCb === 'function') {
                return opsOrCb(mockTxClientRef.current);
            }
            return Promise.all(opsOrCb);
        }),
    };
}

function makeTestingModule(prisma: any) {
    mockTxClientRef.current = prisma;
    return Test.createTestingModule({
        providers: [
            ProjectsService,
            { provide: PrismaService, useValue: prisma },
            {
                provide: InteractionsService,
                useValue: {
                    getUserSignals: jest.fn().mockResolvedValue(null),
                },
            },
            {
                provide: UploadService,
                useValue: {
                    uploadProjectLogo: jest.fn().mockResolvedValue('https://cdn/x.png'),
                    isAvailable: jest.fn().mockReturnValue(true),
                },
            },
            {
                provide: AiService,
                useValue: {
                    getEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0)),
                    getEmbeddingModel: jest.fn().mockReturnValue('jina-v3'),
                },
            },
            {
                provide: MatchingService,
                useValue: {
                    calculateForProject: jest.fn().mockResolvedValue(undefined),
                },
            },
            {
                provide: ModerationService,
                useValue: {
                    moderateProject: jest.fn().mockResolvedValue(undefined),
                },
            },
            {
                provide: FiltersService,
                useValue: {
                    getSkillEmbedding: jest.fn().mockResolvedValue(null),
                },
            },
            {
                provide: I18nService,
                useValue: {
                    t: jest.fn((k: string) => k),
                },
            },
        ],
    }).compile();
}

function makeProject(overrides: Record<string, any> = {}) {
    return {
        id: PROJECT_ID,
        name: 'MojiraX Test',
        slug: 'mojirax-test-abcd',
        pitch: 'Un super projet',
        status: 'PUBLISHED',
        founderId: AMADOU_ID,
        sector: 'TECH',
        stage: 'MVP_BUILD',
        city: 'Douala',
        location: 'Douala, Cameroun',
        logoUrl: null,
        isRemote: false,
        requiredSkills: ['React'],
        qualityScore: 80,
        createdAt: new Date(),
        ...overrides,
    };
}

// ════════════════════════════════════════════════════════════
//  create() — creation de projet
// ════════════════════════════════════════════════════════════

describe('ProjectsService.create — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 1 — Amadou : création valide ───
    test('Amadou — crée un projet avec name + pitch → OK + slug auto-généré', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        // archivePublishedProjects: pas d'anciens projets publiés
        prisma.project.findMany.mockResolvedValue([]);
        prisma.project.create.mockResolvedValue(
            makeProject({ status: 'PENDING_AI', name: 'Nouveau Projet' }),
        );
        prisma.user.update.mockResolvedValue({});

        const result = await service.create(AMADOU_UID, {
            name: 'Nouveau Projet',
            pitch: 'Un pitch incroyable',
        });

        expect(result.name).toBe('Nouveau Projet');
        expect(prisma.project.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Nouveau Projet',
                    pitch: 'Un pitch incroyable',
                    status: 'PENDING_AI',
                    slug: expect.stringMatching(/^nouveau-projet-[a-z0-9]{4}$/),
                }),
            }),
        );
    });

    // ─── Testeur 3 — Moussa : user non trouvé ───
    test('Moussa — user Firebase inconnu → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
            service.create(MOUSSA_UID, { name: 'X', pitch: 'Y' }),
        ).rejects.toThrow(NotFoundException);
    });

    // ─── Testeur 2 — Fatou : champ name manquant ───
    test('Fatou — pas de name → BadRequestException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });

        await expect(
            service.create(FATOU_UID, { name: '', pitch: 'Pitch' } as any),
        ).rejects.toThrow(BadRequestException);
    });

    // ─── Testeur 4 — Aisha : pitch manquant ───
    test('Aisha — pas de pitch → BadRequestException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });

        await expect(
            service.create(AISHA_UID, { name: 'Nom', pitch: '' } as any),
        ).rejects.toThrow(BadRequestException);
    });

    // ─── Testeur 5 — Paul (doublons) : un seul projet publié par fondateur ───
    test('Paul — crée nouveau projet alors qu\'un PUBLISHED existe → ancien passe en DRAFT', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID });
        // Simuler 1 projet déjà publié
        prisma.project.findMany.mockResolvedValueOnce([
            { id: 'proj-old-1', name: 'Ancien' },
        ]);
        // application.findMany (pending apps on archived projects) retourne []
        prisma.application.findMany.mockResolvedValue([]);
        prisma.project.updateMany.mockResolvedValue({ count: 1 });
        prisma.project.create.mockResolvedValue(makeProject({ name: 'Nouveau' }));
        prisma.user.update.mockResolvedValue({});

        await service.create(PAUL_UID, { name: 'Nouveau', pitch: 'p' });

        expect(prisma.project.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['proj-old-1'] } },
            data: { status: 'DRAFT' },
        });
    });

    // ─── Testeur 8 — Olivier (triche) : projetDraft effacé après création ───
    test('Olivier — après création, projectDraft du user mis à null', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID });
        prisma.project.findMany.mockResolvedValue([]);
        prisma.project.create.mockResolvedValue(makeProject());
        prisma.user.update.mockResolvedValue({});

        await service.create(OLIVIER_UID, { name: 'P', pitch: 'x' });

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: OLIVIER_ID },
                data: expect.objectContaining({ projectDraft: expect.anything() }),
            }),
        );
    });
});

// ════════════════════════════════════════════════════════════
//  update() — modification par owner uniquement
// ════════════════════════════════════════════════════════════

describe('ProjectsService.update — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 1 — Amadou : update de son projet ───
    test('Amadou — update son projet → OK', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: AMADOU_ID }));
        prisma.project.update.mockResolvedValue({
            id: PROJECT_ID,
            name: 'Projet Mis A Jour',
            slug: 'projet-mis-a-jour-xyz1',
            pitch: 'Nouveau pitch',
            status: 'PUBLISHED',
            sector: 'FINTECH',
            stage: 'MVP_BUILD',
            updatedAt: new Date(),
        });

        const result = await service.update(AMADOU_UID, PROJECT_ID, {
            name: 'Projet Mis A Jour',
            pitch: 'Nouveau pitch',
        });

        expect(result.name).toBe('Projet Mis A Jour');
        expect(prisma.project.update).toHaveBeenCalled();
    });

    // ─── Testeur 4 — Aisha (sécurité) : update projet d'un autre ───
    test('Aisha — update projet d\'un autre → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'someone-else' }));

        await expect(
            service.update(AISHA_UID, PROJECT_ID, { name: 'Hack' }),
        ).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 3 — Moussa : user inexistant ───
    test('Moussa — Firebase uid inconnu → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
            service.update(MOUSSA_UID, PROJECT_ID, { name: 'X' }),
        ).rejects.toThrow(NotFoundException);
    });

    // ─── Testeur 9 — Sandrine : projet inexistant ───
    test('Sandrine — projet inexistant → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: SANDRINE_ID });
        prisma.project.findUnique.mockResolvedValue(null);

        await expect(
            service.update(SANDRINE_UID, 'fake-id', { name: 'X' }),
        ).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  remove() — suppression
// ════════════════════════════════════════════════════════════

describe('ProjectsService.remove — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 10 — Ibrahim (nettoie tout) : suppression valide ───
    test('Ibrahim — supprime son projet → delete appelé', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: IBRAHIM_ID });
        prisma.project.findUnique.mockResolvedValue(
            makeProject({ founderId: IBRAHIM_ID, logoUrl: null }),
        );
        prisma.project.delete.mockResolvedValue({ id: PROJECT_ID });

        const result = await service.remove(IBRAHIM_UID, PROJECT_ID);

        expect(result).toEqual({ deleted: true });
        expect(prisma.project.delete).toHaveBeenCalledWith({
            where: { id: PROJECT_ID },
        });
    });

    // ─── Testeur 4 — Aisha : tente de supprimer projet d'un autre ───
    test('Aisha — tente de supprimer projet d\'un autre → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.project.findUnique.mockResolvedValue(
            makeProject({ founderId: 'other-founder' }),
        );

        await expect(
            service.remove(AISHA_UID, PROJECT_ID),
        ).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 3 — Moussa : projet inexistant ───
    test('Moussa — supprime un projet inexistant → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 'user-moussa' });
        prisma.project.findUnique.mockResolvedValue(null);

        await expect(
            service.remove(MOUSSA_UID, 'fake-id'),
        ).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  findOne() — lecture par slug ou id
// ════════════════════════════════════════════════════════════

describe('ProjectsService.findOne — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 1 — Amadou : trouve par slug ───
    test('Amadou — findOne par slug → retourne le projet avec founder', async () => {
        prisma.project.findFirst.mockResolvedValue({
            ...makeProject(),
            founder: { id: AMADOU_ID, firstName: 'Amadou', image: null },
            _count: { applications: 0 },
        });

        const result = await service.findOne('mojirax-test-abcd');

        expect(result.id).toBe(PROJECT_ID);
        expect(prisma.project.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { OR: [{ slug: 'mojirax-test-abcd' }, { id: 'mojirax-test-abcd' }] },
            }),
        );
    });

    // ─── Testeur 3 — Moussa : slug inexistant ───
    test('Moussa — findOne avec slug inconnu → NotFoundException', async () => {
        prisma.project.findFirst.mockResolvedValue(null);

        await expect(service.findOne('fake-slug')).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  findAll() — pagination bornée
// ════════════════════════════════════════════════════════════

describe('ProjectsService.findAll — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 7 — Marie (valeurs extrêmes) : demande 1000 projets ───
    test('Marie — demande take=1000 → clippé à 100', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        await service.findAll(1000, 0);

        expect(prisma.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100, skip: 0 }),
        );
    });

    // ─── Testeur 2 — Fatou : valeurs par défaut ───
    test('Fatou — findAll sans params → take=20', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        await service.findAll();

        expect(prisma.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 20, skip: 0 }),
        );
    });
});

// ════════════════════════════════════════════════════════════
//  getFeed() — feed avec filtres
// ════════════════════════════════════════════════════════════

describe('ProjectsService.getFeed — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 1 — Amadou : feed anonyme ───
    test('Amadou (anonyme) — feed sans firebaseUid → retourne projects + nextCursor', async () => {
        prisma.project.findMany.mockResolvedValue([
            { ...makeProject(), founder: { id: 'f1' }, _count: { applications: 0 } },
        ]);

        const result = await service.getFeed(null, null, 7);

        expect(result.projects).toBeDefined();
        expect(Array.isArray(result.projects)).toBe(true);
        expect(result).toHaveProperty('nextCursor');
        expect(result).toHaveProperty('total');
    });

    // ─── Testeur 6 — Paul (doublons) : exclusion des projets propres ───
    test('Paul — feed authentifié exclut ses propres projets', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID,
            candidateProfile: null,
            skills: [],
            city: null,
            country: null,
        });
        // ownProjects
        prisma.project.findMany
            .mockResolvedValueOnce([{ id: 'own-1' }, { id: 'own-2' }])
            // projects to feed
            .mockResolvedValueOnce([]);

        await service.getFeed(PAUL_UID, null, 7);

        // Second call should exclude own project IDs
        const secondCall = prisma.project.findMany.mock.calls[1][0];
        expect(secondCall.where.id).toEqual({ notIn: ['own-1', 'own-2'] });
    });

    // ─── Testeur 7 — Marie : filtre par sector ───
    test('Marie — filtre sector=FINTECH → where.sector ajouté', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        await service.getFeed(null, null, 7, { sector: 'FINTECH' });

        const call = prisma.project.findMany.mock.calls[0][0];
        expect(call.where.sector).toEqual({ equals: 'FINTECH', mode: 'insensitive' });
    });

    // ─── Testeur 9 — Sandrine : filtre par city ───
    test('Sandrine — filtre city=Douala → where.city ajouté (contains, insensitive)', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        await service.getFeed(null, null, 7, { city: 'Douala' });

        const call = prisma.project.findMany.mock.calls[0][0];
        expect(call.where.city).toEqual({ contains: 'Douala', mode: 'insensitive' });
    });

    // ─── Testeur 10 — Ibrahim : filtre par skills (exact fallback) ───
    test('Ibrahim — filtre skills=[React] (pas d\'embedding) → hasSome exact', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        await service.getFeed(null, null, 7, { skills: ['React'] });

        const call = prisma.project.findMany.mock.calls[0][0];
        expect(call.where.requiredSkills).toEqual({ hasSome: ['React'] });
    });
});

// ════════════════════════════════════════════════════════════
//  archivePublishedProjects() — un seul projet publie
// ════════════════════════════════════════════════════════════

describe('ProjectsService.archivePublishedProjects — testeurs humains', () => {
    let service: ProjectsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ProjectsService);
    });

    // ─── Testeur 9 — Sandrine (audit trail) : notifications candidats ───
    test('Sandrine — archive projets + rejette applications PENDING + notifie', async () => {
        prisma.project.findMany.mockResolvedValue([
            { id: 'p1', name: 'Projet 1' },
        ]);
        prisma.project.updateMany.mockResolvedValue({ count: 1 });
        prisma.application.findMany.mockResolvedValue([
            {
                id: 'app-1',
                projectId: 'p1',
                project: { name: 'Projet 1' },
                candidate: { user: { id: FATOU_ID } },
            },
        ]);
        prisma.application.updateMany.mockResolvedValue({ count: 1 });
        prisma.notification.createMany.mockResolvedValue({ count: 1 });

        const result = await service.archivePublishedProjects(prisma as any, SANDRINE_ID);

        expect(result).toBe(1);
        expect(prisma.project.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['p1'] } },
            data: { status: 'DRAFT' },
        });
        expect(prisma.notification.createMany).toHaveBeenCalled();
    });

    // ─── Testeur 2 — Fatou : aucun projet publié → no-op ───
    test('Fatou — aucun projet publié → retourne 0 (no-op)', async () => {
        prisma.project.findMany.mockResolvedValue([]);

        const result = await service.archivePublishedProjects(prisma as any, FATOU_ID);

        expect(result).toBe(0);
        expect(prisma.project.updateMany).not.toHaveBeenCalled();
    });
});
