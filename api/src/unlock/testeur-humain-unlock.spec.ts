/**
 * TESTEURS HUMAINS — Module Unlock (Pay-to-Contact)
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - UnlockService.hasUnlock (cache Redis miss/hit)
 *   - UnlockService.createUnlockFromTransaction (PAID, ownership, self-unlock, double)
 *   - UnlockService.revokeUnlockOnRefund (suppression + invalidation cache)
 *   - UnlockService.listMyUnlocks (pagination)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { UnlockService } from './unlock.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { I18nService } from '../i18n/i18n.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockI18n = { t: jest.fn((k: string) => k), resolveLocale: jest.fn().mockReturnValue('fr') };

// ─── Testeurs ────────────────────────────────────────────
const AMADOU_ID = 'user-amadou-ul-001';
const FATOU_ID = 'user-fatou-ul-002';
const JEAN_ID = 'user-jean-ul-003';
const MOUSSA_ID = 'user-moussa-ul-004';
const AISHA_ID = 'user-aisha-ul-005';
const PAUL_ID = 'user-paul-ul-006';
const MARIE_ID = 'user-marie-ul-007';
const OLIVIER_ID = 'user-olivier-ul-008';
const SANDRINE_ID = 'user-sandrine-ul-009';
const IBRAHIM_ID = 'user-ibrahim-ul-010';

// ─── Mocks ───────────────────────────────────────────────
function createMockPrisma() {
    return {
        unlock: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        transaction: {
            findUnique: jest.fn(),
        },
        candidateProfile: {
            findUnique: jest.fn(),
        },
        project: {
            findUnique: jest.fn(),
        },
    };
}

function createMockRedis() {
    return {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
    };
}

function createMockNotifications() {
    return {
        notify: jest.fn().mockResolvedValue({}),
        getUserLocale: jest.fn().mockResolvedValue('fr'),
    };
}

async function makeService(
    prisma: ReturnType<typeof createMockPrisma>,
    redis: ReturnType<typeof createMockRedis>,
    notifications: ReturnType<typeof createMockNotifications>,
) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            UnlockService,
            { provide: PrismaService, useValue: prisma },
            { provide: NotificationsService, useValue: notifications },
            { provide: I18nService, useValue: mockI18n },
            { provide: REDIS_CLIENT, useValue: redis },
        ],
    }).compile();
    return module.get(UnlockService);
}

// ════════════════════════════════════════════════════════════
//  Testeur 1 — Amadou (hasUnlock cache miss → DB)
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou : hasUnlock cache miss → DB', () => {
    test('Amadou cache miss (null) → DB fetch + setex cache', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        redis.get.mockResolvedValue(null);
        prisma.unlock.findFirst.mockResolvedValue({ id: 'ul-001' });

        const result = await svc.hasUnlock(AMADOU_ID, 'target-001');

        expect(result).toBe(true);
        expect(prisma.unlock.findFirst).toHaveBeenCalledTimes(1);
        expect(redis.setex).toHaveBeenCalledWith(`unlock:${AMADOU_ID}:target-001`, 300, '1');
    });

    test('Amadou cache miss, aucun unlock en DB → false + setex "0"', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        redis.get.mockResolvedValue(null);
        prisma.unlock.findFirst.mockResolvedValue(null);

        const result = await svc.hasUnlock(AMADOU_ID, 'target-001');

        expect(result).toBe(false);
        expect(redis.setex).toHaveBeenCalledWith(`unlock:${AMADOU_ID}:target-001`, 300, '0');
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 2 — Fatou (hasUnlock cache hit → no DB)
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou : hasUnlock cache hit', () => {
    test('Fatou cache hit "1" → true sans appel DB', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        redis.get.mockResolvedValue('1');

        const result = await svc.hasUnlock(FATOU_ID, 'target-002');

        expect(result).toBe(true);
        expect(prisma.unlock.findFirst).not.toHaveBeenCalled();
    });

    test('Fatou cache hit "0" → false sans appel DB', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        redis.get.mockResolvedValue('0');

        const result = await svc.hasUnlock(FATOU_ID, 'target-002');

        expect(result).toBe(false);
        expect(prisma.unlock.findFirst).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 3 — Jean (createUnlockFromTransaction nominal)
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean : createUnlockFromTransaction nominal', () => {
    test('Jean tx PAID à lui → unlock créé + notif envoyée + cache invalidé', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-jean-001',
            userId: JEAN_ID,
            status: 'PAID',
        });
        prisma.candidateProfile.findUnique.mockResolvedValue({ userId: 'other-user' });
        prisma.unlock.create.mockResolvedValue({ id: 'ul-jean-001' });
        // resolveTargetName → candidate exists
        prisma.candidateProfile.findUnique
            .mockResolvedValueOnce({ userId: 'other-user' }) // checkNotSelfUnlock
            .mockResolvedValueOnce({ user: { name: 'Target Candidate' } }); // resolveTargetName

        const result = await svc.createUnlockFromTransaction(
            JEAN_ID,
            'tx-jean-001',
            'candidate-target-001',
            'candidate',
        );

        expect(result.id).toBe('ul-jean-001');
        expect(prisma.unlock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: JEAN_ID,
                    transactionId: 'tx-jean-001',
                    targetCandidateId: 'candidate-target-001',
                }),
            }),
        );
        expect(redis.del).toHaveBeenCalledWith(`unlock:${JEAN_ID}:candidate-target-001`);
        expect(notif.notify).toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 4 — Moussa (tx d'un autre user → ForbiddenException)
// ════════════════════════════════════════════════════════════
describe('Testeur 4 — Moussa : tx d\'un autre user', () => {
    test('Moussa utilise la tx de quelqu\'un d\'autre → ForbiddenException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-foreign-001',
            userId: 'someone-else-id',
            status: 'PAID',
        });

        await expect(
            svc.createUnlockFromTransaction(MOUSSA_ID, 'tx-foreign-001', 'candidate-x', 'candidate'),
        ).rejects.toThrow(ForbiddenException);

        expect(prisma.unlock.create).not.toHaveBeenCalled();
    });

    test('Moussa transaction introuvable → NotFoundException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue(null);

        await expect(
            svc.createUnlockFromTransaction(MOUSSA_ID, 'tx-ghost', 'candidate-x', 'candidate'),
        ).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 5 — Aisha (tx non PAID → BadRequestException)
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha : tx non PAID', () => {
    test('Aisha tx PENDING → BadRequestException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-aisha-pending',
            userId: AISHA_ID,
            status: 'PENDING',
        });

        await expect(
            svc.createUnlockFromTransaction(AISHA_ID, 'tx-aisha-pending', 'candidate-y', 'candidate'),
        ).rejects.toThrow(BadRequestException);

        expect(prisma.unlock.create).not.toHaveBeenCalled();
    });

    test('Aisha tx FAILED → BadRequestException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-aisha-failed',
            userId: AISHA_ID,
            status: 'FAILED',
        });

        await expect(
            svc.createUnlockFromTransaction(AISHA_ID, 'tx-aisha-failed', 'project-y', 'project'),
        ).rejects.toThrow(BadRequestException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 6 — Paul (unlock son propre profil → BadRequestException)
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul : self-unlock interdit', () => {
    test('Paul unlock son propre candidateProfile → BadRequestException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-paul',
            userId: PAUL_ID,
            status: 'PAID',
        });
        // Le candidateProfile appartient à Paul lui-même
        prisma.candidateProfile.findUnique.mockResolvedValue({ userId: PAUL_ID });

        await expect(
            svc.createUnlockFromTransaction(PAUL_ID, 'tx-paul', 'candidate-paul', 'candidate'),
        ).rejects.toThrow(BadRequestException);

        expect(prisma.unlock.create).not.toHaveBeenCalled();
    });

    test('Paul unlock son propre project → BadRequestException', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-paul-2',
            userId: PAUL_ID,
            status: 'PAID',
        });
        prisma.project.findUnique.mockResolvedValue({ founderId: PAUL_ID });

        await expect(
            svc.createUnlockFromTransaction(PAUL_ID, 'tx-paul-2', 'project-paul', 'project'),
        ).rejects.toThrow(BadRequestException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 7 — Marie (double unlock P2002 → ConflictException)
// ════════════════════════════════════════════════════════════
describe('Testeur 7 — Marie : double unlock P2002', () => {
    test('Marie re-unlock même profil → ConflictException (P2002)', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.transaction.findUnique.mockResolvedValue({
            id: 'tx-marie',
            userId: MARIE_ID,
            status: 'PAID',
        });
        prisma.candidateProfile.findUnique.mockResolvedValue({ userId: 'other-user' });
        const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        prisma.unlock.create.mockRejectedValue(p2002);

        await expect(
            svc.createUnlockFromTransaction(MARIE_ID, 'tx-marie', 'candidate-double', 'candidate'),
        ).rejects.toThrow(ConflictException);
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 8 — Olivier (revokeUnlockOnRefund)
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier : revokeUnlockOnRefund', () => {
    test('Olivier refund → unlock supprimé + cache invalidé', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.unlock.findMany.mockResolvedValue([
            {
                id: 'ul-olivier-001',
                userId: OLIVIER_ID,
                targetCandidateId: 'candidate-target-ol',
                targetProjectId: null,
            },
        ]);
        prisma.unlock.delete.mockResolvedValue({ id: 'ul-olivier-001' });

        await svc.revokeUnlockOnRefund('tx-refund-ol');

        expect(prisma.unlock.delete).toHaveBeenCalledWith({ where: { id: 'ul-olivier-001' } });
        expect(redis.del).toHaveBeenCalledWith(`unlock:${OLIVIER_ID}:candidate-target-ol`);
    });

    test('Olivier refund avec tx sans unlock → no-op', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.unlock.findMany.mockResolvedValue([]);

        await svc.revokeUnlockOnRefund('tx-empty');

        expect(prisma.unlock.delete).not.toHaveBeenCalled();
        expect(redis.del).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 9 — Sandrine (listMyUnlocks paginé)
// ════════════════════════════════════════════════════════════
describe('Testeur 9 — Sandrine : listMyUnlocks pagination', () => {
    test('Sandrine liste ses unlocks avec formatage candidate/project', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.unlock.findMany.mockResolvedValue([
            {
                id: 'ul-1',
                targetCandidateId: 'cand-1',
                targetProjectId: null,
                createdAt: new Date('2026-03-01'),
                candidate: { id: 'cand-1', user: { name: 'Jean Candidat', image: 'img1.jpg' } },
                project: null,
            },
            {
                id: 'ul-2',
                targetCandidateId: null,
                targetProjectId: 'proj-1',
                createdAt: new Date('2026-03-02'),
                candidate: null,
                project: { id: 'proj-1', name: 'StartupX', logoUrl: 'logo.jpg', founder: { name: 'F', image: 'f.jpg' } },
            },
        ]);

        const result = await svc.listMyUnlocks(SANDRINE_ID, 20, 0);

        expect(result).toHaveLength(2);
        expect(result[0].targetType).toBe('candidate');
        expect(result[0].targetName).toBe('Jean Candidat');
        expect(result[1].targetType).toBe('project');
        expect(result[1].targetName).toBe('StartupX');
    });

    test('Sandrine demande take=500 → borné à 100', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        prisma.unlock.findMany.mockResolvedValue([]);

        await svc.listMyUnlocks(SANDRINE_ID, 500, 0);

        expect(prisma.unlock.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100 }),
        );
    });
});

// ════════════════════════════════════════════════════════════
//  Testeur 10 — Ibrahim (invalidateCache direct)
// ════════════════════════════════════════════════════════════
describe('Testeur 10 — Ibrahim : invalidateCache', () => {
    test('Ibrahim invalide manuellement le cache → redis.del appelé', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        const svc = await makeService(prisma, redis, notif);

        await svc.invalidateCache(IBRAHIM_ID, 'target-ib-001');

        expect(redis.del).toHaveBeenCalledWith(`unlock:${IBRAHIM_ID}:target-ib-001`);
    });

    test('Ibrahim cache invalidation échoue (redis down) → pas de throw', async () => {
        const prisma = createMockPrisma();
        const redis = createMockRedis();
        const notif = createMockNotifications();
        redis.del.mockRejectedValue(new Error('Redis down'));
        const svc = await makeService(prisma, redis, notif);

        // Ne doit pas throw malgré l'erreur Redis
        await expect(svc.invalidateCache(IBRAHIM_ID, 'target-ib-002')).resolves.toBeUndefined();
    });
});
