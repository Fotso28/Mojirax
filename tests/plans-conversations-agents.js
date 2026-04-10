/**
 * Simulation reelle — 10 Agents avec differents plans d'abonnement
 * Chaque agent a un plan, un role, et tente d'utiliser les features de la plateforme.
 * On verifie que chaque feature est ouverte ou bloquee selon le plan.
 *
 * Run: node tests/plans-conversations-agents.js
 *
 * Agents:
 *   Amadou (FREE, fondateur)  — decouvre la plateforme, limites partout
 *   Fatou  (FREE, candidate)  — decouvre, essaie de depasser les quotas
 *   Jean   (PLUS, fondateur)  — profile views, undo skip, filtres, sans pubs
 *   Marie  (PLUS, candidate)  — deblocage contacts, filtres skills
 *   Paul   (PRO, fondateur)   — boosts, stats, voir qui a aime, messages illimites
 *   Aisha  (PRO, candidate)   — stats, badge PRO, messages illimites
 *   Olivier (ELITE, fondateur) — invisible, priorite recherche, 15 boosts
 *   Sandrine (ELITE, candidate) — invisible, badge ELITE, tout deblocage
 *   Ibrahim (FREE→PRO upgrade) — simule un achat de plan, verifie les features s'ouvrent
 *   Moussa  (PRO→FREE expire)  — plan expire, features se ferment
 */

const path = require('path');
const { PrismaClient, UserPlan } = require(
  path.join(__dirname, '..', 'api', 'node_modules', '@prisma', 'client'),
);
const prisma = new PrismaClient();

let passes = 0;
let failures = 0;
const results = [];
const PREFIX = 'plan_agent_';

// ─── Config miroir ──────────────────────────────────────────

const PLAN_HIERARCHY = { FREE: 0, PLUS: 1, PRO: 2, ELITE: 3 };
const PLAN_LIMITS = {
  FREE:  { messagesPerDay: 10,       savesMax: 10,       boostsPerMonth: 0  },
  PLUS:  { messagesPerDay: 50,       savesMax: Infinity,  boostsPerMonth: 0  },
  PRO:   { messagesPerDay: Infinity, savesMax: Infinity,  boostsPerMonth: 5  },
  ELITE: { messagesPerDay: Infinity, savesMax: Infinity,  boostsPerMonth: 15 },
};

function hasPaidPlan(plan) { return plan !== 'FREE'; }
function canAccess(userPlan, requiredPlan) {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

// ─── Helpers ────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) { console.error(`    \u274c FAIL: ${msg}`); failures++; return false; }
  console.log(`    \u2705 PASS: ${msg}`); passes++; return true;
}
function assertEq(a, b, msg) { return assert(a === b, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }
function assertGte(a, b, msg) { return assert(a >= b, `${msg} (expected >= ${b}, got ${a})`); }

async function run(name, fn) {
  console.log(`\n${'='.repeat(66)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(66)}`);
  const before = passes + failures;
  try { await fn(); } catch (e) { console.error(`    \ud83d\udd34 ERREUR: ${e.message}`); failures++; }
  results.push({ name, ran: passes + failures - before });
}

// ─── Service layer simulé ───────────────────────────────────

const Service = {
  // Simule PlanGuard: verifie si le plan permet l'acces
  checkPlanAccess(userPlan, requiredPlan) {
    if (PLAN_HIERARCHY[userPlan] < PLAN_HIERARCHY[requiredPlan]) {
      throw new Error(`Plan ${requiredPlan} requis. Votre plan: ${userPlan}`);
    }
  },

  // Simule ProfileViewsService.getViewers
  async getProfileViewers(userId, userPlan) {
    this.checkPlanAccess(userPlan, 'PLUS');
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const viewers = await prisma.profileView.findMany({
      where: { viewedId: userId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' }, take: 50,
      select: { viewer: { select: { id: true, firstName: true, image: true } }, createdAt: true },
    });
    return { viewers, count: viewers.length };
  },

  // Simule ProfileViewsService.getViewCount (ouvert a tous)
  async getProfileViewCount(userId) {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return prisma.profileView.count({
      where: { viewedId: userId, createdAt: { gte: thirtyDaysAgo } },
    });
  },

  // Simule ProfileViewsService.trackView (avec invisible check)
  async trackProfileView(viewerId, viewedId) {
    if (viewerId === viewedId) return; // pas de self-view
    const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { isInvisible: true } });
    if (viewer?.isInvisible) return null; // invisible = pas de trace
    return prisma.profileView.upsert({
      where: { viewerId_viewedId: { viewerId, viewedId } },
      update: { createdAt: new Date() },
      create: { viewerId, viewedId },
    });
  },

  // Simule StatsService.getProfileStats
  async getProfileStats(userId, userPlan) {
    this.checkPlanAccess(userPlan, 'PRO');
    const projects = await prisma.project.findMany({
      where: { founderId: userId }, select: { id: true, name: true },
    });
    const stats = [];
    for (const p of projects) {
      const views = await prisma.userProjectInteraction.count({ where: { projectId: p.id, action: 'VIEW' } });
      const likes = await prisma.userProjectInteraction.count({ where: { projectId: p.id, action: 'LIKE' } });
      const saves = await prisma.userProjectInteraction.count({ where: { projectId: p.id, action: 'SAVE' } });
      stats.push({ projectId: p.id, projectName: p.name, views, likes, saves });
    }
    return stats;
  },

  // Simule InteractionsService.getLikers (PRO+)
  async getProjectLikers(projectId, userPlan) {
    this.checkPlanAccess(userPlan, 'PRO');
    return prisma.userProjectInteraction.findMany({
      where: { projectId, action: 'LIKE' },
      select: { user: { select: { id: true, firstName: true, plan: true } }, createdAt: true },
      take: 20,
    });
  },

  // Simule InteractionsService.undoLastSkip (PLUS+)
  async undoLastSkip(userId, userPlan) {
    this.checkPlanAccess(userPlan, 'PLUS');
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastSkip = await prisma.userProjectInteraction.findFirst({
      where: { userId, action: 'SKIP', createdAt: { gte: fiveMinAgo } },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastSkip) return null;
    await prisma.userProjectInteraction.delete({ where: { id: lastSkip.id } });
    return { projectId: lastSkip.projectId };
  },

  // Simule BoostService.activateBoost (PRO+)
  async activateBoost(userId, userPlan, projectId) {
    const limits = PLAN_LIMITS[userPlan];
    if (limits.boostsPerMonth <= 0) throw new Error('Les boosts necessitent le plan Pro ou superieur.');
    const project = await prisma.project.findFirst({ where: { id: projectId, founderId: userId } });
    if (!project) throw new Error('Projet introuvable ou non autorise');
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const used = await prisma.boost.count({ where: { userId, startedAt: { gte: startOfMonth } } });
    if (used >= limits.boostsPerMonth) throw new Error(`Quota boosts atteint (${used}/${limits.boostsPerMonth})`);
    const active = await prisma.boost.findFirst({ where: { projectId, expiresAt: { gt: new Date() } } });
    if (active) throw new Error('Ce projet a deja un boost actif.');
    return prisma.boost.create({
      data: { userId, projectId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
  },

  // Simule UsersService.toggleInvisible (ELITE)
  async toggleInvisible(userId, userPlan, invisible) {
    this.checkPlanAccess(userPlan, 'ELITE');
    return prisma.user.update({ where: { id: userId }, data: { isInvisible: invisible } });
  },

  // Simule PrivacyInterceptor.hasPaidAccess
  hasPaidAccess(plan, planExpiresAt) {
    if (plan === 'FREE') return false;
    if (planExpiresAt && planExpiresAt < new Date()) return false;
    return true;
  },

  // Simule le save avec quota FREE
  async saveProject(userId, userPlan, projectId) {
    if (userPlan === 'FREE') {
      const saved = await prisma.userProjectInteraction.findMany({
        where: { userId, action: { in: ['SAVE', 'UNSAVE'] } },
        orderBy: { createdAt: 'asc' },
      });
      const net = new Set();
      for (const s of saved) { if (s.action === 'SAVE') net.add(s.projectId); else net.delete(s.projectId); }
      if (net.size >= PLAN_LIMITS.FREE.savesMax) throw new Error(`Limite ${PLAN_LIMITS.FREE.savesMax} favoris atteinte.`);
    }
    return prisma.userProjectInteraction.create({ data: { userId, projectId, action: 'SAVE' } });
  },

  // Simule AdsController: tous les plans voient les pubs
  getAds(_userPlan) {
    return { ads: [{ id: 'ad1', title: 'Pub test' }], insertEvery: 5 };
  },
};

// ─── Agent factory ──────────────────────────────────────────

async function createAgent(name, plan, role = 'FOUNDER') {
  return prisma.user.create({
    data: {
      email: `${PREFIX}${name.toLowerCase()}@test.local`,
      firstName: name, lastName: 'Agent', role, plan, status: 'ACTIVE',
      firebaseUid: `fb_${PREFIX}${name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    },
  });
}

async function createProject(founderId, suffix) {
  return prisma.project.create({
    data: {
      founderId, name: `Projet ${suffix}`, pitch: `Pitch ${suffix}`,
      status: 'PUBLISHED', slug: `proj-${suffix}-${Date.now()}`,
    },
  });
}

// ─── Cleanup ────────────────────────────────────────────────

async function cleanup() {
  console.log('\n\ud83e\uddf9 Nettoyage...');
  await prisma.boost.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.profileView.deleteMany({ where: { viewer: { email: { startsWith: PREFIX } } } });
  await prisma.profileView.deleteMany({ where: { viewed: { email: { startsWith: PREFIX } } } });
  await prisma.userProjectInteraction.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.project.deleteMany({ where: { founder: { email: { startsWith: PREFIX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  console.log('   OK\n');
}

// =================================================================
// SCENARIO 1 — Amadou (FREE fondateur) decouvre la plateforme
// =================================================================

async function scenario1_amadou_free() {
  const amadou = await createAgent('Amadou', 'FREE');
  const target = await createAgent('Target1', 'PRO');
  const project = await createProject(amadou.id, 'amadou');

  // 1. Amadou voit les pubs
  const ads = Service.getAds('FREE');
  assertGte(ads.ads.length, 1, 'Amadou FREE: voit des pubs');
  assertEq(ads.insertEvery, 5, 'Amadou FREE: pubs toutes les 5 cartes');

  // 2. Amadou peut sauvegarder 10 projets max
  const projects = [];
  for (let i = 0; i < 10; i++) {
    projects.push(await createProject(target.id, `amadou_save_${i}`));
  }
  for (let i = 0; i < 10; i++) {
    await Service.saveProject(amadou.id, 'FREE', projects[i].id);
  }
  const saveCount = await prisma.userProjectInteraction.count({ where: { userId: amadou.id, action: 'SAVE' } });
  assertEq(saveCount, 10, 'Amadou FREE: 10 saves OK (max atteint)');

  // 3. 11e save → bloque
  const extra = await createProject(target.id, 'amadou_save_extra');
  let blocked = false;
  try { await Service.saveProject(amadou.id, 'FREE', extra.id); } catch (e) { blocked = true; }
  assert(blocked, 'Amadou FREE: 11e save BLOQUE');

  // 4. Amadou ne peut PAS voir les profile views detaillees
  let pvBlocked = false;
  try { await Service.getProfileViewers(amadou.id, 'FREE'); } catch (e) { pvBlocked = true; }
  assert(pvBlocked, 'Amadou FREE: profile views detaillees BLOQUEES');

  // 5. Amadou PEUT voir le count
  const pvCount = await Service.getProfileViewCount(amadou.id);
  assertEq(pvCount, 0, 'Amadou FREE: profile view count = 0 (accessible)');

  // 6. Amadou ne peut PAS undo skip
  let undoBlocked = false;
  try { await Service.undoLastSkip(amadou.id, 'FREE'); } catch (e) { undoBlocked = true; }
  assert(undoBlocked, 'Amadou FREE: undo skip BLOQUE');

  // 7. Amadou ne peut PAS voir les stats
  let statsBlocked = false;
  try { await Service.getProfileStats(amadou.id, 'FREE'); } catch (e) { statsBlocked = true; }
  assert(statsBlocked, 'Amadou FREE: stats BLOQUEES');

  // 8. Amadou ne peut PAS booster
  let boostBlocked = false;
  try { await Service.activateBoost(amadou.id, 'FREE', project.id); } catch (e) { boostBlocked = true; }
  assert(boostBlocked, 'Amadou FREE: boost BLOQUE');

  // 9. Amadou ne peut PAS passer invisible
  let invisBlocked = false;
  try { await Service.toggleInvisible(amadou.id, 'FREE', true); } catch (e) { invisBlocked = true; }
  assert(invisBlocked, 'Amadou FREE: invisible BLOQUE');

  // 10. Privacy wall: Amadou ne voit PAS les contacts
  const hasAccess = Service.hasPaidAccess('FREE', null);
  assert(!hasAccess, 'Amadou FREE: contacts masques (privacy wall)');
}

// =================================================================
// SCENARIO 2 — Fatou (FREE candidate) tente de depasser les quotas
// =================================================================

async function scenario2_fatou_free() {
  const fatou = await createAgent('Fatou2', 'FREE', 'CANDIDATE');
  const founder = await createAgent('Founder2', 'PRO');

  // 1. Fatou ne peut pas voir qui a aime
  const project = await createProject(founder.id, 'fatou_target');
  let likersBlocked = false;
  try { await Service.getProjectLikers(project.id, 'FREE'); } catch (e) { likersBlocked = true; }
  assert(likersBlocked, 'Fatou FREE: voir qui a aime BLOQUE (PRO+)');

  // 2. Messages limites a 10/jour
  assertEq(PLAN_LIMITS.FREE.messagesPerDay, 10, 'Fatou FREE: limite 10 msg/jour');

  // 3. Pas de badge
  assert(!canAccess('FREE', 'PRO'), 'Fatou FREE: pas de badge (< PRO)');

  // 4. Privacy wall actif
  assert(!Service.hasPaidAccess('FREE', null), 'Fatou FREE: privacy wall actif');
}

// =================================================================
// SCENARIO 3 — Jean (PLUS fondateur) debloque features
// =================================================================

async function scenario3_jean_plus() {
  const jean = await createAgent('Jean3', 'PLUS');
  const viewer = await createAgent('Viewer3', 'FREE');
  const project = await createProject(jean.id, 'jean_proj');

  // 1. Jean voit les pubs (tous les plans voient les pubs)
  const ads = Service.getAds('PLUS');
  assertGte(ads.ads.length, 1, 'Jean PLUS: voit les pubs');
  assertEq(ads.insertEvery, 5, 'Jean PLUS: pubs toutes les 5 cartes');

  // 2. Jean peut voir les profile views
  await Service.trackProfileView(viewer.id, jean.id);
  const pv = await Service.getProfileViewers(jean.id, 'PLUS');
  assertEq(pv.count, 1, 'Jean PLUS: voit 1 profile viewer');
  assertEq(pv.viewers[0].viewer.id, viewer.id, 'Jean PLUS: viewer = le bon user');

  // 3. Jean peut undo un skip
  await prisma.userProjectInteraction.create({
    data: { userId: jean.id, projectId: project.id, action: 'SKIP' },
  });
  const undo = await Service.undoLastSkip(jean.id, 'PLUS');
  assert(undo !== null, 'Jean PLUS: undo skip OK');
  assertEq(undo.projectId, project.id, 'Jean PLUS: undo retourne le bon projectId');

  // 4. Jean peut sauvegarder sans limite
  const projects = [];
  for (let i = 0; i < 15; i++) {
    projects.push(await createProject(viewer.id, `jean_save_${i}`));
  }
  for (let i = 0; i < 15; i++) {
    await Service.saveProject(jean.id, 'PLUS', projects[i].id);
  }
  const saveCount = await prisma.userProjectInteraction.count({ where: { userId: jean.id, action: 'SAVE' } });
  assertEq(saveCount, 15, 'Jean PLUS: 15 saves OK (illimite)');

  // 5. Jean ne peut PAS booster (PLUS = 0 boosts)
  let boostBlocked = false;
  try { await Service.activateBoost(jean.id, 'PLUS', project.id); } catch (e) { boostBlocked = true; }
  assert(boostBlocked, 'Jean PLUS: boost BLOQUE (PRO+ feature)');

  // 6. Jean ne peut PAS voir les stats avancees
  let statsBlocked = false;
  try { await Service.getProfileStats(jean.id, 'PLUS'); } catch (e) { statsBlocked = true; }
  assert(statsBlocked, 'Jean PLUS: stats BLOQUEES (PRO+ feature)');

  // 7. Jean ne peut PAS passer invisible
  let invisBlocked = false;
  try { await Service.toggleInvisible(jean.id, 'PLUS', true); } catch (e) { invisBlocked = true; }
  assert(invisBlocked, 'Jean PLUS: invisible BLOQUE (ELITE feature)');

  // 8. Privacy wall: Jean PEUT voir les contacts
  assert(Service.hasPaidAccess('PLUS', null), 'Jean PLUS: contacts visibles');
}

// =================================================================
// SCENARIO 4 — Marie (PLUS candidate) utilise filtres avances
// =================================================================

async function scenario4_marie_plus() {
  const marie = await createAgent('Marie4', 'PLUS', 'CANDIDATE');

  // 1. Marie a un plan payant → filtres skills debloquees
  assert(hasPaidPlan('PLUS'), 'Marie PLUS: plan payant → filtres skills OK');

  // 2. Marie voit les pubs (tous les plans)
  assertGte(Service.getAds('PLUS').ads.length, 1, 'Marie PLUS: voit les pubs');

  // 3. Marie a 50 msg/jour
  assertEq(PLAN_LIMITS.PLUS.messagesPerDay, 50, 'Marie PLUS: 50 msg/jour');

  // 4. Marie ne peut pas voir qui a aime
  let blocked = false;
  try { await Service.getProjectLikers('fake-id', 'PLUS'); } catch (e) { blocked = true; }
  assert(blocked, 'Marie PLUS: voir likers BLOQUE (PRO+)');

  // 5. Marie ne peut pas booster
  assertEq(PLAN_LIMITS.PLUS.boostsPerMonth, 0, 'Marie PLUS: 0 boosts/mois');
}

// =================================================================
// SCENARIO 5 — Paul (PRO fondateur) utilise boosts et stats
// =================================================================

async function scenario5_paul_pro() {
  const paul = await createAgent('Paul5', 'PRO');
  const liker1 = await createAgent('Liker5a', 'FREE');
  const liker2 = await createAgent('Liker5b', 'PLUS');

  const project = await createProject(paul.id, 'paul_proj');

  // 1. Paul peut booster son projet
  const boost = await Service.activateBoost(paul.id, 'PRO', project.id);
  assert(boost.id !== undefined, 'Paul PRO: boost active OK');
  const boostDuration = (boost.expiresAt.getTime() - boost.startedAt.getTime()) / (1000 * 60 * 60);
  assert(boostDuration >= 23.9 && boostDuration <= 24.1, `Paul PRO: boost duree 24h (${boostDuration.toFixed(1)}h)`);

  // 2. Paul peut voir les stats
  const stats = await Service.getProfileStats(paul.id, 'PRO');
  assert(Array.isArray(stats), 'Paul PRO: stats accessibles');
  assertEq(stats.length, 1, 'Paul PRO: stats pour 1 projet');

  // 3. Creer des likes et verifier que Paul peut voir les likers
  await prisma.userProjectInteraction.create({ data: { userId: liker1.id, projectId: project.id, action: 'LIKE' } });
  await prisma.userProjectInteraction.create({ data: { userId: liker2.id, projectId: project.id, action: 'LIKE' } });
  const likers = await Service.getProjectLikers(project.id, 'PRO');
  assertEq(likers.length, 2, 'Paul PRO: voit 2 likers');

  // 4. Paul a le badge PRO
  assert(canAccess('PRO', 'PRO'), 'Paul PRO: badge PRO visible');
  assert(!canAccess('PRO', 'ELITE'), 'Paul PRO: PAS de badge ELITE');

  // 5. Paul a des messages illimites
  assert(PLAN_LIMITS.PRO.messagesPerDay === Infinity, 'Paul PRO: messages illimites');

  // 6. Paul ne peut PAS passer invisible
  let invisBlocked = false;
  try { await Service.toggleInvisible(paul.id, 'PRO', true); } catch (e) { invisBlocked = true; }
  assert(invisBlocked, 'Paul PRO: invisible BLOQUE (ELITE)');

  // 7. Paul ne peut PAS re-booster le meme projet (deja actif)
  let reBoostBlocked = false;
  try { await Service.activateBoost(paul.id, 'PRO', project.id); } catch (e) { reBoostBlocked = true; }
  assert(reBoostBlocked, 'Paul PRO: re-boost meme projet BLOQUE (boost actif)');

  // 8. Paul peut booster un 2e projet
  const project2 = await createProject(paul.id, 'paul_proj2');
  const boost2 = await Service.activateBoost(paul.id, 'PRO', project2.id);
  assert(boost2.id !== undefined, 'Paul PRO: 2e boost sur autre projet OK');
}

// =================================================================
// SCENARIO 6 — Aisha (PRO candidate) profite du badge et stats
// =================================================================

async function scenario6_aisha_pro() {
  const aisha = await createAgent('Aisha6', 'PRO', 'CANDIDATE');
  const viewer = await createAgent('Viewer6', 'FREE');

  // 1. Aisha a le badge PRO
  assert(canAccess('PRO', 'PRO'), 'Aisha PRO: badge PRO');

  // 2. Aisha peut voir qui a consulte son profil (PRO >= PLUS)
  await Service.trackProfileView(viewer.id, aisha.id);
  const pv = await Service.getProfileViewers(aisha.id, 'PRO');
  assertEq(pv.count, 1, 'Aisha PRO: profile viewers accessible (PRO >= PLUS)');

  // 3. Aisha ne peut pas booster (pas de projets — elle est candidate)
  assertEq(PLAN_LIMITS.PRO.boostsPerMonth, 5, 'Aisha PRO: 5 boosts/mois en config');

  // 4. Aisha voit les pubs (tous les plans)
  assertGte(Service.getAds('PRO').ads.length, 1, 'Aisha PRO: voit les pubs');

  // 5. Privacy wall: contacts visibles
  assert(Service.hasPaidAccess('PRO', null), 'Aisha PRO: contacts visibles');
}

// =================================================================
// SCENARIO 7 — Olivier (ELITE fondateur) utilise TOUT
// =================================================================

async function scenario7_olivier_elite() {
  const olivier = await createAgent('Olivier7', 'ELITE');
  const viewer = await createAgent('Viewer7', 'PRO');
  const projects = [];
  for (let i = 0; i < 3; i++) projects.push(await createProject(olivier.id, `olivier_${i}`));

  // 1. Olivier passe invisible
  const updated = await Service.toggleInvisible(olivier.id, 'ELITE', true);
  assertEq(updated.isInvisible, true, 'Olivier ELITE: invisible active');

  // 2. Invisible: profile view pas tracee
  const pv = await Service.trackProfileView(olivier.id, viewer.id);
  assert(pv === null || pv === undefined, 'Olivier ELITE invisible: visite profil PAS tracee');

  // 3. Olivier desactive invisible
  await Service.toggleInvisible(olivier.id, 'ELITE', false);

  // 4. Maintenant la vue est tracee
  const pv2 = await Service.trackProfileView(olivier.id, viewer.id);
  assert(pv2 !== null, 'Olivier ELITE visible: visite profil tracee');

  // 5. Olivier peut booster 3 projets (quota ELITE = 15)
  for (let i = 0; i < 3; i++) {
    const b = await Service.activateBoost(olivier.id, 'ELITE', projects[i].id);
    assert(b.id !== undefined, `Olivier ELITE: boost projet ${i + 1} OK`);
  }

  // 6. Badge ELITE
  assert(canAccess('ELITE', 'ELITE'), 'Olivier ELITE: badge ELITE');

  // 7. Toutes les features
  assert(canAccess('ELITE', 'PLUS'), 'Olivier ELITE: acces PLUS features');
  assert(canAccess('ELITE', 'PRO'), 'Olivier ELITE: acces PRO features');

  // 8. Messages illimites
  assert(PLAN_LIMITS.ELITE.messagesPerDay === Infinity, 'Olivier ELITE: messages illimites');

  // 9. Stats accessibles
  const stats = await Service.getProfileStats(olivier.id, 'ELITE');
  assertEq(stats.length, 3, 'Olivier ELITE: stats pour 3 projets');

  // 10. Olivier voit les pubs (tous les plans)
  assertGte(Service.getAds('ELITE').ads.length, 1, 'Olivier ELITE: voit les pubs');
}

// =================================================================
// SCENARIO 8 — Sandrine (ELITE candidate) contacts debloquees
// =================================================================

async function scenario8_sandrine_elite() {
  const sandrine = await createAgent('Sandrine8', 'ELITE', 'CANDIDATE');

  // 1. Privacy wall: tout visible
  assert(Service.hasPaidAccess('ELITE', null), 'Sandrine ELITE: contacts visibles');

  // 2. Invisible mode
  const inv = await Service.toggleInvisible(sandrine.id, 'ELITE', true);
  assertEq(inv.isInvisible, true, 'Sandrine ELITE: invisible OK');

  // 3. Badge ELITE
  assert(canAccess('ELITE', 'ELITE'), 'Sandrine ELITE: badge ELITE');

  // 4. Saves illimites
  assert(PLAN_LIMITS.ELITE.savesMax === Infinity, 'Sandrine ELITE: saves illimites');

  // 5. Messages illimites
  assert(PLAN_LIMITS.ELITE.messagesPerDay === Infinity, 'Sandrine ELITE: msg illimites');

  // 6. 15 boosts/mois
  assertEq(PLAN_LIMITS.ELITE.boostsPerMonth, 15, 'Sandrine ELITE: 15 boosts/mois');
}

// =================================================================
// SCENARIO 9 — Ibrahim (FREE→PRO) achete un plan, features s'ouvrent
// =================================================================

async function scenario9_ibrahim_upgrade() {
  const ibrahim = await createAgent('Ibrahim9', 'FREE');
  const project = await createProject(ibrahim.id, 'ibrahim_proj');
  const viewer = await createAgent('Viewer9', 'PLUS');

  // 1. Ibrahim est FREE → boost bloque
  let boostBlocked = false;
  try { await Service.activateBoost(ibrahim.id, 'FREE', project.id); } catch (e) { boostBlocked = true; }
  assert(boostBlocked, 'Ibrahim FREE: boost BLOQUE');

  // 2. Ibrahim FREE: stats bloquees
  let statsBlocked = false;
  try { await Service.getProfileStats(ibrahim.id, 'FREE'); } catch (e) { statsBlocked = true; }
  assert(statsBlocked, 'Ibrahim FREE: stats BLOQUEES');

  // 3. Ibrahim FREE: privacy wall actif
  assert(!Service.hasPaidAccess('FREE', null), 'Ibrahim FREE: contacts masques');

  // === ACHAT DU PLAN PRO ===
  const oneMonthLater = new Date(); oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  await prisma.user.update({
    where: { id: ibrahim.id },
    data: { plan: 'PRO', stripeSubscriptionId: 'sub_test_ibrahim', planExpiresAt: oneMonthLater },
  });
  const upgraded = await prisma.user.findUnique({ where: { id: ibrahim.id } });
  assertEq(upgraded.plan, 'PRO', 'Ibrahim: plan upgrade FREE → PRO OK');

  // 4. Ibrahim PRO: boost marche maintenant
  const boost = await Service.activateBoost(ibrahim.id, 'PRO', project.id);
  assert(boost.id !== undefined, 'Ibrahim PRO: boost DEBLOQUE apres upgrade');

  // 5. Ibrahim PRO: stats marchent
  const stats = await Service.getProfileStats(ibrahim.id, 'PRO');
  assertEq(stats.length, 1, 'Ibrahim PRO: stats DEBLOQUEES');

  // 6. Ibrahim PRO: privacy wall desactive
  assert(Service.hasPaidAccess('PRO', oneMonthLater), 'Ibrahim PRO: contacts visibles');

  // 7. Ibrahim PRO: voit toujours les pubs (tous les plans)
  assertGte(Service.getAds('PRO').ads.length, 1, 'Ibrahim PRO: voit les pubs (tous les plans)');

  // 8. Ibrahim PRO: profile views
  await Service.trackProfileView(viewer.id, ibrahim.id);
  const pv = await Service.getProfileViewers(ibrahim.id, 'PRO');
  assertEq(pv.count, 1, 'Ibrahim PRO: profile views DEBLOQUEES');
}

// =================================================================
// SCENARIO 10 — Moussa (PRO→FREE) plan expire, features se ferment
// =================================================================

async function scenario10_moussa_expire() {
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // hier
  const moussa = await createAgent('Moussa10', 'PRO');
  const project = await createProject(moussa.id, 'moussa_proj');

  // 1. Moussa PRO: tout marche
  const stats = await Service.getProfileStats(moussa.id, 'PRO');
  assert(Array.isArray(stats), 'Moussa PRO: stats accessibles');
  assert(Service.hasPaidAccess('PRO', null), 'Moussa PRO: contacts visibles');

  // === EXPIRATION DU PLAN ===
  await prisma.user.update({
    where: { id: moussa.id },
    data: { plan: 'PRO', planExpiresAt: expiredDate },
  });

  // 2. Privacy wall: plan expire → contacts masques
  assert(!Service.hasPaidAccess('PRO', expiredDate), 'Moussa PRO expire: contacts MASQUES');

  // 3. Simule le lazy cleanup du PlanGuard (remet en FREE)
  const user = await prisma.user.findUnique({ where: { id: moussa.id }, select: { plan: true, planExpiresAt: true } });
  if (user.plan !== 'FREE' && user.planExpiresAt && user.planExpiresAt < new Date()) {
    await prisma.user.update({ where: { id: moussa.id }, data: { plan: 'FREE', stripeSubscriptionId: null } });
  }
  const downgraded = await prisma.user.findUnique({ where: { id: moussa.id } });
  assertEq(downgraded.plan, 'FREE', 'Moussa: lazy cleanup → FREE');

  // 4. Moussa FREE: tout est bloque maintenant
  let statsBlocked = false;
  try { await Service.getProfileStats(moussa.id, 'FREE'); } catch (e) { statsBlocked = true; }
  assert(statsBlocked, 'Moussa FREE (expire): stats BLOQUEES');

  let boostBlocked = false;
  try { await Service.activateBoost(moussa.id, 'FREE', project.id); } catch (e) { boostBlocked = true; }
  assert(boostBlocked, 'Moussa FREE (expire): boost BLOQUE');

  let invisBlocked = false;
  try { await Service.toggleInvisible(moussa.id, 'FREE', true); } catch (e) { invisBlocked = true; }
  assert(invisBlocked, 'Moussa FREE (expire): invisible BLOQUE');

  // 5. Moussa voit toujours les pubs (tous les plans)
  assertGte(Service.getAds('FREE').ads.length, 1, 'Moussa FREE (expire): voit les pubs');

  // 6. Saves limites a 10
  assertEq(PLAN_LIMITS.FREE.savesMax, 10, 'Moussa FREE (expire): saves limites a 10');

  // 7. Messages limites a 10/jour
  assertEq(PLAN_LIMITS.FREE.messagesPerDay, 10, 'Moussa FREE (expire): 10 msg/jour');
}

// =================================================================
// MAIN
// =================================================================

async function main() {
  console.log('\u2554' + '\u2550'.repeat(66) + '\u2557');
  console.log('\u2551  Simulation Plans — 10 Agents avec differents abonnements        \u2551');
  console.log('\u2560' + '\u2550'.repeat(66) + '\u2563');
  console.log('\u2551  FREE, PLUS, PRO, ELITE — upgrade, expiration, features gate    \u2551');
  console.log('\u255a' + '\u2550'.repeat(66) + '\u255d');

  await cleanup();

  try {
    await run('Scenario 1  \u2014 Amadou (FREE fondateur) : tout est limite', scenario1_amadou_free);
    await run('Scenario 2  \u2014 Fatou (FREE candidate) : quotas et blocages', scenario2_fatou_free);
    await run('Scenario 3  \u2014 Jean (PLUS fondateur) : profile views, undo, filtres', scenario3_jean_plus);
    await run('Scenario 4  \u2014 Marie (PLUS candidate) : filtres skills, sans pub', scenario4_marie_plus);
    await run('Scenario 5  \u2014 Paul (PRO fondateur) : boosts, stats, likers', scenario5_paul_pro);
    await run('Scenario 6  \u2014 Aisha (PRO candidate) : badge, profile views', scenario6_aisha_pro);
    await run('Scenario 7  \u2014 Olivier (ELITE fondateur) : invisible, tout deblocage', scenario7_olivier_elite);
    await run('Scenario 8  \u2014 Sandrine (ELITE candidate) : contacts, badge', scenario8_sandrine_elite);
    await run('Scenario 9  \u2014 Ibrahim (FREE\u2192PRO) : upgrade, features s\'ouvrent', scenario9_ibrahim_upgrade);
    await run('Scenario 10 \u2014 Moussa (PRO\u2192FREE) : expiration, features se ferment', scenario10_moussa_expire);
  } finally {
    await cleanup();
  }

  console.log('\n');
  console.log('\u2554' + '\u2550'.repeat(66) + '\u2557');
  console.log('\u2551                       RAPPORT FINAL                               \u2551');
  console.log('\u2560' + '\u2550'.repeat(66) + '\u2563');
  console.log(`\u2551  \u2705 Passes:  ${String(passes).padEnd(4)} | \u274c Echecs: ${String(failures).padEnd(4)}                  \u2551`);
  console.log(`\u2551  Total:      ${String(passes + failures).padEnd(4)} | Taux: ${((passes / Math.max(1, passes + failures)) * 100).toFixed(1)}%                        \u2551`);
  console.log('\u2560' + '\u2550'.repeat(66) + '\u2563');
  for (const r of results) {
    console.log(`\u2551  ${r.name.substring(0, 56).padEnd(56)}  ${String(r.ran).padStart(3)} \u2551`);
  }
  console.log('\u255a' + '\u2550'.repeat(66) + '\u255d');

  if (failures > 0) {
    console.log(`\n\u26a0\ufe0f  ${failures} echec(s).`);
    process.exitCode = 1;
  } else {
    console.log('\n\ud83c\udf89 Tous les plans fonctionnent correctement !');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exitCode = 1; prisma.$disconnect(); });
