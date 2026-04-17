/**
 * TESTEURS HUMAINS — Module Boost (24h project boost)
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - BoostService.activateBoost (plan, ownership, quota, déjà actif)
 *   - BoostService.getRemainingBoosts
 *   - BoostService.getActiveBoostProjectIds
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserPlan } from '@prisma/client';
import { BoostService } from './boost.service';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';

const mockI18n = {
    t: jest.fn((k: string) => k),
    resolveLocale: jest.fn().mockReturnValue('fr'),
};

// ─── Testeurs ────────────────────────────────────────────
const AMADOU_UID = 'firebase-amadou-bst-001';
const FATOU_UID = 'firebase-fatou-bst-002';
const JEAN_UID = 'firebase-jean-bst-003';
const MOUSSA_UID = 'firebase-moussa-bst-004';
const AISHA_UID = 'firebase-aisha-bst-005';
const PAUL_UID = 'firebase-paul-bst-006';
const MARIE_UID = 'firebase-marie-bst-007';
const OLIVIER_UID = 'firebase-olivier-bst-008';

const AMADOU_ID = 'user-amadou-bst-001';
const FATOU_ID = 'user-fatou-bst-002';
const JEAN_ID = 'user-jean-bst-003';
const MOUSSA_ID = 'user-moussa-bst-004';
const AISHA_ID = 'user-aisha-bst-005';
const PAUL_ID = 'user-paul-bst-006';
const MARIE_ID = 'user-marie-bst-007';
const OLIVIER_ID = 'user-olivier-bst-008';

// ─── Mocks ───────────────────────────────────────────────
function createMockPrisma() {
    return {
        user: { findUnique: jest.fn() },
        project: { findFirst: jest.fn() },
        boost: {
            count: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
        },
    };
}

async function makeService(prisma: ReturnType<typeof createMockPrisma>) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            BoostService,
            { provide: PrismaService, useValue: prisma },
            { provide: I18nService, useValue: mockI18n },
        ],
    }).compile();
    return module.get(BoostService);
}

// ════════════════════════════════════════════════════════════
//  Testeur 1 — Amadou (PRO nominal : boost créé)
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou : PRO active boost', () => {
    test('Amadou (PRO) boost son propre projet → BoostRequest créé, expiresAt +24h', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: AMADOU_ID,
            plan: UserPlan.PRO,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-amadou-1' });
        prisma.boost.count.mockResolvedValue(0); // 0 boosts utilisés ce mois
        prisma.boost.findFirst.mockResolvedValue(null); // Pas de boost actif
        const now = Date.now();
        prisma.boost.create.mockResolvedValue({
            id: 'boost-001',
            expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        });

        const result = await svc.activateBoost(AMADOU_UID, 'proj-amadou-1');

        expect(result.id).toBe('boost-001');
        expect(prisma.boost.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: AMADOU_ID,
                projectId: 'proj-amadou-1',
                expiresAt: expect.any(Date),
            }),
        });
        const createdExpiresAt = prisma.boost.create.mock.calls[0][0].data.expiresAt as Date;
        expect(createdExpiresAt.getTime()).toBeGreaterThan(now + 23 * 60 * 60 * 1000);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 2 — Fatou (FREE tente boost → refusé plan)
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou : FREE tente boost', () => {
    test('Fatou (FREE, boostsPerMonth=0) → ForbiddenException "plan_required"', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: FATOU_ID,
            plan: UserPlan.FREE,
            preferredLang: 'fr',
        });

        await expect(svc.activateBoost(FATOU_UID, 'proj-fatou-1')).rejects.toThrow(ForbiddenException);

        expect(prisma.boost.create).not.toHaveBeenCalled();
    });

    test('Fatou (PLUS, boostsPerMonth=0) → ForbiddenException (PLUS n\'a pas de boosts)', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: FATOU_ID,
            plan: UserPlan.PLUS,
            preferredLang: 'fr',
        });

        await expect(svc.activateBoost(FATOU_UID, 'proj-fatou-1')).rejects.toThrow(ForbiddenException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 3 — Jean (PRO dépasse 5/mois → ForbiddenException)
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean : PRO dépasse quota mensuel', () => {
    test('Jean (PRO) avec 5 boosts utilisés → 6e refusé', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: JEAN_ID,
            plan: UserPlan.PRO,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-jean' });
        prisma.boost.count.mockResolvedValue(5); // Limite PRO atteinte

        await expect(svc.activateBoost(JEAN_UID, 'proj-jean')).rejects.toThrow(ForbiddenException);

        expect(prisma.boost.create).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 4 — Moussa (non-owner tente boost → NotFoundException)
// ════════════════════════════════════════════════════════════
describe('Testeur 4 — Moussa : non-owner tente boost', () => {
    test('Moussa (PRO) tente boost d\'un projet qui n\'est pas à lui → NotFoundException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: MOUSSA_ID,
            plan: UserPlan.PRO,
            preferredLang: 'fr',
        });
        // findFirst filtre par founderId: MOUSSA_ID → retourne null car pas owner
        prisma.project.findFirst.mockResolvedValue(null);

        await expect(svc.activateBoost(MOUSSA_UID, 'proj-someone-else')).rejects.toThrow(
            NotFoundException,
        );

        expect(prisma.boost.create).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 5 — Aisha (getRemainingBoosts)
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha : getRemainingBoosts', () => {
    test('Aisha (PRO) 2/5 utilisés → { used: 2, remaining: 3, total: 5, plan: PRO }', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID, plan: UserPlan.PRO });
        prisma.boost.count.mockResolvedValue(2);

        const result = await svc.getRemainingBoosts(AISHA_UID);

        expect(result).toEqual({
            used: 2,
            remaining: 3,
            total: 5,
            plan: UserPlan.PRO,
        });
    });

    test('Aisha user inexistant → NotFoundException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue(null);

        await expect(svc.getRemainingBoosts('firebase-ghost')).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 6 — Paul (ELITE a 15 boosts/mois)
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul : ELITE a 15 boosts', () => {
    test('Paul (ELITE) 0 utilisés → remaining=15, total=15', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID, plan: UserPlan.ELITE });
        prisma.boost.count.mockResolvedValue(0);

        const result = await svc.getRemainingBoosts(PAUL_UID);

        expect(result.total).toBe(15);
        expect(result.remaining).toBe(15);
        expect(result.plan).toBe(UserPlan.ELITE);
    });

    test('Paul (ELITE) 14/15 utilisés → peut activer le 15e', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID,
            plan: UserPlan.ELITE,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-paul' });
        prisma.boost.count.mockResolvedValue(14);
        prisma.boost.findFirst.mockResolvedValue(null);
        prisma.boost.create.mockResolvedValue({
            id: 'boost-paul-15',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const result = await svc.activateBoost(PAUL_UID, 'proj-paul');

        expect(result.id).toBe('boost-paul-15');
    });

    test('Paul (ELITE) 15/15 utilisés → 16e refusé par ForbiddenException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID,
            plan: UserPlan.ELITE,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-paul' });
        prisma.boost.count.mockResolvedValue(15);

        await expect(svc.activateBoost(PAUL_UID, 'proj-paul')).rejects.toThrow(ForbiddenException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 7 — Marie (boost sur projet inexistant)
// ════════════════════════════════════════════════════════════
describe('Testeur 7 — Marie : projet inexistant', () => {
    test('Marie (PRO) boost sur un id inexistant → NotFoundException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: MARIE_ID,
            plan: UserPlan.PRO,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue(null);

        await expect(svc.activateBoost(MARIE_UID, 'proj-ghost')).rejects.toThrow(NotFoundException);
    });

    test('Marie user inexistant → NotFoundException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue(null);

        await expect(svc.activateBoost('firebase-ghost-marie', 'proj-1')).rejects.toThrow(
            NotFoundException,
        );
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 8 — Olivier (projet déjà boosté)
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier : boost déjà actif', () => {
    test('Olivier (PRO) tente boost d\'un projet déjà boosté (non expiré) → ForbiddenException', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.user.findUnique.mockResolvedValue({
            id: OLIVIER_ID,
            plan: UserPlan.PRO,
            preferredLang: 'fr',
        });
        prisma.project.findFirst.mockResolvedValue({ id: 'proj-olivier' });
        prisma.boost.count.mockResolvedValue(1);
        prisma.boost.findFirst.mockResolvedValue({
            id: 'boost-existing',
            expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000), // +5h, actif
        });

        await expect(svc.activateBoost(OLIVIER_UID, 'proj-olivier')).rejects.toThrow(
            ForbiddenException,
        );

        expect(prisma.boost.create).not.toHaveBeenCalled();
    });

    test('Olivier getActiveBoostProjectIds retourne les projets boostés actifs', async () => {
        const prisma = createMockPrisma();
        const svc = await makeService(prisma);

        prisma.boost.findMany.mockResolvedValue([
            { projectId: 'proj-A' },
            { projectId: 'proj-B' },
        ]);

        const ids = await svc.getActiveBoostProjectIds();
        expect(ids).toEqual(['proj-A', 'proj-B']);
    });
});
