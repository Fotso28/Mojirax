/**
 * TESTEURS HUMAINS — Module Moderation
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - ModerationService.moderateProject (async AI worker)
 *   - ModerationService.moderateCandidate (async AI worker)
 *   - AdminGuard (protection endpoints admin)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { I18nService } from '../i18n/i18n.service';
import { AdminGuard } from '../auth/admin.guard';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-mod-001';
const FATOU_UID = 'firebase-fatou-mod-002';
const JEAN_UID = 'firebase-jean-mod-003';
const MOUSSA_UID = 'firebase-moussa-mod-004';
const AISHA_UID = 'firebase-aisha-mod-005';
const PAUL_UID = 'firebase-paul-mod-006';

const AMADOU_ID = 'user-amadou-mod-001';
const FATOU_ID = 'user-fatou-mod-002';

// ─── Helpers ─────────────────────────────────────────────
function makeExecContext(firebaseUid: string | undefined): ExecutionContext {
    const req = { user: firebaseUid ? { uid: firebaseUid } : undefined };
    return {
        switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => ({}),
            getNext: () => ({}),
        }),
        getHandler: () => () => {},
        getClass: () => class {},
        getType: () => 'http',
        getArgs: () => [],
        getArgByIndex: () => null,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;
}

function createMockPrisma() {
    return {
        project: { findUnique: jest.fn(), update: jest.fn() },
        candidateProfile: { findUnique: jest.fn(), update: jest.fn() },
        moderationLog: { create: jest.fn().mockResolvedValue({ id: 'log-001' }) },
        user: { findUnique: jest.fn() },
    };
}

const mockI18n = {
    t: jest.fn((key: string) => key),
    detectLocale: jest.fn().mockReturnValue('fr'),
};

const mockNotifications = {
    getUserLocale: jest.fn().mockResolvedValue('fr'),
    notify: jest.fn().mockResolvedValue({ id: 'notif-001' }),
};

// ════════════════════════════════════════════════════════════
//  ModerationService — moderateProject
// ════════════════════════════════════════════════════════════

describe('ModerationService.moderateProject — testeurs humains', () => {
    let service: ModerationService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let aiService: any;

    beforeEach(async () => {
        prisma = createMockPrisma();
        aiService = {
            checkLegality: jest.fn(),
            validateProject: jest.fn(),
            validateCandidateProfile: jest.fn(),
            getEmbedding: jest.fn(),
        };
        mockNotifications.notify.mockClear();
        mockNotifications.getUserLocale.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ModerationService,
                { provide: PrismaService, useValue: prisma },
                { provide: AiService, useValue: aiService },
                { provide: NotificationsService, useValue: mockNotifications },
                { provide: I18nService, useValue: mockI18n },
            ],
        }).compile();
        service = module.get(ModerationService);
    });

    // ─── Testeur 1 — Amadou (admin) : workflow nominal ───
    test('Amadou — projet legal et qualite haute → PUBLISHED + log + notif', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-amadou',
            founderId: AMADOU_ID,
            name: 'MojiraX',
            pitch: 'Connect founders with co-founders in Africa.',
            problem: 'Isolation',
            solutionDesc: 'Platform',
            uvp: 'AI matching',
            sector: 'TECH',
            stage: 'MVP',
            vision: 'Unify African startup ecosystem',
            target: 'Founders',
            businessModel: 'SaaS',
        });
        aiService.checkLegality.mockResolvedValue({ isLegal: true, confidence: 0.95, reason: null });
        aiService.validateProject.mockResolvedValue({ score: 85, summary: 'Projet excellent' });

        await service.moderateProject('proj-amadou');

        // PUBLISHED car score combiné > 0.7
        expect(prisma.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'proj-amadou' },
                data: expect.objectContaining({ status: 'PUBLISHED', qualityScore: 85 }),
            }),
        );
        // Log créé
        expect(prisma.moderationLog.create).toHaveBeenCalled();
        // Notification envoyée
        expect(mockNotifications.notify).toHaveBeenCalledWith(
            AMADOU_ID,
            'MODERATION_ALERT',
            expect.any(String),
            expect.any(String),
            expect.objectContaining({ projectId: 'proj-amadou' }),
        );
    });

    // ─── Testeur 2 — Fatou (rapide, saute étapes) : projet vide ───
    test('Fatou — projet inexistant → warn log, pas d\'update', async () => {
        prisma.project.findUnique.mockResolvedValue(null);

        await service.moderateProject('proj-ghost');

        expect(prisma.project.update).not.toHaveBeenCalled();
        expect(prisma.moderationLog.create).not.toHaveBeenCalled();
    });

    // ─── Testeur 3 — Jean (comptable) : score intermediaire ───
    test('Jean — score combine entre 0.3 et 0.7 → PENDING_AI', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-jean',
            founderId: 'user-jean-id',
            name: 'ProjetFlou',
            pitch: 'Un peu vague',
            problem: '', solutionDesc: '', uvp: '', sector: 'TECH',
            stage: 'IDEA', vision: '', target: '', businessModel: '',
        });
        aiService.checkLegality.mockResolvedValue({ isLegal: true, confidence: 0.6 });
        // quality 50/100 → 0.5, legality 0.6 * 0.4 + 0.5 * 0.6 = 0.54
        aiService.validateProject.mockResolvedValue({ score: 50, summary: 'Besoin ameliorations' });

        await service.moderateProject('proj-jean');

        expect(prisma.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'PENDING_AI' }),
            }),
        );
    });

    // ─── Testeur 4 — Moussa (peu tech) : projet illégal ───
    test('Moussa — projet clairement illegal → REJECTED immediat', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-moussa',
            founderId: 'user-moussa-id',
            name: 'DarkStuff',
            pitch: 'Illegal content',
            problem: '', solutionDesc: '', uvp: '', sector: 'OTHER',
            stage: 'IDEA', vision: '', target: '', businessModel: '',
        });
        aiService.checkLegality.mockResolvedValue({
            isLegal: false,
            confidence: 0.95,
            reason: 'Contenu illicite',
        });

        await service.moderateProject('proj-moussa');

        // REJECTED direct, pas de validateProject
        expect(aiService.validateProject).not.toHaveBeenCalled();
        expect(prisma.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'REJECTED' }),
            }),
        );
        // Notification avec la raison
        expect(mockNotifications.notify).toHaveBeenCalled();
    });

    // ─── Testeur 5 — Aisha (securite) : AI crash → fallback PUBLISHED ───
    test('Aisha — AI service crash → fallback publish pour ne pas bloquer', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-aisha',
            founderId: 'user-aisha-id',
            name: 'Secured',
            pitch: 'X',
            problem: '', solutionDesc: '', uvp: '', sector: 'TECH',
            stage: 'IDEA', vision: '', target: '', businessModel: '',
        });
        aiService.checkLegality.mockRejectedValue(new Error('OpenAI API down'));

        await service.moderateProject('proj-aisha');

        // Fallback a publié quand même
        expect(prisma.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'proj-aisha' },
                data: { status: 'PUBLISHED' },
            }),
        );
    });

    // ─── Testeur 6 — Paul (valeurs extrêmes) : qualité très basse ───
    test('Paul — score combine < 0.3 → REJECTED', async () => {
        prisma.project.findUnique.mockResolvedValue({
            id: 'proj-paul',
            founderId: 'user-paul-id',
            name: 'Vague',
            pitch: 'rien',
            problem: '', solutionDesc: '', uvp: '', sector: 'TECH',
            stage: 'IDEA', vision: '', target: '', businessModel: '',
        });
        // legality 0.3 * 0.4 + 0.1 * 0.6 = 0.18
        aiService.checkLegality.mockResolvedValue({ isLegal: true, confidence: 0.3 });
        aiService.validateProject.mockResolvedValue({ score: 10, summary: 'Trop faible' });

        await service.moderateProject('proj-paul');

        expect(prisma.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'REJECTED' }),
            }),
        );
    });
});

// ════════════════════════════════════════════════════════════
//  ModerationService — moderateCandidate
// ════════════════════════════════════════════════════════════

describe('ModerationService.moderateCandidate — testeurs humains', () => {
    let service: ModerationService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let aiService: any;

    beforeEach(async () => {
        prisma = createMockPrisma();
        aiService = {
            checkLegality: jest.fn(),
            validateProject: jest.fn(),
            validateCandidateProfile: jest.fn(),
            getEmbedding: jest.fn(),
        };
        mockNotifications.notify.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ModerationService,
                { provide: PrismaService, useValue: prisma },
                { provide: AiService, useValue: aiService },
                { provide: NotificationsService, useValue: mockNotifications },
                { provide: I18nService, useValue: mockI18n },
            ],
        }).compile();
        service = module.get(ModerationService);
    });

    // ─── Testeur 7 — Marie (limites) : candidat valide ───
    test('Marie — candidat valide → PUBLISHED + notif PROFILE_PUBLISHED', async () => {
        prisma.candidateProfile.findUnique.mockResolvedValue({
            id: 'cp-marie',
            userId: 'user-marie-id',
            shortPitch: 'Dev passionnee',
            vision: 'Build cool things',
            roleType: 'TECH',
            user: {
                title: 'Full Stack Dev',
                bio: 'Expert React',
                skills: ['React', 'Node'],
                yearsOfExperience: 5,
                city: 'Douala',
                country: 'Cameroun',
            },
        });
        aiService.validateCandidateProfile.mockResolvedValue({
            isValid: true,
            qualityScore: 80,
            legitimacyScore: 90,
            reason: null,
        });

        await service.moderateCandidate('cp-marie');

        expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'cp-marie' },
                data: expect.objectContaining({ status: 'PUBLISHED', qualityScore: 80 }),
            }),
        );
        expect(mockNotifications.notify).toHaveBeenCalledWith(
            'user-marie-id',
            'PROFILE_PUBLISHED',
            expect.any(String),
            expect.any(String),
        );
    });

    // ─── Testeur 8 — Olivier (tricheur) : candidat invalide → PENDING_AI ───
    test('Olivier — candidat invalide → PENDING_AI + notif PROFILE_REVIEW', async () => {
        prisma.candidateProfile.findUnique.mockResolvedValue({
            id: 'cp-olivier',
            userId: 'user-olivier-id',
            shortPitch: '',
            vision: '',
            roleType: null,
            user: { title: null, bio: null, skills: [], yearsOfExperience: 0, city: null, country: null },
        });
        aiService.validateCandidateProfile.mockResolvedValue({
            isValid: false,
            qualityScore: 30,
            legitimacyScore: 40,
            reason: 'Profil incomplet',
        });

        await service.moderateCandidate('cp-olivier');

        expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'PENDING_AI' }),
            }),
        );
        expect(mockNotifications.notify).toHaveBeenCalledWith(
            'user-olivier-id',
            'PROFILE_REVIEW',
            expect.any(String),
            expect.any(String),
        );
    });

    // ─── Testeur 9 — Sandrine (methodique) : candidat fantome ───
    test('Sandrine — candidat inexistant → warn log, pas d\'update', async () => {
        prisma.candidateProfile.findUnique.mockResolvedValue(null);

        await service.moderateCandidate('cp-ghost');

        expect(prisma.candidateProfile.update).not.toHaveBeenCalled();
        expect(aiService.validateCandidateProfile).not.toHaveBeenCalled();
    });

    // ─── Testeur 10 — Ibrahim (nettoyeur) : AI crash → fallback PUBLISHED ───
    test('Ibrahim — AI crash → fallback PUBLISHED sur profil candidat', async () => {
        prisma.candidateProfile.findUnique.mockResolvedValue({
            id: 'cp-ibrahim',
            userId: 'user-ibrahim-id',
            shortPitch: 'X',
            vision: '',
            roleType: 'TECH',
            user: { title: 'Dev', bio: 'X', skills: [], yearsOfExperience: 2, city: null, country: null },
        });
        aiService.validateCandidateProfile.mockRejectedValue(new Error('Jina down'));

        await service.moderateCandidate('cp-ibrahim');

        expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'cp-ibrahim' },
                data: { status: 'PUBLISHED' },
            }),
        );
    });
});

// ════════════════════════════════════════════════════════════
//  AdminGuard — testeurs humains
// ════════════════════════════════════════════════════════════

describe('AdminGuard — testeurs humains', () => {
    let guard: AdminGuard;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        prisma = createMockPrisma();
        guard = new AdminGuard(prisma as any);
    });

    // ─── Testeur 1 — Amadou (admin) : passe ───
    test('Amadou — role ADMIN → canActivate true + attache dbId', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID, role: 'ADMIN' });
        const ctx = makeExecContext(AMADOU_UID);

        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);

        // dbId + role attachés sur request.user
        const req = ctx.switchToHttp().getRequest();
        expect(req.user.dbId).toBe(AMADOU_ID);
        expect(req.user.role).toBe('ADMIN');
    });

    // ─── Testeur 2 — Fatou (USER) : bloquée ───
    test('Fatou — role USER → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID, role: 'USER' });

        await expect(guard.canActivate(makeExecContext(FATOU_UID))).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 4 — Moussa (pas de token) : bloqué ───
    test('Moussa — pas de firebaseUid → ForbiddenException', async () => {
        await expect(guard.canActivate(makeExecContext(undefined))).rejects.toThrow(ForbiddenException);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    // ─── Testeur 5 — Aisha (user BD absent) : bloquée ───
    test('Aisha — user absent en BD → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(guard.canActivate(makeExecContext(AISHA_UID))).rejects.toThrow(ForbiddenException);
    });
});
