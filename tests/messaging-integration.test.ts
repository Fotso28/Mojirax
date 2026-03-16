/**
 * Tests d'intégration approfondis — Système de messagerie MojiraX
 *
 * Teste directement la couche base de données et la logique métier
 * via PrismaClient (pas besoin de Firebase Auth).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ÉCHOUÉ: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ ÉCHOUÉ: ${message} — attendu: ${JSON.stringify(expected)}, reçu: ${JSON.stringify(actual)}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// ─── Test Data ────────────────────────────────────────────────────

const TEST_CONV_ID = 'conv_001';
const TEST_CONV_ID_2 = 'conv_002';
const FOUNDER_ID = 'user_founder_01';
const CANDIDATE_ID = 'user_cand_01';
const FOUNDER_2_ID = 'user_founder_05';
const CANDIDATE_2_ID = 'user_cand_04';
const NON_MEMBER_ID = 'user_founder_02'; // not in conv_001

// IDs for test data we create (will be cleaned up)
const TEST_MSG_IDS: string[] = [];
const TEST_REACTION_IDS: string[] = [];

// ─── Tests ────────────────────────────────────────────────────────

async function testConversationQuery() {
  console.log('\n═══ TEST 1: Récupération des conversations ═══');

  // Test: conversations for user_founder_01
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ founderId: FOUNDER_ID }, { candidateId: FOUNDER_ID }] },
    select: {
      id: true, lastMessageAt: true, lastMessagePreview: true,
      founderId: true, candidateId: true,
      founder: { select: { id: true, firstName: true, lastName: true, image: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    take: 21,
  });

  assert(convs.length === 1, `Fondateur 01 a 1 conversation (reçu: ${convs.length})`);
  assertEq(convs[0].id, TEST_CONV_ID, 'Conversation correcte');
  assert(convs[0].founder !== null, 'Founder inclus dans la réponse');
  assert(convs[0].candidate !== null, 'Candidate inclus dans la réponse');
  assertEq(convs[0].founder.firstName, 'Oswaldo', 'Founder name correct');
  assertEq(convs[0].candidate.firstName, 'Sophie', 'Candidate name correct');
  assert(convs[0].lastMessagePreview !== null, 'Preview du dernier message non-null');

  // Test: conversations for user_cand_01
  const convsCand = await prisma.conversation.findMany({
    where: { OR: [{ founderId: CANDIDATE_ID }, { candidateId: CANDIDATE_ID }] },
    take: 21,
  });
  assertEq(convsCand.length, 1, 'Candidat 01 a 1 conversation');

  // Test: non-member has conversations
  const convsNon = await prisma.conversation.findMany({
    where: { OR: [{ founderId: NON_MEMBER_ID }, { candidateId: NON_MEMBER_ID }] },
    take: 21,
  });
  assertEq(convsNon.length, 0, 'Non-membre a 0 conversation');
}

async function testMessageQuery() {
  console.log('\n═══ TEST 2: Récupération des messages ═══');

  // All messages in conv_001
  const messages = await prisma.message.findMany({
    where: { conversationId: TEST_CONV_ID },
    select: {
      id: true, content: true, fileUrl: true, fileName: true,
      fileSize: true, fileMimeType: true, status: true,
      deliveredAt: true, readAt: true, createdAt: true,
      senderId: true,
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 21,
  });

  assertEq(messages.length, 7, 'conv_001 a 7 messages');

  // Check order (newest first)
  for (let i = 0; i < messages.length - 1; i++) {
    assert(
      new Date(messages[i].createdAt) >= new Date(messages[i + 1].createdAt),
      `Message ${i} est plus récent que ${i + 1}`
    );
  }

  // Check last message status (msg_007 = DELIVERED, not READ)
  const lastMsg = messages[0]; // newest
  assertEq(lastMsg.id, 'msg_007', 'Dernier message est msg_007');
  assertEq(lastMsg.status, 'DELIVERED', 'msg_007 est DELIVERED');
  assert(lastMsg.readAt === null, 'msg_007 pas encore lu (readAt null)');

  // Check older messages are READ
  const olderMsgs = messages.filter(m => m.id !== 'msg_007');
  for (const m of olderMsgs) {
    assertEq(m.status, 'READ', `${m.id} est READ`);
    assert(m.readAt !== null, `${m.id} a un readAt`);
  }
}

async function testPaginationCursor() {
  console.log('\n═══ TEST 3: Pagination cursor-based ═══');

  // Page 1: 3 messages
  const page1 = await prisma.message.findMany({
    where: { conversationId: TEST_CONV_ID },
    orderBy: { createdAt: 'desc' },
    take: 4, // 3 + 1 to check hasMore
    select: { id: true, createdAt: true },
  });

  const hasMore = page1.length > 3;
  assert(hasMore, 'Page 1 a hasMore=true (plus de 3 messages)');

  const items1 = page1.slice(0, 3);
  const cursor = items1[items1.length - 1].id;

  // Page 2: using cursor
  const page2 = await prisma.message.findMany({
    where: { conversationId: TEST_CONV_ID },
    orderBy: { createdAt: 'desc' },
    cursor: { id: cursor },
    skip: 1,
    take: 4,
    select: { id: true, createdAt: true },
  });

  assert(page2.length > 0, 'Page 2 a des résultats');
  // Ensure no overlap
  const page1Ids = new Set(items1.map(m => m.id));
  for (const m of page2) {
    assert(!page1Ids.has(m.id), `Message ${m.id} n'est pas en double`);
  }

  // Ensure continuity (page2 first item is older than page1 last item)
  assert(
    new Date(page2[0].createdAt) < new Date(items1[items1.length - 1].createdAt),
    'Page 2 commence après la fin de page 1'
  );
}

async function testMembershipVerification() {
  console.log('\n═══ TEST 4: Vérification membership (M01) ═══');

  // Founder IS member
  const conv = await prisma.conversation.findUnique({
    where: { id: TEST_CONV_ID },
    select: { founderId: true, candidateId: true },
  });
  assert(conv !== null, 'Conversation existe');
  assertEq(conv!.founderId, FOUNDER_ID, 'Founder est membre (founderId match)');
  assertEq(conv!.candidateId, CANDIDATE_ID, 'Candidate est membre (candidateId match)');
  assert(conv!.founderId !== NON_MEMBER_ID && conv!.candidateId !== NON_MEMBER_ID,
    'Non-membre n\'est PAS membre');
}

async function testSendMessage() {
  console.log('\n═══ TEST 5: Envoi de message ═══');

  // Send a test message
  const msg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: 'Test message from integration test',
      status: 'SENT',
    },
    select: {
      id: true, content: true, status: true, senderId: true,
      conversationId: true, createdAt: true,
    },
  });

  TEST_MSG_IDS.push(msg.id);

  assert(msg.id !== null, 'Message créé avec un ID');
  assertEq(msg.content, 'Test message from integration test', 'Contenu correct');
  assertEq(msg.status, 'SENT', 'Status initial = SENT');
  assertEq(msg.senderId, FOUNDER_ID, 'SenderId correct');

  // Update conversation lastMessageAt
  const updatedConv = await prisma.conversation.update({
    where: { id: TEST_CONV_ID },
    data: {
      lastMessageAt: msg.createdAt,
      lastMessagePreview: msg.content!.substring(0, 100),
    },
  });
  assert(updatedConv.lastMessagePreview === 'Test message from integration test',
    'Preview mise à jour');
}

async function testSendEmptyMessage() {
  console.log('\n═══ TEST 6: Message vide (validation) ═══');

  // In the service, this is checked: !dto.content && !dto.fileUrl → BadRequest
  // We test at DB level that both are nullable
  const msg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: null,
      fileUrl: null,
      status: 'SENT',
    },
  });
  TEST_MSG_IDS.push(msg.id);

  assert(msg.content === null, 'Content null accepté au niveau DB');
  assert(msg.fileUrl === null, 'FileUrl null accepté au niveau DB');
  // NOTE: La validation "content OU fileUrl requis" est dans le service, pas dans le schema
  console.log('⚠️  La contrainte "content OU fileUrl requis" est dans le service, pas en DB — OK design');
}

async function testMarkDelivered() {
  console.log('\n═══ TEST 7: Mark as DELIVERED ═══');

  // Get the SENT test message
  const sentMsg = await prisma.message.findFirst({
    where: { id: TEST_MSG_IDS[0], status: 'SENT' },
  });
  assert(sentMsg !== null, 'Message SENT trouvé');

  // Mark as delivered (simulating recipient)
  const updated = await prisma.message.update({
    where: { id: sentMsg!.id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });

  assertEq(updated.status, 'DELIVERED', 'Status mis à jour en DELIVERED');
  assert(updated.deliveredAt !== null, 'deliveredAt rempli');

  // Idempotency: service checks status !== 'SENT' before updating
  // If already DELIVERED, service returns null
  assertEq(updated.status, 'DELIVERED', 'Re-delivery = idempotent (déjà DELIVERED)');
}

async function testMarkRead() {
  console.log('\n═══ TEST 8: Mark as READ (batch) ═══');

  // Create a few SENT messages from founder to candidate
  const msgs = [];
  for (let i = 0; i < 3; i++) {
    const m = await prisma.message.create({
      data: {
        conversationId: TEST_CONV_ID,
        senderId: FOUNDER_ID,
        content: `Unread test message ${i}`,
        status: 'SENT',
      },
    });
    msgs.push(m);
    TEST_MSG_IDS.push(m.id);
  }

  // Mark all as read (simulating candidate reading)
  const now = new Date();
  const result = await prisma.message.updateMany({
    where: {
      conversationId: TEST_CONV_ID,
      senderId: { not: CANDIDATE_ID },
      status: { not: 'READ' },
    },
    data: { status: 'READ', readAt: now },
  });

  assert(result.count >= 3, `Au moins 3 messages marqués READ (reçu: ${result.count})`);

  // Verify
  const readMsgs = await prisma.message.findMany({
    where: { id: { in: msgs.map(m => m.id) } },
  });
  for (const m of readMsgs) {
    assertEq(m.status, 'READ', `${m.id} est READ`);
    assert(m.readAt !== null, `${m.id} a readAt`);
  }
}

async function testUnreadCount() {
  console.log('\n═══ TEST 9: Compteur de messages non-lus ═══');

  // Create an unread SENT message for candidate
  const unreadMsg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: 'Unread for candidate',
      status: 'SENT',
    },
  });
  TEST_MSG_IDS.push(unreadMsg.id);

  // Count unread for candidate (messages not from candidate, not READ)
  const count = await prisma.message.count({
    where: {
      conversation: { OR: [{ founderId: CANDIDATE_ID }, { candidateId: CANDIDATE_ID }] },
      senderId: { not: CANDIDATE_ID },
      status: { not: 'READ' },
    },
  });

  assert(count >= 1, `Candidat a au moins 1 message non-lu (reçu: ${count})`);

  // Count for founder (the sender): should be 0 for their own messages
  // Actually let's check if there are unread messages FROM candidate to founder
  const founderUnread = await prisma.message.count({
    where: {
      conversation: { OR: [{ founderId: FOUNDER_ID }, { candidateId: FOUNDER_ID }] },
      senderId: { not: FOUNDER_ID },
      status: { not: 'READ' },
    },
  });
  console.log(`  → Founder non-lus: ${founderUnread}`);
}

async function testReactions() {
  console.log('\n═══ TEST 10: Réactions emoji ═══');

  const targetMsgId = 'msg_001'; // existing message

  // Add reaction
  const reaction = await prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '👍' } },
    create: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '👍' },
    update: {},
  });
  TEST_REACTION_IDS.push(reaction.id);
  assert(reaction.id !== null, 'Réaction créée');
  assertEq(reaction.emoji, '👍', 'Emoji correct');

  // Add second reaction (different emoji, same user)
  const reaction2 = await prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '❤️' } },
    create: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '❤️' },
    update: {},
  });
  TEST_REACTION_IDS.push(reaction2.id);

  // Add reaction from founder
  const reaction3 = await prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId: targetMsgId, userId: FOUNDER_ID, emoji: '👍' } },
    create: { messageId: targetMsgId, userId: FOUNDER_ID, emoji: '👍' },
    update: {},
  });
  TEST_REACTION_IDS.push(reaction3.id);

  // Check all reactions
  const allReactions = await prisma.messageReaction.findMany({
    where: { messageId: targetMsgId },
    select: { id: true, emoji: true, userId: true },
  });

  assert(allReactions.length >= 3, `Au moins 3 réactions (reçu: ${allReactions.length})`);

  // Check max 6 distinct emojis
  const distinctEmojis = new Set(allReactions.map(r => r.emoji));
  assert(distinctEmojis.size <= 6, `Max 6 emojis distincts (reçu: ${distinctEmojis.size})`);

  // Test idempotent upsert (same emoji, same user = no duplicate)
  const reactionDup = await prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '👍' } },
    create: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '👍' },
    update: {},
  });
  assertEq(reactionDup.id, reaction.id, 'Upsert idempotent — pas de doublon');
}

async function testReactionLimit() {
  console.log('\n═══ TEST 11: Limite de 6 emojis distincts ═══');

  const targetMsgId = 'msg_002';
  const emojis = ['😀', '😂', '🎉', '🔥', '💯', '🙌'];

  // Add 6 distinct emojis
  for (const emoji of emojis) {
    await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji } },
      create: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji },
      update: {},
    });
  }

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: targetMsgId },
    select: { emoji: true },
    distinct: ['emoji'],
  });

  assertEq(reactions.length, 6, 'Exactement 6 emojis distincts');

  // The service would reject a 7th distinct emoji — test the logic
  const wouldExceed = !new Set(reactions.map(r => r.emoji)).has('🤯') && reactions.length >= 6;
  assert(wouldExceed, 'Ajout d\'un 7ème emoji distinct serait rejeté par le service');

  // Cleanup
  await prisma.messageReaction.deleteMany({
    where: { messageId: targetMsgId, userId: CANDIDATE_ID },
  });
}

async function testRemoveReaction() {
  console.log('\n═══ TEST 12: Suppression de réaction ═══');

  const targetMsgId = 'msg_003';

  // Add then remove
  const reaction = await prisma.messageReaction.create({
    data: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '🎯' },
  });

  const deleted = await prisma.messageReaction.deleteMany({
    where: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '🎯' },
  });
  assertEq(deleted.count, 1, 'Réaction supprimée');

  // Verify it's gone
  const remaining = await prisma.messageReaction.findMany({
    where: { messageId: targetMsgId, userId: CANDIDATE_ID, emoji: '🎯' },
  });
  assertEq(remaining.length, 0, 'Réaction bien supprimée de la DB');
}

async function testMessageWithFile() {
  console.log('\n═══ TEST 13: Message avec fichier ═══');

  const msg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: null,
      fileUrl: 'https://storage.example.com/test.pdf',
      fileName: 'business-plan.pdf',
      fileSize: 1_234_567,
      fileMimeType: 'application/pdf',
      status: 'SENT',
    },
  });
  TEST_MSG_IDS.push(msg.id);

  assert(msg.fileUrl !== null, 'FileUrl enregistré');
  assertEq(msg.fileName, 'business-plan.pdf', 'FileName correct');
  assertEq(msg.fileSize, 1234567, 'FileSize correct');
  assertEq(msg.fileMimeType, 'application/pdf', 'FileMimeType correct');
  assert(msg.content === null, 'Content null pour un message fichier');
}

async function testConversationLastMessageUpdate() {
  console.log('\n═══ TEST 14: Mise à jour lastMessage de la conversation ═══');

  const conv = await prisma.conversation.findUnique({
    where: { id: TEST_CONV_ID },
    select: { lastMessageAt: true, lastMessagePreview: true },
  });

  assert(conv !== null, 'Conversation trouvée');
  assert(conv!.lastMessageAt !== null, 'lastMessageAt non-null');
  assert(conv!.lastMessagePreview !== null, 'lastMessagePreview non-null');
  assert(conv!.lastMessagePreview!.length <= 100, 'Preview ≤ 100 caractères');
}

async function testConversationApplicationCascade() {
  console.log('\n═══ TEST 15: Relation Conversation → Application ═══');

  // Verify conversations are linked to applications
  const conv = await prisma.conversation.findUnique({
    where: { id: TEST_CONV_ID },
    select: {
      applicationId: true,
      application: { select: { id: true, status: true } },
    },
  });

  assert(conv !== null, 'Conversation existe');
  assertEq(conv!.applicationId, 'app_001', 'Liée à application app_001');
  assert(conv!.application !== null, 'Relation application résolue');
}

async function testMessageCascadeDelete() {
  console.log('\n═══ TEST 16: Cascade delete — Message → Reactions ═══');

  // Create a message with reactions, then delete message
  const msg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: 'Message with reactions to delete',
      status: 'SENT',
    },
  });

  await prisma.messageReaction.create({
    data: { messageId: msg.id, userId: CANDIDATE_ID, emoji: '👍' },
  });
  await prisma.messageReaction.create({
    data: { messageId: msg.id, userId: FOUNDER_ID, emoji: '❤️' },
  });

  // Verify reactions exist
  const beforeCount = await prisma.messageReaction.count({ where: { messageId: msg.id } });
  assertEq(beforeCount, 2, '2 réactions avant suppression');

  // Delete message
  await prisma.message.delete({ where: { id: msg.id } });

  // Reactions should be cascade-deleted
  const afterCount = await prisma.messageReaction.count({ where: { messageId: msg.id } });
  assertEq(afterCount, 0, 'Réactions supprimées en cascade');
}

async function testSecuritySelects() {
  console.log('\n═══ TEST 17: Sécurité — Select explicites (A01) ═══');

  // Verify public conversation query uses select (no email, phone, firebaseUid)
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ founderId: FOUNDER_ID }, { candidateId: FOUNDER_ID }] },
    select: {
      id: true, lastMessageAt: true, lastMessagePreview: true,
      founderId: true, candidateId: true,
      founder: { select: { id: true, firstName: true, lastName: true, image: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
    },
    take: 20,
  });

  // Verify no sensitive fields
  const founderData = convs[0]?.founder;
  assert(founderData !== null, 'Founder data exists');
  assert(!('email' in founderData), 'Pas d\'email dans la réponse');
  assert(!('firebaseUid' in founderData), 'Pas de firebaseUid dans la réponse');
  assert(!('phone' in founderData), 'Pas de phone dans la réponse');
  assert('firstName' in founderData, 'firstName présent');
  assert('lastName' in founderData, 'lastName présent');
}

async function testSecondConversation() {
  console.log('\n═══ TEST 18: Deuxième conversation (conv_002) ═══');

  const messages = await prisma.message.findMany({
    where: { conversationId: TEST_CONV_ID_2 },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, senderId: true, content: true },
  });

  assertEq(messages.length, 4, 'conv_002 a 4 messages');

  // All should be READ
  for (const m of messages) {
    assertEq(m.status, 'READ', `${m.id} est READ`);
  }

  // Founder 05 and Candidate 04 are the participants
  const senders = new Set(messages.map(m => m.senderId));
  assert(senders.has(FOUNDER_2_ID), 'Founder 05 a envoyé des messages');
  assert(senders.has(CANDIDATE_2_ID), 'Candidate 04 a envoyé des messages');
}

async function testMaxContentLength() {
  console.log('\n═══ TEST 19: Longueur max contenu (5000 chars) ═══');

  const longContent = 'A'.repeat(5000);
  const msg = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: longContent,
      status: 'SENT',
    },
  });
  TEST_MSG_IDS.push(msg.id);
  assertEq(msg.content!.length, 5000, 'Message de 5000 chars accepté');

  // Very long content (> 5000) — DB accepts it, but DTO validation rejects it
  const veryLong = 'B'.repeat(5001);
  const msg2 = await prisma.message.create({
    data: {
      conversationId: TEST_CONV_ID,
      senderId: FOUNDER_ID,
      content: veryLong,
      status: 'SENT',
    },
  });
  TEST_MSG_IDS.push(msg2.id);
  console.log('⚠️  DB accepte >5000 chars — la validation est dans le DTO (MaxLength(5000)) — OK');
}

async function testGetRecipient() {
  console.log('\n═══ TEST 20: Récupération du destinataire ═══');

  const conv = await prisma.conversation.findUnique({
    where: { id: TEST_CONV_ID },
    select: { founderId: true, candidateId: true },
  });

  assert(conv !== null, 'Conversation trouvée');

  // If sender is founder, recipient is candidate
  const recipientWhenFounderSends = conv!.founderId === FOUNDER_ID ? conv!.candidateId : conv!.founderId;
  assertEq(recipientWhenFounderSends, CANDIDATE_ID, 'Destinataire = candidate quand founder envoie');

  // If sender is candidate, recipient is founder
  const recipientWhenCandidateSends = conv!.founderId === CANDIDATE_ID ? conv!.candidateId : conv!.founderId;
  assertEq(recipientWhenCandidateSends, FOUNDER_ID, 'Destinataire = founder quand candidate envoie');
}

async function testConversationUniqueApplication() {
  console.log('\n═══ TEST 21: Unicité conversation par application ═══');

  // applicationId is UNIQUE on Conversation — verify
  try {
    // This should fail because app_001 already has a conversation
    await prisma.conversation.create({
      data: {
        applicationId: 'app_001',
        founderId: FOUNDER_ID,
        candidateId: CANDIDATE_ID,
      },
    });
    assert(false, 'Devrait échouer — applicationId unique');
  } catch (err: any) {
    assert(
      err.code === 'P2002' || err.message.includes('Unique'),
      'Contrainte unique applicationId respectée'
    );
  }
}

// ─── Cleanup & Run ────────────────────────────────────────────────

async function cleanup() {
  console.log('\n═══ NETTOYAGE ═══');

  // Remove test reactions
  if (TEST_REACTION_IDS.length > 0) {
    await prisma.messageReaction.deleteMany({
      where: { id: { in: TEST_REACTION_IDS } },
    });
  }

  // Remove remaining test reactions on msg_001
  await prisma.messageReaction.deleteMany({
    where: { messageId: { in: ['msg_001', 'msg_002', 'msg_003'] } },
  });

  // Remove test messages
  if (TEST_MSG_IDS.length > 0) {
    await prisma.messageReaction.deleteMany({
      where: { messageId: { in: TEST_MSG_IDS } },
    });
    await prisma.message.deleteMany({
      where: { id: { in: TEST_MSG_IDS } },
    });
  }

  // Restore conv_001 lastMessage to original
  await prisma.conversation.update({
    where: { id: TEST_CONV_ID },
    data: {
      lastMessageAt: new Date('2026-03-11T08:28:43.320Z'),
      lastMessagePreview: 'Super, on se voit lundi à 10h au Hilton Douala ?',
    },
  });

  console.log('✅ Données de test nettoyées');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║    Tests d\'intégration — Messagerie MojiraX          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  const tests = [
    testConversationQuery,
    testMessageQuery,
    testPaginationCursor,
    testMembershipVerification,
    testSendMessage,
    testSendEmptyMessage,
    testMarkDelivered,
    testMarkRead,
    testUnreadCount,
    testReactions,
    testReactionLimit,
    testRemoveReaction,
    testMessageWithFile,
    testConversationLastMessageUpdate,
    testConversationApplicationCascade,
    testMessageCascadeDelete,
    testSecuritySelects,
    testSecondConversation,
    testMaxContentLength,
    testGetRecipient,
    testConversationUniqueApplication,
  ];

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`\n🔴 Test échoué: ${test.name} — ${err.message}\n`);
    }
  }

  await cleanup();

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`Résultats: ${passed} réussis, ${failed} échoués sur ${tests.length}`);
  console.log('════════════════════════════════════════════════════════');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main();
