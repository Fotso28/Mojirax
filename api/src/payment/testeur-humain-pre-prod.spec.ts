/**
 * TESTEURS HUMAINS — Zones critiques pré-prod (39 commits fix/pre-prod-audit)
 *
 * 10 testeurs simulent des scenarios reels sur :
 *   - PlanGuard (403 PLAN_REQUIRED structuré)
 *   - Stripe webhook idempotence (replay safe)
 *   - PrivacyInterceptor (masquage email/phone pour non-premium)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UserPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuard } from './guards/plan.guard';
import { REQUIRED_PLAN_KEY } from './decorators/requires-plan.decorator';
import { PaymentService } from './payment.service';
import { PrivacyInterceptor } from '../common/interceptors/privacy.interceptor';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-pp-001';
const FATOU_UID = 'firebase-fatou-pp-002';
const JEAN_UID = 'firebase-jean-pp-003';
const MOUSSA_UID = 'firebase-moussa-pp-004';
const AISHA_UID = 'firebase-aisha-pp-005';
const PAUL_UID = 'firebase-paul-pp-006';
const MARIE_UID = 'firebase-marie-pp-007';
const OLIVIER_UID = 'firebase-olivier-pp-008';
const SANDRINE_UID = 'firebase-sandrine-pp-009';
const IBRAHIM_UID = 'firebase-ibrahim-pp-010';

const AMADOU_ID = 'user-amadou-pp-001';
const FATOU_ID = 'user-fatou-pp-002';
const PAUL_ID = 'user-paul-pp-006';

// ─── Helpers ─────────────────────────────────────────────
function makeExecContext(firebaseUid: string | undefined, handler: any = () => {}): ExecutionContext {
    const req = { user: firebaseUid ? { uid: firebaseUid } : undefined };
    return {
        switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => ({}),
            getNext: () => ({}),
        }),
        getHandler: () => handler,
        getClass: () => class FakeController {},
        getType: () => 'http',
        getArgs: () => [],
        getArgByIndex: () => null,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;
}

function createMockPrisma() {
    return {
        user: { findUnique: jest.fn(), update: jest.fn() },
        transaction: { upsert: jest.fn(), findUnique: jest.fn() },
        paymentAuditLog: { create: jest.fn() },
        $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
}

// ════════════════════════════════════════════════════════════
//  PlanGuard — 5 testeurs sur la structure d'erreur 403
// ════════════════════════════════════════════════════════════

describe('PlanGuard — testeurs humains pré-prod', () => {
    let guard: PlanGuard;
    let prisma: ReturnType<typeof createMockPrisma>;
    let reflector: Reflector;

    beforeEach(async () => {
        prisma = createMockPrisma();
        reflector = new Reflector();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlanGuard,
                { provide: PrismaService, useValue: prisma },
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();
        guard = module.get(PlanGuard);
    });

    // ─── Testeur 1 — Amadou (admin) : workflow nominal ───
    test('Amadou — user PLUS accède à un endpoint @RequiresPlan(PLUS) → true', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID, plan: UserPlan.PLUS, planExpiresAt: null });

        const result = await guard.canActivate(makeExecContext(AMADOU_UID));
        expect(result).toBe(true);
    });

    // ─── Testeur 2 — Fatou (rapide, saute des étapes) ───
    test('Fatou — user FREE postule à un projet → 403 avec code PLAN_REQUIRED structuré', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID, plan: UserPlan.FREE, planExpiresAt: null });

        try {
            await guard.canActivate(makeExecContext(FATOU_UID));
            fail('Devait throw ForbiddenException');
        } catch (err) {
            expect(err).toBeInstanceOf(ForbiddenException);
            const response = (err as ForbiddenException).getResponse() as any;
            // Le frontend dépend exactement de ces 4 champs pour le modal upsell
            expect(response.code).toBe('PLAN_REQUIRED');
            expect(response.requiredPlan).toBe('PLUS');
            expect(response.currentPlan).toBe('FREE');
            expect(response.message).toContain('PLUS');
        }
    });

    // ─── Testeur 3 — Jean (comptable, vérifie les chiffres) ───
    test('Jean — user ELITE accède à un endpoint @RequiresPlan(PLUS) → autorisé (hiérarchie)', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);
        prisma.user.findUnique.mockResolvedValue({ id: JEAN_UID, plan: UserPlan.ELITE, planExpiresAt: null });

        const result = await guard.canActivate(makeExecContext(JEAN_UID));
        expect(result).toBe(true);
    });

    // ─── Testeur 4 — Moussa (clique sans token Firebase) ───
    test('Moussa — requête sans Firebase uid → 403 "Authentification requise"', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);

        await expect(guard.canActivate(makeExecContext(undefined))).rejects.toThrow('Authentification requise');
    });

    // ─── Testeur 5 — Aisha (sécurité, user inexistant en BD) ───
    test('Aisha — firebase uid valide mais user absent de la BD → 403 "Utilisateur introuvable"', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(guard.canActivate(makeExecContext(AISHA_UID))).rejects.toThrow('Utilisateur introuvable');
    });

    // ─── Testeur 6 — Paul (plan expiré : lazy downgrade) ───
    test('Paul — plan PRO expiré hier → downgraded FREE + 403 si endpoint PLUS', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(UserPlan.PLUS);
        const expired = new Date(Date.now() - 24 * 60 * 60 * 1000);
        prisma.user.findUnique.mockResolvedValue({ id: PAUL_ID, plan: UserPlan.PRO, planExpiresAt: expired });

        try {
            await guard.canActivate(makeExecContext(PAUL_UID));
            fail('Devait être downgraded et refuser');
        } catch (err) {
            expect(err).toBeInstanceOf(ForbiddenException);
            // Le guard doit avoir mis à jour le user à FREE
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { firebaseUid: PAUL_UID },
                data: { plan: UserPlan.FREE, stripeSubscriptionId: null },
            });
            const response = (err as ForbiddenException).getResponse() as any;
            expect(response.currentPlan).toBe('FREE');
        }
    });

    // ─── Testeur 7 — Marie (endpoint sans @RequiresPlan) ───
    test('Marie — endpoint non-protégé (pas de décorateur) → toujours true', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
        const result = await guard.canActivate(makeExecContext(MARIE_UID));
        expect(result).toBe(true);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════
//  Stripe webhook idempotence — 3 testeurs
// ════════════════════════════════════════════════════════════

describe('Stripe webhook — testeurs humains idempotence', () => {
    let service: PaymentService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();

        // Mock Stripe pour éviter toute vraie API call
        const stripeMock = {
            webhooks: { constructEvent: jest.fn() },
            subscriptions: {
                retrieve: jest.fn().mockResolvedValue({
                    items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
                    cancel_at: null,
                }),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                { provide: PrismaService, useValue: prisma },
                {
                    provide: ConfigService,
                    useValue: { getOrThrow: jest.fn().mockReturnValue('whsec_test') },
                },
                // I18nService est injecté dans PaymentService — mock minimal
                { provide: 'I18nService', useValue: { t: (k: string) => k } },
            ],
        })
            .overrideProvider(PaymentService)
            .useFactory({
                factory: (prismaSvc: any, config: any) => {
                    const svc = new PaymentService(prismaSvc, config, {
                        t: (k: string) => k,
                    } as any);
                    (svc as any).stripe = stripeMock;
                    return svc;
                },
                inject: [PrismaService, ConfigService],
            })
            .compile();

        service = module.get(PaymentService);
    });

    // ─── Testeur 6 — Paul (fait des doublons) ───
    test('Paul — Stripe relance checkout.session.completed 2× → 1 seule transaction créée', async () => {
        prisma.user.update.mockResolvedValue({ id: PAUL_ID });
        // Upsert renvoie la même transaction les 2 fois (replay safe)
        prisma.transaction.upsert.mockResolvedValue({ id: 'tx-001', externalId: 'cs_test_replay' });
        prisma.paymentAuditLog.create.mockResolvedValue({});

        const session = {
            id: 'cs_test_replay',
            metadata: { userId: PAUL_ID, planKey: 'PLUS' },
            subscription: 'sub_001',
            customer: 'cus_001',
            amount_total: 499,
            currency: 'eur',
        };

        await (service as any).handleCheckoutCompleted(session);
        await (service as any).handleCheckoutCompleted(session); // Replay

        // Deux appels à $transaction, mais upsert idempotent = pas de P2002
        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
        // Chaque fois l'upsert reçoit le même externalId
        const upsertCalls = prisma.transaction.upsert.mock.calls;
        expect(upsertCalls.length).toBe(2);
        expect(upsertCalls[0][0].where.externalId).toBe('cs_test_replay');
        expect(upsertCalls[1][0].where.externalId).toBe('cs_test_replay');
        // Update est un no-op (pas d'écrasement de données)
        expect(upsertCalls[0][0].update).toEqual({});
    });

    // ─── Testeur 7 — Marie (valeurs extrêmes : montant 0) ───
    test('Marie — checkout avec amount_total null → upsert avec amount=0', async () => {
        prisma.user.update.mockResolvedValue({ id: MARIE_UID });
        prisma.transaction.upsert.mockResolvedValue({ id: 'tx-002', externalId: 'cs_zero' });
        prisma.paymentAuditLog.create.mockResolvedValue({});

        const session = {
            id: 'cs_zero',
            metadata: { userId: MARIE_UID, planKey: 'PLUS' },
            subscription: 'sub_002',
            customer: 'cus_002',
            amount_total: null,
            currency: null,
        };

        await (service as any).handleCheckoutCompleted(session);

        const createCall = prisma.transaction.upsert.mock.calls[0][0].create;
        expect(createCall.amount).toBe(0);
        expect(createCall.currency).toBe('EUR'); // Fallback uppercase
    });

    // ─── Testeur 9 — Sandrine (audit trail après chaque webhook) ───
    test('Sandrine — après handleCheckoutCompleted, un PaymentAuditLog est créé', async () => {
        prisma.user.update.mockResolvedValue({ id: SANDRINE_UID });
        prisma.transaction.upsert.mockResolvedValue({ id: 'tx-003', externalId: 'cs_audit' });
        prisma.paymentAuditLog.create.mockResolvedValue({ id: 'log-001' });

        const session = {
            id: 'cs_audit',
            metadata: { userId: SANDRINE_UID, planKey: 'PRO' },
            subscription: 'sub_003',
            customer: 'cus_003',
            amount_total: 999,
            currency: 'eur',
        };

        await (service as any).handleCheckoutCompleted(session);

        expect(prisma.paymentAuditLog.create).toHaveBeenCalledTimes(1);
        const auditArgs = prisma.paymentAuditLog.create.mock.calls[0][0];
        expect(auditArgs.data.transactionId).toBe('tx-003');
        expect(auditArgs.data.event).toBe('checkout.session.completed');
        expect(auditArgs.data.payload).toBeDefined();
    });
});

// ════════════════════════════════════════════════════════════
//  PrivacyInterceptor — 2 testeurs sur le masquage
// ════════════════════════════════════════════════════════════

describe('PrivacyInterceptor — testeurs humains masquage', () => {
    let interceptor: PrivacyInterceptor;
    let prisma: ReturnType<typeof createMockPrisma>;
    let redis: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

    beforeEach(() => {
        prisma = createMockPrisma();
        redis = {
            get: jest.fn().mockResolvedValue(null),
            setex: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };
        interceptor = new PrivacyInterceptor(prisma as any, redis as any);
    });

    // ─── Testeur 8 — Olivier (essaie de tricher) ───
    test('Olivier — user FREE voit un profil candidat → email et phone masqués', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: OLIVIER_UID,
            plan: UserPlan.FREE,
            planExpiresAt: null,
        });

        const data = {
            id: 'target-user-001',
            role: 'FOUNDER',
            email: 'secret@example.com',
            phone: '+237699000042',
            linkedinUrl: 'https://linkedin.com/in/secret',
            websiteUrl: 'https://secret.dev',
            firstName: 'Target',
        };

        const result = await (interceptor as any).applyPrivacy(data, OLIVIER_UID);

        expect(result.email).toBeNull();
        expect(result.phone).toBeNull();
        expect(result.linkedinUrl).toBeNull();
        expect(result.websiteUrl).toBeNull();
        // _isLocked signale au frontend d'afficher "Information masquée"
        expect(result._isLocked).toBe(true);
        // Mais les champs non-sensibles restent
        expect(result.firstName).toBe('Target');
    });

    // ─── Testeur 10 — Ibrahim (premium, vérifie qu'il VOIT tout) ───
    test('Ibrahim — user PRO voit un profil candidat → email et phone présents, _isLocked=false', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: IBRAHIM_UID,
            plan: UserPlan.PRO,
            planExpiresAt: null,
        });

        const data = {
            id: 'target-user-002',
            role: 'FOUNDER',
            email: 'ibrahim-can-see@example.com',
            phone: '+237699000043',
            linkedinUrl: 'https://linkedin.com/in/visible',
            firstName: 'Visible',
        };

        const result = await (interceptor as any).applyPrivacy(data, IBRAHIM_UID);

        expect(result.email).toBe('ibrahim-can-see@example.com');
        expect(result.phone).toBe('+237699000043');
        expect(result.linkedinUrl).toBe('https://linkedin.com/in/visible');
        expect(result._isLocked).toBe(false);
    });

    // ─── Testeur 5 — Aisha (sécurité, plan expiré doit masquer) ───
    test('Aisha — user PLUS expiré hier → traité comme FREE, email masqué', async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        prisma.user.findUnique.mockResolvedValue({
            id: AISHA_UID,
            plan: UserPlan.PLUS,
            planExpiresAt: yesterday,
        });

        const data = {
            id: 'target-user-003',
            role: 'FOUNDER',
            email: 'expired-view@example.com',
            phone: '+237699000044',
            firstName: 'Target',
        };

        const result = await (interceptor as any).applyPrivacy(data, AISHA_UID);

        expect(result.email).toBeNull();
        expect(result.phone).toBeNull();
        expect(result._isLocked).toBe(true);
    });
});
