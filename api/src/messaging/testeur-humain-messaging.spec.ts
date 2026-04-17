/**
 * TESTEURS HUMAINS — Module Messaging
 *
 * 10 testeurs simulent des scenarios reels sur les methodes :
 *   - findOrCreateConversation (idempotence, auto-messaging interdit)
 *   - getConversations (pagination cursor-based, membership)
 *   - getMessages (pagination, membership, cursor invalide)
 *   - sendMessage (idempotent via clientMessageId, content requis)
 *   - verifyMembership (acces non autorise => Forbidden)
 *   - getUnreadCount (compte correct par user)
 *   - markRead / markDelivered (flux normal + no-op proprio)
 *   - addReaction (limite 6 emojis distincts)
 *   - getUserConversationIds (cap a 500, liste des IDs)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-msg-001';
const FATOU_UID = 'firebase-fatou-msg-002';
const JEAN_UID = 'firebase-jean-msg-003';
const MOUSSA_UID = 'firebase-moussa-msg-004';
const AISHA_UID = 'firebase-aisha-msg-005';
const PAUL_UID = 'firebase-paul-msg-006';
const MARIE_UID = 'firebase-marie-msg-007';
const OLIVIER_UID = 'firebase-olivier-msg-008';
const SANDRINE_UID = 'firebase-sandrine-msg-009';
const IBRAHIM_UID = 'firebase-ibrahim-msg-010';

const AMADOU_ID = 'user-amadou-msg-001';
const FATOU_ID = 'user-fatou-msg-002';
const JEAN_ID = 'user-jean-msg-003';
const MOUSSA_ID = 'user-moussa-msg-004';
const AISHA_ID = 'user-aisha-msg-005';
const PAUL_ID = 'user-paul-msg-006';
const MARIE_ID = 'user-marie-msg-007';
const OLIVIER_ID = 'user-olivier-msg-008';
const SANDRINE_ID = 'user-sandrine-msg-009';
const IBRAHIM_ID = 'user-ibrahim-msg-010';

// ─── Mock PrismaService ─────────────────────────────────
function createMockPrisma() {
    const txnImpl = jest.fn((ops: any[]) => Promise.all(ops));
    return {
        user: { findUnique: jest.fn() },
        conversation: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        message: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            count: jest.fn(),
        },
        messageReaction: {
            findMany: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: txnImpl,
    };
}

// Helper factory
function makeUser(id: string, overrides: Record<string, any> = {}) {
    return { id, status: 'ACTIVE', ...overrides };
}

function makeConversation(overrides: Record<string, any> = {}) {
    return {
        id: 'conv-001',
        founderId: AMADOU_ID,
        candidateId: FATOU_ID,
        lastMessageAt: new Date('2026-04-01'),
        lastMessagePreview: 'Bonjour',
        founder: { id: AMADOU_ID, firstName: 'Amadou', lastName: 'Diallo', image: null },
        candidate: { id: FATOU_ID, firstName: 'Fatou', lastName: 'Bamba', image: null },
        ...overrides,
    };
}

async function buildModule(prisma: ReturnType<typeof createMockPrisma>) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            MessagingService,
            { provide: PrismaService, useValue: prisma },
        ],
    }).compile();
    return module.get(MessagingService);
}

// ════════════════════════════════════════════════════════════
//  TESTEUR 1 — Amadou (admin, methodique) : Workflow nominal
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou (admin) : workflow nominal messagerie', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('resolveUserId — Amadou resout son firebaseUid vers un userId interne', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        const result = await service.resolveUserId(AMADOU_UID);
        expect(result).toBe(AMADOU_ID);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { firebaseUid: AMADOU_UID },
            select: { id: true },
        });
    });

    test('findOrCreateConversation — Amadou (founder) et Fatou (candidate) => conversation creee', async () => {
        // Pour resolveUserId pas utilise : findOrCreateConversation prend des userId directs
        prisma.user.findUnique
            .mockResolvedValueOnce(makeUser(AMADOU_ID))
            .mockResolvedValueOnce(makeUser(FATOU_ID));
        prisma.conversation.findUnique.mockResolvedValue(null); // pas existante
        const created = makeConversation();
        prisma.conversation.create.mockResolvedValue(created);

        const result = await service.findOrCreateConversation(AMADOU_ID, FATOU_ID);
        expect(result).toEqual(created);
        expect(prisma.conversation.create).toHaveBeenCalledTimes(1);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 2 — Fatou (rapide) : Idempotence findOrCreateConversation
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou (rapide) : idempotence findOrCreate', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('findOrCreateConversation appele 2x avec memes users => meme conversation, jamais de doublon', async () => {
        prisma.user.findUnique.mockImplementation((args: any) => {
            const id = args.where.id;
            return Promise.resolve(makeUser(id));
        });
        const existing = makeConversation({ id: 'conv-shared-001' });

        // 1er appel: trouve existante => pas de create
        prisma.conversation.findUnique.mockResolvedValueOnce(existing);
        const first = await service.findOrCreateConversation(FATOU_ID, AMADOU_ID);

        // 2eme appel: toujours trouve existante
        prisma.conversation.findUnique.mockResolvedValueOnce(existing);
        const second = await service.findOrCreateConversation(FATOU_ID, AMADOU_ID);

        expect(first.id).toBe('conv-shared-001');
        expect(second.id).toBe('conv-shared-001');
        expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    test('findOrCreateConversation — race condition P2002 => refetch sans erreur', async () => {
        prisma.user.findUnique.mockImplementation((args: any) =>
            Promise.resolve(makeUser(args.where.id)),
        );
        const shared = makeConversation({ id: 'conv-race-001' });

        // findUnique: null au debut, puis trouve apres create rate
        prisma.conversation.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(shared);
        const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        prisma.conversation.create.mockRejectedValue(p2002);

        const result = await service.findOrCreateConversation(FATOU_ID, AMADOU_ID);
        expect(result?.id).toBe('conv-race-001');
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 3 — Jean (comptable) : Pagination getConversations / getMessages
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean (comptable) : pagination soignee', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('getConversations — Jean recupere 20 convs par defaut + nextCursor si hasMore', async () => {
        const convs = Array.from({ length: 21 }).map((_, i) =>
            makeConversation({ id: `c-${i}` }),
        );
        prisma.conversation.findMany.mockResolvedValue(convs);

        const result = await service.getConversations(JEAN_ID);

        expect(result.items).toHaveLength(20);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBe('c-19');
    });

    test('getConversations — limit > 100 plafonne a 100', async () => {
        prisma.conversation.findMany.mockResolvedValue([]);
        await service.getConversations(JEAN_ID, undefined, 500);

        const call = prisma.conversation.findMany.mock.calls[0][0];
        // take = min(limit, 100) + 1 (pour detecter hasMore)
        expect(call.take).toBe(101);
    });

    test('getMessages — Jean recupere 20 messages avec cursor, plafonne a 100', async () => {
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: JEAN_ID,
            candidateId: AMADOU_ID,
        });
        prisma.message.findUnique.mockResolvedValue({ id: 'msg-cursor' });
        prisma.message.findMany.mockResolvedValue([
            { id: 'msg-1', content: 'Hello', senderId: JEAN_ID, reactions: [] },
        ]);

        const result = await service.getMessages('conv-jean', JEAN_ID, 'msg-cursor', 50);
        expect(result.items).toHaveLength(1);
        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeNull();

        const call = prisma.message.findMany.mock.calls[0][0];
        expect(call.take).toBe(51);
        expect(call.cursor).toEqual({ id: 'msg-cursor' });
        expect(call.skip).toBe(1);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 4 — Moussa (peu tech, tape sur lui-meme)
// ════════════════════════════════════════════════════════════
describe('Testeur 4 — Moussa (peu tech) : cas limites basiques', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('findOrCreateConversation — Moussa essaie de se parler a lui-meme => BadRequestException', async () => {
        await expect(
            service.findOrCreateConversation(MOUSSA_ID, MOUSSA_ID),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    test('findOrCreateConversation — user cible banni (non ACTIVE) => ForbiddenException', async () => {
        prisma.user.findUnique
            .mockResolvedValueOnce(makeUser(MOUSSA_ID))
            .mockResolvedValueOnce(makeUser(OLIVIER_ID, { status: 'BANNED' }));

        await expect(
            service.findOrCreateConversation(MOUSSA_ID, OLIVIER_ID),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    test('sendMessage — Moussa envoie un message vide (ni texte ni fichier) => BadRequestException', async () => {
        await expect(
            service.sendMessage(MOUSSA_ID, { conversationId: 'c-1' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 5 — Aisha (securite) : Membership
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha (securite) : membership guard', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('verifyMembership — Aisha (non-membre) sur une conv entre Amadou et Fatou => ForbiddenException', async () => {
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: AMADOU_ID,
            candidateId: FATOU_ID,
        });
        await expect(
            service.verifyMembership('conv-x', AISHA_ID),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    test('verifyMembership — conversation inexistante => NotFoundException', async () => {
        prisma.conversation.findUnique.mockResolvedValue(null);
        await expect(
            service.verifyMembership('conv-ghost', AISHA_ID),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('getMessages — Aisha (non-membre) tente de lire messages => ForbiddenException', async () => {
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: AMADOU_ID,
            candidateId: FATOU_ID,
        });
        await expect(
            service.getMessages('conv-x', AISHA_ID),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 6 — Paul (doublons) : Idempotence sendMessage
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul (doublons) : idempotence sendMessage', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('sendMessage — clientMessageId deja utilise => retourne le message existant (idempotent)', async () => {
        const existing = {
            id: 'msg-001',
            conversationId: 'c-1',
            senderId: PAUL_ID,
            content: 'Hello déjà envoyé',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            fileMimeType: null,
            status: 'SENT',
            createdAt: new Date('2026-04-01'),
        };
        prisma.message.findUnique.mockResolvedValue(existing);

        const result = await service.sendMessage(PAUL_ID, {
            conversationId: 'c-1',
            clientMessageId: 'client-uuid-123',
            content: 'Doublon ignoré',
        });

        expect(result).toEqual(existing);
        expect(prisma.message.create).not.toHaveBeenCalled();
        expect(prisma.conversation.update).not.toHaveBeenCalled();
    });

    test('sendMessage — clientMessageId nouveau => create + update conversation (transaction)', async () => {
        prisma.message.findUnique.mockResolvedValue(null); // aucun prior
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: PAUL_ID,
            candidateId: FATOU_ID,
        });
        const created = {
            id: 'msg-new-001',
            conversationId: 'c-1',
            senderId: PAUL_ID,
            content: 'Hello neuf',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            fileMimeType: null,
            status: 'SENT',
            createdAt: new Date(),
        };
        prisma.message.create.mockReturnValue(created as any);
        prisma.conversation.update.mockReturnValue({} as any);
        // $transaction resout un array [createResult, updateResult]
        (prisma.$transaction as jest.Mock).mockResolvedValue([created, {}]);

        const result = await service.sendMessage(PAUL_ID, {
            conversationId: 'c-1',
            clientMessageId: 'client-uuid-456',
            content: 'Hello neuf',
        });

        expect(result).toEqual(created);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 7 — Marie (extremes) : Limite 6 reactions + cursor invalide
// ════════════════════════════════════════════════════════════
describe('Testeur 7 — Marie (valeurs extremes)', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('addReaction — Marie tente un 7eme emoji distinct => BadRequestException (limite 6)', async () => {
        // 6 emojis distincts deja presents
        prisma.message.findUnique.mockResolvedValue({
            conversationId: 'c-1',
            reactions: [
                { emoji: '👍' }, { emoji: '❤️' }, { emoji: '😂' },
                { emoji: '🎉' }, { emoji: '😮' }, { emoji: '😢' },
            ],
        });
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: MARIE_ID,
            candidateId: AMADOU_ID,
        });

        await expect(
            service.addReaction('msg-1', MARIE_ID, '🚀'),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.messageReaction.upsert).not.toHaveBeenCalled();
    });

    test('addReaction — emoji deja present (meme set) => upsert OK (pas de 7eme)', async () => {
        prisma.message.findUnique.mockResolvedValue({
            conversationId: 'c-1',
            reactions: [
                { emoji: '👍' }, { emoji: '❤️' }, { emoji: '😂' },
                { emoji: '🎉' }, { emoji: '😮' }, { emoji: '😢' },
            ],
        });
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: MARIE_ID,
            candidateId: AMADOU_ID,
        });
        prisma.messageReaction.upsert.mockResolvedValue({});
        prisma.messageReaction.findMany.mockResolvedValue([
            { id: 'r-1', emoji: '👍', userId: MARIE_ID },
        ]);

        const result = await service.addReaction('msg-1', MARIE_ID, '👍');
        expect(result.conversationId).toBe('c-1');
        expect(prisma.messageReaction.upsert).toHaveBeenCalled();
    });

    test('getMessages — cursor pointant vers message supprime => ignore (pas de crash)', async () => {
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: MARIE_ID,
            candidateId: AMADOU_ID,
        });
        prisma.message.findUnique.mockResolvedValue(null); // cursor inexistant
        prisma.message.findMany.mockResolvedValue([]);

        const result = await service.getMessages('c-1', MARIE_ID, 'msg-deleted');
        // Pas de cursor passe a findMany car message deleted
        const call = prisma.message.findMany.mock.calls[0][0];
        expect(call.cursor).toBeUndefined();
        expect(call.skip).toBeUndefined();
        expect(result.items).toEqual([]);
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 8 — Olivier (essaie de tricher) : getUnreadCount + acces autre org
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier (essaie de tricher)', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('getUnreadCount — Olivier demande son compteur => filtre sur conv dont il est membre, senderId != soi, status != READ', async () => {
        prisma.message.count.mockResolvedValue(7);

        const count = await service.getUnreadCount(OLIVIER_ID);
        expect(count).toBe(7);

        const where = prisma.message.count.mock.calls[0][0].where;
        expect(where.conversation.OR).toEqual([
            { founderId: OLIVIER_ID },
            { candidateId: OLIVIER_ID },
        ]);
        expect(where.senderId).toEqual({ not: OLIVIER_ID });
        expect(where.status).toEqual({ not: 'READ' });
    });

    test('sendMessage — Olivier tente d envoyer dans une conv ou il n est pas membre => ForbiddenException', async () => {
        prisma.message.findUnique.mockResolvedValue(null); // pas d idempotence
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: AMADOU_ID,
            candidateId: FATOU_ID,
        });

        await expect(
            service.sendMessage(OLIVIER_ID, {
                conversationId: 'conv-foreign',
                content: 'Intrusion!',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 9 — Sandrine (audit) : markRead, markDelivered, structure
// ════════════════════════════════════════════════════════════
describe('Testeur 9 — Sandrine (audit)', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('markRead — Sandrine marque tous les messages recus comme lus (bulk updateMany)', async () => {
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: SANDRINE_ID,
            candidateId: AMADOU_ID,
        });
        prisma.message.updateMany.mockResolvedValue({ count: 3 });

        const result = await service.markRead('c-1', SANDRINE_ID);
        expect(result.conversationId).toBe('c-1');
        expect(result.readAt).toBeInstanceOf(Date);

        const call = prisma.message.updateMany.mock.calls[0][0];
        expect(call.where.senderId).toEqual({ not: SANDRINE_ID });
        expect(call.where.status).toEqual({ not: 'READ' });
        expect(call.data.status).toBe('READ');
    });

    test('markDelivered — Sandrine essaie de marquer son propre message delivered => no-op (null)', async () => {
        prisma.message.findUnique.mockResolvedValue({
            id: 'msg-own',
            senderId: SANDRINE_ID, // c est elle l expedrice
            status: 'SENT',
            conversationId: 'c-1',
        });

        const result = await service.markDelivered('msg-own', SANDRINE_ID);
        expect(result).toBeNull();
        expect(prisma.message.update).not.toHaveBeenCalled();
    });

    test('markDelivered — message deja DELIVERED => no-op', async () => {
        prisma.message.findUnique.mockResolvedValue({
            id: 'msg-deja',
            senderId: AMADOU_ID,
            status: 'DELIVERED',
            conversationId: 'c-1',
        });

        const result = await service.markDelivered('msg-deja', SANDRINE_ID);
        expect(result).toBeNull();
        expect(prisma.message.update).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 10 — Ibrahim (cleanup) : getUserConversationIds / liste
// ════════════════════════════════════════════════════════════
describe('Testeur 10 — Ibrahim (cleanup)', () => {
    let service: MessagingService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        service = await buildModule(prisma);
    });

    test('getUserConversationIds — Ibrahim recupere ses conv IDs, plafonne a 500', async () => {
        const convs = Array.from({ length: 3 }).map((_, i) => ({ id: `c-${i}` }));
        prisma.conversation.findMany.mockResolvedValue(convs);

        const result = await service.getUserConversationIds(IBRAHIM_ID);
        expect(result).toEqual(['c-0', 'c-1', 'c-2']);

        const call = prisma.conversation.findMany.mock.calls[0][0];
        expect(call.take).toBe(500);
        expect(call.where.OR).toEqual([
            { founderId: IBRAHIM_ID },
            { candidateId: IBRAHIM_ID },
        ]);
    });

    test('removeReaction — Ibrahim retire son emoji => deleteMany + retour des reactions restantes', async () => {
        prisma.message.findUnique.mockResolvedValue({ conversationId: 'c-1' });
        prisma.conversation.findUnique.mockResolvedValue({
            founderId: IBRAHIM_ID,
            candidateId: AMADOU_ID,
        });
        prisma.messageReaction.deleteMany.mockResolvedValue({ count: 1 });
        prisma.messageReaction.findMany.mockResolvedValue([]);

        const result = await service.removeReaction('msg-1', IBRAHIM_ID, '👍');
        expect(result.conversationId).toBe('c-1');
        expect(result.reactions).toEqual([]);
        expect(prisma.messageReaction.deleteMany).toHaveBeenCalledWith({
            where: { messageId: 'msg-1', userId: IBRAHIM_ID, emoji: '👍' },
        });
    });
});
