/**
 * TESTEURS HUMAINS — Module Interactions (Save / Skip / Like)
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - InteractionsService.create (SAVE + limite FREE, SKIP, doublon)
 *   - InteractionsService.getSavedProjectIds (idempotence save/unsave)
 *   - InteractionsService.undoLastSkip (fenetre 5min)
 *   - InteractionsService.getLikers (PRO+ sur un projet)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserPlan } from '@prisma/client';
import { InteractionsService } from './interactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';

const mockI18n = { t: jest.fn((k: string) => k), resolveLocale: jest.fn().mockReturnValue('fr') };

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-int-001';
const FATOU_UID = 'firebase-fatou-int-002';
const JEAN_UID = 'firebase-jean-int-003';
const MOUSSA_UID = 'firebase-moussa-int-004';
const AISHA_UID = 'firebase-aisha-int-005';
const PAUL_UID = 'firebase-paul-int-006';
const MARIE_UID = 'firebase-marie-int-007';
const OLIVIER_UID = 'firebase-olivier-int-008';
const SANDRINE_UID = 'firebase-sandrine-int-009';
const IBRAHIM_UID = 'firebase-ibrahim-int-010';

const AMADOU_ID = 'user-amadou-int-001';
const FATOU_ID = 'user-fatou-int-002';
const JEAN_ID = 'user-jean-int-003';
const MOUSSA_ID = 'user-moussa-int-004';
const AISHA_ID = 'user-aisha-int-005';
const PAUL_ID = 'user-paul-int-006';
const MARIE_ID = 'user-marie-int-007';
const OLIVIER_ID = 'user-olivier-int-008';
const SANDRINE_ID = 'user-sandrine-int-009';
const IBRAHIM_ID = 'user-ibrahim-int-010';

// ─── Mock Prisma ─────────────────────────────────────────
function createMockPrisma() {
    return {
        user: { findUnique: jest.fn() },
        project: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
        },
        userProjectInteraction: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
    };
}

async function makeService(prisma: ReturnType<typeof createMockPrisma>) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            InteractionsService,
            { provide: PrismaService, useValue: prisma },
            { provide: I18nService, useValue: mockI18n },
        ],
    }).compile();
    return module.get(InteractionsService);
}

// ════════════════════════════════════════════════════════════
//  Testeur 1 — Amadou (nominal : SAVE + persiste en BD)
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou : SAVE nominal', () => {
    test('Amadou (PLUS) save un projet → interaction SAVE créée en BD', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID, plan: UserPlan.PLUS, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-001' });
        prisma.userProjectInteraction.create.mockResolvedValue({ id: 'int-001', action: 'SAVE' });

        const result = await svc.create(AMADOU_UID, { projectId: 'proj-001', action: 'SAVE' });

        expect(result).toBeDefined();
        expect(result!.action).toBe('SAVE');
        expect(prisma.userProjectInteraction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: AMADOU_ID,
                projectId: 'proj-001',
                action: 'SAVE',
            }),
        });
    });

    test('Amadou — projet inexistant → renvoie null', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID, plan: UserPlan.PLUS, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue(null);

        const result = await svc.create(AMADOU_UID, { projectId: 'ghost', action: 'SAVE' });
        expect(result).toBeNull();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 2 — Fatou (idempotence : save déjà saved)
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou : idempotence SAVE/UNSAVE', () => {
    test('Fatou save → unsave → re-save → getSavedProjectIds reflète correctement', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });

        // Séquence : SAVE proj-A, SAVE proj-B, UNSAVE proj-A, SAVE proj-A
        prisma.userProjectInteraction.findMany.mockResolvedValue([
            { projectId: 'proj-A', action: 'SAVE', createdAt: new Date('2026-03-01') },
            { projectId: 'proj-B', action: 'SAVE', createdAt: new Date('2026-03-02') },
            { projectId: 'proj-A', action: 'UNSAVE', createdAt: new Date('2026-03-03') },
            { projectId: 'proj-A', action: 'SAVE', createdAt: new Date('2026-03-04') },
        ]);

        const saved = await svc.getSavedProjectIds(FATOU_UID);

        // L'ordre des items n'importe pas, mais le contenu doit etre A + B
        expect(saved.sort()).toEqual(['proj-A', 'proj-B']);
    });

    test('Fatou user inexistant → getSavedProjectIds retourne []', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue(null);

        const saved = await svc.getSavedProjectIds('firebase-ghost');
        expect(saved).toEqual([]);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 3 — Jean (comptable : limite FREE savesMax = 10)
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean : limite FREE savesMax = 10', () => {
    test('Jean (FREE) avec 10 saves → 11e save refusé par ForbiddenException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: JEAN_ID, plan: UserPlan.FREE, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-11' });

        // Simule 10 SAVE déjà en BD → getSavedProjectIds retourne 10 ids
        prisma.userProjectInteraction.findMany.mockResolvedValue(
            Array.from({ length: 10 }, (_, i) => ({
                projectId: `proj-${i}`,
                action: 'SAVE',
                createdAt: new Date(),
            })),
        );

        await expect(
            svc.create(JEAN_UID, { projectId: 'proj-11', action: 'SAVE' }),
        ).rejects.toThrow(ForbiddenException);

        expect(prisma.userProjectInteraction.create).not.toHaveBeenCalled();
    });

    test('Jean (FREE) avec 9 saves → 10e save passe', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: JEAN_ID, plan: UserPlan.FREE, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-10' });
        prisma.userProjectInteraction.findMany.mockResolvedValue(
            Array.from({ length: 9 }, (_, i) => ({
                projectId: `proj-${i}`,
                action: 'SAVE',
                createdAt: new Date(),
            })),
        );
        prisma.userProjectInteraction.create.mockResolvedValue({ id: 'int-10', action: 'SAVE' });

        const result = await svc.create(JEAN_UID, { projectId: 'proj-10', action: 'SAVE' });
        expect(result).toBeDefined();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 4 — Moussa (PLUS : savesMax = Infinity, pas de limite)
// ════════════════════════════════════════════════════════════
describe('Testeur 4 — Moussa : PLUS savesMax = Infinity', () => {
    test('Moussa (PLUS) avec 50 saves → 51e save passe sans limite', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: MOUSSA_ID, plan: UserPlan.PLUS, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-51' });
        // Avec PLUS, la limite n'est meme pas evaluee, mais on laisse findMany par defaut
        prisma.userProjectInteraction.create.mockResolvedValue({ id: 'int-51', action: 'SAVE' });

        const result = await svc.create(MOUSSA_UID, { projectId: 'proj-51', action: 'SAVE' });
        expect(result).toBeDefined();
        // Pas d'appel à findMany car la branche SAVE+FREE n'a pas été déclenchée
        expect(prisma.userProjectInteraction.findMany).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 5 — Aisha (SKIP : création interaction SKIP)
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha : SKIP et UNSAVE', () => {
    test('Aisha skip un projet → interaction SKIP créée', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID, plan: UserPlan.FREE, preferredLang: 'fr' });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-skip' });
        prisma.userProjectInteraction.create.mockResolvedValue({ id: 'int-skip', action: 'SKIP' });

        const result = await svc.create(AISHA_UID, { projectId: 'proj-skip', action: 'SKIP' });

        expect(result!.action).toBe('SKIP');
        expect(prisma.userProjectInteraction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ action: 'SKIP', userId: AISHA_ID, projectId: 'proj-skip' }),
        });
    });

    test('Aisha unsave un projet → getSavedProjectIds retire le projet', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.userProjectInteraction.findMany.mockResolvedValue([
            { projectId: 'proj-X', action: 'SAVE', createdAt: new Date('2026-03-01') },
            { projectId: 'proj-X', action: 'UNSAVE', createdAt: new Date('2026-03-02') },
        ]);

        const saved = await svc.getSavedProjectIds(AISHA_UID);
        expect(saved).not.toContain('proj-X');
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 6 — Paul (undoLastSkip fenêtre 5 min)
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul : undoLastSkip', () => {
    test('Paul undo un skip < 5min → projet retourné + interaction supprimée', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID });
        prisma.userProjectInteraction.findFirst.mockResolvedValue({
            id: 'int-skip-001',
            projectId: 'proj-undo',
        });
        prisma.userProjectInteraction.delete.mockResolvedValue({ id: 'int-skip-001' });

        const result = await svc.undoLastSkip(PAUL_UID);

        expect(result).toEqual({ projectId: 'proj-undo' });
        expect(prisma.userProjectInteraction.delete).toHaveBeenCalledWith({
            where: { id: 'int-skip-001' },
        });
    });

    test('Paul undo sans skip récent (> 5min ou aucun) → renvoie null', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID });
        // findFirst filtre déjà createdAt >= now-5min, donc un skip ancien ne sera pas retourné
        prisma.userProjectInteraction.findFirst.mockResolvedValue(null);

        const result = await svc.undoLastSkip(PAUL_UID);
        expect(result).toBeNull();
        expect(prisma.userProjectInteraction.delete).not.toHaveBeenCalled();
    });

    test('Paul undo avec firebaseUid inconnu → renvoie null', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue(null);

        const result = await svc.undoLastSkip('firebase-ghost-paul');
        expect(result).toBeNull();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 7 — Marie (getLikers sur un projet PRO+)
// ════════════════════════════════════════════════════════════
describe('Testeur 7 — Marie : getLikers & getLikersCount', () => {
    test('Marie liste les likers d\'un projet avec pagination bornée', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        const likers = [
            {
                createdAt: new Date(),
                user: { id: MARIE_ID, firstName: 'Marie', lastName: 'L', image: null, role: 'USER', plan: 'PRO' },
            },
            {
                createdAt: new Date(),
                user: { id: 'u-2', firstName: 'Alex', lastName: 'P', image: null, role: 'USER', plan: 'PLUS' },
            },
        ];
        prisma.userProjectInteraction.findMany.mockResolvedValue(likers);

        const result = await svc.getLikers('proj-1', 10, 0);

        expect(result).toHaveLength(2);
        expect(prisma.userProjectInteraction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: 'proj-1', action: 'LIKE' },
                take: 10,
                skip: 0,
            }),
        );
    });

    test('Marie demande take=500 → borné à 100', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.userProjectInteraction.findMany.mockResolvedValue([]);

        await svc.getLikers('proj-1', 500, 0);

        expect(prisma.userProjectInteraction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100 }),
        );
    });

    test('Marie compte les likes d\'un projet', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.userProjectInteraction.count.mockResolvedValue(42);

        const count = await svc.getLikersCount('proj-1');
        expect(count).toBe(42);
        expect(prisma.userProjectInteraction.count).toHaveBeenCalledWith({
            where: { projectId: 'proj-1', action: 'LIKE' },
        });
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 8 — Olivier (getSavedIds user courant)
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier : getSavedProjectIds user courant', () => {
    test('Olivier sans aucune interaction → saved = []', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID });
        prisma.userProjectInteraction.findMany.mockResolvedValue([]);

        const saved = await svc.getSavedProjectIds(OLIVIER_UID);
        expect(saved).toEqual([]);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 9 — Sandrine (user inexistant → null)
// ════════════════════════════════════════════════════════════
describe('Testeur 9 — Sandrine : user inexistant', () => {
    test('Sandrine avec firebaseUid inconnu → create retourne null', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue(null);

        const result = await svc.create('firebase-ghost', { projectId: 'proj-1', action: 'VIEW' });
        expect(result).toBeNull();
        expect(prisma.userProjectInteraction.create).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 10 — Ibrahim (getProjectOwner)
// ════════════════════════════════════════════════════════════
describe('Testeur 10 — Ibrahim : getProjectOwner', () => {
    test('Ibrahim récupère le founder d\'un projet', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.project.findUnique.mockResolvedValue({ founderId: IBRAHIM_ID });

        const owner = await svc.getProjectOwner('proj-owner-1');
        expect(owner).toEqual({ founderId: IBRAHIM_ID });
        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: 'proj-owner-1' },
            select: { founderId: true },
        });
    });
});
