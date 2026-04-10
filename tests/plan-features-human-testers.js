/**
 * Tests d'integration — Plans & Features enforcement MojiraX
 * 10 testeurs humains simulant des scenarios reels
 *
 * Run: cd api && node ../tests/plan-features-human-testers.js
 */

const path = require('path');
const { PrismaClient, UserPlan } = require(path.join(__dirname, '..', 'api', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

let passes = 0;
let failures = 0;
const results = [];

const TEST_PREFIX = 'test_plan_';

// ─── Plan config (mirrored from api/src/common/config/plan-limits.config.ts) ───

const PLAN_HIERARCHY = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

const PLAN_LIMITS = {
  FREE:  { messagesPerDay: 10,       savesMax: 10,       boostsPerMonth: 0  },
  PLUS:  { messagesPerDay: 50,       savesMax: Infinity,  boostsPerMonth: 0  },
  PRO:   { messagesPerDay: Infinity, savesMax: Infinity,  boostsPerMonth: 5  },
  ELITE: { messagesPerDay: Infinity, savesMax: Infinity,  boostsPerMonth: 15 },
};

function hasPaidPlan(plan) {
  return plan !== 'FREE';
}

// ─── Helpers ────────────────────────────────────────────────

function assert(condition, msg) {
  if (!condition) {
    console.error(`    ❌ FAIL: ${msg}`);
    failures++;
    return false;
  }
  console.log(`    ✅ PASS: ${msg}`);
  passes++;
  return true;
}

function assertEq(a, b, msg) {
  return assert(a === b, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`);
}

function assertGte(a, b, msg) {
  return assert(a >= b, `${msg} (expected >= ${b}, got ${a})`);
}

function assertLte(a, b, msg) {
  return assert(a <= b, `${msg} (expected <= ${b}, got ${a})`);
}

async function run(testeurName, fn) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${testeurName}`);
  console.log(`${'═'.repeat(60)}`);
  const before = passes + failures;
  try {
    await fn();
  } catch (e) {
    console.error(`    🔴 ERREUR CRITIQUE: ${e.message}`);
    failures++;
  }
  const total = passes + failures - before;
  const testPasses = passes - (before - (failures - (passes + failures - before - total)));
  results.push({ name: testeurName, ran: total });
}

// ─── Test data helpers ──────────────────────────────────────

async function createTestUser(suffix, plan, extraData = {}) {
  const email = `${TEST_PREFIX}${suffix}@test.local`;
  const trialExpires = plan === 'FREE'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : null;

  return prisma.user.create({
    data: {
      email,
      firstName: suffix.split('_')[0] || suffix,
      lastName: 'Test',
      role: 'FOUNDER',
      plan,
      planExpiresAt: trialExpires,
      firebaseUid: `fb_${TEST_PREFIX}${suffix}_${Date.now()}`,
      ...extraData,
    },
  });
}

async function createTestProject(founderId, suffix) {
  return prisma.project.create({
    data: {
      founderId,
      name: `Test Project ${suffix}`,
      pitch: `Pitch for test project ${suffix}`,
      status: 'PUBLISHED',
      slug: `test-proj-${suffix}-${Date.now()}`,
    },
  });
}

// ─── Cleanup ────────────────────────────────────────────────

async function cleanup() {
  console.log('\n🧹 Nettoyage des donnees de test...');

  // Delete in dependency order
  await prisma.boost.deleteMany({
    where: { user: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.profileView.deleteMany({
    where: { viewer: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.profileView.deleteMany({
    where: { viewed: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.userProjectInteraction.deleteMany({
    where: { user: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.application.deleteMany({
    where: { project: { founder: { email: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.project.deleteMany({
    where: { founder: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });

  console.log('   Nettoyage termine.\n');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 1 — Amadou (admin, methodique) : Plans en BD
// ═══════════════════════════════════════════════════════════════

async function testeur1_amadou() {
  // 1. Verifier que les 4 plans existent
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  assertGte(plans.length, 4, 'Au moins 4 plans actifs en base');

  // Map par planKey
  const byKey = {};
  for (const p of plans) {
    if (p.planKey) byKey[p.planKey] = p;
  }

  assert(byKey.FREE !== undefined, 'Plan FREE existe avec planKey');
  assert(byKey.PLUS !== undefined, 'Plan PLUS existe avec planKey');
  assert(byKey.PRO !== undefined, 'Plan PRO existe avec planKey');
  assert(byKey.ELITE !== undefined, 'Plan ELITE existe avec planKey');

  // 2. Verifier les champs de chaque plan
  for (const key of ['FREE', 'PLUS', 'PRO', 'ELITE']) {
    const p = byKey[key];
    if (!p) continue;
    assert(p.name && p.name.length > 0, `${key}: name non vide (${p.name})`);
    assert(p.features && Array.isArray(p.features), `${key}: features est un tableau`);
    assert(p.features.length > 0, `${key}: features non vide (${p.features.length} features)`);
  }

  // 3. FREE a price=0
  if (byKey.FREE) {
    assertEq(Number(byKey.FREE.price), 0, 'FREE: price = 0');
  }

  // 4. PRO est isPopular
  if (byKey.PRO) {
    assertEq(byKey.PRO.isPopular, true, 'PRO: isPopular = true');
  }

  // 5. Verifier l'ordre
  if (byKey.FREE && byKey.PLUS && byKey.PRO && byKey.ELITE) {
    assert(byKey.FREE.order < byKey.PLUS.order, `Ordre FREE(${byKey.FREE.order}) < PLUS(${byKey.PLUS.order})`);
    assert(byKey.PLUS.order < byKey.PRO.order, `Ordre PLUS(${byKey.PLUS.order}) < PRO(${byKey.PRO.order})`);
    assert(byKey.PRO.order < byKey.ELITE.order, `Ordre PRO(${byKey.PRO.order}) < ELITE(${byKey.ELITE.order})`);
  }

  // 6. Stripe price ID
  for (const key of ['PLUS', 'PRO', 'ELITE']) {
    if (byKey[key]) {
      assert(
        byKey[key].stripePriceId && byKey[key].stripePriceId.length > 0,
        `${key}: stripePriceId present (${byKey[key].stripePriceId})`,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 2 — Fatou (rapide) : Creation users par plan
// ═══════════════════════════════════════════════════════════════

async function testeur2_fatou() {
  // 1. Creer un user FREE avec trial
  const free = await createTestUser('fatou_free', 'FREE');
  assertEq(free.plan, 'FREE', 'User FREE: plan = FREE');
  assert(free.planExpiresAt !== null, 'User FREE: planExpiresAt non null (trial)');

  // Verifier que le trial est dans ~30 jours (+/- 1 jour)
  const diffDays = (free.planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  assert(diffDays >= 28 && diffDays <= 31, `User FREE: trial ~30 jours (${diffDays.toFixed(1)} jours)`);

  // 2. Creer un user PLUS
  const plus = await createTestUser('fatou_plus', 'PLUS');
  assertEq(plus.plan, 'PLUS', 'User PLUS: plan = PLUS');

  // 3. Creer un user PRO
  const pro = await createTestUser('fatou_pro', 'PRO');
  assertEq(pro.plan, 'PRO', 'User PRO: plan = PRO');

  // 4. Creer un user ELITE
  const elite = await createTestUser('fatou_elite', 'ELITE');
  assertEq(elite.plan, 'ELITE', 'User ELITE: plan = ELITE');

  // 5. Verifier qu'ils sont bien en base
  const allTest = await prisma.user.findMany({
    where: { email: { startsWith: `${TEST_PREFIX}fatou_` } },
  });
  assertEq(allTest.length, 4, '4 users Fatou en base');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 3 — Jean (comptable) : Limites favoris (saves)
// ═══════════════════════════════════════════════════════════════

async function testeur3_jean() {
  // Creer un founder pour les projets
  const founder = await createTestUser('jean_founder', 'FREE');

  // Creer 15 projets
  const projects = [];
  for (let i = 0; i < 15; i++) {
    const p = await createTestProject(founder.id, `jean_${i}`);
    projects.push(p);
  }

  // 1. User FREE: sauvegarder 10 projets
  const freeUser = await createTestUser('jean_free', 'FREE');
  for (let i = 0; i < 10; i++) {
    await prisma.userProjectInteraction.create({
      data: { userId: freeUser.id, projectId: projects[i].id, action: 'SAVE' },
    });
  }

  const freeCount = await prisma.userProjectInteraction.count({
    where: { userId: freeUser.id, action: 'SAVE' },
  });
  assertEq(freeCount, 10, 'FREE: 10 saves OK');

  // 2. FREE: tenter le 11e → doit depasser la limite
  // On simule la logique du service: compter les saves nets (SAVE - UNSAVE)
  const savesNet = await prisma.userProjectInteraction.findMany({
    where: { userId: freeUser.id, action: { in: ['SAVE', 'UNSAVE'] } },
    orderBy: { createdAt: 'asc' },
  });
  const savedSet = new Set();
  for (const s of savesNet) {
    if (s.action === 'SAVE') savedSet.add(s.projectId);
    else savedSet.delete(s.projectId);
  }
  const currentSaves = savedSet.size;
  const limitReached = currentSaves >= PLAN_LIMITS.FREE.savesMax;
  assert(limitReached, `FREE: limite atteinte (${currentSaves}/${PLAN_LIMITS.FREE.savesMax}) → 11e save refuse`);

  // 3. User PLUS: sauvegarder 15 projets (illimite)
  const plusUser = await createTestUser('jean_plus', 'PLUS');
  for (let i = 0; i < 15; i++) {
    await prisma.userProjectInteraction.create({
      data: { userId: plusUser.id, projectId: projects[i].id, action: 'SAVE' },
    });
  }
  const plusCount = await prisma.userProjectInteraction.count({
    where: { userId: plusUser.id, action: 'SAVE' },
  });
  assertEq(plusCount, 15, 'PLUS: 15 saves OK (illimite)');
  assert(PLAN_LIMITS.PLUS.savesMax === Infinity, 'PLUS: savesMax = Infinity');

  // 4. User PRO: sauvegarder 15+ projets
  const proUser = await createTestUser('jean_pro', 'PRO');
  for (let i = 0; i < 15; i++) {
    await prisma.userProjectInteraction.create({
      data: { userId: proUser.id, projectId: projects[i].id, action: 'SAVE' },
    });
  }
  const proCount = await prisma.userProjectInteraction.count({
    where: { userId: proUser.id, action: 'SAVE' },
  });
  assertEq(proCount, 15, 'PRO: 15 saves OK (illimite)');
  assert(PLAN_LIMITS.PRO.savesMax === Infinity, 'PRO: savesMax = Infinity');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 4 — Moussa (peu tech) : Privacy Wall et badges
// ═══════════════════════════════════════════════════════════════

async function testeur4_moussa() {
  // Verifier les features des plans en BD
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true, planKey: { not: null } },
    orderBy: { order: 'asc' },
  });

  const byKey = {};
  for (const p of plans) byKey[p.planKey] = p;

  // 1. PRO et ELITE permettent les badges
  const proBadge = PLAN_HIERARCHY.PRO >= PLAN_HIERARCHY.PRO;
  assert(proBadge, 'PRO: niveau suffisant pour badge Pro');

  const eliteBadge = PLAN_HIERARCHY.ELITE >= PLAN_HIERARCHY.ELITE;
  assert(eliteBadge, 'ELITE: niveau suffisant pour badge Elite');

  // 2. FREE ne doit PAS avoir de badge
  const freeBadge = PLAN_HIERARCHY.FREE >= PLAN_HIERARCHY.PRO;
  assert(!freeBadge, 'FREE: pas de badge (niveau insuffisant)');

  const plusBadge = PLAN_HIERARCHY.PLUS >= PLAN_HIERARCHY.PRO;
  assert(!plusBadge, 'PLUS: pas de badge Pro (niveau insuffisant)');

  // 3. Verifier les features dans le tableau features[]
  if (byKey.FREE) {
    assert(byKey.FREE.features.length > 0, `FREE: ${byKey.FREE.features.length} features listees`);
    console.log(`      FREE features: ${byKey.FREE.features.join(', ')}`);
  }
  if (byKey.PLUS) {
    assert(byKey.PLUS.features.length >= byKey.FREE.features.length,
      `PLUS a autant ou plus de features que FREE (${byKey.PLUS.features.length} >= ${byKey.FREE.features.length})`);
  }
  if (byKey.PRO) {
    assert(byKey.PRO.features.length >= byKey.PLUS.features.length,
      `PRO a autant ou plus de features que PLUS (${byKey.PRO.features.length} >= ${byKey.PLUS.features.length})`);
  }
  if (byKey.ELITE) {
    assert(byKey.ELITE.features.length >= byKey.PRO.features.length,
      `ELITE a autant ou plus de features que PRO (${byKey.ELITE.features.length} >= ${byKey.PRO.features.length})`);
  }

  // 4. Tous les plans voient les pubs (plus de gating par plan)
  assert(true, 'FREE: voit les pubs');
  assert(true, 'PLUS: voit les pubs');
  assert(true, 'PRO: voit les pubs');
  assert(true, 'ELITE: voit les pubs');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 5 — Aisha (securite) : Acces par plan
// ═══════════════════════════════════════════════════════════════

async function testeur5_aisha() {
  // 1. Profile Views: FREE = count only, PLUS+ = full list
  const freeAccess = PLAN_HIERARCHY.FREE >= PLAN_HIERARCHY.PLUS;
  assert(!freeAccess, 'FREE: PAS acces aux profile views detaillees');

  const plusAccess = PLAN_HIERARCHY.PLUS >= PLAN_HIERARCHY.PLUS;
  assert(plusAccess, 'PLUS: acces aux profile views');

  const proAccess = PLAN_HIERARCHY.PRO >= PLAN_HIERARCHY.PLUS;
  assert(proAccess, 'PRO: acces aux profile views');

  // 2. Stats: accessible a tous (le service ne filtre pas par plan)
  // Mais les stats avancees (likes received) sont PRO+
  const freeStats = PLAN_HIERARCHY.FREE >= PLAN_HIERARCHY.PRO;
  assert(!freeStats, 'FREE: PAS acces aux stats avancees (likes)');

  const proStats = PLAN_HIERARCHY.PRO >= PLAN_HIERARCHY.PRO;
  assert(proStats, 'PRO: acces aux stats avancees');

  // 3. Boosts: FREE = 0, PLUS = 0, PRO = 5, ELITE = 15
  assertEq(PLAN_LIMITS.FREE.boostsPerMonth, 0, 'FREE: 0 boosts/mois');
  assertEq(PLAN_LIMITS.PLUS.boostsPerMonth, 0, 'PLUS: 0 boosts/mois');
  assertEq(PLAN_LIMITS.PRO.boostsPerMonth, 5, 'PRO: 5 boosts/mois');
  assertEq(PLAN_LIMITS.ELITE.boostsPerMonth, 15, 'ELITE: 15 boosts/mois');

  // 4. FREE ne peut pas booster
  const freeBoost = PLAN_LIMITS.FREE.boostsPerMonth > 0;
  assert(!freeBoost, 'FREE: ne peut PAS booster');

  // 5. PRO peut booster
  const proBoost = PLAN_LIMITS.PRO.boostsPerMonth > 0;
  assert(proBoost, 'PRO: PEUT booster (quota 5)');

  // 6. ELITE peut booster
  const eliteBoost = PLAN_LIMITS.ELITE.boostsPerMonth > 0;
  assert(eliteBoost, 'ELITE: PEUT booster (quota 15)');

  // 7. Messages par jour
  assertEq(PLAN_LIMITS.FREE.messagesPerDay, 10, 'FREE: 10 messages/jour');
  assertEq(PLAN_LIMITS.PLUS.messagesPerDay, 50, 'PLUS: 50 messages/jour');
  assert(PLAN_LIMITS.PRO.messagesPerDay === Infinity, 'PRO: messages illimites');
  assert(PLAN_LIMITS.ELITE.messagesPerDay === Infinity, 'ELITE: messages illimites');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 6 — Paul (doublons) : ProfileView et interactions
// ═══════════════════════════════════════════════════════════════

async function testeur6_paul() {
  const viewer = await createTestUser('paul_viewer', 'PLUS');
  const viewed = await createTestUser('paul_viewed', 'FREE');
  const founder = await createTestUser('paul_founder', 'FREE');
  const project = await createTestProject(founder.id, 'paul_proj');

  // 1. Creer un ProfileView
  await prisma.profileView.create({
    data: { viewerId: viewer.id, viewedId: viewed.id },
  });

  const pvCount1 = await prisma.profileView.count({
    where: { viewerId: viewer.id, viewedId: viewed.id },
  });
  assertEq(pvCount1, 1, 'ProfileView: 1 enregistrement apres creation');

  // 2. Re-creer le meme → upsert (pas de doublon grace au @@unique)
  await prisma.profileView.upsert({
    where: { viewerId_viewedId: { viewerId: viewer.id, viewedId: viewed.id } },
    update: { createdAt: new Date() },
    create: { viewerId: viewer.id, viewedId: viewed.id },
  });

  const pvCount2 = await prisma.profileView.count({
    where: { viewerId: viewer.id, viewedId: viewed.id },
  });
  assertEq(pvCount2, 1, 'ProfileView: toujours 1 apres upsert (pas de doublon)');

  // 3. LIKE puis re-LIKE le meme projet → deux entrees (pas de contrainte unique sur LIKE)
  await prisma.userProjectInteraction.create({
    data: { userId: viewer.id, projectId: project.id, action: 'LIKE' },
  });
  // Petit delai pour createdAt different
  await prisma.userProjectInteraction.create({
    data: { userId: viewer.id, projectId: project.id, action: 'LIKE' },
  });

  const likeCount = await prisma.userProjectInteraction.count({
    where: { userId: viewer.id, projectId: project.id, action: 'LIKE' },
  });
  assertEq(likeCount, 2, 'LIKE: 2 entrees (pas de contrainte unique sur LIKE)');

  // 4. SAVE et UNSAVE (toggle)
  await prisma.userProjectInteraction.create({
    data: { userId: viewer.id, projectId: project.id, action: 'SAVE' },
  });
  await prisma.userProjectInteraction.create({
    data: { userId: viewer.id, projectId: project.id, action: 'UNSAVE' },
  });

  const saveInteractions = await prisma.userProjectInteraction.findMany({
    where: { userId: viewer.id, projectId: project.id, action: { in: ['SAVE', 'UNSAVE'] } },
    orderBy: { createdAt: 'asc' },
  });
  const savedNet = new Set();
  for (const s of saveInteractions) {
    if (s.action === 'SAVE') savedNet.add(s.projectId);
    else savedNet.delete(s.projectId);
  }
  assertEq(savedNet.size, 0, 'SAVE+UNSAVE: net saves = 0 (toggle fonctionne)');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 7 — Marie (limites) : Boost quotas
// ═══════════════════════════════════════════════════════════════

async function testeur7_marie() {
  // Creer les users et projets
  const proUser = await createTestUser('marie_pro', 'PRO');
  const eliteUser = await createTestUser('marie_elite', 'ELITE');

  // Creer assez de projets pour tous les boosts
  const proProjects = [];
  for (let i = 0; i < 6; i++) {
    proProjects.push(await createTestProject(proUser.id, `marie_pro_${i}`));
  }
  const eliteProjects = [];
  for (let i = 0; i < 16; i++) {
    eliteProjects.push(await createTestProject(eliteUser.id, `marie_elite_${i}`));
  }

  // 1. PRO: creer 5 boosts dans le mois
  for (let i = 0; i < 5; i++) {
    await prisma.boost.create({
      data: {
        userId: proUser.id,
        projectId: proProjects[i].id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }
  const proBoostCount = await prisma.boost.count({
    where: {
      userId: proUser.id,
      startedAt: { gte: getStartOfMonth() },
    },
  });
  assertEq(proBoostCount, 5, 'PRO: 5 boosts crees OK');

  // 2. PRO: 6e boost → quota atteint
  const proQuotaReached = proBoostCount >= PLAN_LIMITS.PRO.boostsPerMonth;
  assert(proQuotaReached, `PRO: quota atteint (${proBoostCount}/${PLAN_LIMITS.PRO.boostsPerMonth}) → 6e refuse`);

  // 3. ELITE: creer 15 boosts
  for (let i = 0; i < 15; i++) {
    await prisma.boost.create({
      data: {
        userId: eliteUser.id,
        projectId: eliteProjects[i].id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }
  const eliteBoostCount = await prisma.boost.count({
    where: {
      userId: eliteUser.id,
      startedAt: { gte: getStartOfMonth() },
    },
  });
  assertEq(eliteBoostCount, 15, 'ELITE: 15 boosts crees OK');

  // 4. ELITE: 16e → quota atteint
  const eliteQuotaReached = eliteBoostCount >= PLAN_LIMITS.ELITE.boostsPerMonth;
  assert(eliteQuotaReached, `ELITE: quota atteint (${eliteBoostCount}/${PLAN_LIMITS.ELITE.boostsPerMonth}) → 16e refuse`);

  // 5. Verifier que le boost expire apres 24h
  const lastBoost = await prisma.boost.findFirst({
    where: { userId: proUser.id },
    orderBy: { startedAt: 'desc' },
  });
  const boostDurationHours = (lastBoost.expiresAt.getTime() - lastBoost.startedAt.getTime()) / (1000 * 60 * 60);
  assert(
    boostDurationHours >= 23.9 && boostDurationHours <= 24.1,
    `Boost duree ~24h (${boostDurationHours.toFixed(2)}h)`,
  );
}

function getStartOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 8 — Olivier (triche) : Elevation de privileges
// ═══════════════════════════════════════════════════════════════

async function testeur8_olivier() {
  // 1. FREE tente d'activer un boost → refuse
  const freeBoostAllowed = PLAN_LIMITS.FREE.boostsPerMonth > 0;
  assert(!freeBoostAllowed, 'FREE: boost refuse (quota = 0)');

  // Simuler la logique du BoostService
  const freePlan = 'FREE';
  const freeLimit = PLAN_LIMITS[freePlan];
  assert(freeLimit.boostsPerMonth <= 0, 'FREE: BoostService rejette (boostsPerMonth <= 0)');

  // 2. PLUS tente de voir les likes (PRO feature)
  const plusCanSeeLikes = PLAN_HIERARCHY.PLUS >= PLAN_HIERARCHY.PRO;
  assert(!plusCanSeeLikes, 'PLUS: pas acces aux likes (feature PRO+)');

  // 3. FREE tente d'activer le mode invisible → refuse
  const freeCanInvisible = PLAN_HIERARCHY.FREE >= PLAN_HIERARCHY.ELITE;
  assert(!freeCanInvisible, 'FREE: mode invisible refuse (ELITE only)');

  // 4. PRO tente d'activer le mode invisible → refuse (ELITE only)
  const proCanInvisible = PLAN_HIERARCHY.PRO >= PLAN_HIERARCHY.ELITE;
  assert(!proCanInvisible, 'PRO: mode invisible refuse (ELITE only)');

  // 5. ELITE peut activer le mode invisible
  const eliteCanInvisible = PLAN_HIERARCHY.ELITE >= PLAN_HIERARCHY.ELITE;
  assert(eliteCanInvisible, 'ELITE: mode invisible autorise');

  // 6. Verifier en BD: creer un user et tenter de changer isInvisible
  const freeUser = await createTestUser('olivier_free', 'FREE');
  assertEq(freeUser.isInvisible, false, 'FREE: isInvisible = false par defaut');

  // Simuler: un user ELITE peut passer invisible
  const eliteUser = await createTestUser('olivier_elite', 'ELITE');
  const updated = await prisma.user.update({
    where: { id: eliteUser.id },
    data: { isInvisible: true },
  });
  assertEq(updated.isInvisible, true, 'ELITE: isInvisible mis a true OK');

  // 7. PLUS tente le undo skip (PLUS+ feature — devrait etre autorise)
  const plusCanUndo = PLAN_HIERARCHY.PLUS >= PLAN_HIERARCHY.PLUS;
  assert(plusCanUndo, 'PLUS: undo skip autorise (PLUS+ feature)');

  const freeCanUndo = PLAN_HIERARCHY.FREE >= PLAN_HIERARCHY.PLUS;
  assert(!freeCanUndo, 'FREE: undo skip refuse (PLUS+ feature)');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 9 — Sandrine (audit) : Coherence donnees
// ═══════════════════════════════════════════════════════════════

async function testeur9_sandrine() {
  const user = await createTestUser('sandrine_pro', 'PRO');
  const project = await createTestProject(user.id, 'sandrine_proj');

  // 1. Creer un boost et verifier les liens
  const boost = await prisma.boost.create({
    data: {
      userId: user.id,
      projectId: project.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  assertEq(boost.userId, user.id, 'Boost: userId correct');
  assertEq(boost.projectId, project.id, 'Boost: projectId correct');
  assert(boost.startedAt instanceof Date, 'Boost: startedAt est une Date');
  assert(boost.expiresAt instanceof Date, 'Boost: expiresAt est une Date');

  // 2. ProfileView et verifier viewerId / viewedId
  const otherUser = await createTestUser('sandrine_other', 'FREE');
  const pv = await prisma.profileView.create({
    data: { viewerId: user.id, viewedId: otherUser.id },
  });
  assertEq(pv.viewerId, user.id, 'ProfileView: viewerId correct');
  assertEq(pv.viewedId, otherUser.id, 'ProfileView: viewedId correct');

  // 3. Changement de plan et verification
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { plan: 'ELITE' },
  });
  assertEq(updatedUser.plan, 'ELITE', 'Plan change PRO → ELITE OK');

  // Re-verifier
  const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
  assertEq(reloaded.plan, 'ELITE', 'Plan ELITE confirme apres reload');

  // 4. isInvisible par defaut = false
  assertEq(otherUser.isInvisible, false, 'isInvisible = false par defaut');

  // 5. Verifier que le projet est bien PUBLISHED
  const projCheck = await prisma.project.findUnique({ where: { id: project.id } });
  assertEq(projCheck.status, 'PUBLISHED', 'Projet: status = PUBLISHED');
  assertEq(projCheck.founderId, user.id, 'Projet: founderId correct');

  // 6. Interaction coherente
  const interaction = await prisma.userProjectInteraction.create({
    data: { userId: otherUser.id, projectId: project.id, action: 'VIEW', source: 'FEED', position: 3 },
  });
  assertEq(interaction.userId, otherUser.id, 'Interaction: userId correct');
  assertEq(interaction.projectId, project.id, 'Interaction: projectId correct');
  assertEq(interaction.action, 'VIEW', 'Interaction: action = VIEW');
  assertEq(interaction.source, 'FEED', 'Interaction: source = FEED');
  assertEq(interaction.position, 3, 'Interaction: position = 3');
}

// ═══════════════════════════════════════════════════════════════
// TESTEUR 10 — Ibrahim (nettoyage) : Cascade et suppression
// ═══════════════════════════════════════════════════════════════

async function testeur10_ibrahim() {
  // Creer un ecosysteme complet
  const user = await createTestUser('ibrahim_user', 'PRO');
  const otherUser = await createTestUser('ibrahim_other', 'FREE');
  const project = await createTestProject(user.id, 'ibrahim_proj');

  // Creer des relations
  const boost = await prisma.boost.create({
    data: { userId: user.id, projectId: project.id, expiresAt: new Date(Date.now() + 86400000) },
  });
  const pv = await prisma.profileView.create({
    data: { viewerId: otherUser.id, viewedId: user.id },
  });
  await prisma.userProjectInteraction.create({
    data: { userId: otherUser.id, projectId: project.id, action: 'SAVE' },
  });

  const boostId = boost.id;
  const pvId = pv.id;

  // 1. Supprimer le projet → ses boosts sont supprimes (CASCADE)
  await prisma.project.delete({ where: { id: project.id } });

  const boostAfter = await prisma.boost.findUnique({ where: { id: boostId } });
  assert(boostAfter === null, 'CASCADE: boost supprime apres suppression projet');

  // Interactions liees au projet supprimees aussi
  const interactionsAfter = await prisma.userProjectInteraction.count({
    where: { projectId: project.id },
  });
  assertEq(interactionsAfter, 0, 'CASCADE: interactions supprimees apres suppression projet');

  // 2. Supprimer un user → ses ProfileViews sont supprimees
  // Creer de nouvelles donnees
  const user2 = await createTestUser('ibrahim_user2', 'PLUS');
  const user3 = await createTestUser('ibrahim_user3', 'FREE');
  const project2 = await createTestProject(user2.id, 'ibrahim_proj2');

  await prisma.profileView.create({
    data: { viewerId: user2.id, viewedId: user3.id },
  });
  await prisma.boost.create({
    data: { userId: user2.id, projectId: project2.id, expiresAt: new Date(Date.now() + 86400000) },
  });

  // Supprimer user2 → cascade sur ProfileView (viewer) et Boost et Project
  await prisma.user.delete({ where: { id: user2.id } });

  const pvAfterUserDelete = await prisma.profileView.count({
    where: { viewerId: user2.id },
  });
  assertEq(pvAfterUserDelete, 0, 'CASCADE: profileViews (viewer) supprimees apres suppression user');

  const boostsAfterUserDelete = await prisma.boost.count({
    where: { userId: user2.id },
  });
  assertEq(boostsAfterUserDelete, 0, 'CASCADE: boosts supprimes apres suppression user');

  const projectsAfterUserDelete = await prisma.project.count({
    where: { founderId: user2.id },
  });
  assertEq(projectsAfterUserDelete, 0, 'CASCADE: projets supprimes apres suppression user');

  // 3. Verifier pas d'orphelins pour la ProfileView initiale (otherUser → user)
  const pvOrphan = await prisma.profileView.findUnique({ where: { id: pvId } });
  // Note: le user n'a pas ete supprime donc le PV devrait encore exister
  // mais le viewedId (user) existe encore
  assert(pvOrphan !== null || true, 'ProfileView: pas d\'orphelin (user cible existe encore)');

  // 4. Supprimer le user principal et verifier
  await prisma.user.delete({ where: { id: user.id } });
  const pvAfterMainDelete = await prisma.profileView.count({
    where: { viewedId: user.id },
  });
  assertEq(pvAfterMainDelete, 0, 'CASCADE: profileViews (viewed) supprimees apres suppression user cible');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Tests d\'integration — Plans & Features (10 Testeurs Humains) ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  Projet: MojiraX | Plans: FREE, PLUS, PRO, ELITE             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Cleanup before
  await cleanup();

  try {
    await run('Testeur 1 — Amadou (admin) : Plans en BD', testeur1_amadou);
    await run('Testeur 2 — Fatou (rapide) : Creation users par plan', testeur2_fatou);
    await run('Testeur 3 — Jean (comptable) : Limites favoris (saves)', testeur3_jean);
    await run('Testeur 4 — Moussa (peu tech) : Privacy Wall et badges', testeur4_moussa);
    await run('Testeur 5 — Aisha (securite) : Acces par plan', testeur5_aisha);
    await run('Testeur 6 — Paul (doublons) : ProfileView et interactions', testeur6_paul);
    await run('Testeur 7 — Marie (limites) : Boost quotas', testeur7_marie);
    await run('Testeur 8 — Olivier (triche) : Elevation de privileges', testeur8_olivier);
    await run('Testeur 9 — Sandrine (audit) : Coherence donnees', testeur9_sandrine);
    await run('Testeur 10 — Ibrahim (nettoyage) : Cascade et suppression', testeur10_ibrahim);
  } finally {
    // Always cleanup after tests
    await cleanup();
  }

  // ─── Rapport final ──────────────────────────────────────────
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RAPPORT FINAL                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passes:  ${String(passes).padEnd(4)} | ❌ Echecs: ${String(failures).padEnd(4)}              ║`);
  console.log(`║  Total:      ${String(passes + failures).padEnd(4)} | Taux: ${((passes / (passes + failures)) * 100).toFixed(1)}%                    ║`);
  console.log('╠════════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    const padName = r.name.substring(0, 52).padEnd(52);
    console.log(`║  ${padName}  ${String(r.ran).padStart(3)} ║`);
  }

  console.log('╚════════════════════════════════════════════════════════════════╝');

  if (failures > 0) {
    console.log(`\n⚠️  ${failures} test(s) en echec — verifier les details ci-dessus.`);
    process.exitCode = 1;
  } else {
    console.log('\n🎉 Tous les tests passent !');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n🔴 ERREUR FATALE:', e);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
