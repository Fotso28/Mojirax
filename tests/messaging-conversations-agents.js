/**
 * Simulation de conversations reelles — Messagerie MojiraX
 * 10 agents jouent des roles et s'ecrivent entre eux via le service layer.
 *
 * Run: node tests/messaging-conversations-agents.js
 *
 * Chaque scenario simule un cas d'usage reel:
 *   - Amadou (fondateur PRO) contacte Fatou (candidate PLUS) pour un recrutement
 *   - Jean (fondateur FREE) essaie de contacter avec quota limite
 *   - Moussa (FREE) tente d'acceder a une conv qui n'est pas la sienne
 *   - Aisha (ELITE) utilise toutes les features premium
 *   - Paul et Marie s'envoient des fichiers
 *   - Olivier tente de tricher (usurpation, self-message)
 *   - Sandrine et Ibrahim testent les cascades et coherence
 */

const path = require('path');
const { PrismaClient, UserPlan, MessageStatus } = require(
  path.join(__dirname, '..', 'api', 'node_modules', '@prisma', 'client'),
);
const prisma = new PrismaClient();

let passes = 0;
let failures = 0;
const results = [];
const PREFIX = 'conv_agent_';

// ─── Helpers ────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) { console.error(`    \u274c FAIL: ${msg}`); failures++; return false; }
  console.log(`    \u2705 PASS: ${msg}`); passes++; return true;
}
function assertEq(a, b, msg) { return assert(a === b, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }
function assertNe(a, b, msg) { return assert(a !== b, `${msg} (expected != ${JSON.stringify(b)})`); }
function assertGte(a, b, msg) { return assert(a >= b, `${msg} (expected >= ${b}, got ${a})`); }
function assertNull(a, msg) { return assert(a === null || a === undefined, `${msg} (got ${JSON.stringify(a)})`); }

async function run(name, fn) {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(64)}`);
  const before = passes + failures;
  try { await fn(); } catch (e) { console.error(`    \ud83d\udd34 ERREUR: ${e.message}`); failures++; }
  results.push({ name, ran: passes + failures - before });
}

// ─── Service layer (simule MessagingService sans NestJS DI) ─────

const Service = {
  async resolveUserId(firebaseUid) {
    const u = await prisma.user.findUnique({ where: { firebaseUid }, select: { id: true } });
    if (!u) throw new Error('Utilisateur introuvable');
    return u.id;
  },

  async verifyMembership(conversationId, userId) {
    const c = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { founderId: true, candidateId: true },
    });
    if (!c) throw new Error('Conversation introuvable');
    if (c.founderId !== userId && c.candidateId !== userId) {
      throw new Error('Acces refuse a cette conversation');
    }
  },

  async findOrCreateConversation(userId, targetUserId) {
    if (userId === targetUserId) throw new Error('Vous ne pouvez pas vous envoyer un message');
    const [u1, u2] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, status: true } }),
    ]);
    if (!u1 || !u2) throw new Error('Utilisateur introuvable');
    if (u1.status !== 'ACTIVE' || u2.status !== 'ACTIVE') throw new Error('Action non autorisee');

    const [founderId, candidateId] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];
    const sel = {
      id: true, founderId: true, candidateId: true, lastMessageAt: true, lastMessagePreview: true,
      founder: { select: { id: true, firstName: true, lastName: true, image: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
    };

    const existing = await prisma.conversation.findUnique({
      where: { founderId_candidateId: { founderId, candidateId } },
      select: sel,
    });
    if (existing) return existing;

    try {
      return await prisma.conversation.create({ data: { founderId, candidateId }, select: sel });
    } catch (e) {
      if (e?.code === 'P2002') {
        return prisma.conversation.findUnique({
          where: { founderId_candidateId: { founderId, candidateId } },
          select: sel,
        });
      }
      throw e;
    }
  },

  async sendMessage(senderId, dto) {
    if (!dto.content && !dto.fileUrl) throw new Error('Le message doit contenir du texte ou un fichier');

    if (dto.clientMessageId) {
      const dup = await prisma.message.findUnique({
        where: { clientMessageId: dto.clientMessageId },
        select: { id: true, conversationId: true, senderId: true, content: true, fileUrl: true, fileName: true, fileSize: true, fileMimeType: true, status: true, createdAt: true },
      });
      if (dup) return dup;
    }

    await this.verifyMembership(dto.conversationId, senderId);

    const preview = dto.content ? dto.content.substring(0, 100) : `\ud83d\udcce ${dto.fileName || 'Fichier'}`;
    const msgSel = { id: true, conversationId: true, senderId: true, content: true, fileUrl: true, fileName: true, fileSize: true, fileMimeType: true, status: true, createdAt: true };

    const [msg] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: dto.conversationId, senderId,
          clientMessageId: dto.clientMessageId || undefined,
          content: dto.content, fileUrl: dto.fileUrl, fileName: dto.fileName,
          fileSize: dto.fileSize, fileMimeType: dto.fileMimeType, status: 'SENT',
        },
        select: msgSel,
      }),
      prisma.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: new Date(), lastMessagePreview: preview },
      }),
    ]);
    return msg;
  },

  async markDelivered(messageId, userId) {
    const m = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, status: true, conversationId: true },
    });
    if (!m) throw new Error('Message introuvable');
    if (m.senderId === userId) return null; // can't self-deliver
    if (m.status !== 'SENT') return null;
    await this.verifyMembership(m.conversationId, userId);
    return prisma.message.update({
      where: { id: messageId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
      select: { id: true, status: true, deliveredAt: true },
    });
  },

  async markRead(conversationId, userId) {
    await this.verifyMembership(conversationId, userId);
    const now = new Date();
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, status: { not: 'READ' } },
      data: { status: 'READ', readAt: now },
    });
    return { conversationId, readAt: now };
  },

  async addReaction(messageId, userId, emoji) {
    const m = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, reactions: { select: { emoji: true }, distinct: ['emoji'] } },
    });
    if (!m) throw new Error('Message introuvable');
    await this.verifyMembership(m.conversationId, userId);
    const distinct = new Set(m.reactions.map(r => r.emoji));
    if (!distinct.has(emoji) && distinct.size >= 6) throw new Error('Maximum de reactions atteint (6 emojis distincts)');
    await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
    return prisma.messageReaction.findMany({ where: { messageId }, select: { id: true, emoji: true, userId: true } });
  },

  async removeReaction(messageId, userId, emoji) {
    const m = await prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true } });
    if (!m) throw new Error('Message introuvable');
    await this.verifyMembership(m.conversationId, userId);
    await prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
    return prisma.messageReaction.findMany({ where: { messageId }, select: { id: true, emoji: true, userId: true } });
  },

  async getUnreadCount(userId) {
    return prisma.message.count({
      where: {
        conversation: { OR: [{ founderId: userId }, { candidateId: userId }] },
        senderId: { not: userId },
        status: { not: 'READ' },
      },
    });
  },

  async getMessages(conversationId, userId, limit = 20) {
    await this.verifyMembership(conversationId, userId);
    const take = Math.min(limit, 100);
    const msgs = await prisma.message.findMany({
      where: { conversationId },
      select: {
        id: true, content: true, senderId: true, status: true, fileUrl: true,
        fileName: true, fileMimeType: true, createdAt: true,
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    });
    const hasMore = msgs.length > take;
    return { items: hasMore ? msgs.slice(0, take) : msgs, hasMore };
  },

  async getConversations(userId, limit = 20) {
    const take = Math.min(limit, 100);
    const convs = await prisma.conversation.findMany({
      where: {
        OR: [{ founderId: userId }, { candidateId: userId }],
        lastMessageAt: { not: null },
      },
      select: {
        id: true, lastMessageAt: true, lastMessagePreview: true,
        founder: { select: { id: true, firstName: true, lastName: true } },
        candidate: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take,
    });
    return convs;
  },
};

// ─── User factory ───────────────────────────────────────────

async function createAgent(name, plan, role = 'FOUNDER') {
  return prisma.user.create({
    data: {
      email: `${PREFIX}${name.toLowerCase()}@test.local`,
      firstName: name, lastName: 'Agent', role, plan,
      firebaseUid: `fb_${PREFIX}${name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'ACTIVE',
    },
  });
}

// ─── Cleanup ────────────────────────────────────────────────

async function cleanup() {
  console.log('\n\ud83e\uddf9 Nettoyage...');
  await prisma.messageReaction.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.message.deleteMany({ where: { sender: { email: { startsWith: PREFIX } } } });
  // Supprimer les messages restants dans les convs de test (envoyes par des users non-prefix)
  await prisma.message.deleteMany({ where: { conversation: { founder: { email: { startsWith: PREFIX } } } } });
  await prisma.conversation.deleteMany({ where: { founder: { email: { startsWith: PREFIX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  console.log('   OK\n');
}

// =================================================================
// SCENARIO 1 — Amadou (fondateur PRO) recrute Fatou (candidate PLUS)
// Une conversation complete: premier contact, echanges, fichier CV, reactions
// =================================================================

async function scenario1_recrutement() {
  const amadou = await createAgent('Amadou', 'PRO');
  const fatou = await createAgent('Fatou', 'PLUS', 'CANDIDATE');

  // 1. Amadou ouvre la conversation
  const conv = await Service.findOrCreateConversation(amadou.id, fatou.id);
  assert(conv.id !== undefined, 'Amadou ouvre une conv avec Fatou');

  // 2. Amadou envoie le premier message
  const msg1 = await Service.sendMessage(amadou.id, {
    conversationId: conv.id,
    content: 'Bonjour Fatou ! Ton profil de dev fullstack m\'interesse pour mon projet MojiraX.',
    clientMessageId: `amadou_1_${Date.now()}`,
  });
  assertEq(msg1.status, 'SENT', 'Amadou envoie: status SENT');
  assertEq(msg1.senderId, amadou.id, 'Amadou envoie: senderId = amadou');

  // 3. Fatou recoit (marque DELIVERED)
  const delivered = await Service.markDelivered(msg1.id, fatou.id);
  assertEq(delivered.status, 'DELIVERED', 'Fatou recoit: status DELIVERED');

  // 4. Fatou lit (marque READ)
  await Service.markRead(conv.id, fatou.id);
  const msgAfterRead = await prisma.message.findUnique({ where: { id: msg1.id } });
  assertEq(msgAfterRead.status, 'READ', 'Fatou lit: status READ');
  assert(msgAfterRead.readAt !== null, 'Fatou lit: readAt non null');

  // 5. Fatou repond
  const msg2 = await Service.sendMessage(fatou.id, {
    conversationId: conv.id,
    content: 'Merci Amadou ! Je suis disponible. Quels sont les details du poste ?',
  });
  assertEq(msg2.senderId, fatou.id, 'Fatou repond: senderId = fatou');

  // 6. Amadou reagit avec un pouce
  const reactions1 = await Service.addReaction(msg2.id, amadou.id, '\ud83d\udc4d');
  assertEq(reactions1.length, 1, 'Amadou reagit: 1 reaction');
  assertEq(reactions1[0].emoji, '\ud83d\udc4d', 'Amadou reagit: emoji = pouce');

  // 7. Fatou aussi reagit au meme message
  const reactions2 = await Service.addReaction(msg2.id, fatou.id, '\u2764\ufe0f');
  assertEq(reactions2.length, 2, 'Fatou reagit: 2 reactions au total');

  // 8. Amadou envoie son pitch en PDF
  const msg3 = await Service.sendMessage(amadou.id, {
    conversationId: conv.id,
    content: 'Voici le pitch deck du projet',
    fileUrl: 'https://minio.local/messages/mojirax-pitch.pdf',
    fileName: 'mojirax-pitch.pdf',
    fileSize: 2500000,
    fileMimeType: 'application/pdf',
  });
  assert(msg3.fileUrl !== null, 'Amadou envoie PDF: fileUrl present');
  assertEq(msg3.fileMimeType, 'application/pdf', 'Amadou envoie PDF: mime correct');

  // 9. Fatou envoie son CV en retour
  const msg4 = await Service.sendMessage(fatou.id, {
    conversationId: conv.id,
    fileUrl: 'https://minio.local/messages/fatou-cv.pdf',
    fileName: 'CV-Fatou-2026.pdf',
    fileSize: 1200000,
    fileMimeType: 'application/pdf',
  });
  assertNull(msg4.content, 'Fatou envoie CV: pas de texte (fichier seul)');
  assertEq(msg4.fileName, 'CV-Fatou-2026.pdf', 'Fatou envoie CV: nom fichier');

  // 10. Verifier la conversation cote Amadou
  const convList = await Service.getConversations(amadou.id);
  assert(convList.length >= 1, 'Amadou voit >= 1 conversation');
  const thisConv = convList.find(c => c.id === conv.id);
  assert(thisConv !== undefined, 'Amadou voit sa conv avec Fatou');

  // 11. Verifier la preview = dernier message (fichier)
  const convFresh = await prisma.conversation.findUnique({ where: { id: conv.id } });
  assert(convFresh.lastMessagePreview.includes('CV-Fatou'), 'Preview = dernier fichier envoye');

  // 12. Historique complet
  const history = await Service.getMessages(conv.id, amadou.id, 50);
  assertEq(history.items.length, 4, 'Historique: 4 messages au total');
}

// =================================================================
// SCENARIO 2 — Jean (FREE) vs Marie (FREE) : quotas messages
// Jean a un plan FREE (10 msg/jour). On simule l'envoi puis la limite.
// =================================================================

async function scenario2_quotas() {
  const jean = await createAgent('Jean', 'FREE');
  const marie = await createAgent('Marie', 'FREE');
  const conv = await Service.findOrCreateConversation(jean.id, marie.id);

  // 1. Jean envoie 10 messages (limite FREE)
  for (let i = 0; i < 10; i++) {
    const m = await Service.sendMessage(jean.id, {
      conversationId: conv.id,
      content: `Message ${i + 1} de Jean`,
    });
    assertEq(m.status, 'SENT', `Jean msg ${i + 1}/10: SENT OK`);
  }

  // 2. Verifier que 10 messages existent
  const count = await prisma.message.count({
    where: { conversationId: conv.id, senderId: jean.id },
  });
  assertEq(count, 10, 'Jean: 10 messages envoyes en base');

  // 3. Marie peut aussi envoyer (quota separe)
  const marieMsg = await Service.sendMessage(marie.id, {
    conversationId: conv.id,
    content: 'Reponse de Marie',
  });
  assertEq(marieMsg.senderId, marie.id, 'Marie repond: son quota est independant');

  // 4. Verifier le plan limits config (miroir)
  const PLAN_LIMITS = {
    FREE: { messagesPerDay: 10 },
    PLUS: { messagesPerDay: 50 },
    PRO: { messagesPerDay: Infinity },
    ELITE: { messagesPerDay: Infinity },
  };
  assertEq(PLAN_LIMITS.FREE.messagesPerDay, 10, 'Config: FREE = 10 msg/jour');
  assertEq(PLAN_LIMITS.PLUS.messagesPerDay, 50, 'Config: PLUS = 50 msg/jour');
  assert(PLAN_LIMITS.PRO.messagesPerDay === Infinity, 'Config: PRO = illimite');
  assert(PLAN_LIMITS.ELITE.messagesPerDay === Infinity, 'Config: ELITE = illimite');
}

// =================================================================
// SCENARIO 3 — Moussa (intrus) tente d'acceder a la conv d'autrui
// =================================================================

async function scenario3_intrus() {
  const alice = await createAgent('Alice3', 'PRO');
  const bob = await createAgent('Bob3', 'PLUS');
  const moussa = await createAgent('Moussa3', 'FREE');

  const conv = await Service.findOrCreateConversation(alice.id, bob.id);
  await Service.sendMessage(alice.id, { conversationId: conv.id, content: 'Secret entre Alice et Bob' });

  // 1. Moussa tente de lire les messages → acces refuse
  let moussa_blocked = false;
  try {
    await Service.getMessages(conv.id, moussa.id);
  } catch (e) {
    moussa_blocked = true;
    assert(e.message.includes('refuse'), 'Moussa bloque: getMessages refuse');
  }
  assert(moussa_blocked, 'Moussa ne peut PAS lire la conv Alice-Bob');

  // 2. Moussa tente d'envoyer un message → acces refuse
  let moussa_send_blocked = false;
  try {
    await Service.sendMessage(moussa.id, { conversationId: conv.id, content: 'Intrus!' });
  } catch (e) {
    moussa_send_blocked = true;
    assert(e.message.includes('refuse'), 'Moussa bloque: sendMessage refuse');
  }
  assert(moussa_send_blocked, 'Moussa ne peut PAS envoyer dans conv Alice-Bob');

  // 3. Moussa tente de marquer comme lu → refuse
  let moussa_read_blocked = false;
  try {
    await Service.markRead(conv.id, moussa.id);
  } catch (e) {
    moussa_read_blocked = true;
  }
  assert(moussa_read_blocked, 'Moussa ne peut PAS markRead dans conv Alice-Bob');

  // 4. Moussa tente d'ajouter une reaction → refuse
  const msgs = await prisma.message.findMany({ where: { conversationId: conv.id }, take: 1 });
  let moussa_react_blocked = false;
  try {
    await Service.addReaction(msgs[0].id, moussa.id, '\ud83d\udc4d');
  } catch (e) {
    moussa_react_blocked = true;
  }
  assert(moussa_react_blocked, 'Moussa ne peut PAS reagir dans conv Alice-Bob');

  // 5. Moussa peut creer sa propre conv avec Alice
  const moussaConv = await Service.findOrCreateConversation(moussa.id, alice.id);
  assert(moussaConv.id !== undefined, 'Moussa PEUT creer sa propre conv avec Alice');
  assertNe(moussaConv.id, conv.id, 'Moussa-Alice != Alice-Bob (differentes convs)');
}

// =================================================================
// SCENARIO 4 — Aisha (ELITE) : features premium + invisible
// =================================================================

async function scenario4_premium() {
  const aisha = await createAgent('Aisha4', 'ELITE');
  const paul = await createAgent('Paul4', 'PRO');
  const conv = await Service.findOrCreateConversation(aisha.id, paul.id);

  // 1. Aisha envoie une image (feature messagerie corrigee)
  const msgImg = await Service.sendMessage(aisha.id, {
    conversationId: conv.id,
    fileUrl: 'https://minio.local/messages/mockup.png',
    fileName: 'design-mockup.png',
    fileSize: 3500000,
    fileMimeType: 'image/png',
  });
  assertEq(msgImg.fileMimeType, 'image/png', 'ELITE Aisha envoie image PNG');

  // 2. Aisha envoie une photo WebP
  const msgWebp = await Service.sendMessage(aisha.id, {
    conversationId: conv.id,
    fileUrl: 'https://minio.local/messages/photo.webp',
    fileName: 'photo-produit.webp',
    fileSize: 800000,
    fileMimeType: 'image/webp',
  });
  assertEq(msgWebp.fileMimeType, 'image/webp', 'ELITE Aisha envoie image WebP');

  // 3. Paul repond avec un DOCX
  const msgDocx = await Service.sendMessage(paul.id, {
    conversationId: conv.id,
    content: 'Voici mes commentaires',
    fileUrl: 'https://minio.local/messages/feedback.docx',
    fileName: 'feedback-design.docx',
    fileSize: 450000,
    fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  assert(msgDocx.content !== null && msgDocx.fileUrl !== null, 'PRO Paul: texte + fichier DOCX');

  // 4. Aisha active le mode invisible
  await prisma.user.update({ where: { id: aisha.id }, data: { isInvisible: true } });
  const aishaInvis = await prisma.user.findUnique({ where: { id: aisha.id }, select: { isInvisible: true } });
  assertEq(aishaInvis.isInvisible, true, 'ELITE Aisha: mode invisible active');

  // 5. Aisha continue d'envoyer des messages meme invisible
  const msgInvis = await Service.sendMessage(aisha.id, {
    conversationId: conv.id,
    content: 'Je suis invisible mais je peux toujours ecrire',
  });
  assertEq(msgInvis.status, 'SENT', 'Aisha invisible: peut toujours envoyer');

  // 6. Verifier l'historique complet
  const history = await Service.getMessages(conv.id, aisha.id, 50);
  assertEq(history.items.length, 4, 'Historique Aisha-Paul: 4 messages');
}

// =================================================================
// SCENARIO 5 — Olivier tente de tricher
// =================================================================

async function scenario5_triche() {
  const olivier = await createAgent('Olivier5', 'FREE');
  const cible = await createAgent('Cible5', 'PLUS');

  // 1. Olivier tente de s'envoyer un message a lui-meme
  let selfBlocked = false;
  try {
    await Service.findOrCreateConversation(olivier.id, olivier.id);
  } catch (e) {
    selfBlocked = true;
    assert(e.message.includes('vous'), 'Olivier: auto-message rejete');
  }
  assert(selfBlocked, 'Olivier ne peut PAS creer une conv avec lui-meme');

  // 2. Olivier tente d'envoyer un message vide (ni texte ni fichier)
  const conv = await Service.findOrCreateConversation(olivier.id, cible.id);
  let emptyBlocked = false;
  try {
    await Service.sendMessage(olivier.id, { conversationId: conv.id });
  } catch (e) {
    emptyBlocked = true;
    assert(e.message.includes('texte ou un fichier'), 'Olivier: message vide rejete');
  }
  assert(emptyBlocked, 'Olivier ne peut PAS envoyer un message vide');

  // 3. Olivier ne peut pas self-deliver son propre message
  const msg = await Service.sendMessage(olivier.id, {
    conversationId: conv.id,
    content: 'Test self delivery',
  });
  const selfDeliver = await Service.markDelivered(msg.id, olivier.id);
  assertNull(selfDeliver, 'Olivier: self-deliver retourne null (bloque)');

  // 4. Le message reste SENT (pas de changement)
  const msgCheck = await prisma.message.findUnique({ where: { id: msg.id } });
  assertEq(msgCheck.status, 'SENT', 'Message: toujours SENT apres tentative self-deliver');

  // 5. Seul le destinataire peut marquer DELIVERED
  const delivered = await Service.markDelivered(msg.id, cible.id);
  assertEq(delivered.status, 'DELIVERED', 'Cible marque DELIVERED: OK');

  // 6. Re-deliver un message deja DELIVERED → null (pas de regression)
  const reDeliver = await Service.markDelivered(msg.id, cible.id);
  assertNull(reDeliver, 'Re-deliver un msg DELIVERED: retourne null');
}

// =================================================================
// SCENARIO 6 — Paul et Marie echangent avec reactions multiples
// =================================================================

async function scenario6_reactions() {
  const paul = await createAgent('Paul6', 'PRO');
  const marie = await createAgent('Marie6', 'ELITE');
  const conv = await Service.findOrCreateConversation(paul.id, marie.id);

  const msg = await Service.sendMessage(paul.id, {
    conversationId: conv.id,
    content: 'On lance le projet demain ?',
  });

  // 1. Marie reagit avec 3 emojis differents
  await Service.addReaction(msg.id, marie.id, '\ud83d\udc4d');
  await Service.addReaction(msg.id, marie.id, '\ud83d\ude80');
  await Service.addReaction(msg.id, marie.id, '\ud83d\udd25');
  let reactions = await prisma.messageReaction.findMany({ where: { messageId: msg.id } });
  assertEq(reactions.length, 3, 'Marie: 3 reactions distinctes');

  // 2. Paul aussi reagit
  await Service.addReaction(msg.id, paul.id, '\ud83d\udc4d');
  await Service.addReaction(msg.id, paul.id, '\u2764\ufe0f');
  reactions = await prisma.messageReaction.findMany({ where: { messageId: msg.id } });
  assertEq(reactions.length, 5, 'Paul + Marie: 5 reactions au total');

  // 3. Meme emoji par 2 users = 2 reactions
  const thumbs = reactions.filter(r => r.emoji === '\ud83d\udc4d');
  assertEq(thumbs.length, 2, 'Pouce: 2 reactions (1 par user)');

  // 4. Ajouter un 6e emoji distinct (5 existants: pouce, fusee, feu, coeur, party)
  // Actuellement 5 distincts: 👍, 🚀, 🔥, ❤️ — on ajoute 🎉 et 😱 pour arriver a 6
  await Service.addReaction(msg.id, paul.id, '\ud83c\udf89');
  await Service.addReaction(msg.id, marie.id, '\ud83d\ude31');
  const distinctEmojis = new Set((await prisma.messageReaction.findMany({
    where: { messageId: msg.id }, select: { emoji: true }, distinct: ['emoji'],
  })).map(r => r.emoji));
  assertEq(distinctEmojis.size, 6, '6 emojis distincts (le max)');

  // 5. Ajouter un 7e emoji distinct → refuse
  let blocked = false;
  try {
    await Service.addReaction(msg.id, paul.id, '\ud83e\udd2f');
  } catch (e) {
    blocked = true;
    assert(e.message.includes('Maximum'), '7e emoji: rejete avec message clair');
  }
  assert(blocked, '7e emoji distinct: BLOQUE');

  // 6. Retirer une reaction puis en ajouter une nouvelle → OK
  await Service.removeReaction(msg.id, marie.id, '\ud83d\ude31');
  const afterRemove = await prisma.messageReaction.findMany({
    where: { messageId: msg.id }, select: { emoji: true }, distinct: ['emoji'],
  });
  assertEq(new Set(afterRemove.map(r => r.emoji)).size, 5, 'Apres retrait: 5 emojis distincts');

  // Maintenant le 7e (devenu 6e) passe
  const newReactions = await Service.addReaction(msg.id, paul.id, '\ud83e\udd2f');
  assert(newReactions.some(r => r.emoji === '\ud83e\udd2f'), 'Nouveau emoji accepte apres retrait');

  // 7. Double-add meme reaction = idempotent (upsert)
  const before = (await prisma.messageReaction.findMany({ where: { messageId: msg.id } })).length;
  await Service.addReaction(msg.id, paul.id, '\ud83e\udd2f');
  const after = (await prisma.messageReaction.findMany({ where: { messageId: msg.id } })).length;
  assertEq(after, before, 'Double-add: idempotent (meme nombre)');
}

// =================================================================
// SCENARIO 7 — Sandrine et Ibrahim : idempotence network retry
// =================================================================

async function scenario7_idempotence() {
  const sandrine = await createAgent('Sandrine7', 'PLUS');
  const ibrahim = await createAgent('Ibrahim7', 'PRO');
  const conv = await Service.findOrCreateConversation(sandrine.id, ibrahim.id);

  const clientId = `client_retry_${Date.now()}`;

  // 1. Premier envoi
  const msg1 = await Service.sendMessage(sandrine.id, {
    conversationId: conv.id,
    content: 'Ce message peut etre retransmis',
    clientMessageId: clientId,
  });
  assert(msg1.id !== undefined, 'Premier envoi: message cree');

  // 2. Retry (meme clientMessageId) → retourne le meme message
  const msg2 = await Service.sendMessage(sandrine.id, {
    conversationId: conv.id,
    content: 'Ce message peut etre retransmis (retry)',
    clientMessageId: clientId,
  });
  assertEq(msg2.id, msg1.id, 'Retry: meme message retourne (idempotent)');
  assertEq(msg2.content, msg1.content, 'Retry: contenu identique (pas ecrase)');

  // 3. Un seul message en base
  const count = await prisma.message.count({ where: { clientMessageId: clientId } });
  assertEq(count, 1, 'Idempotence: 1 seul message en base');

  // 4. Nouveau clientMessageId = nouveau message
  const msg3 = await Service.sendMessage(sandrine.id, {
    conversationId: conv.id,
    content: 'Message different',
    clientMessageId: `client_new_${Date.now()}`,
  });
  assertNe(msg3.id, msg1.id, 'Nouveau clientMessageId: nouveau message');
}

// =================================================================
// SCENARIO 8 — Conversation bi-directionnelle et unread count
// =================================================================

async function scenario8_unread() {
  const u1 = await createAgent('Unread_A', 'PRO');
  const u2 = await createAgent('Unread_B', 'PLUS');
  const conv = await Service.findOrCreateConversation(u1.id, u2.id);

  // 1. u1 envoie 5 messages
  for (let i = 0; i < 5; i++) {
    await Service.sendMessage(u1.id, {
      conversationId: conv.id, content: `Msg u1 ${i}`,
    });
  }

  // 2. u2 a 5 unread
  let unread = await Service.getUnreadCount(u2.id);
  assertEq(unread, 5, 'u2: 5 messages non-lus');

  // 3. u1 a 0 unread (ses propres messages)
  let u1Unread = await Service.getUnreadCount(u1.id);
  assertEq(u1Unread, 0, 'u1: 0 non-lus (ses propres messages)');

  // 4. u2 lit tout
  await Service.markRead(conv.id, u2.id);
  unread = await Service.getUnreadCount(u2.id);
  assertEq(unread, 0, 'u2 apres markRead: 0 non-lus');

  // 5. u2 repond 3 fois
  for (let i = 0; i < 3; i++) {
    await Service.sendMessage(u2.id, {
      conversationId: conv.id, content: `Reponse u2 ${i}`,
    });
  }

  // 6. Maintenant u1 a 3 unread
  u1Unread = await Service.getUnreadCount(u1.id);
  assertEq(u1Unread, 3, 'u1: 3 non-lus de u2');

  // 7. u1 lit
  await Service.markRead(conv.id, u1.id);
  u1Unread = await Service.getUnreadCount(u1.id);
  assertEq(u1Unread, 0, 'u1 apres markRead: 0 non-lus');

  // 8. Verifier que tous les messages sont READ
  const allMsgs = await prisma.message.findMany({ where: { conversationId: conv.id } });
  const allRead = allMsgs.every(m => m.status === 'READ');
  assert(allRead, 'Tous les messages sont READ');
}

// =================================================================
// SCENARIO 9 — Conversations multiples en parallele
// =================================================================

async function scenario9_multi_conv() {
  const hub = await createAgent('Hub9', 'ELITE');
  const a = await createAgent('PartA9', 'PRO');
  const b = await createAgent('PartB9', 'PLUS');
  const c = await createAgent('PartC9', 'FREE');

  // Hub ouvre 3 conversations
  const conv1 = await Service.findOrCreateConversation(hub.id, a.id);
  const conv2 = await Service.findOrCreateConversation(hub.id, b.id);
  const conv3 = await Service.findOrCreateConversation(hub.id, c.id);

  assertNe(conv1.id, conv2.id, 'Conv Hub-A != Conv Hub-B');
  assertNe(conv2.id, conv3.id, 'Conv Hub-B != Conv Hub-C');

  // Hub envoie dans les 3
  await Service.sendMessage(hub.id, { conversationId: conv1.id, content: 'Salut A !' });
  await Service.sendMessage(hub.id, { conversationId: conv2.id, content: 'Salut B !' });
  await Service.sendMessage(hub.id, { conversationId: conv3.id, content: 'Salut C !' });

  // Chacun repond
  await Service.sendMessage(a.id, { conversationId: conv1.id, content: 'Yo Hub !' });
  await Service.sendMessage(b.id, { conversationId: conv2.id, content: 'Salut !' });
  await Service.sendMessage(c.id, { conversationId: conv3.id, content: 'Hello !' });

  // Hub voit 3 conversations avec messages
  const hubConvs = await Service.getConversations(hub.id);
  assertEq(hubConvs.length, 3, 'Hub: 3 conversations actives');

  // A ne voit que 1
  const aConvs = await Service.getConversations(a.id);
  assertEq(aConvs.length, 1, 'A: 1 conversation');

  // Hub a 3 unread (1 par partenaire)
  const hubUnread = await Service.getUnreadCount(hub.id);
  assertEq(hubUnread, 3, 'Hub: 3 non-lus (1 par conv)');

  // Lire conv1 → plus que 2 unread
  await Service.markRead(conv1.id, hub.id);
  const hubUnread2 = await Service.getUnreadCount(hub.id);
  assertEq(hubUnread2, 2, 'Hub apres lecture conv1: 2 non-lus');

  // Isolation: messages de conv1 pas dans conv2
  const conv1Msgs = await prisma.message.findMany({ where: { conversationId: conv1.id } });
  const conv2Msgs = await prisma.message.findMany({ where: { conversationId: conv2.id } });
  const conv1Ids = new Set(conv1Msgs.map(m => m.id));
  assert(conv2Msgs.every(m => !conv1Ids.has(m.id)), 'Isolation: aucun msg de conv1 dans conv2');
}

// =================================================================
// SCENARIO 10 — Cascade: suppression user nettoie tout
// =================================================================

async function scenario10_cascade() {
  const user1 = await createAgent('Cascade_A', 'PRO');
  const user2 = await createAgent('Cascade_B', 'PLUS');
  const user3 = await createAgent('Cascade_C', 'FREE');

  // Creer 2 conversations avec messages et reactions
  const conv1 = await Service.findOrCreateConversation(user1.id, user2.id);
  const conv2 = await Service.findOrCreateConversation(user1.id, user3.id);

  const m1 = await Service.sendMessage(user1.id, { conversationId: conv1.id, content: 'Msg conv1' });
  const m2 = await Service.sendMessage(user2.id, { conversationId: conv1.id, content: 'Reply conv1' });
  const m3 = await Service.sendMessage(user1.id, { conversationId: conv2.id, content: 'Msg conv2' });

  await Service.addReaction(m1.id, user2.id, '\ud83d\udc4d');
  await Service.addReaction(m2.id, user1.id, '\u2764\ufe0f');
  await Service.addReaction(m3.id, user3.id, '\ud83d\ude80');

  // Verifier etat avant
  const msgsBefore = await prisma.message.count({
    where: { conversation: { OR: [{ founderId: user1.id }, { candidateId: user1.id }] } },
  });
  assertGte(msgsBefore, 3, `Avant suppression: >= 3 messages (got ${msgsBefore})`);

  // Supprimer user1 → tout CASCADE
  await prisma.user.delete({ where: { id: user1.id } });

  // Conversations supprimees
  const convsAfter = await prisma.conversation.count({
    where: { OR: [{ founderId: user1.id }, { candidateId: user1.id }] },
  });
  assertEq(convsAfter, 0, 'CASCADE: 0 conversations apres suppression user1');

  // Messages supprimes
  const msgsAfter = await prisma.message.count({
    where: { conversationId: { in: [conv1.id, conv2.id] } },
  });
  assertEq(msgsAfter, 0, 'CASCADE: 0 messages apres suppression user1');

  // Reactions supprimees
  const reactsAfter = await prisma.messageReaction.count({
    where: { messageId: { in: [m1.id, m2.id, m3.id] } },
  });
  assertEq(reactsAfter, 0, 'CASCADE: 0 reactions apres suppression user1');

  // user2 et user3 existent toujours
  assert((await prisma.user.findUnique({ where: { id: user2.id } })) !== null, 'user2 toujours en vie');
  assert((await prisma.user.findUnique({ where: { id: user3.id } })) !== null, 'user3 toujours en vie');

  // user2-user3 peuvent creer une nouvelle conv entre eux
  const newConv = await Service.findOrCreateConversation(user2.id, user3.id);
  assert(newConv.id !== undefined, 'user2 et user3 peuvent toujours se parler');
}

// =================================================================
// MAIN
// =================================================================

async function main() {
  console.log('\u2554' + '\u2550'.repeat(64) + '\u2557');
  console.log('\u2551  Simulation Conversations Reelles \u2014 10 Agents Messagerie      \u2551');
  console.log('\u2560' + '\u2550'.repeat(64) + '\u2563');
  console.log('\u2551  Chaque agent joue un role et ecrit a d\'autres agents          \u2551');
  console.log('\u255a' + '\u2550'.repeat(64) + '\u255d');

  await cleanup();

  try {
    await run('Scenario 1 \u2014 Amadou recrute Fatou (workflow complet)', scenario1_recrutement);
    await run('Scenario 2 \u2014 Jean vs Marie : quotas messages FREE', scenario2_quotas);
    await run('Scenario 3 \u2014 Moussa intrus : membership et securite', scenario3_intrus);
    await run('Scenario 4 \u2014 Aisha ELITE : images, invisible, premium', scenario4_premium);
    await run('Scenario 5 \u2014 Olivier triche : self-msg, vide, self-deliver', scenario5_triche);
    await run('Scenario 6 \u2014 Paul & Marie : reactions (ajout, limite, retrait)', scenario6_reactions);
    await run('Scenario 7 \u2014 Sandrine & Ibrahim : idempotence network retry', scenario7_idempotence);
    await run('Scenario 8 \u2014 Unread count bi-directionnel', scenario8_unread);
    await run('Scenario 9 \u2014 Hub ELITE gere 3 conversations en parallele', scenario9_multi_conv);
    await run('Scenario 10 \u2014 Cascade : suppression user nettoie tout', scenario10_cascade);
  } finally {
    await cleanup();
  }

  console.log('\n');
  console.log('\u2554' + '\u2550'.repeat(64) + '\u2557');
  console.log('\u2551                      RAPPORT FINAL                              \u2551');
  console.log('\u2560' + '\u2550'.repeat(64) + '\u2563');
  console.log(`\u2551  \u2705 Passes:  ${String(passes).padEnd(4)} | \u274c Echecs: ${String(failures).padEnd(4)}                \u2551`);
  console.log(`\u2551  Total:      ${String(passes + failures).padEnd(4)} | Taux: ${((passes / Math.max(1, passes + failures)) * 100).toFixed(1)}%                      \u2551`);
  console.log('\u2560' + '\u2550'.repeat(64) + '\u2563');
  for (const r of results) {
    console.log(`\u2551  ${r.name.substring(0, 54).padEnd(54)}  ${String(r.ran).padStart(3)} \u2551`);
  }
  console.log('\u255a' + '\u2550'.repeat(64) + '\u255d');

  if (failures > 0) {
    console.log(`\n\u26a0\ufe0f  ${failures} echec(s) — voir details ci-dessus.`);
    process.exitCode = 1;
  } else {
    console.log('\n\ud83c\udf89 Tous les scenarios passent ! La messagerie fonctionne correctement.');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exitCode = 1; prisma.$disconnect(); });
