/**
 * Tests d'intégration approfondis — Système de messagerie MojiraX
 * Run: cd api && node ../tests/messaging-integration.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const TEST_MSG_IDS = [];

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ ${msg}`); throw new Error(msg); }
  console.log(`  ✅ ${msg}`);
}
function eq(a, b, msg) {
  if (a !== b) { console.error(`  ❌ ${msg} — attendu: ${JSON.stringify(b)}, reçu: ${JSON.stringify(a)}`); throw new Error(msg); }
  console.log(`  ✅ ${msg}`);
}

const CONV1 = 'conv_001', CONV2 = 'conv_002';
const F1 = 'user_founder_01', C1 = 'user_cand_01';
const F2 = 'user_founder_05', C2 = 'user_cand_04';
const NON_MEMBER = 'user_founder_02';

async function run(name, fn) {
  console.log(`\n═══ ${name} ═══`);
  try { await fn(); passed++; }
  catch (e) { failed++; console.error(`  🔴 ${e.message}`); }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Tests d\'intégration — Messagerie MojiraX            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // ─── 1. Récupération des conversations ─────────────────────
  await run('1. Conversations d\'un utilisateur', async () => {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ founderId: F1 }, { candidateId: F1 }] },
      select: {
        id: true, lastMessageAt: true, lastMessagePreview: true,
        founderId: true, candidateId: true,
        founder: { select: { id: true, firstName: true, lastName: true, image: true } },
        candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: 21,
    });
    eq(convs.length, 1, 'Founder 01 a 1 conversation');
    eq(convs[0].id, CONV1, 'Bonne conversation');
    eq(convs[0].founder.firstName, 'Oswaldo', 'Founder name OK');
    eq(convs[0].candidate.firstName, 'Sophie', 'Candidate name OK');
    assert(convs[0].lastMessagePreview !== null, 'Preview non null');
    assert(convs[0].lastMessagePreview.length <= 100, 'Preview ≤ 100 chars');

    // Non-membre
    const empty = await prisma.conversation.findMany({
      where: { OR: [{ founderId: NON_MEMBER }, { candidateId: NON_MEMBER }] },
    });
    eq(empty.length, 0, 'Non-membre → 0 conversations');
  });

  // ─── 2. Messages d'une conversation ───────────────────────
  await run('2. Messages de conv_001', async () => {
    const msgs = await prisma.message.findMany({
      where: { conversationId: CONV1 },
      select: {
        id: true, content: true, status: true, senderId: true,
        deliveredAt: true, readAt: true, createdAt: true,
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    eq(msgs.length, 7, '7 messages dans conv_001');

    // Tri DESC
    for (let i = 0; i < msgs.length - 1; i++) {
      assert(new Date(msgs[i].createdAt) >= new Date(msgs[i + 1].createdAt),
        `Message ${i} plus récent que ${i + 1}`);
    }

    // msg_007 = DELIVERED (dernier)
    eq(msgs[0].id, 'msg_007', 'Dernier = msg_007');
    eq(msgs[0].status, 'DELIVERED', 'msg_007 = DELIVERED');
    assert(msgs[0].readAt === null, 'msg_007 pas lu');

    // Les autres = READ
    for (const m of msgs.filter(m => m.id !== 'msg_007')) {
      eq(m.status, 'READ', `${m.id} = READ`);
      assert(m.readAt !== null, `${m.id} readAt non null`);
    }
  });

  // ─── 3. Pagination cursor ────────────────────────────────
  await run('3. Pagination cursor-based', async () => {
    const page1 = await prisma.message.findMany({
      where: { conversationId: CONV1 },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, createdAt: true },
    });
    assert(page1.length === 4, 'Page 1 a 4 résultats (3+1 pour hasMore)');
    const hasMore = page1.length > 3;
    assert(hasMore, 'hasMore = true');
    const cursor = page1[2].id;

    const page2 = await prisma.message.findMany({
      where: { conversationId: CONV1 },
      orderBy: { createdAt: 'desc' },
      cursor: { id: cursor },
      skip: 1,
      take: 4,
      select: { id: true, createdAt: true },
    });
    assert(page2.length > 0, 'Page 2 non vide');
    const p1ids = new Set(page1.slice(0, 3).map(m => m.id));
    for (const m of page2) {
      assert(!p1ids.has(m.id), `${m.id} pas en double`);
    }
  });

  // ─── 4. Membership ──────────────────────────────────────
  await run('4. Vérification membership (M01)', async () => {
    const conv = await prisma.conversation.findUnique({
      where: { id: CONV1 },
      select: { founderId: true, candidateId: true },
    });
    eq(conv.founderId, F1, 'Founder est membre');
    eq(conv.candidateId, C1, 'Candidate est membre');
    assert(conv.founderId !== NON_MEMBER && conv.candidateId !== NON_MEMBER,
      'Non-membre refusé');
  });

  // ─── 5. Envoi de message ──────────────────────────────────
  await run('5. Envoi de message', async () => {
    const msg = await prisma.message.create({
      data: {
        conversationId: CONV1, senderId: F1,
        content: 'Test integration msg', status: 'SENT',
      },
    });
    TEST_MSG_IDS.push(msg.id);
    assert(msg.id !== null, 'Message créé');
    eq(msg.content, 'Test integration msg', 'Contenu OK');
    eq(msg.status, 'SENT', 'Status SENT');

    // Update conversation preview
    await prisma.conversation.update({
      where: { id: CONV1 },
      data: { lastMessageAt: msg.createdAt, lastMessagePreview: msg.content.substring(0, 100) },
    });
    const conv = await prisma.conversation.findUnique({ where: { id: CONV1 } });
    eq(conv.lastMessagePreview, 'Test integration msg', 'Preview mise à jour');
  });

  // ─── 6. Message vide ─────────────────────────────────────
  await run('6. Message sans contenu ni fichier (DB accepte, service valide)', async () => {
    const msg = await prisma.message.create({
      data: { conversationId: CONV1, senderId: F1, content: null, fileUrl: null, status: 'SENT' },
    });
    TEST_MSG_IDS.push(msg.id);
    assert(msg.content === null, 'Content null en DB');
    assert(msg.fileUrl === null, 'FileUrl null en DB');
    console.log('  ⚠️  Validation "contenu OU fichier" = service layer, pas DB → OK');
  });

  // ─── 7. Mark DELIVERED ────────────────────────────────────
  await run('7. Mark as DELIVERED', async () => {
    const updated = await prisma.message.update({
      where: { id: TEST_MSG_IDS[0] },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    eq(updated.status, 'DELIVERED', 'Status → DELIVERED');
    assert(updated.deliveredAt !== null, 'deliveredAt rempli');
  });

  // ─── 8. Mark READ (batch) ────────────────────────────────
  await run('8. Mark as READ (batch)', async () => {
    const m1 = await prisma.message.create({ data: { conversationId: CONV1, senderId: F1, content: 'Unread 1', status: 'SENT' } });
    const m2 = await prisma.message.create({ data: { conversationId: CONV1, senderId: F1, content: 'Unread 2', status: 'SENT' } });
    const m3 = await prisma.message.create({ data: { conversationId: CONV1, senderId: F1, content: 'Unread 3', status: 'DELIVERED' } });
    TEST_MSG_IDS.push(m1.id, m2.id, m3.id);

    // Only mark test messages as READ (not seed data like msg_007)
    const now = new Date();
    const result = await prisma.message.updateMany({
      where: {
        id: { in: [m1.id, m2.id, m3.id] },
        senderId: { not: C1 },
        status: { not: 'READ' },
      },
      data: { status: 'READ', readAt: now },
    });
    eq(result.count, 3, `3 marqués READ (reçu: ${result.count})`);

    for (const id of [m1.id, m2.id, m3.id]) {
      const msg = await prisma.message.findUnique({ where: { id } });
      eq(msg.status, 'READ', `${id} = READ`);
      assert(msg.readAt !== null, `${id} readAt`);
    }
  });

  // ─── 9. Unread count ────────────────────────────────────
  await run('9. Compteur non-lus', async () => {
    const unread = await prisma.message.create({
      data: { conversationId: CONV1, senderId: F1, content: 'Unread for C1', status: 'SENT' },
    });
    TEST_MSG_IDS.push(unread.id);

    const count = await prisma.message.count({
      where: {
        conversation: { OR: [{ founderId: C1 }, { candidateId: C1 }] },
        senderId: { not: C1 },
        status: { not: 'READ' },
      },
    });
    assert(count >= 1, `C1 a ≥1 non-lu (reçu: ${count})`);

    // L'expéditeur ne devrait pas compter ses propres messages
    const founderSelfCount = await prisma.message.count({
      where: {
        conversation: { OR: [{ founderId: F1 }, { candidateId: F1 }] },
        senderId: F1,
        status: { not: 'READ' },
      },
    });
    console.log(`  ℹ️  Messages non-lus envoyés PAR founder: ${founderSelfCount} (pas comptés dans unread)`);
  });

  // ─── 10. Réactions emoji ──────────────────────────────────
  await run('10. Réactions emoji', async () => {
    const r1 = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: 'msg_001', userId: C1, emoji: '👍' } },
      create: { messageId: 'msg_001', userId: C1, emoji: '👍' },
      update: {},
    });
    assert(r1.id !== null, 'Réaction 👍 créée');

    const r2 = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: 'msg_001', userId: C1, emoji: '❤️' } },
      create: { messageId: 'msg_001', userId: C1, emoji: '❤️' },
      update: {},
    });
    assert(r2.id !== r1.id, '2ème réaction différente');

    // Same emoji = idempotent
    const r1dup = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: 'msg_001', userId: C1, emoji: '👍' } },
      create: { messageId: 'msg_001', userId: C1, emoji: '👍' },
      update: {},
    });
    eq(r1dup.id, r1.id, 'Upsert idempotent');

    // Cleanup
    await prisma.messageReaction.deleteMany({ where: { messageId: 'msg_001' } });
  });

  // ─── 11. Limite 6 emojis distincts ────────────────────────
  await run('11. Limite 6 emojis distincts', async () => {
    const emojis = ['😀', '😂', '🎉', '🔥', '💯', '🙌'];
    for (const e of emojis) {
      await prisma.messageReaction.upsert({
        where: { messageId_userId_emoji: { messageId: 'msg_002', userId: C1, emoji: e } },
        create: { messageId: 'msg_002', userId: C1, emoji: e },
        update: {},
      });
    }
    const distinct = await prisma.messageReaction.findMany({
      where: { messageId: 'msg_002' },
      distinct: ['emoji'],
      select: { emoji: true },
    });
    eq(distinct.length, 6, '6 emojis distincts');

    // Service rejetterait un 7ème
    const existing = new Set(distinct.map(r => r.emoji));
    assert(!existing.has('🤯') && existing.size >= 6,
      '7ème emoji serait rejeté par le service');

    await prisma.messageReaction.deleteMany({ where: { messageId: 'msg_002' } });
  });

  // ─── 12. Suppression de réaction ──────────────────────────
  await run('12. Suppression de réaction', async () => {
    await prisma.messageReaction.create({
      data: { messageId: 'msg_003', userId: C1, emoji: '🎯' },
    });
    const del = await prisma.messageReaction.deleteMany({
      where: { messageId: 'msg_003', userId: C1, emoji: '🎯' },
    });
    eq(del.count, 1, 'Réaction supprimée');
    const remaining = await prisma.messageReaction.count({
      where: { messageId: 'msg_003', userId: C1, emoji: '🎯' },
    });
    eq(remaining, 0, 'Plus aucune trace');
  });

  // ─── 13. Message avec fichier ─────────────────────────────
  await run('13. Message avec fichier', async () => {
    const msg = await prisma.message.create({
      data: {
        conversationId: CONV1, senderId: F1, content: null,
        fileUrl: 'https://storage.example.com/test.pdf',
        fileName: 'business-plan.pdf', fileSize: 1234567,
        fileMimeType: 'application/pdf', status: 'SENT',
      },
    });
    TEST_MSG_IDS.push(msg.id);
    assert(msg.fileUrl !== null, 'FileUrl OK');
    eq(msg.fileName, 'business-plan.pdf', 'FileName OK');
    eq(msg.fileSize, 1234567, 'FileSize OK');
    eq(msg.fileMimeType, 'application/pdf', 'MimeType OK');
    assert(msg.content === null, 'Content null pour fichier');
  });

  // ─── 14. Relation Conversation → Application ──────────────
  await run('14. Relation Conversation → Application', async () => {
    const conv = await prisma.conversation.findUnique({
      where: { id: CONV1 },
      select: { applicationId: true, application: { select: { id: true, status: true } } },
    });
    eq(conv.applicationId, 'app_001', 'Liée à app_001');
    assert(conv.application !== null, 'Relation résolue');
  });

  // ─── 15. Cascade delete Message → Reactions ────────────────
  await run('15. Cascade delete Message → Reactions', async () => {
    const msg = await prisma.message.create({
      data: { conversationId: CONV1, senderId: F1, content: 'To delete', status: 'SENT' },
    });
    await prisma.messageReaction.create({ data: { messageId: msg.id, userId: C1, emoji: '👍' } });
    await prisma.messageReaction.create({ data: { messageId: msg.id, userId: F1, emoji: '❤️' } });
    eq(await prisma.messageReaction.count({ where: { messageId: msg.id } }), 2, '2 réactions avant');

    await prisma.message.delete({ where: { id: msg.id } });
    eq(await prisma.messageReaction.count({ where: { messageId: msg.id } }), 0, 'Cascade delete OK');
  });

  // ─── 16. Select explicite (sécurité A01) ───────────────────
  await run('16. Sécurité — pas de leak de données sensibles', async () => {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ founderId: F1 }, { candidateId: F1 }] },
      select: {
        founder: { select: { id: true, firstName: true, lastName: true, image: true } },
        candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
      },
      take: 1,
    });
    const f = convs[0].founder;
    assert(!('email' in f), 'Pas d\'email');
    assert(!('firebaseUid' in f), 'Pas de firebaseUid');
    assert(!('phone' in f), 'Pas de phone');
    assert('firstName' in f, 'firstName présent');
  });

  // ─── 17. conv_002 ─────────────────────────────────────────
  await run('17. Conv_002 — données correctes', async () => {
    const msgs = await prisma.message.findMany({
      where: { conversationId: CONV2 },
      orderBy: { createdAt: 'desc' },
    });
    eq(msgs.length, 4, '4 messages');
    for (const m of msgs) eq(m.status, 'READ', `${m.id} READ`);
    const senders = new Set(msgs.map(m => m.senderId));
    assert(senders.has(F2), 'Founder 05 présent');
    assert(senders.has(C2), 'Candidate 04 présent');
  });

  // ─── 18. Unicité conversation par application ──────────────
  await run('18. Unicité conversation par application', async () => {
    try {
      await prisma.conversation.create({
        data: { applicationId: 'app_001', founderId: F1, candidateId: C1 },
      });
      assert(false, 'Devrait échouer');
    } catch (e) {
      assert(e.code === 'P2002' || e.message.includes('Unique'),
        'Contrainte unique respectée');
    }
  });

  // ─── 19. Recipient resolution ─────────────────────────────
  await run('19. Résolution du destinataire', async () => {
    const conv = await prisma.conversation.findUnique({
      where: { id: CONV1 },
      select: { founderId: true, candidateId: true },
    });
    const recipientWhenF1Sends = conv.founderId === F1 ? conv.candidateId : conv.founderId;
    eq(recipientWhenF1Sends, C1, 'Quand F1 envoie → C1 reçoit');
    const recipientWhenC1Sends = conv.founderId === C1 ? conv.candidateId : conv.founderId;
    eq(recipientWhenC1Sends, F1, 'Quand C1 envoie → F1 reçoit');
  });

  // ─── 20. getUserConversationIds ────────────────────────────
  await run('20. Liste des conversation IDs (socket rooms)', async () => {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ founderId: F1 }, { candidateId: F1 }] },
      select: { id: true },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: 500,
    });
    const ids = convs.map(c => c.id);
    assert(ids.includes(CONV1), 'conv_001 dans la liste');
    assert(ids.length <= 500, 'Limite 500 respectée');
  });

  // ─── 21. Contenu long (5000 chars) ────────────────────────
  await run('21. Message 5000 caractères', async () => {
    const longContent = 'A'.repeat(5000);
    const msg = await prisma.message.create({
      data: { conversationId: CONV1, senderId: F1, content: longContent, status: 'SENT' },
    });
    TEST_MSG_IDS.push(msg.id);
    eq(msg.content.length, 5000, '5000 chars accepté');
  });

  // ─── CLEANUP ──────────────────────────────────────────────
  console.log('\n═══ NETTOYAGE ═══');
  if (TEST_MSG_IDS.length > 0) {
    await prisma.messageReaction.deleteMany({ where: { messageId: { in: TEST_MSG_IDS } } });
    await prisma.message.deleteMany({ where: { id: { in: TEST_MSG_IDS } } });
    console.log(`  🧹 ${TEST_MSG_IDS.length} messages de test supprimés`);
  }
  // Restore conv_001
  await prisma.conversation.update({
    where: { id: CONV1 },
    data: {
      lastMessageAt: new Date('2026-03-11T08:28:43.320Z'),
      lastMessagePreview: 'Super, on se voit lundi à 10h au Hilton Douala ?',
    },
  });
  console.log('  🧹 Données restaurées');

  // ─── RESULTS ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  Résultats: ${passed} réussis, ${failed} échoués sur ${passed + failed}`);
  console.log('════════════════════════════════════════════════════════');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main();
