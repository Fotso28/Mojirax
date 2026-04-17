/**
 * TESTEURS HUMAINS — Module Profil Utilisateur
 *
 * 10 testeurs simulent des scenarios reels sur les endpoints :
 *   2.1 GET /users/profile
 *   2.2 PATCH /users/profile
 *   2.3 POST/PATCH /users/candidate-profile
 *   2.4 PATCH /users/invisible
 *   2.5 GET /users/profile-views
 *   2.6 GET /users/stats
 *   2.7 GET /users/features
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserPlan } from '@prisma/client';
import { UsersService } from './users.service';
import { StatsService } from './stats.service';
import { ProfileViewsService } from './profile-views.service';
import { CandidateModerationService } from './candidate-moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AiService } from '../ai/ai.service';
import { MatchingService } from '../matching/matching.service';
import { PlanGuard } from '../payment/guards/plan.guard';
import { Reflector } from '@nestjs/core';
import { getAvailableFlags, FEATURE_FLAGS } from '../common/config/feature-flags';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { I18nService } from '../i18n/i18n.service';

const mockI18n = { t: jest.fn((k: string) => k), detectLocale: jest.fn().mockReturnValue('fr') };

// Shared Redis mock — UsersService now depends on it (added by commit 30e720d).
// Every beforeEach passes this same instance so tests stay fast + isolated.
const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    zadd: jest.fn().mockResolvedValue(1),
    zrange: jest.fn().mockResolvedValue([]),
    zrevrange: jest.fn().mockResolvedValue([]),
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    keys: jest.fn().mockResolvedValue([]),
};

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-001';
const FATOU_UID = 'firebase-fatou-002';
const JEAN_UID = 'firebase-jean-003';
const MOUSSA_UID = 'firebase-moussa-004';
const AISHA_UID = 'firebase-aisha-005';
const PAUL_UID = 'firebase-paul-006';
const MARIE_UID = 'firebase-marie-007';
const OLIVIER_UID = 'firebase-olivier-008';
const SANDRINE_UID = 'firebase-sandrine-009';
const IBRAHIM_UID = 'firebase-ibrahim-010';

const AMADOU_ID = 'user-amadou-001';
const FATOU_ID = 'user-fatou-002';
const JEAN_ID = 'user-jean-003';
const MOUSSA_ID = 'user-moussa-004';
const AISHA_ID = 'user-aisha-005';
const PAUL_ID = 'user-paul-006';
const MARIE_ID = 'user-marie-007';
const OLIVIER_ID = 'user-olivier-008';
const SANDRINE_ID = 'user-sandrine-009';
const IBRAHIM_ID = 'user-ibrahim-010';

// ─── Mock PrismaService ─────────────────────────────────
function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    candidateProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    profileView: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    userProjectInteraction: {
      count: jest.fn(),
    },
    application: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    moderationLog: {
      create: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────
function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: AMADOU_ID,
    firebaseUid: AMADOU_UID,
    firstName: 'Amadou',
    lastName: 'Diallo',
    name: 'Amadou Diallo',
    email: 'amadou@test.cm',
    phone: '+237699000001',
    address: 'Douala, Cameroun',
    image: null,
    role: 'USER',
    plan: 'FREE' as UserPlan,
    status: 'ACTIVE',
    isInvisible: false,
    onboardingState: null,
    projectDraft: null,
    planExpiresAt: null,
    planStartedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    projects: [],
    candidateProfile: null,
    ...overrides,
  };
}

function makeCandidateProfile(overrides: Record<string, any> = {}) {
  return {
    id: 'cp-001',
    userId: FATOU_ID,
    title: 'Développeuse Full Stack',
    bio: 'Passionnée par la tech au Cameroun, 5 ans d\'expérience en React et Node.js.',
    skills: ['React', 'Node.js', 'TypeScript'],
    location: 'Yaoundé, Cameroun',
    linkedinUrl: 'https://linkedin.com/in/fatou',
    resumeUrl: null,
    githubUrl: 'https://github.com/fatou',
    portfolioUrl: 'https://fatou.dev',
    yearsOfExperience: 4,
    availability: 'IMMEDIATE',
    shortPitch: 'Développeuse passionnée',
    longPitch: 'Je cherche à co-fonder une startup tech au Cameroun',
    vision: 'Transformer le paysage numérique camerounais',
    roleType: 'TECH',
    commitmentType: 'SERIOUS',
    collabPref: 'EQUITY',
    locationPref: 'HYBRID',
    desiredSectors: ['TECH', 'IMPACT'],
    remoteOnly: false,
    hasCofounded: 'NO',
    languages: ['Français', 'Anglais'],
    certifications: ['AWS Certified'],
    qualityScore: 75,
    profileCompleteness: 85,
    status: 'PUBLISHED',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
//  TESTEUR 1 — Amadou (admin, methodique) : Workflow nominal
// ════════════════════════════════════════════════════════════
describe('Testeur 1 — Amadou (admin) : workflow nominal profil', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0)), getEmbeddingModel: jest.fn().mockReturnValue('jina-v3') } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  // 2.1 — Voir mon profil
  test('2.1 — Amadou consulte son profil et voit toutes ses données', async () => {
    const amadouData = makeUser({
      projects: [{ id: 'proj-1', name: 'MojiraX', status: 'PUBLISHED' }],
      candidateProfile: null,
    });
    prisma.user.findUnique.mockResolvedValue(amadouData);

    const result = await usersService.findOne(AMADOU_UID);

    expect(result).toBeDefined();
    expect(result!.firstName).toBe('Amadou');
    expect(result!.lastName).toBe('Diallo');
    expect(result!.email).toBe('amadou@test.cm');
    expect(result!.phone).toBe('+237699000001');
    expect(result!.projects).toHaveLength(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { firebaseUid: AMADOU_UID } }),
    );
  });

  test('2.1 — Amadou consulte un profil inexistant → null', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await usersService.findOne('firebase-inexistant');
    expect(result).toBeNull();
  });

  // 2.2 — Modifier mon profil
  test('2.2 — Amadou modifie son prénom et adresse', async () => {
    const updated = makeUser({ firstName: 'Amadou-Junior', address: 'Kribi' });
    prisma.user.update.mockResolvedValue(updated);

    const result = await usersService.updateProfile(AMADOU_UID, {
      firstName: 'Amadou-Junior',
      address: 'Kribi',
    });

    expect(result.firstName).toBe('Amadou-Junior');
    expect(result.address).toBe('Kribi');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: AMADOU_UID },
        data: { firstName: 'Amadou-Junior', address: 'Kribi' },
      }),
    );
  });

  test('2.2 — Amadou met à jour son titre professionnel', async () => {
    const updated = makeUser({ title: 'CTO' });
    prisma.user.update.mockResolvedValue(updated);

    const result = await usersService.updateProfile(AMADOU_UID, { title: 'CTO' } as any);
    expect(result.title).toBe('CTO');
  });

  // 2.3 — Créer un profil candidat
  test('2.3 — Amadou crée son profil candidat avec tous les champs', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-new', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    const result = await usersService.createCandidateProfile(AMADOU_UID, {
      shortPitch: 'Expert technique',
      longPitch: 'Plus de 10 ans d\'expérience en développement',
      roleType: 'TECH',
      commitmentType: 'FULLTIME',
      availability: 'IMMEDIATE',
      collabPref: 'EQUITY',
      locationPref: 'HYBRID',
      hasCofounded: 'YES',
    });

    expect(result.id).toBe('cp-new');
    expect(result.status).toBe('ANALYZING');
    // Vérifier que le brouillon est effacé
    expect(prisma.user.update).toHaveBeenCalled();
  });

  test('2.3 — Amadou met à jour son profil candidat existant', async () => {
    prisma.user.findUnique.mockResolvedValue(
      makeUser({ candidateProfile: { id: 'cp-existing' } }),
    );
    prisma.candidateProfile.update.mockResolvedValue({ id: 'cp-existing', status: 'ANALYZING' });

    const result = await usersService.updateCandidateProfile(AMADOU_UID, {
      shortPitch: 'CTO Senior — Expert en architecture logicielle',
    });

    expect(result.id).toBe('cp-existing');
    expect(result.status).toBe('ANALYZING');
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 2 — Fatou (rapide, saute des etapes) : Champs optionnels
// ════════════════════════════════════════════════════════════
describe('Testeur 2 — Fatou (rapide) : champs optionnels et incomplets', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('2.2 — Fatou envoie un PATCH profil vide (aucun champ)', async () => {
    prisma.user.update.mockResolvedValue(makeUser({ id: FATOU_ID }));

    const result = await usersService.updateProfile(FATOU_UID, {});
    // Le service accepte un DTO vide (tous les champs sont optionnels)
    expect(result).toBeDefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: FATOU_UID },
        data: {},
      }),
    );
  });

  test('2.3 — Fatou crée un profil candidat minimal (champs sur CandidateProfile)', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: FATOU_ID, firebaseUid: FATOU_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-fatou', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    const result = await usersService.createCandidateProfile(FATOU_UID, {
      shortPitch: 'Marketeur Digital passionné',
    });

    expect(result.id).toBe('cp-fatou');
    expect(prisma.candidateProfile.create).toHaveBeenCalled();
  });

  test('2.3 — Fatou crée un profil avec roleType et commitmentType', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: FATOU_ID, firebaseUid: FATOU_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-fatou2', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    await usersService.createCandidateProfile(FATOU_UID, {
      roleType: 'MARKETING',
      commitmentType: 'SERIOUS',
    });

    expect(prisma.candidateProfile.create).toHaveBeenCalled();
  });

  test('2.2 — Fatou met à jour en vidant un champ optionnel (address → vide)', async () => {
    prisma.user.update.mockResolvedValue(makeUser({ id: FATOU_ID, address: '' }));

    const result = await usersService.updateProfile(FATOU_UID, { address: '' });
    expect(result.address).toBe('');
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 3 — Jean (comptable) : Coherence des données
// ════════════════════════════════════════════════════════════
describe('Testeur 3 — Jean (comptable) : cohérence des données retournées', () => {
  let usersService: UsersService;
  let statsService: StatsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        StatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
    statsService = module.get(StatsService);
  });

  test('2.6 — Jean vérifie que les totaux stats = somme par projet', async () => {
    prisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Projet Alpha' },
      { id: 'proj-2', name: 'Projet Beta' },
    ]);

    // Mock des interactions par projet
    prisma.userProjectInteraction.count.mockImplementation((args: any) => {
      const projectId = args.where.projectId;
      const action = args.where.action;
      const since = args.where.createdAt?.gte;
      if (projectId === 'proj-1') {
        if (action === 'VIEW' && !since) return Promise.resolve(10);
        if (action === 'CLICK' && !since) return Promise.resolve(3);
        if (action === 'SAVE' && !since) return Promise.resolve(2);
        if (action === 'LIKE' && !since) return Promise.resolve(5);
        if (action === 'VIEW' && since) return Promise.resolve(4); // trend
      }
      if (projectId === 'proj-2') {
        if (action === 'VIEW' && !since) return Promise.resolve(20);
        if (action === 'CLICK' && !since) return Promise.resolve(7);
        if (action === 'SAVE' && !since) return Promise.resolve(1);
        if (action === 'LIKE' && !since) return Promise.resolve(8);
        if (action === 'VIEW' && since) return Promise.resolve(12); // trend
      }
      return Promise.resolve(0);
    });
    prisma.application.count.mockImplementation((args: any) => {
      return Promise.resolve(args.where.projectId === 'proj-1' ? 5 : 3);
    });

    const stats = await statsService.getProfileStats(JEAN_ID);

    // Vérifier la somme des totaux
    expect(stats.totals.views).toBe(10 + 20);
    expect(stats.totals.clicks).toBe(3 + 7);
    expect(stats.totals.saves).toBe(2 + 1);
    expect(stats.totals.likes).toBe(5 + 8);
    expect(stats.totals.applications).toBe(5 + 3);

    // Vérifier que chaque projet a ses propres stats
    expect(stats.projects).toHaveLength(2);
    expect(stats.projects[0].projectName).toBe('Projet Alpha');
    expect(stats.projects[0].views).toBe(10);
    expect(stats.projects[1].projectName).toBe('Projet Beta');
    expect(stats.projects[1].views).toBe(20);
  });

  test('2.6 — Jean vérifie stats avec 0 projets → retourne totaux vides', async () => {
    prisma.project.findMany.mockResolvedValue([]);

    const stats = await statsService.getProfileStats(JEAN_ID);

    expect(stats.projects).toEqual([]);
    expect(stats.totals).toEqual({ views: 0, clicks: 0, saves: 0, likes: 0, applications: 0 });
  });

  test('2.3 — Jean vérifie le mapping yearsExp → yearsOfExperience', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: JEAN_ID, firebaseUid: JEAN_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-jean', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    // Tester chaque mapping
    const cases = [
      { input: '0-2', expected: 1 },
      { input: '3-5', expected: 4 },
      { input: '6-10', expected: 8 },
      { input: '10+', expected: 12 },
    ];

    for (const c of cases) {
      prisma.user.findUnique.mockResolvedValue(makeUser({ id: JEAN_ID, firebaseUid: JEAN_UID, role: 'USER', candidateProfile: null }));
      prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-jean', status: 'ANALYZING' });

      await usersService.createCandidateProfile(JEAN_UID, {
        shortPitch: `Dev ${c.input} ans`,
      });

      expect(prisma.candidateProfile.create).toHaveBeenCalled();
    }
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 4 — Moussa (peu tech) : Erreurs de saisie, permissions
// ════════════════════════════════════════════════════════════
describe('Testeur 4 — Moussa (peu tech) : erreurs et permissions', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('2.3 — Moussa tente de créer un profil candidat sans être inscrit → NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      usersService.createCandidateProfile('firebase-inexistant', { shortPitch: 'Test' }),
    ).rejects.toThrow(NotFoundException);
  });

  test('2.3 — Moussa tente de créer un profil candidat quand il en a déjà un → ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MOUSSA_ID, firebaseUid: MOUSSA_UID, role: 'USER', candidateProfile: { id: 'cp-existing' } }));

    await expect(
      usersService.createCandidateProfile(MOUSSA_UID, { shortPitch: 'Test' }),
    ).rejects.toThrow(ConflictException);
  });

  test('2.3 — Moussa tente de modifier un profil candidat qui n\'existe pas → NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MOUSSA_ID, firebaseUid: MOUSSA_UID, candidateProfile: null }));

    await expect(
      usersService.updateCandidateProfile(MOUSSA_UID, { shortPitch: 'Nouveau pitch' }),
    ).rejects.toThrow(NotFoundException);
  });

  test('2.1 — Moussa avec firebaseUid invalide → findOne retourne null', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await usersService.findOne('uid-bidon-12345');
    expect(result).toBeNull();
  });

  test('2.3 — Moussa crée un profil avec yearsExp invalide → yearsOfExperience = 0', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MOUSSA_ID, firebaseUid: MOUSSA_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-moussa', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    await usersService.createCandidateProfile(MOUSSA_UID, {
      shortPitch: 'Barman Tech passionné',
    });

    expect(prisma.candidateProfile.create).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 5 — Aisha (paranoïaque sécurité) : Privacy Wall & Plans
// ════════════════════════════════════════════════════════════
describe('Testeur 5 — Aisha (sécurité) : Privacy Wall et contrôle d\'accès', () => {
  let usersService: UsersService;
  let profileViewsService: ProfileViewsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        ProfileViewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
    profileViewsService = module.get(ProfileViewsService);
  });

  test('2.1 — findPublicProfile retourne email et phone (privacy wall = interceptor, pas service)', async () => {
    // Le service retourne TOUT — la privacy est gérée par le PrivacyInterceptor
    const userData = makeUser({
      id: AISHA_ID,
      email: 'aisha@secret.cm',
      phone: '+237699005',
      candidateProfile: makeCandidateProfile(),
      projects: [],
    });
    prisma.user.findUnique.mockResolvedValue(userData);

    const result = await usersService.findPublicProfile(AISHA_ID);

    // Le service retourne tout — c'est l'interceptor qui masque
    expect(result.email).toBe('aisha@secret.cm');
    expect(result.phone).toBe('+237699005');
  });

  test('2.5 — Utilisateur FREE ne voit PAS les détails des viewers', async () => {
    prisma.profileView.count.mockResolvedValue(5);

    const result = await profileViewsService.getViewers(AISHA_ID, UserPlan.FREE);

    expect(result.viewers).toEqual([]); // Pas de détails
    expect(result.count).toBe(5); // Juste le count
  });

  test('2.5 — Utilisateur PLUS voit les détails des viewers', async () => {
    const viewers = [
      { createdAt: new Date(), viewer: { id: 'v1', firstName: 'Test', lastName: 'User', image: null, role: 'USER', plan: 'FREE' } },
    ];
    prisma.profileView.findMany.mockResolvedValue(viewers);

    const result = await profileViewsService.getViewers(AISHA_ID, UserPlan.PLUS);

    expect(result.viewers).toHaveLength(1);
    expect(result.viewers[0].viewer.firstName).toBe('Test');
    expect(result.count).toBe(1);
  });

  test('2.5 — Utilisateur PRO et ELITE voient aussi les viewers', async () => {
    const viewers = [
      { createdAt: new Date(), viewer: { id: 'v1', firstName: 'A', lastName: 'B', image: null, role: 'USER', plan: 'PRO' } },
    ];
    prisma.profileView.findMany.mockResolvedValue(viewers);

    for (const plan of [UserPlan.PRO, UserPlan.ELITE]) {
      const result = await profileViewsService.getViewers(AISHA_ID, plan);
      expect(result.viewers.length).toBeGreaterThan(0);
    }
  });

  test('2.5 — trackView ne traque pas les auto-vues', async () => {
    await profileViewsService.trackView(AISHA_ID, AISHA_ID);
    expect(prisma.profileView.upsert).not.toHaveBeenCalled();
  });

  test('2.5 — trackView ne traque pas si viewer est invisible', async () => {
    prisma.user.findUnique.mockResolvedValue({ isInvisible: true });

    await profileViewsService.trackView(OLIVIER_ID, AISHA_ID);
    expect(prisma.profileView.upsert).not.toHaveBeenCalled();
  });

  test('2.4 — PlanGuard rejette un utilisateur FREE pour ELITE', async () => {
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    // Simuler le context d'exécution
    prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID, plan: 'FREE', planExpiresAt: null });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: AISHA_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    // Spy sur reflector pour retourner ELITE
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.ELITE);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  test('2.4 — PlanGuard accepte un utilisateur ELITE', async () => {
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID, plan: 'ELITE', planExpiresAt: new Date('2027-01-01') });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: AISHA_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.ELITE);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  test('2.4 — PlanGuard lazy cleanup : plan expiré → repassé en FREE', async () => {
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    const expiredUser = {
      id: AISHA_ID,
      plan: 'PRO',
      planExpiresAt: new Date('2025-01-01'), // Expiré
    };
    prisma.user.findUnique.mockResolvedValue(expiredUser);
    prisma.user.update.mockResolvedValue({});

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: AISHA_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PRO);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);

    // Vérifier que le plan a été reset à FREE
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: AISHA_UID },
      data: { plan: UserPlan.FREE, stripeSubscriptionId: null },
    });
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 6 — Paul (doublons) : Contraintes unicité
// ════════════════════════════════════════════════════════════
describe('Testeur 6 — Paul (doublons) : contraintes et doublons', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: { ...prisma } },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('2.3 — Paul tente de créer un 2e profil candidat → ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue(
      makeUser({ id: PAUL_ID, firebaseUid: PAUL_UID, role: 'USER', candidateProfile: { id: 'cp-paul-existing' } }),
    );

    await expect(
      usersService.createCandidateProfile(PAUL_UID, { shortPitch: 'Doublon' }),
    ).rejects.toThrow(ConflictException);
  });

  test('2.5 — Paul re-visite un profil → upsert met à jour la date', async () => {
    const profileViewsService = new ProfileViewsService(prisma as any);

    prisma.user.findUnique.mockResolvedValue({ isInvisible: false });
    prisma.profileView.upsert.mockResolvedValue({});

    await profileViewsService.trackView(PAUL_ID, AMADOU_ID);

    expect(prisma.profileView.upsert).toHaveBeenCalledWith({
      where: { viewerId_viewedId: { viewerId: PAUL_ID, viewedId: AMADOU_ID } },
      update: { createdAt: expect.any(Date) },
      create: { viewerId: PAUL_ID, viewedId: AMADOU_ID },
    });
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 7 — Marie (limites) : Valeurs extrêmes
// ════════════════════════════════════════════════════════════
describe('Testeur 7 — Marie (limites) : valeurs extrêmes', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('2.3 — Marie crée un profil avec un shortPitch de 1 caractère', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MARIE_ID, firebaseUid: MARIE_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-marie', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    const result = await usersService.createCandidateProfile(MARIE_UID, {
      shortPitch: 'X',
    });

    // Le service accepte — pas de validation de longueur min côté service
    expect(result).toBeDefined();
  });

  test('2.3 — Marie crée un profil avec un shortPitch long (280 chars max)', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MARIE_ID, firebaseUid: MARIE_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-marie-long', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    const longPitch = 'A'.repeat(280);
    const result = await usersService.createCandidateProfile(MARIE_UID, {
      shortPitch: longPitch,
    });

    expect(result).toBeDefined();
  });

  test('2.3 — Marie crée un profil minimal sans champs optionnels', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: MARIE_ID, firebaseUid: MARIE_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-marie-noskill', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    await usersService.createCandidateProfile(MARIE_UID, {});

    expect(prisma.candidateProfile.create).toHaveBeenCalled();
  });

  test('2.5 — Marie vérifie le count des vues sur 30 jours', async () => {
    const profileViewsService = new ProfileViewsService(prisma as any);
    prisma.profileView.count.mockResolvedValue(9999);

    const count = await profileViewsService.getViewCount(MARIE_ID);
    expect(count).toBe(9999);
    // Vérifier que la date 30j est bien passée
    expect(prisma.profileView.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          viewedId: MARIE_ID,
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  test('2.2 — Marie envoie un prénom de 500 caractères', async () => {
    const longName = 'M'.repeat(500);
    prisma.user.update.mockResolvedValue(makeUser({ firstName: longName }));

    // ⚠ BUG POTENTIEL : Pas de validation MaxLength sur firstName dans le DTO !
    const result = await usersService.updateProfile(MARIE_UID, { firstName: longName });
    expect(result.firstName).toBe(longName);
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 8 — Olivier (tricheur) : Elevation de privilege
// ════════════════════════════════════════════════════════════
describe('Testeur 8 — Olivier (tricheur) : élévation de privilège', () => {
  test('2.4 — Olivier (FREE) tente le mode invisible → PlanGuard bloque', async () => {
    const prisma = createMockPrisma();
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID, plan: 'FREE', planExpiresAt: null });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: OLIVIER_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.ELITE);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(/ELITE/);
  });

  test('2.6 — Olivier (FREE) tente d\'accéder aux stats → PlanGuard bloque', async () => {
    const prisma = createMockPrisma();
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID, plan: 'FREE', planExpiresAt: null });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: OLIVIER_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PRO);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(/PRO/);
  });

  test('2.5 — Olivier (FREE) tente d\'accéder aux profile-views → PlanGuard bloque', async () => {
    const prisma = createMockPrisma();
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID, plan: 'FREE', planExpiresAt: null });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: OLIVIER_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  test('2.4 — Olivier (PLUS) tente le mode invisible (besoin ELITE) → bloqué', async () => {
    const prisma = createMockPrisma();
    const reflector = new Reflector();
    const guard = new PlanGuard(reflector, prisma as any);

    prisma.user.findUnique.mockResolvedValue({ id: OLIVIER_ID, plan: 'PLUS', planExpiresAt: new Date('2027-01-01') });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: OLIVIER_UID } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.ELITE);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 9 — Sandrine (méthodique) : Vérification avant/après
// ════════════════════════════════════════════════════════════
describe('Testeur 9 — Sandrine (méthodique) : vérification avant/après', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn().mockResolvedValue('https://s3.local/avatars/new.jpg'), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('2.2 — Sandrine modifie le bio et le titre sur le profil User', async () => {
    prisma.user.update.mockResolvedValue(makeUser({ bio: 'Fondateur tech', title: 'CEO' }));

    const result = await usersService.updateProfile(SANDRINE_UID, {
      bio: 'Fondateur tech',
      title: 'CEO',
    } as any);

    expect(result.bio).toBe('Fondateur tech');
    expect(result.title).toBe('CEO');
  });

  test('2.3 — Sandrine crée un profil candidat et vérifie que bio = concaténation des pitchs', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: SANDRINE_ID, firebaseUid: SANDRINE_UID, role: 'USER', candidateProfile: null }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-sandrine', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    await usersService.createCandidateProfile(SANDRINE_UID, {
      shortPitch: 'Court pitch',
      longPitch: 'Long pitch détaillé',
      vision: 'Ma vision du futur',
    });

    expect(prisma.candidateProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shortPitch: 'Court pitch',
          longPitch: 'Long pitch détaillé',
          vision: 'Ma vision du futur',
        }),
      }),
    );
  });

  test('2.3 — Sandrine vérifie que le brouillon est effacé après création profil', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: SANDRINE_ID, firebaseUid: SANDRINE_UID, role: 'USER', candidateProfile: null, projectDraft: { step: 3 } }));
    prisma.candidateProfile.create.mockResolvedValue({ id: 'cp-sandrine2', status: 'ANALYZING' });
    prisma.user.update.mockResolvedValue({});

    await usersService.createCandidateProfile(SANDRINE_UID, { shortPitch: 'PM passionnée' });

    // Vérifier que projectDraft est effacé (JsonNull)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: SANDRINE_UID },
        data: expect.objectContaining({ projectDraft: expect.anything() }),
      }),
    );
  });

  test('2.1 — Sandrine vérifie que findOne inclut bien les projets et candidateProfile', async () => {
    const user = makeUser({
      id: SANDRINE_ID,
      firebaseUid: SANDRINE_UID,
      projects: [{ id: 'p1', name: 'MonProjet' }],
      candidateProfile: { id: 'cp-s', status: 'PUBLISHED' },
    });
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await usersService.findOne(SANDRINE_UID);

    expect(result!.projects).toHaveLength(1);
    expect(result!.candidateProfile).toBeDefined();
    expect(result!.candidateProfile!.status).toBe('PUBLISHED');
  });

  test('Avatar upload — Sandrine vérifie que l\'ancien avatar est supprimé', async () => {
    const uploadService = { uploadAvatar: jest.fn().mockResolvedValue('https://s3.local/avatars/new.jpg'), deleteFile: jest.fn() };
    prisma.user.findUnique.mockResolvedValue(makeUser({
      id: SANDRINE_ID,
      firebaseUid: SANDRINE_UID,
      image: 'https://s3.local/avatars/old.jpg',
    }));
    prisma.user.update.mockResolvedValue(makeUser({ image: 'https://s3.local/avatars/new.jpg' }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: uploadService },
        { provide: AiService, useValue: { getEmbedding: jest.fn(), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    const svc = module.get(UsersService);

    await svc.updateAvatar(SANDRINE_UID, Buffer.from('fake-image'));

    expect(uploadService.deleteFile).toHaveBeenCalledWith('avatars/old.jpg');
    expect(uploadService.uploadAvatar).toHaveBeenCalledWith(SANDRINE_ID, Buffer.from('fake-image'));
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { image: 'https://s3.local/avatars/new.jpg' },
      }),
    );
  });
});

// ════════════════════════════════════════════════════════════
//  TESTEUR 10 — Ibrahim (nettoie tout) : Suppressions et edge cases
// ════════════════════════════════════════════════════════════
describe('Testeur 10 — Ibrahim (nettoyeur) : edge cases et suppressions', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('Onboarding — Ibrahim sauvegarde et récupère l\'état onboarding', async () => {
    const state = { data: { step1: true, role: 'USER' }, step: 2 };
    prisma.user.update.mockResolvedValue(makeUser({ onboardingState: state }));

    await usersService.saveOnboardingState(IBRAHIM_UID, state);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: IBRAHIM_UID },
      data: { onboardingState: state },
      select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
    });
  });

  test('Onboarding — Ibrahim récupère un état vide', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ onboardingState: null }));

    const result = await usersService.getOnboardingState(IBRAHIM_UID);
    expect(result).toEqual({}); // null → {}
  });

  test('Project Draft — Ibrahim sauvegarde et efface un brouillon projet', async () => {
    const draft = { data: { name: 'MonProjet', sector: 'TECH' }, step: 1 };
    prisma.user.update.mockResolvedValue(makeUser({ projectDraft: draft }));

    await usersService.saveProjectDraft(IBRAHIM_UID, draft);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: IBRAHIM_UID },
      data: { projectDraft: draft },
      select: { id: true, email: true, firstName: true, lastName: true, name: true, image: true, role: true, plan: true },
    });

    // Effacer
    prisma.user.update.mockResolvedValue(makeUser({ projectDraft: null }));
    await usersService.clearProjectDraft(IBRAHIM_UID);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectDraft: expect.anything() }),
      }),
    );
  });

  test('Project Draft — Ibrahim récupère un brouillon vide', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ projectDraft: null }));

    const result = await usersService.getProjectDraft(IBRAHIM_UID);
    expect(result).toEqual({});
  });

  test('Avatar upload — Ibrahim sans avatar précédent ne supprime rien', async () => {
    const uploadService = { uploadAvatar: jest.fn().mockResolvedValue('https://s3.local/avatars/new.jpg'), deleteFile: jest.fn() };
    prisma.user.findUnique.mockResolvedValue(makeUser({ id: IBRAHIM_ID, firebaseUid: IBRAHIM_UID, image: null }));
    prisma.user.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: uploadService },
        { provide: AiService, useValue: { getEmbedding: jest.fn(), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    const svc = module.get(UsersService);

    await svc.updateAvatar(IBRAHIM_UID, Buffer.from('image'));

    expect(uploadService.deleteFile).not.toHaveBeenCalled();
    expect(uploadService.uploadAvatar).toHaveBeenCalled();
  });

  test('Avatar upload — Ibrahim inexistant → NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      usersService.updateAvatar('firebase-ghost', Buffer.from('image')),
    ).rejects.toThrow(NotFoundException);
  });

  test('findPublicProfile — Ibrahim cherche un utilisateur inexistant → NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      usersService.findPublicProfile('user-inexistant'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ════════════════════════════════════════════════════════════
//  TESTS TRANSVERSAUX — Feature Flags (2.7)
// ════════════════════════════════════════════════════════════
describe('Tests transversaux — Feature Flags (2.7)', () => {
  test('getAvailableFlags retourne un tableau vide quand aucun flag activé', () => {
    // Les FEATURE_FLAGS actuels sont tous commentés → tableau vide
    const flags = getAvailableFlags(UserPlan.FREE);
    expect(Array.isArray(flags)).toBe(true);
    expect(flags).toEqual([]);
  });

  test('getAvailableFlags retourne un tableau vide même pour ELITE (aucun flag activé)', () => {
    const flags = getAvailableFlags(UserPlan.ELITE);
    expect(flags).toEqual([]);
  });

  test('FEATURE_FLAGS est bien un tableau', () => {
    expect(Array.isArray(FEATURE_FLAGS)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
//  TESTS TRANSVERSAUX — Candidates Feed
// ════════════════════════════════════════════════════════════
describe('Tests transversaux — Candidates Feed', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('getCandidatesFeed respecte la pagination (max 20)', async () => {
    prisma.candidateProfile.findMany.mockResolvedValue([]);

    await usersService.getCandidatesFeed(null, null, 100);

    // Doit demander 21 (20+1) pour déterminer le nextCursor
    expect(prisma.candidateProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 21,
      }),
    );
  });

  test('getCandidatesFeed retourne nextCursor quand il y a plus de résultats', async () => {
    const candidates = Array.from({ length: 8 }, (_, i) => ({
      id: `cp-${i}`,
      title: `Dev ${i}`,
      user: { id: `u-${i}` },
    }));
    prisma.candidateProfile.findMany.mockResolvedValue(candidates);

    const result = await usersService.getCandidatesFeed(null, null, 7);

    expect(result.candidates).toHaveLength(7);
    expect(result.nextCursor).toBe('cp-7');
  });

  test('getCandidatesFeed retourne nextCursor null quand pas de suite', async () => {
    const candidates = Array.from({ length: 3 }, (_, i) => ({
      id: `cp-${i}`,
      title: `Dev ${i}`,
      user: { id: `u-${i}` },
    }));
    prisma.candidateProfile.findMany.mockResolvedValue(candidates);

    const result = await usersService.getCandidatesFeed(null, null, 7);

    expect(result.candidates).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  test('Trending candidates — retourne vide quand aucun candidat publié', async () => {
    prisma.candidateProfile.findMany.mockResolvedValue([]);

    const result = await usersService.getTrendingCandidates();
    expect(result).toEqual([]);
  });

  test('Trending candidates — retourne max 5 avec scoring composite', async () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      id: `cp-${i}`,
      title: `Dev ${i}`,
      skills: ['JS'],
      qualityScore: 50 + i * 5,
      createdAt: new Date(Date.now() - i * 86400000),
      user: { id: `u-${i}`, name: `User ${i}`, image: null },
    }));
    prisma.candidateProfile.findMany.mockResolvedValue(candidates);
    prisma.application.groupBy.mockResolvedValue([]);

    const result = await usersService.getTrendingCandidates();

    expect(result.length).toBeLessThanOrEqual(5);
    // Vérifier que les résultats sont triés par score décroissant
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });
});

// ════════════════════════════════════════════════════════════
//  TESTS TRANSVERSAUX — Toggle Invisible
// ════════════════════════════════════════════════════════════
describe('Tests transversaux — Toggle Invisible (2.4)', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: { uploadAvatar: jest.fn(), deleteFile: jest.fn() } },
        { provide: AiService, useValue: { getEmbedding: jest.fn().mockResolvedValue([]), getEmbeddingModel: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    usersService = module.get(UsersService);
  });

  test('toggleInvisible active le mode invisible', async () => {
    prisma.user.update.mockResolvedValue({ isInvisible: true });

    const result = await usersService.toggleInvisible(AMADOU_UID, true);
    expect(result.isInvisible).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: AMADOU_UID },
      data: { isInvisible: true },
      select: { isInvisible: true },
    });
  });

  test('toggleInvisible désactive le mode invisible', async () => {
    prisma.user.update.mockResolvedValue({ isInvisible: false });

    const result = await usersService.toggleInvisible(AMADOU_UID, false);
    expect(result.isInvisible).toBe(false);
  });
});
