/**
 * TESTEURS HUMAINS — Module Admin
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - AdminService.getKpis (dashboard global)
 *   - AdminService.listUsers (filtres role + search + pagination)
 *   - AdminService.banUser / unbanUser (+ AdminLog)
 *   - AdminService.listTransactions (par status)
 *   - AdminService.listLogs (audit logs paginés)
 *   - AdminService.moderateItem (admin approve/reject)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingGateway } from '../messaging/messaging.gateway';
import { I18nService } from '../i18n/i18n.service';

// ─── IDs testeurs ────────────────────────────────────────
const AMADOU_ID = 'user-amadou-adm-001';
const FATOU_ID = 'user-fatou-adm-002';
const MOUSSA_ID = 'user-moussa-adm-004';
const PAUL_ID = 'user-paul-adm-006';
const MARIE_ID = 'user-marie-adm-007';
const SANDRINE_ID = 'user-sandrine-adm-009';

// ─── Helpers ─────────────────────────────────────────────
function createMockPrisma() {
    const countMock = jest.fn().mockResolvedValue(0);
    const aggregateMock = jest.fn().mockResolvedValue({ _sum: { amount: 0 } });
    const groupByMock = jest.fn().mockResolvedValue([]);

    return {
        user: {
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        project: {
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        application: { count: jest.fn().mockResolvedValue(0) },
        transaction: {
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn().mockResolvedValue([]),
            aggregate: aggregateMock,
        },
        unlock: { count: jest.fn().mockResolvedValue(0) },
        candidateProfile: {
            count: jest.fn().mockResolvedValue(0),
            findUnique: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
        },
        moderationLog: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue({ id: 'log-001' }),
        },
        userProjectInteraction: {
            count: jest.fn().mockResolvedValue(0),
            groupBy: groupByMock,
        },
        searchLog: { count: jest.fn().mockResolvedValue(0) },
        userVisit: {
            count: jest.fn().mockResolvedValue(0),
            groupBy: groupByMock,
        },
        adminLog: {
            count: jest.fn().mockResolvedValue(0),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'adm-log-001' }),
        },
        $transaction: jest.fn().mockImplementation((ops: any) => {
            if (Array.isArray(ops)) return Promise.all(ops.map((op: any) => (typeof op?.then === 'function' ? op : Promise.resolve(op))));
            return typeof ops === 'function' ? ops(this) : Promise.resolve(ops);
        }),
    };
}

const mockI18n = { t: jest.fn((k: string) => k), detectLocale: jest.fn().mockReturnValue('fr') };
const mockNotifications = {
    getUserLocale: jest.fn().mockResolvedValue('fr'),
    notify: jest.fn().mockResolvedValue({ id: 'notif-001' }),
};
const mockGateway = { disconnectUser: jest.fn().mockResolvedValue(1) };

async function buildService(prisma: any): Promise<AdminService> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            AdminService,
            { provide: PrismaService, useValue: prisma },
            { provide: NotificationsService, useValue: mockNotifications },
            { provide: MessagingGateway, useValue: mockGateway },
            { provide: I18nService, useValue: mockI18n },
        ],
    }).compile();
    return module.get(AdminService);
}

// ════════════════════════════════════════════════════════════
//  AdminService — testeurs humains
// ════════════════════════════════════════════════════════════

describe('AdminService — testeurs humains', () => {
    let service: AdminService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        mockNotifications.notify.mockClear();
        mockGateway.disconnectUser.mockClear();
        service = await buildService(prisma);
    });

    // ─── Testeur 1 — Amadou (admin) : KPIs nominal ───
    test('Amadou — getKpis retourne users/projects/transactions counts', async () => {
        // Simule 42 users, 10 projets, 5 transactions payées à 100 chacune
        prisma.user.count.mockResolvedValue(42);
        prisma.project.count.mockResolvedValue(10);
        prisma.transaction.count.mockResolvedValue(5);
        prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

        const kpis = await service.getKpis();

        expect(kpis.users.total).toBeGreaterThanOrEqual(0);
        expect(kpis.projects).toBeDefined();
        expect(kpis.revenue).toBeDefined();
        expect(kpis.moderation).toBeDefined();
        expect(kpis.revenue.totalEUR).toBe(500);
    });

    // ─── Testeur 2 — Fatou (rapide) : listUsers avec search ───
    test('Fatou — listUsers avec search texte → filtre OR sur name/email', async () => {
        prisma.user.findMany.mockResolvedValue([
            { id: FATOU_ID, name: 'Fatou Test', email: 'fatou@test.cm', role: 'USER', status: 'ACTIVE' },
        ]);
        prisma.user.count.mockResolvedValue(1);

        const result = await service.listUsers({ search: 'fatou', take: 10, skip: 0 });

        expect(result.users).toHaveLength(1);
        expect(result.total).toBe(1);
        // Le where contient OR avec name + email
        const findManyArgs = prisma.user.findMany.mock.calls[0][0];
        expect(findManyArgs.where.OR).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: expect.anything() }),
                expect.objectContaining({ email: expect.anything() }),
            ]),
        );
    });

    // ─── Testeur 3 — Jean (comptable) : pagination bornée ───
    test('Jean — listUsers take > 50 → capé à 50', async () => {
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        const result = await service.listUsers({ take: 9999, skip: 0 });

        expect(result.take).toBe(50);
        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 50 }),
        );
    });

    test('Jean — listUsers par défaut take=20', async () => {
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        const result = await service.listUsers({});

        expect(result.take).toBe(20);
    });

    // ─── Testeur 4 — Moussa : listUsers filtre par role ───
    test('Moussa — listUsers avec role=ADMIN → filtre applique', async () => {
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        await service.listUsers({ role: 'ADMIN' });

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ role: 'ADMIN' }) }),
        );
    });

    // ─── Testeur 5 — Aisha (securite) : ban user succès ───
    test('Aisha — banUser sur user ACTIVE → status=BANNED + AdminLog + disconnect WS', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID,
            role: 'USER',
            status: 'ACTIVE',
            name: 'Paul',
            email: 'paul@test.cm',
        });
        prisma.project.findMany.mockResolvedValue([{ id: 'proj-paul-1' }]);
        prisma.user.update.mockResolvedValue({});
        prisma.project.updateMany.mockResolvedValue({ count: 1 });
        prisma.adminLog.create.mockResolvedValue({ id: 'log-ban' });

        const result = await service.banUser(AMADOU_ID, PAUL_ID, { reason: 'Spam massif' });

        expect(result.status).toBe('BANNED');
        expect(result.archivedProjects).toBe(1);
        // $transaction appelé
        expect(prisma.$transaction).toHaveBeenCalled();
        // Disconnect WebSocket
        expect(mockGateway.disconnectUser).toHaveBeenCalledWith(PAUL_ID);
    });

    // ─── Testeur 6 — Paul (doublons) : ban déjà banni → Bad Request ───
    test('Paul — ban sur user déjà BANNED → BadRequestException', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID, role: 'USER', status: 'BANNED', name: 'Paul', email: 'p@test.cm',
        });

        await expect(
            service.banUser(AMADOU_ID, PAUL_ID, { reason: 'Test replay ban' }),
        ).rejects.toThrow(BadRequestException);
    });

    // ─── Testeur 7 — Marie (limites) : ban admin interdit ───
    test('Marie — ban sur un ADMIN → BadRequestException', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: MARIE_ID, role: 'ADMIN', status: 'ACTIVE', name: 'Marie Admin', email: 'm@test.cm',
        });

        await expect(
            service.banUser(AMADOU_ID, MARIE_ID, { reason: 'Tentative tricheuse' }),
        ).rejects.toThrow(BadRequestException);
    });

    test('Marie — banUser sur user inexistant → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
            service.banUser(AMADOU_ID, 'ghost', { reason: 'Ghost ban' }),
        ).rejects.toThrow(NotFoundException);
    });

    // ─── Testeur 8 — Olivier : unban restore les projets ───
    test('Olivier — unban user banni → status ACTIVE + AdminLog + restore projets', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID, status: 'BANNED', name: 'Paul', email: 'p@test.cm', role: 'USER',
        });
        prisma.adminLog.findFirst.mockResolvedValue({
            details: { archivedProjectIds: ['proj-1', 'proj-2'] },
        });
        prisma.project.findMany.mockResolvedValue([{ id: 'proj-1' }, { id: 'proj-2' }]);

        const result = await service.unbanUser(AMADOU_ID, PAUL_ID, { reason: 'Faux positif' });

        expect(result.status).toBe('ACTIVE');
        expect(result.restoredProjects).toBe(2);
    });

    test('Olivier — unban user non banni → BadRequestException', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: PAUL_ID, status: 'ACTIVE', name: 'P', email: 'p@t.cm', role: 'USER',
        });

        await expect(
            service.unbanUser(AMADOU_ID, PAUL_ID, { reason: 'test' }),
        ).rejects.toThrow(BadRequestException);
    });

    // ─── Testeur 9 — Sandrine (methodique) : listTransactions ───
    test('Sandrine — listTransactions filtre par status=PAID', async () => {
        prisma.transaction.findMany.mockResolvedValue([
            { id: 'tx-1', amount: 100, status: 'PAID', user: { id: SANDRINE_ID, name: 'S', email: 's@t.cm' } },
        ]);
        prisma.transaction.count.mockResolvedValue(1);

        const result = await service.listTransactions({ status: 'PAID', take: 20, skip: 0 });

        expect(result.transactions).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { status: 'PAID' } }),
        );
    });

    // ─── Testeur 9 — Sandrine : listLogs paginé ───
    test('Sandrine — listLogs paginé (take=5) → DB appelée avec take=5', async () => {
        prisma.adminLog.findMany.mockResolvedValue([]);
        prisma.adminLog.count.mockResolvedValue(0);

        const result = await service.listLogs({ take: 5, skip: 0 });

        expect(result.take).toBe(5);
        expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 5 }),
        );
    });

    test('Sandrine — listLogs avec filtre action=BAN_USER', async () => {
        prisma.adminLog.findMany.mockResolvedValue([]);
        prisma.adminLog.count.mockResolvedValue(0);

        await service.listLogs({ action: 'BAN_USER', take: 20, skip: 0 });

        expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { action: 'BAN_USER' } }),
        );
    });

    // ─── Testeur 10 — Ibrahim : moderateItem approuve un projet ───
    test('Ibrahim — moderateItem PUBLISHED sur projet → log + admin log + notif', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-ibrahim',
            founderId: 'founder-id',
            name: 'MyProject',
            status: 'PENDING_AI',
        });
        prisma.project.update.mockResolvedValue({});

        const result = await service.moderateItem(AMADOU_ID, 'proj-ibrahim', {
            action: 'PUBLISHED',
            reason: 'OK',
        });

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('project');
        expect(result.newStatus).toBe('PUBLISHED');
        expect(prisma.moderationLog.create).toHaveBeenCalled();
        expect(prisma.adminLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'MODERATE_PROJECT' }),
            }),
        );
        expect(mockNotifications.notify).toHaveBeenCalled();
    });

    test('Ibrahim — moderateItem REJECTED sur candidate profile → notif PROFILE_REVIEW', async () => {
        prisma.project.findUnique.mockResolvedValue(null); // pas un projet
        prisma.candidateProfile.findUnique.mockResolvedValue({
            id: 'cp-1',
            userId: 'cand-user-id',
            status: 'PENDING_AI',
            user: { title: 'Dev' },
        });

        const result = await service.moderateItem(AMADOU_ID, 'cp-1', {
            action: 'REJECTED',
            reason: 'Pitch insuffisant',
        });

        expect(result.entityType).toBe('candidate');
        expect(result.newStatus).toBe('REJECTED');
        expect(prisma.adminLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'MODERATE_CANDIDATE' }),
            }),
        );
    });

    test('Ibrahim — moderateItem sur id inexistant → NotFoundException', async () => {
        prisma.project.findUnique.mockResolvedValue(null);
        prisma.candidateProfile.findUnique.mockResolvedValue(null);

        await expect(
            service.moderateItem(AMADOU_ID, 'ghost-id', { action: 'PUBLISHED' }),
        ).rejects.toThrow(NotFoundException);
    });
});
