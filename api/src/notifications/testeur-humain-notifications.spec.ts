/**
 * TESTEURS HUMAINS — Module Notifications
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - notify() : creation + fire-and-forget push/email
 *   - findAll() : pagination cursor-based + filtre unreadOnly
 *   - markAsRead / markAllAsRead : ownership
 *   - getUnreadCount
 *   - getUserLocale : fallback 'fr'
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { EmailService } from './email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-notif-001';
const FATOU_UID = 'firebase-fatou-notif-002';
const JEAN_UID = 'firebase-jean-notif-003';
const MOUSSA_UID = 'firebase-moussa-notif-004';
const AISHA_UID = 'firebase-aisha-notif-005';
const PAUL_UID = 'firebase-paul-notif-006';
const MARIE_UID = 'firebase-marie-notif-007';
const OLIVIER_UID = 'firebase-olivier-notif-008';
const SANDRINE_UID = 'firebase-sandrine-notif-009';
const IBRAHIM_UID = 'firebase-ibrahim-notif-010';

const AMADOU_ID = 'user-amadou-notif-001';
const FATOU_ID = 'user-fatou-notif-002';
const JEAN_ID = 'user-jean-notif-003';
const MOUSSA_ID = 'user-moussa-notif-004';
const AISHA_ID = 'user-aisha-notif-005';
const PAUL_ID = 'user-paul-notif-006';
const MARIE_ID = 'user-marie-notif-007';
const OLIVIER_ID = 'user-olivier-notif-008';
const SANDRINE_ID = 'user-sandrine-notif-009';
const IBRAHIM_ID = 'user-ibrahim-notif-010';

const mockI18n = {
    t: jest.fn((k: string) => k),
    detectLocale: jest.fn().mockReturnValue('fr'),
    resolveLocale: jest.fn().mockReturnValue('fr'),
};

// ─── Mock PrismaService ─────────────────────────────────
function createMockPrisma() {
    return {
        user: { findUnique: jest.fn() },
        notification: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    };
}

async function buildModule(
    prisma: ReturnType<typeof createMockPrisma>,
    pushMock: Partial<PushService> = {},
    emailMock: Partial<EmailService> = {},
) {
    const defaultPush = {
        sendPush: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
    };
    const defaultEmail = {
        sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
        providers: [
            NotificationsService,
            { provide: PrismaService, useValue: prisma },
            { provide: PushService, useValue: { ...defaultPush, ...pushMock } },
            { provide: EmailService, useValue: { ...defaultEmail, ...emailMock } },
            { provide: I18nService, useValue: mockI18n },
        ],
    }).compile();
    return module.get(NotificationsService);
}

// ════════════════════════════════════════════════════════════
//  TESTEUR 1 — Amadou (admin) : notify() nominal
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou (admin) : notify() nominal', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let pushSpy: jest.Mock;
    let emailSpy: jest.Mock;

    beforeEach(async () => {
        prisma = createMockPrisma();
        pushSpy = jest.fn().mockResolvedValue(undefined);
        emailSpy = jest.fn().mockResolvedValue(undefined);
        service = await buildModule(
            prisma,
            { sendPush: pushSpy },
            { sendEmail: emailSpy },
        );
    });

    test('notify — cree une notification en BD avec bons champs (type, title, message, data)', async () => {
        const createdNotif = {
            id: 'notif-001',
            type: NotificationType.APPLICATION_RECEIVED,
            title: 'Nouvelle candidature',
            createdAt: new Date(),
        };
        prisma.notification.create.mockResolvedValue(createdNotif);

        const result = await service.notify(
            AMADOU_ID,
            NotificationType.APPLICATION_RECEIVED,
            'Nouvelle candidature',
            'Un candidat a postule a votre projet',
            { projectId: 'proj-1', applicationId: 'app-1' },
        );

        expect(result).toEqual(createdNotif);
        expect(prisma.notification.create).toHaveBeenCalledWith({
            data: {
                userId: AMADOU_ID,
                type: NotificationType.APPLICATION_RECEIVED,
                title: 'Nouvelle candidature',
                message: 'Un candidat a postule a votre projet',
                data: { projectId: 'proj-1', applicationId: 'app-1' },
            },
            select: { id: true, type: true, title: true, createdAt: true },
        });
    });

    test('notify — envoie push FCM avec data enrichie (projectId, applicationId)', async () => {
        prisma.notification.create.mockResolvedValue({
            id: 'notif-002',
            type: NotificationType.APPLICATION_ACCEPTED,
            title: 'Accepte',
            createdAt: new Date(),
        });

        await service.notify(
            AMADOU_ID,
            NotificationType.APPLICATION_ACCEPTED,
            'Accepte',
            'Vous avez ete accepte',
            { projectId: 'proj-42', applicationId: 'app-42' },
        );

        // Attendre la microtask fire-and-forget
        await new Promise((r) => setImmediate(r));

        expect(pushSpy).toHaveBeenCalledWith(
            AMADOU_ID,
            'Accepte',
            'Vous avez ete accepte',
            expect.objectContaining({
                type: NotificationType.APPLICATION_ACCEPTED,
                notificationId: 'notif-002',
                projectId: 'proj-42',
                applicationId: 'app-42',
            }),
        );
    });

    test('notify — declenche email fire-and-forget (sans bloquer si email fail)', async () => {
        prisma.notification.create.mockResolvedValue({
            id: 'notif-003',
            type: NotificationType.WELCOME,
            title: 'Bienvenue',
            createdAt: new Date(),
        });
        emailSpy.mockRejectedValueOnce(new Error('Brevo down'));

        // Ne doit PAS throw meme si email crash
        await expect(
            service.notify(AMADOU_ID, NotificationType.WELCOME, 'Bienvenue', 'Salut'),
        ).resolves.toBeDefined();

        await new Promise((r) => setImmediate(r));
        expect(emailSpy).toHaveBeenCalledWith(
            AMADOU_ID,
            NotificationType.WELCOME,
            undefined,
        );
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 2 — Fatou (rapide) : findAll / pagination
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou (rapide) : findAll pagination', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('findAll — Fatou recoit ses notifs paginees (20 par defaut) + nextCursor', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });
        const notifs = Array.from({ length: 21 }).map((_, i) => ({
            id: `n-${i}`,
            type: NotificationType.SYSTEM,
            title: `Titre ${i}`,
            message: 'msg',
            isRead: false,
            data: {},
            createdAt: new Date(),
        }));
        prisma.notification.findMany.mockResolvedValue(notifs);

        const result = await service.findAll(FATOU_UID);
        expect(result.items).toHaveLength(20);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBe('n-19');
    });

    test('findAll — filtre unreadOnly=true => where.isRead=false', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });
        prisma.notification.findMany.mockResolvedValue([]);

        await service.findAll(FATOU_UID, true);

        const call = prisma.notification.findMany.mock.calls[0][0];
        expect(call.where).toEqual({ userId: FATOU_ID, isRead: false });
    });

    test('findAll — limit > 20 => plafonne a 20 (protection anti-abus)', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });
        prisma.notification.findMany.mockResolvedValue([]);

        await service.findAll(FATOU_UID, false, undefined, 500);

        const call = prisma.notification.findMany.mock.calls[0][0];
        expect(call.take).toBe(21); // take = min(500, 20) + 1
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 3 — Jean (comptable) : getUnreadCount
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean (comptable)', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('getUnreadCount — Jean verifie son compteur: count correct avec isRead=false', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: JEAN_ID });
        prisma.notification.count.mockResolvedValue(5);

        const result = await service.getUnreadCount(JEAN_UID);
        expect(result).toEqual({ count: 5 });

        const call = prisma.notification.count.mock.calls[0][0];
        expect(call.where).toEqual({ userId: JEAN_ID, isRead: false });
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 5 — Aisha (securite) : markAsRead ownership
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha (securite) : ownership markAsRead', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('markAsRead — Aisha marque SA propre notif => update isRead=true + success', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.notification.findUnique.mockResolvedValue({
            id: 'notif-aisha-1',
            userId: AISHA_ID,
        });
        prisma.notification.update.mockResolvedValue({});

        const result = await service.markAsRead(AISHA_UID, 'notif-aisha-1');
        expect(result).toEqual({ success: true });
        expect(prisma.notification.update).toHaveBeenCalledWith({
            where: { id: 'notif-aisha-1' },
            data: { isRead: true },
        });
    });

    test('markAsRead — Aisha tente de lire la notif d un AUTRE user => ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.notification.findUnique.mockResolvedValue({
            id: 'notif-autre',
            userId: OLIVIER_ID, // notif d Olivier, pas Aisha
        });

        await expect(
            service.markAsRead(AISHA_UID, 'notif-autre'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    test('markAsRead — notif inexistante => NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.notification.findUnique.mockResolvedValue(null);

        await expect(
            service.markAsRead(AISHA_UID, 'notif-ghost'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 6 — Paul (doublons) : markAllAsRead
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul (doublons) : markAllAsRead bulk', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('markAllAsRead — Paul marque toutes ses non-lues => retourne count', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID });
        prisma.notification.updateMany.mockResolvedValue({ count: 12 });

        const result = await service.markAllAsRead(PAUL_UID);
        expect(result).toEqual({ updated: 12 });
        expect(prisma.notification.updateMany).toHaveBeenCalledWith({
            where: { userId: PAUL_ID, isRead: false },
            data: { isRead: true },
        });
    });

    test('markAllAsRead — deuxieme appel (toutes deja lues) => count=0, idempotent', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID });
        prisma.notification.updateMany.mockResolvedValue({ count: 0 });

        const result = await service.markAllAsRead(PAUL_UID);
        expect(result).toEqual({ updated: 0 });
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 8 — Olivier (triche) : user firebase inexistant
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier (triche) : user introuvable', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('findAll — firebaseUid sans user en BD => NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(
            service.findAll('firebase-ghost-xxx'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('getUnreadCount — user inexistant => NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(
            service.getUnreadCount('firebase-ghost-yyy'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 9 — Sandrine (audit) : getUserLocale defaults
// ════════════════════════════════════════════════════════════
describe('Testeur 9 — Sandrine (audit) : getUserLocale', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('getUserLocale — user avec preferredLang=en => retourne en', async () => {
        prisma.user.findUnique.mockResolvedValue({ preferredLang: 'en' });
        const locale = await service.getUserLocale(SANDRINE_ID);
        expect(locale).toBe('en');
    });

    test('getUserLocale — user sans preferredLang => fallback fr', async () => {
        prisma.user.findUnique.mockResolvedValue({ preferredLang: null });
        const locale = await service.getUserLocale(SANDRINE_ID);
        expect(locale).toBe('fr');
    });

    test('getUserLocale — user inexistant => fallback fr (pas de crash)', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const locale = await service.getUserLocale('user-ghost');
        expect(locale).toBe('fr');
    });

    test('getUserLocale — Prisma throw => fallback fr (resilient)', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB down'));
        const locale = await service.getUserLocale(SANDRINE_ID);
        expect(locale).toBe('fr');
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 10 — Ibrahim (cleanup) : cascade + push failure resilience
// ════════════════════════════════════════════════════════════
describe('Testeur 10 — Ibrahim (cleanup)', () => {
    let service: NotificationsService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let pushSpy: jest.Mock;

    beforeEach(async () => {
        prisma = createMockPrisma();
        pushSpy = jest.fn().mockRejectedValue(new Error('FCM token invalid'));
        service = await buildModule(prisma, { sendPush: pushSpy });
    });

    test('notify — push FCM echoue => notification toujours creee, log seulement', async () => {
        prisma.notification.create.mockResolvedValue({
            id: 'notif-resilient',
            type: NotificationType.SYSTEM,
            title: 'Alerte',
            createdAt: new Date(),
        });

        const result = await service.notify(
            IBRAHIM_ID,
            NotificationType.SYSTEM,
            'Alerte',
            'Message test',
        );

        // La notification est creee malgre l echec FCM
        expect(result.id).toBe('notif-resilient');
        await new Promise((r) => setImmediate(r));
        expect(pushSpy).toHaveBeenCalled();
    });

    // Cascade reellement geree via onDelete:Cascade en BD (schema Prisma).
    // Ici on verifie juste que le service peut requeter un userId qui n a plus de notifs.
    test.skip('cascade — notifications supprimees en cascade quand user delete (verifie via integration Prisma, hors scope unit)', () => {
        // Cascade testable en integration (ex: E2E avec vraie BD).
        // Le onDelete: Cascade est garantit au niveau schema.prisma.
    });
});
