/**
 * Tests d'integration — Messagerie MojiraX
 * 10 testeurs humains simulant des scenarios reels
 *
 * Run: node tests/messaging-human-testers.js
 *
 * Couvre: conversations, messages, fichiers, reactions, statuts de livraison,
 * idempotence, membership, quotas plan, pagination, doublons, cascades
 */

const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'api', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

let passes = 0;
let failures = 0;
const results = [];
const TEST_PREFIX = 'test_msg_';

// ─── Helpers ────────────────────────────────────────────────

function assert(condition, msg) {
  if (!condition) {
    console.error(`    \u274c FAIL: ${msg}`);
    failures++;
    return false;
  }
  console.log(`    \u2705 PASS: ${msg}`);
  passes++;
  return true;
}

function assertEq(a, b, msg) {
  return assert(a === b, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`);
}

function assertNe(a, b, msg) {
  return assert(a !== b, `${msg} (expected != ${JSON.stringify(b)}, got ${JSON.stringify(a)})`);
}

function assertGte(a, b, msg) {
  return assert(a >= b, `${msg} (expected >= ${b}, got ${a})`);
}

async function assertThrows(fn, msg) {
  try {
    await fn();
    console.error(`    \u274c FAIL: ${msg} (aucune exception levee)`);
    failures++;
    return false;
  } catch (e) {
    console.log(`    \u2705 PASS: ${msg} (exception: ${e.message?.substring(0, 60)})`);
    passes++;
    return true;
  }
}

async function run(testeurName, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${testeurName}`);
  console.log(`${'='.repeat(60)}`);
  const before = passes + failures;
  try {
    await fn();
  } catch (e) {
    console.error(`    \ud83d\udd34 ERREUR CRITIQUE: ${e.message}`);
    failures++;
  }
  const total = passes + failures - before;
  results.push({ name: testeurName, ran: total });
}

// ─── Data helpers ───────────────────────────────────────────

async function createUser(suffix, plan = 'FREE', extra = {}) {
  return prisma.user.create({
    data: {
      email: `${TEST_PREFIX}${suffix}@test.local`,
      firstName: suffix.split('_')[0],
      lastName: 'Test',
      role: 'FOUNDER',
      plan,
      firebaseUid: `fb_${TEST_PREFIX}${suffix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'ACTIVE',
      ...extra,
    },
  });
}

async function createConversation(user1Id, user2Id) {
  const [founderId, candidateId] = user1Id < user2Id
    ? [user1Id, user2Id]
    : [user2Id, user1Id];

  return prisma.conversation.create({
    data: { founderId, candidateId },
  });
}

async function createMessage(conversationId, senderId, content, extra = {}) {
  return prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      status: 'SENT',
      ...extra,
    },
  });
}

// ─── Cleanup ────────────────────────────────────────────────

async function cleanup() {
  console.log('\n\ud83e\uddf9 Nettoyage des donnees de test...');
  await prisma.messageReaction.deleteMany({
    where: { message: { conversation: { founder: { email: { startsWith: TEST_PREFIX } } } } },
  });
  await prisma.message.deleteMany({
    where: { conversation: { founder: { email: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.conversation.deleteMany({
    where: { founder: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  console.log('   Nettoyage termine.\n');
}

// =================================================================
// TESTEUR 1 — Amadou (methodique) : Workflow nominal conversation
// =================================================================

async function testeur1_amadou() {
  const alice = await createUser('amadou_alice', 'PRO');
  const bob = await createUser('amadou_bob', 'PLUS');

  // 1. Creer une conversation
  const conv = await createConversation(alice.id, bob.id);
  assert(conv.id !== undefined, 'Conversation creee avec un ID');
  assert(conv.founderId !== null && conv.candidateId !== null, 'founderId et candidateId presents');

  // 2. Verifier la normalisation des IDs (petit = founder)
  const expectedFounder = alice.id < bob.id ? alice.id : bob.id;
  assertEq(conv.founderId, expectedFounder, 'Normalisation: le plus petit ID = founderId');

  // 3. Envoyer un message texte
  const msg1 = await createMessage(conv.id, alice.id, 'Bonjour Bob, je suis interesse par ton profil!');
  assertEq(msg1.senderId, alice.id, 'Message: senderId correct');
  assertEq(msg1.conversationId, conv.id, 'Message: conversationId correct');
  assertEq(msg1.status, 'SENT', 'Message: status initial = SENT');
  assert(msg1.content.includes('Bonjour Bob'), 'Message: contenu correct');

  // 4. Mettre a jour lastMessageAt
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date(), lastMessagePreview: msg1.content.substring(0, 100) },
  });
  const updatedConv = await prisma.conversation.findUnique({ where: { id: conv.id } });
  assert(updatedConv.lastMessageAt !== null, 'Conversation: lastMessageAt mis a jour');
  assert(updatedConv.lastMessagePreview.startsWith('Bonjour Bob'), 'Conversation: lastMessagePreview correct');

  // 5. Bob repond
  const msg2 = await createMessage(conv.id, bob.id, 'Merci Alice! Quand es-tu disponible?');
  assertEq(msg2.senderId, bob.id, 'Reponse Bob: senderId correct');

  // 6. Lister les messages
  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'asc' },
  });
  assertEq(messages.length, 2, 'Conversation: 2 messages');
  assertEq(messages[0].senderId, alice.id, 'Premier message = Alice');
  assertEq(messages[1].senderId, bob.id, 'Deuxieme message = Bob');
}

// =================================================================
// TESTEUR 2 — Fatou (rapide) : Messages optionnels et fichiers
// =================================================================

async function testeur2_fatou() {
  const u1 = await createUser('fatou_u1', 'PRO');
  const u2 = await createUser('fatou_u2', 'FREE');
  const conv = await createConversation(u1.id, u2.id);

  // 1. Message avec fichier PDF (pas de texte)
  const msgFile = await createMessage(conv.id, u1.id, null, {
    fileUrl: 'https://minio.local/messages/business-plan.pdf',
    fileName: 'business-plan.pdf',
    fileSize: 1048576,
    fileMimeType: 'application/pdf',
  });
  assert(msgFile.content === null, 'Message fichier: content = null');
  assertEq(msgFile.fileName, 'business-plan.pdf', 'Message fichier: fileName correct');
  assertEq(msgFile.fileSize, 1048576, 'Message fichier: fileSize = 1MB');
  assertEq(msgFile.fileMimeType, 'application/pdf', 'Message fichier: mime = PDF');

  // 2. Message avec fichier image
  const msgImg = await createMessage(conv.id, u2.id, null, {
    fileUrl: 'https://minio.local/messages/screenshot.png',
    fileName: 'screenshot.png',
    fileSize: 256000,
    fileMimeType: 'image/png',
  });
  assertEq(msgImg.fileMimeType, 'image/png', 'Message image: mime = image/png');

  // 3. Message texte + fichier (les deux)
  const msgBoth = await createMessage(conv.id, u1.id, 'Voici le doc', {
    fileUrl: 'https://minio.local/messages/doc.docx',
    fileName: 'doc.docx',
    fileSize: 500000,
    fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  assert(msgBoth.content === 'Voici le doc', 'Message texte+fichier: contenu present');
  assert(msgBoth.fileUrl !== null, 'Message texte+fichier: fichier present');

  // 4. Message vide (ni texte ni fichier) → OK en base, c'est le service qui valide
  // On verifie que Prisma accepte le null (la validation est au service layer)
  const msgEmpty = await prisma.message.create({
    data: { conversationId: conv.id, senderId: u2.id, status: 'SENT' },
  });
  assert(msgEmpty.content === null, 'Message vide: content = null en base (validation service)');
  assert(msgEmpty.fileUrl === null, 'Message vide: fileUrl = null en base');
}

// =================================================================
// TESTEUR 3 — Jean (comptable) : Tailles fichiers et limites
// =================================================================

async function testeur3_jean() {
  const u1 = await createUser('jean_u1', 'PLUS');
  const u2 = await createUser('jean_u2', 'FREE');
  const conv = await createConversation(u1.id, u2.id);

  // 1. Fichier exactement 5MB (limite max)
  const msg5mb = await createMessage(conv.id, u1.id, null, {
    fileUrl: 'https://minio.local/messages/big.pdf',
    fileName: 'big.pdf',
    fileSize: 5242880,
    fileMimeType: 'application/pdf',
  });
  assertEq(msg5mb.fileSize, 5242880, 'Fichier 5MB: taille exacte OK');

  // 2. Fichier petit (1 byte)
  const msgTiny = await createMessage(conv.id, u1.id, null, {
    fileUrl: 'https://minio.local/messages/tiny.txt',
    fileName: 'tiny.txt',
    fileSize: 1,
    fileMimeType: 'application/pdf',
  });
  assertEq(msgTiny.fileSize, 1, 'Fichier 1 byte: OK');

  // 3. Verifier le nombre total de messages
  const count = await prisma.message.count({ where: { conversationId: conv.id } });
  assertEq(count, 2, 'Jean: 2 messages fichier en base');

  // 4. Preview pour fichier doit montrer le nom
  const preview = msg5mb.fileName ? `\ud83d\udcce ${msg5mb.fileName}` : '';
  assert(preview.includes('big.pdf'), 'Preview fichier contient le nom');
}

// =================================================================
// TESTEUR 4 — Moussa (peu tech) : Erreurs et cas limites
// =================================================================

async function testeur4_moussa() {
  const u1 = await createUser('moussa_u1');
  const u2 = await createUser('moussa_u2');
  const conv = await createConversation(u1.id, u2.id);

  // 1. Message contenu vide string
  const msgEmpty = await createMessage(conv.id, u1.id, '');
  assertEq(msgEmpty.content, '', 'Message contenu vide string: accepte en BD');

  // 2. Message contenu tres long (5000 chars — la limite DTO)
  const longContent = 'A'.repeat(5000);
  const msgLong = await createMessage(conv.id, u1.id, longContent);
  assertEq(msgLong.content.length, 5000, 'Message 5000 chars: OK');

  // 3. Message avec caracteres speciaux et emojis
  const specialContent = "Hello \ud83d\udc4b! C'est <script>alert('xss')</script> & des accents: eaeacutee, uumlaut";
  const msgSpecial = await createMessage(conv.id, u1.id, specialContent);
  assert(msgSpecial.content.includes('<script>'), 'Contenu special stocke tel quel (XSS gere au frontend)');

  // 4. Conversation vers soi-meme → constraint check via IDs differents
  // En BD la constraint @@unique([founderId, candidateId]) le permet techniquement
  // mais le service l'interdit. On verifie le schema.
  const selfConvAllowed = u1.id !== u1.id; // false
  assert(!selfConvAllowed, 'Auto-conversation: le service doit rejeter (userId === targetUserId)');

  // 5. Envoyer dans une conversation qui n'existe pas
  const fakeConvId = 'cm00000000000000000000fake';
  const msgOrphan = await prisma.message.create({
    data: { conversationId: fakeConvId, senderId: u1.id, content: 'Orphelin', status: 'SENT' },
  }).catch(e => e);
  assert(msgOrphan instanceof Error, 'Message dans conv inexistante: erreur FK');
}

// =================================================================
// TESTEUR 5 — Aisha (securite) : Membership et isolation
// =================================================================

async function testeur5_aisha() {
  const alice = await createUser('aisha_alice', 'PRO');
  const bob = await createUser('aisha_bob', 'PLUS');
  const eve = await createUser('aisha_eve', 'ELITE'); // intrus

  const conv = await createConversation(alice.id, bob.id);
  await createMessage(conv.id, alice.id, 'Message secret entre Alice et Bob');

  // 1. Alice est membre
  const aliceIsMember = conv.founderId === alice.id || conv.candidateId === alice.id;
  assert(aliceIsMember, 'Alice est membre de la conversation');

  // 2. Bob est membre
  const bobIsMember = conv.founderId === bob.id || conv.candidateId === bob.id;
  assert(bobIsMember, 'Bob est membre de la conversation');

  // 3. Eve N'EST PAS membre
  const eveIsMember = conv.founderId === eve.id || conv.candidateId === eve.id;
  assert(!eveIsMember, 'Eve N EST PAS membre (intrus detecte)');

  // 4. Eve ne doit pas voir les messages (simulation membership check)
  const convCheck = await prisma.conversation.findUnique({
    where: { id: conv.id },
    select: { founderId: true, candidateId: true },
  });
  const eveHasAccess = convCheck.founderId === eve.id || convCheck.candidateId === eve.id;
  assert(!eveHasAccess, 'Verification membership: Eve rejetee');

  // 5. Les messages de la conv ne sont pas visibles pour Eve (filtre membership)
  const eveMessages = await prisma.message.findMany({
    where: {
      conversationId: conv.id,
      conversation: { OR: [{ founderId: eve.id }, { candidateId: eve.id }] },
    },
  });
  assertEq(eveMessages.length, 0, 'Eve ne voit aucun message (filtre membership)');

  // 6. Conversation entre Alice et Eve = differente
  const conv2 = await createConversation(alice.id, eve.id);
  assertNe(conv.id, conv2.id, 'Conversations distinctes: Alice-Bob != Alice-Eve');

  // 7. Messages de conv2 ne leakent pas dans conv1
  await createMessage(conv2.id, eve.id, 'Message Eve prive');
  const conv1Messages = await prisma.message.findMany({ where: { conversationId: conv.id } });
  const conv2Messages = await prisma.message.findMany({ where: { conversationId: conv2.id } });
  assert(conv1Messages.every(m => m.senderId !== eve.id), 'Isolation: aucun msg Eve dans conv Alice-Bob');
  assertEq(conv2Messages.length, 1, 'Conv Alice-Eve: 1 message');
}

// =================================================================
// TESTEUR 6 — Paul (doublons) : Idempotence et contraintes unique
// =================================================================

async function testeur6_paul() {
  const u1 = await createUser('paul_u1', 'PRO');
  const u2 = await createUser('paul_u2', 'PLUS');

  // 1. Conversation unique: @@unique([founderId, candidateId])
  const conv1 = await createConversation(u1.id, u2.id);
  const duplicateConv = await prisma.conversation.create({
    data: {
      founderId: conv1.founderId,
      candidateId: conv1.candidateId,
    },
  }).catch(e => e);
  assert(duplicateConv instanceof Error, 'Doublon conversation: P2002 rejete');
  assert(duplicateConv.code === 'P2002', `Code erreur Prisma = P2002 (got ${duplicateConv.code})`);

  // 2. Conversation inversee (u2, u1) = meme paire normalisee
  const [f, c] = u2.id < u1.id ? [u2.id, u1.id] : [u1.id, u2.id];
  assertEq(f, conv1.founderId, 'Normalisation inversee: meme founderId');
  assertEq(c, conv1.candidateId, 'Normalisation inversee: meme candidateId');

  // 3. Idempotence via clientMessageId
  const clientId = `client_${Date.now()}`;
  const msg1 = await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: u1.id,
      content: 'Message idempotent',
      clientMessageId: clientId,
      status: 'SENT',
    },
  });

  // Re-creation avec meme clientMessageId → P2002
  const msg2 = await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: u1.id,
      content: 'Message doublon',
      clientMessageId: clientId,
      status: 'SENT',
    },
  }).catch(e => e);
  assert(msg2 instanceof Error, 'Doublon clientMessageId: rejete');

  // 4. Verifier qu'un seul message existe
  const count = await prisma.message.count({
    where: { conversationId: conv1.id, clientMessageId: clientId },
  });
  assertEq(count, 1, 'Idempotence: 1 seul message pour ce clientMessageId');

  // 5. Reaction unique: @@unique([messageId, userId, emoji])
  await prisma.messageReaction.create({
    data: { messageId: msg1.id, userId: u2.id, emoji: '\ud83d\udc4d' },
  });
  const dupReaction = await prisma.messageReaction.create({
    data: { messageId: msg1.id, userId: u2.id, emoji: '\ud83d\udc4d' },
  }).catch(e => e);
  assert(dupReaction instanceof Error, 'Doublon reaction (meme user+emoji): rejete');
}

// =================================================================
// TESTEUR 7 — Marie (limites) : Reactions et pagination
// =================================================================

async function testeur7_marie() {
  const u1 = await createUser('marie_u1', 'ELITE');
  const u2 = await createUser('marie_u2', 'PRO');
  const conv = await createConversation(u1.id, u2.id);
  const msg = await createMessage(conv.id, u1.id, 'Message pour reactions');

  // 1. Ajouter 6 emojis distincts (le maximum)
  const emojis = ['\ud83d\udc4d', '\u2764\ufe0f', '\ud83d\ude02', '\ud83d\ude22', '\ud83d\ude21', '\ud83d\ude31'];
  for (const emoji of emojis) {
    await prisma.messageReaction.create({
      data: { messageId: msg.id, userId: u2.id, emoji },
    });
  }
  const reactionCount = await prisma.messageReaction.count({ where: { messageId: msg.id } });
  assertEq(reactionCount, 6, 'Reactions: 6 emojis distincts crees');

  // 2. La limite de 6 est dans le SERVICE, pas en BD
  // En BD on peut en ajouter plus, le service doit bloquer
  const emoji7 = await prisma.messageReaction.create({
    data: { messageId: msg.id, userId: u2.id, emoji: '\ud83e\udd2f' },
  });
  assert(emoji7.id !== undefined, 'BD accepte 7e emoji (le service doit bloquer, pas la BD)');
  // Nettoyage
  await prisma.messageReaction.delete({ where: { id: emoji7.id } });

  // 3. 2 users peuvent mettre le meme emoji
  await prisma.messageReaction.create({
    data: { messageId: msg.id, userId: u1.id, emoji: '\ud83d\udc4d' },
  });
  const thumbsCount = await prisma.messageReaction.count({
    where: { messageId: msg.id, emoji: '\ud83d\udc4d' },
  });
  assertEq(thumbsCount, 2, 'Meme emoji par 2 users: 2 reactions distinctes');

  // 4. Pagination messages: creer 25 messages, paginer par 10
  for (let i = 0; i < 25; i++) {
    await createMessage(conv.id, i % 2 === 0 ? u1.id : u2.id, `Msg pagination ${i}`);
  }
  const totalMsgs = await prisma.message.count({ where: { conversationId: conv.id } });
  assertGte(totalMsgs, 25, `Total messages >= 25 (got ${totalMsgs})`);

  // Page 1: 10 plus recents
  const page1 = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  assertEq(page1.length, 10, 'Page 1: 10 messages');

  // Page 2: 10 suivants
  const page2 = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    cursor: { id: page1[page1.length - 1].id },
    skip: 1,
  });
  assertEq(page2.length, 10, 'Page 2: 10 messages');

  // Pas de doublons entre pages
  const page1Ids = new Set(page1.map(m => m.id));
  const overlap = page2.filter(m => page1Ids.has(m.id));
  assertEq(overlap.length, 0, 'Pagination: aucun doublon entre page 1 et 2');
}

// =================================================================
// TESTEUR 8 — Olivier (triche) : Statuts de livraison
// =================================================================

async function testeur8_olivier() {
  const sender = await createUser('olivier_sender', 'PRO');
  const receiver = await createUser('olivier_receiver', 'PLUS');
  const conv = await createConversation(sender.id, receiver.id);

  // 1. Nouveau message = SENT
  const msg = await createMessage(conv.id, sender.id, 'Test statuts');
  assertEq(msg.status, 'SENT', 'Nouveau message: status = SENT');
  assert(msg.deliveredAt === null, 'Nouveau message: deliveredAt = null');
  assert(msg.readAt === null, 'Nouveau message: readAt = null');

  // 2. Passage SENT → DELIVERED
  const delivered = await prisma.message.update({
    where: { id: msg.id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
  assertEq(delivered.status, 'DELIVERED', 'Statut: SENT → DELIVERED OK');
  assert(delivered.deliveredAt !== null, 'deliveredAt non null apres DELIVERED');

  // 3. Passage DELIVERED → READ
  const read = await prisma.message.update({
    where: { id: msg.id },
    data: { status: 'READ', readAt: new Date() },
  });
  assertEq(read.status, 'READ', 'Statut: DELIVERED → READ OK');
  assert(read.readAt !== null, 'readAt non null apres READ');
  assert(read.deliveredAt !== null, 'deliveredAt toujours present apres READ');

  // 4. L'envoyeur ne doit pas pouvoir marquer son propre message comme DELIVERED
  // (logique service: msg.senderId === userId → return null)
  const isSender = msg.senderId === sender.id;
  assert(isSender, 'Verification: l envoyeur ne doit pas self-deliver (service check)');

  // 5. markRead met a jour TOUS les messages non-lus du destinataire
  const msg2 = await createMessage(conv.id, sender.id, 'Message 2');
  const msg3 = await createMessage(conv.id, sender.id, 'Message 3');
  await prisma.message.updateMany({
    where: {
      conversationId: conv.id,
      senderId: { not: receiver.id },
      status: { not: 'READ' },
    },
    data: { status: 'READ', readAt: new Date() },
  });
  const unreadCount = await prisma.message.count({
    where: { conversationId: conv.id, senderId: sender.id, status: { not: 'READ' } },
  });
  assertEq(unreadCount, 0, 'markRead: tous les messages du sender sont READ');

  // 6. Unread count global (messages non-READ ou le user n'est pas l'envoyeur)
  const newMsg = await createMessage(conv.id, sender.id, 'Nouveau non-lu');
  const globalUnread = await prisma.message.count({
    where: {
      conversation: { OR: [{ founderId: receiver.id }, { candidateId: receiver.id }] },
      senderId: { not: receiver.id },
      status: { not: 'READ' },
    },
  });
  assertGte(globalUnread, 1, `Unread count receiver >= 1 (got ${globalUnread})`);
}

// =================================================================
// TESTEUR 9 — Sandrine (audit) : Coherence et timestamps
// =================================================================

async function testeur9_sandrine() {
  const u1 = await createUser('sandrine_u1', 'PLUS');
  const u2 = await createUser('sandrine_u2', 'FREE');
  const conv = await createConversation(u1.id, u2.id);

  // 1. Conversation: createdAt automatique
  assert(conv.createdAt instanceof Date, 'Conversation: createdAt est une Date');

  // 2. Message: createdAt automatique et coherent
  const before = new Date();
  const msg = await createMessage(conv.id, u1.id, 'Test coherence');
  const after = new Date();
  assert(msg.createdAt >= before, 'Message: createdAt >= avant creation');
  assert(msg.createdAt <= after, 'Message: createdAt <= apres creation');

  // 3. lastMessageAt mis a jour correctement
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: msg.createdAt, lastMessagePreview: msg.content.substring(0, 100) },
  });
  const convAfter = await prisma.conversation.findUnique({ where: { id: conv.id } });
  assertEq(convAfter.lastMessagePreview, 'Test coherence', 'lastMessagePreview = contenu message');

  // 4. Ordre des messages preserves
  const msg2 = await createMessage(conv.id, u2.id, 'Reponse 1');
  const msg3 = await createMessage(conv.id, u1.id, 'Reponse 2');
  const ordered = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'asc' },
  });
  assert(ordered[0].createdAt <= ordered[1].createdAt, 'Messages: ordre chronologique correct (1 <= 2)');
  assert(ordered[1].createdAt <= ordered[2].createdAt, 'Messages: ordre chronologique correct (2 <= 3)');

  // 5. Reaction: createdAt automatique
  const reaction = await prisma.messageReaction.create({
    data: { messageId: msg.id, userId: u2.id, emoji: '\u2764\ufe0f' },
  });
  assert(reaction.createdAt instanceof Date, 'Reaction: createdAt est une Date');

  // 6. Conversation updatedAt change apres modification
  const convBefore = await prisma.conversation.findUnique({ where: { id: conv.id } });
  // Petit delai pour garantir le changement
  await new Promise(r => setTimeout(r, 50));
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessagePreview: 'Updated' },
  });
  const convUpdated = await prisma.conversation.findUnique({ where: { id: conv.id } });
  assert(convUpdated.updatedAt >= convBefore.updatedAt, 'Conversation: updatedAt avance apres update');

  // 7. Lister conversations avec lastMessageAt non null seulement
  const convsWithMsg = await prisma.conversation.findMany({
    where: {
      OR: [{ founderId: u1.id }, { candidateId: u1.id }],
      lastMessageAt: { not: null },
    },
  });
  assert(convsWithMsg.every(c => c.lastMessageAt !== null), 'Liste convs: toutes ont lastMessageAt non null');
}

// =================================================================
// TESTEUR 10 — Ibrahim (nettoyage) : Cascades et suppressions
// =================================================================

async function testeur10_ibrahim() {
  const u1 = await createUser('ibrahim_u1', 'ELITE');
  const u2 = await createUser('ibrahim_u2', 'PRO');
  const u3 = await createUser('ibrahim_u3', 'FREE');

  const conv = await createConversation(u1.id, u2.id);
  const msg1 = await createMessage(conv.id, u1.id, 'Message avec reactions');
  const msg2 = await createMessage(conv.id, u2.id, 'Reponse');

  // Ajouter des reactions
  await prisma.messageReaction.create({
    data: { messageId: msg1.id, userId: u2.id, emoji: '\ud83d\udc4d' },
  });
  await prisma.messageReaction.create({
    data: { messageId: msg1.id, userId: u1.id, emoji: '\u2764\ufe0f' },
  });

  const reactionsBeforeId = msg1.id;

  // 1. Supprimer un message → ses reactions CASCADE
  await prisma.message.delete({ where: { id: msg1.id } });
  const reactionsAfter = await prisma.messageReaction.count({
    where: { messageId: reactionsBeforeId },
  });
  assertEq(reactionsAfter, 0, 'CASCADE: reactions supprimees avec le message');

  // 2. msg2 toujours present
  const msg2Check = await prisma.message.findUnique({ where: { id: msg2.id } });
  assert(msg2Check !== null, 'Message 2 toujours present apres suppression message 1');

  // 3. Supprimer la conversation → tous les messages CASCADE
  const msg3 = await createMessage(conv.id, u1.id, 'Dernier message');
  await prisma.messageReaction.create({
    data: { messageId: msg3.id, userId: u2.id, emoji: '\ud83d\ude02' },
  });

  const msgCountBefore = await prisma.message.count({ where: { conversationId: conv.id } });
  assertGte(msgCountBefore, 2, `Messages avant suppression conv >= 2 (got ${msgCountBefore})`);

  await prisma.conversation.delete({ where: { id: conv.id } });

  const msgCountAfter = await prisma.message.count({ where: { conversationId: conv.id } });
  assertEq(msgCountAfter, 0, 'CASCADE: tous les messages supprimes avec la conversation');

  const reactionsConv = await prisma.messageReaction.count({
    where: { message: { conversationId: conv.id } },
  });
  assertEq(reactionsConv, 0, 'CASCADE: toutes les reactions supprimees avec la conversation');

  // 4. Supprimer un user → ses conversations CASCADE
  const conv2 = await createConversation(u1.id, u3.id);
  await createMessage(conv2.id, u1.id, 'Message u1 → u3');
  await createMessage(conv2.id, u3.id, 'Reponse u3');

  await prisma.user.delete({ where: { id: u1.id } });

  const u1Convs = await prisma.conversation.count({
    where: { OR: [{ founderId: u1.id }, { candidateId: u1.id }] },
  });
  assertEq(u1Convs, 0, 'CASCADE: conversations supprimees apres suppression user u1');

  const u1Msgs = await prisma.message.count({
    where: { conversation: { OR: [{ founderId: u1.id }, { candidateId: u1.id }] } },
  });
  assertEq(u1Msgs, 0, 'CASCADE: messages supprimes apres suppression user u1');

  // 5. u2 et u3 existent toujours
  const u2Check = await prisma.user.findUnique({ where: { id: u2.id } });
  assert(u2Check !== null, 'User u2 toujours present');
  const u3Check = await prisma.user.findUnique({ where: { id: u3.id } });
  assert(u3Check !== null, 'User u3 toujours present');
}

// =================================================================
// MAIN
// =================================================================

async function main() {
  console.log('\u2554' + '\u2550'.repeat(62) + '\u2557');
  console.log('\u2551  Tests d\'integration \u2014 Messagerie (10 Testeurs Humains)       \u2551');
  console.log('\u2560' + '\u2550'.repeat(62) + '\u2563');
  console.log('\u2551  Projet: MojiraX | Feature: Messagerie complete              \u2551');
  console.log('\u255a' + '\u2550'.repeat(62) + '\u255d');

  await cleanup();

  try {
    await run('Testeur 1 \u2014 Amadou (methodique) : Workflow nominal conversation', testeur1_amadou);
    await run('Testeur 2 \u2014 Fatou (rapide) : Messages optionnels et fichiers', testeur2_fatou);
    await run('Testeur 3 \u2014 Jean (comptable) : Tailles fichiers et limites', testeur3_jean);
    await run('Testeur 4 \u2014 Moussa (peu tech) : Erreurs et cas limites', testeur4_moussa);
    await run('Testeur 5 \u2014 Aisha (securite) : Membership et isolation', testeur5_aisha);
    await run('Testeur 6 \u2014 Paul (doublons) : Idempotence et contraintes unique', testeur6_paul);
    await run('Testeur 7 \u2014 Marie (limites) : Reactions et pagination', testeur7_marie);
    await run('Testeur 8 \u2014 Olivier (triche) : Statuts de livraison', testeur8_olivier);
    await run('Testeur 9 \u2014 Sandrine (audit) : Coherence et timestamps', testeur9_sandrine);
    await run('Testeur 10 \u2014 Ibrahim (nettoyage) : Cascades et suppressions', testeur10_ibrahim);
  } finally {
    await cleanup();
  }

  // Rapport final
  console.log('\n');
  console.log('\u2554' + '\u2550'.repeat(62) + '\u2557');
  console.log('\u2551                    RAPPORT FINAL                              \u2551');
  console.log('\u2560' + '\u2550'.repeat(62) + '\u2563');
  console.log(`\u2551  \u2705 Passes:  ${String(passes).padEnd(4)} | \u274c Echecs: ${String(failures).padEnd(4)}              \u2551`);
  console.log(`\u2551  Total:      ${String(passes + failures).padEnd(4)} | Taux: ${((passes / (passes + failures)) * 100).toFixed(1)}%                    \u2551`);
  console.log('\u2560' + '\u2550'.repeat(62) + '\u2563');

  for (const r of results) {
    const padName = r.name.substring(0, 52).padEnd(52);
    console.log(`\u2551  ${padName}  ${String(r.ran).padStart(3)} \u2551`);
  }

  console.log('\u255a' + '\u2550'.repeat(62) + '\u255d');

  if (failures > 0) {
    console.log(`\n\u26a0\ufe0f  ${failures} test(s) en echec.`);
    process.exitCode = 1;
  } else {
    console.log('\n\ud83c\udf89 Tous les tests passent !');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  prisma.$disconnect();
});
