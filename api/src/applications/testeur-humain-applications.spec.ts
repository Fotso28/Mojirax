/**
 * TESTEURS HUMAINS — Module Applications (Candidatures)
 *
 * 10 testeurs simulent des scenarios reels sur ApplicationsService :
 *   - apply (creation candidature)
 *   - findMine, findByProject (lecture)
 *   - updateStatus (accept/reject)
 *   - hasApplied (verif existence)
 *
 * Pattern reproduit de src/users/testeur-humain-profil.spec.ts et
 * src/payment/testeur-humain-pre-prod.spec.ts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CandidateModerationService } from '../users/candidate-moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { I18nService } from '../i18n/i18n.service';

// ─── Donnees de base des testeurs ───────────────────────
const AMADOU_UID = 'firebase-amadou-app-001';
const FATOU_UID = 'firebase-fatou-app-002';
const JEAN_UID = 'firebase-jean-app-003';
const MOUSSA_UID = 'firebase-moussa-app-004';
const AISHA_UID = 'firebase-aisha-app-005';
const PAUL_UID = 'firebase-paul-app-006';
const MARIE_UID = 'firebase-marie-app-007';
const OLIVIER_UID = 'firebase-olivier-app-008';
const SANDRINE_UID = 'firebase-sandrine-app-009';
const IBRAHIM_UID = 'firebase-ibrahim-app-010';

const AMADOU_ID = 'user-amadou-app-001';
const FATOU_ID = 'user-fatou-app-002';
const JEAN_ID = 'user-jean-app-003';
const AISHA_ID = 'user-aisha-app-005';
const PAUL_ID = 'user-paul-app-006';
const MARIE_ID = 'user-marie-app-007';
const OLIVIER_ID = 'user-olivier-app-008';
const SANDRINE_ID = 'user-sandrine-app-009';
const IBRAHIM_ID = 'user-ibrahim-app-010';

const PROJECT_ID = 'project-test-001';
const APPLICATION_ID = 'application-test-001';

// ─── Helpers ─────────────────────────────────────────────
function createMockPrisma() {
    return {
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        candidateProfile: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
        application: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            count: jest.fn(),
        },
        project: {
            findUnique: jest.fn(),
        },
        userProjectInteraction: {
            create: jest.fn(),
        },
        conversation: {
            create: jest.fn(),
        },
        // $transaction accepts either an array of ops or an async callback
        $transaction: jest.fn((opsOrCb: any) => {
            if (typeof opsOrCb === 'function') {
                // Pass the prisma mock itself as the "tx" client
                return opsOrCb(mockTxClientRef.current);
            }
            return Promise.all(opsOrCb);
        }),
    };
}

// Reference used by $transaction to inject the same mock as tx
const mockTxClientRef: { current: any } = { current: null };

function makeCompleteUser(overrides: Record<string, any> = {}) {
    return {
        id: FATOU_ID,
        firstName: 'Fatou',
        lastName: 'Sow',
        name: 'Fatou Sow',
        title: 'Développeuse Full Stack',
        bio: 'Passionnée par la tech camerounaise',
        skills: ['React', 'Node.js'],
        candidateProfile: { id: 'cp-fatou-001' },
        ...overrides,
    };
}

function makeProject(overrides: Record<string, any> = {}) {
    return {
        id: PROJECT_ID,
        name: 'MojiraX Startup',
        slug: 'mojirax-startup-abcd',
        status: 'PUBLISHED',
        founderId: AMADOU_ID,
        ...overrides,
    };
}

function makeTestingModule(prisma: any) {
    mockTxClientRef.current = prisma;
    return Test.createTestingModule({
        providers: [
            ApplicationsService,
            { provide: PrismaService, useValue: prisma },
            {
                provide: CandidateModerationService,
                useValue: {
                    moderateProfile: jest.fn().mockResolvedValue(undefined),
                },
            },
            {
                provide: NotificationsService,
                useValue: {
                    getUserLocale: jest.fn().mockResolvedValue('fr'),
                    notify: jest.fn().mockResolvedValue(undefined),
                },
            },
            {
                provide: I18nService,
                useValue: {
                    t: jest.fn((k: string) => k),
                },
            },
        ],
    }).compile();
}

// ════════════════════════════════════════════════════════════
//  apply() — 8 testeurs sur la creation de candidature
// ════════════════════════════════════════════════════════════

describe('ApplicationsService.apply — testeurs humains', () => {
    let service: ApplicationsService;
    let prisma: ReturnType<typeof createMockPrisma>;
    let notifications: { getUserLocale: jest.Mock; notify: jest.Mock };

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ApplicationsService);
        notifications = module.get(NotificationsService) as any;
    });

    // ─── Testeur 1 — Amadou (admin) : workflow nominal ───
    test('Amadou — candidature valide → application créée + interaction tracée', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: FATOU_ID }));
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'other-founder' }));
        prisma.application.create.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
            createdAt: new Date(),
        });
        prisma.userProjectInteraction.create.mockResolvedValue({});

        const result = await service.apply(AMADOU_UID, {
            projectId: PROJECT_ID,
            message: 'Je suis très intéressé par ce projet.',
        });

        expect(result.id).toBe(APPLICATION_ID);
        expect(result.status).toBe('PENDING');
        expect(prisma.application.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    candidateId: 'cp-fatou-001',
                    projectId: PROJECT_ID,
                    status: 'PENDING',
                    message: 'Je suis très intéressé par ce projet.',
                }),
            }),
        );
        expect(prisma.userProjectInteraction.create).toHaveBeenCalled();
    });

    // ─── Testeur 2 — Fatou (rapide) : message vide (optionnel) ───
    test('Fatou — candidature sans message → OK (champ optionnel)', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser());
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'other-founder' }));
        prisma.application.create.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
            createdAt: new Date(),
        });

        const result = await service.apply(FATOU_UID, { projectId: PROJECT_ID });

        expect(result.status).toBe('PENDING');
    });

    // ─── Testeur 3 — Moussa (barman peu tech) : pas authentifié en BD ───
    test('Moussa — user Firebase uid inconnu → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
            service.apply(MOUSSA_UID, { projectId: PROJECT_ID, message: 'test' }),
        ).rejects.toThrow(NotFoundException);
    });

    // ─── Testeur 4 — Aisha (sécurité paranoïaque) : profil incomplet ───
    test('Aisha — profil incomplet (pas de bio ni skills) → BadRequestException INCOMPLETE_PROFILE', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: AISHA_ID,
            firstName: 'Aisha',
            lastName: 'Ndiaye',
            name: 'Aisha Ndiaye',
            title: null,
            bio: null,
            skills: [],
            candidateProfile: { id: 'cp-aisha' },
        });

        try {
            await service.apply(AISHA_UID, { projectId: PROJECT_ID, message: 'test' });
            fail('Devait throw BadRequestException');
        } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as any;
            expect(resp.code).toBe('INCOMPLETE_PROFILE');
            expect(resp.missingFields).toContain('Bio');
            expect(resp.missingFields).toContain('Compétences');
        }
    });

    // ─── Testeur 5 — Paul (doublons) : postule 2x au même projet ───
    test('Paul — postule 2x au même projet → ConflictException (P2002)', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: PAUL_ID }));
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'other-founder' }));
        // Simuler l'erreur Prisma P2002 (unique constraint)
        const p2002: any = new Error('Unique constraint violation');
        p2002.code = 'P2002';
        prisma.application.create.mockRejectedValue(p2002);

        await expect(
            service.apply(PAUL_UID, { projectId: PROJECT_ID, message: 'Encore !' }),
        ).rejects.toThrow(ConflictException);
    });

    // ─── Testeur 6 — Marie (valeurs extrêmes) : message 1001 chars ───
    // NOTE: la validation du MaxLength(1000) est faite au niveau DTO (class-validator)
    // par le ValidationPipe global, pas au niveau du service. On teste donc
    // que le service accepte bien les messages qui ont passé la validation.
    test('Marie — message long (1000 chars) accepté par le service', async () => {
        const longMsg = 'x'.repeat(1000);
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: MARIE_ID }));
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'other-founder' }));
        prisma.application.create.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
            createdAt: new Date(),
        });

        const result = await service.apply(MARIE_UID, {
            projectId: PROJECT_ID,
            message: longMsg,
        });

        expect(result.status).toBe('PENDING');
        expect(prisma.application.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ message: longMsg }),
            }),
        );
    });

    // ─── Testeur 7 — Olivier (triche) : postule à SON propre projet ───
    test('Olivier — fondateur postule à son propre projet → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: OLIVIER_ID }));
        // Le projet appartient à Olivier
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: OLIVIER_ID }));

        await expect(
            service.apply(OLIVIER_UID, { projectId: PROJECT_ID, message: 'Moi-même' }),
        ).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 8 — Sandrine (audit trail) : notification créée après postulation ───
    test('Sandrine — après postulation, notification envoyée au fondateur', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: SANDRINE_ID }));
        prisma.project.findUnique.mockResolvedValue(
            makeProject({ founderId: 'founder-remote', name: 'Projet X' }),
        );
        prisma.application.create.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
            createdAt: new Date(),
        });

        await service.apply(SANDRINE_UID, {
            projectId: PROJECT_ID,
            message: 'Audit trail',
        });

        // getUserLocale se fait en then() => promise chain
        // On attend une tick de l'event loop
        await new Promise((r) => setImmediate(r));

        expect(notifications.getUserLocale).toHaveBeenCalledWith('founder-remote');
        expect(notifications.notify).toHaveBeenCalledWith(
            'founder-remote',
            'APPLICATION_RECEIVED',
            expect.any(String),
            expect.any(String),
            expect.objectContaining({ applicationId: APPLICATION_ID, projectId: PROJECT_ID }),
        );
    });

    // ─── Testeur 9 — Jean (comptable) : projet DRAFT (pas publié) ───
    test('Jean — projet en DRAFT (non publié) → NotFoundException (project_unavailable)', async () => {
        prisma.user.findUnique.mockResolvedValue(makeCompleteUser({ id: JEAN_ID }));
        prisma.project.findUnique.mockResolvedValue(
            makeProject({ status: 'DRAFT', founderId: 'autre' }),
        );

        await expect(
            service.apply(JEAN_UID, { projectId: PROJECT_ID, message: 'test' }),
        ).rejects.toThrow(NotFoundException);
    });

    // ─── Testeur 10 — Ibrahim (nettoie tout) : user sans candidateProfile → auto-create ───
    test('Ibrahim — sans candidateProfile → auto-création avant postulation', async () => {
        prisma.user.findUnique.mockResolvedValue(
            makeCompleteUser({ id: IBRAHIM_ID, candidateProfile: null }),
        );
        prisma.candidateProfile.create.mockResolvedValue({
            id: 'cp-new-ibrahim',
            status: 'ANALYZING',
        });
        prisma.project.findUnique.mockResolvedValue(makeProject({ founderId: 'other' }));
        prisma.application.create.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
            createdAt: new Date(),
        });

        await service.apply(IBRAHIM_UID, { projectId: PROJECT_ID, message: 'Hello' });

        expect(prisma.candidateProfile.create).toHaveBeenCalledWith({
            data: { userId: IBRAHIM_ID, status: 'ANALYZING' },
            select: { id: true },
        });
    });
});

// ════════════════════════════════════════════════════════════
//  findByProject() — pagination & ownership
// ════════════════════════════════════════════════════════════

describe('ApplicationsService.findByProject — testeurs humains', () => {
    let service: ApplicationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ApplicationsService);
    });

    // ─── Testeur 4 — Aisha : accès à un projet d'une autre personne ───
    test('Aisha — accède aux candidatures d\'un projet qu\'elle ne possède pas → ForbiddenException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });
        prisma.project.findUnique.mockResolvedValue({
            id: PROJECT_ID,
            founderId: 'someone-else',
        });

        await expect(
            service.findByProject(AISHA_UID, PROJECT_ID),
        ).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 7 — Marie : pagination par défaut max 20 ───
    test('Marie — demande limit=1000 → clippé à 20', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: MARIE_ID });
        prisma.project.findUnique.mockResolvedValue({
            id: PROJECT_ID,
            founderId: MARIE_ID,
        });
        prisma.application.findMany.mockResolvedValue([]);

        await service.findByProject(MARIE_UID, PROJECT_ID, 1000, 0);

        expect(prisma.application.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 20, skip: 0 }),
        );
    });

    // ─── Testeur 1 — Amadou : liste vide si aucune candidature ───
    test('Amadou — owner du projet, aucune candidature → retourne []', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        prisma.project.findUnique.mockResolvedValue({
            id: PROJECT_ID,
            founderId: AMADOU_ID,
        });
        prisma.application.findMany.mockResolvedValue([]);

        const result = await service.findByProject(AMADOU_UID, PROJECT_ID);
        expect(result).toEqual([]);
    });

    // ─── Testeur 3 — Moussa : projet inexistant ───
    test('Moussa — projet inexistant → NotFoundException', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 'user-moussa' });
        prisma.project.findUnique.mockResolvedValue(null);

        await expect(
            service.findByProject(MOUSSA_UID, 'fake-project'),
        ).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  updateStatus() — accept/reject
// ════════════════════════════════════════════════════════════

describe('ApplicationsService.updateStatus — testeurs humains', () => {
    let service: ApplicationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ApplicationsService);
    });

    function makeAppForStatus(overrides: Record<string, any> = {}) {
        return {
            id: APPLICATION_ID,
            status: 'PENDING',
            project: {
                id: PROJECT_ID,
                name: 'MojiraX',
                slug: 'mojirax-xyz',
                founderId: AMADOU_ID,
            },
            candidate: {
                id: 'cp-fatou-001',
                user: { id: FATOU_ID },
            },
            ...overrides,
        };
    }

    // ─── Testeur 1 — Amadou : accepte une candidature ───
    test('Amadou — founder accepte une candidature PENDING → conversation créée', async () => {
        prisma.application.findUnique.mockResolvedValue(makeAppForStatus());
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        prisma.application.updateMany.mockResolvedValue({ count: 1 });
        prisma.conversation.create.mockResolvedValue({ id: 'conv-001' });

        const result = await service.updateStatus(AMADOU_UID, APPLICATION_ID, 'ACCEPTED');

        expect(result.status).toBe('ACCEPTED');
        expect(prisma.conversation.create).toHaveBeenCalledWith({
            data: {
                applicationId: APPLICATION_ID,
                founderId: AMADOU_ID,
                candidateId: FATOU_ID,
            },
        });
    });

    // ─── Testeur 2 — Fatou : refuse une candidature ───
    test('Fatou — founder refuse une candidature PENDING → pas de conversation', async () => {
        prisma.application.findUnique.mockResolvedValue(
            makeAppForStatus({ project: { id: PROJECT_ID, name: 'P', slug: 's', founderId: FATOU_ID } }),
        );
        prisma.user.findUnique.mockResolvedValue({ id: FATOU_ID });
        prisma.application.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.updateStatus(FATOU_UID, APPLICATION_ID, 'REJECTED');

        expect(result.status).toBe('REJECTED');
        expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    // ─── Testeur 4 — Aisha : tente de modifier une candidature d'un autre projet ───
    test('Aisha — non-owner tente d\'accepter une candidature → ForbiddenException', async () => {
        prisma.application.findUnique.mockResolvedValue(
            makeAppForStatus({ project: { id: PROJECT_ID, name: 'P', slug: 's', founderId: 'someone' } }),
        );
        prisma.user.findUnique.mockResolvedValue({ id: AISHA_ID });

        await expect(
            service.updateStatus(AISHA_UID, APPLICATION_ID, 'ACCEPTED'),
        ).rejects.toThrow(ForbiddenException);
    });

    // ─── Testeur 5 — Paul : double-clic → candidature déjà traitée ───
    test('Paul — accepter 2x → BadRequestException (already processed)', async () => {
        prisma.application.findUnique.mockResolvedValue(
            makeAppForStatus({ status: 'ACCEPTED' }),
        );
        prisma.user.findUnique.mockResolvedValue({ id: AMADOU_ID });
        // Le updateMany filtre `status: 'PENDING'` donc count=0 car déjà ACCEPTED
        prisma.application.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.updateStatus(AMADOU_UID, APPLICATION_ID, 'ACCEPTED'),
        ).rejects.toThrow(BadRequestException);
    });

    // ─── Testeur 3 — Moussa : application inexistante ───
    test('Moussa — applicationId invalide → NotFoundException', async () => {
        prisma.application.findUnique.mockResolvedValue(null);

        await expect(
            service.updateStatus(MOUSSA_UID, 'fake-id', 'ACCEPTED'),
        ).rejects.toThrow(NotFoundException);
    });
});

// ════════════════════════════════════════════════════════════
//  hasApplied() — verification existence candidature
// ════════════════════════════════════════════════════════════

describe('ApplicationsService.hasApplied — testeurs humains', () => {
    let service: ApplicationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ApplicationsService);
    });

    // ─── Testeur 10 — Ibrahim : user sans candidateProfile ───
    test('Ibrahim — sans candidateProfile → hasApplied=false', async () => {
        prisma.user.findUnique.mockResolvedValue({ candidateProfile: null });

        const result = await service.hasApplied(IBRAHIM_UID, PROJECT_ID);
        expect(result).toEqual({ hasApplied: false });
    });

    // ─── Testeur 1 — Amadou : déjà postulé ───
    test('Amadou — a déjà postulé → hasApplied=true + status', async () => {
        prisma.user.findUnique.mockResolvedValue({ candidateProfile: { id: 'cp-1' } });
        prisma.application.findUnique.mockResolvedValue({
            id: APPLICATION_ID,
            status: 'PENDING',
        });

        const result = await service.hasApplied(AMADOU_UID, PROJECT_ID);
        expect(result).toEqual({ hasApplied: true, status: 'PENDING' });
    });

    // ─── Testeur 2 — Fatou : profile existe mais pas candidature ───
    test('Fatou — candidateProfile OK mais jamais postulé → hasApplied=false', async () => {
        prisma.user.findUnique.mockResolvedValue({ candidateProfile: { id: 'cp-2' } });
        prisma.application.findUnique.mockResolvedValue(null);

        const result = await service.hasApplied(FATOU_UID, PROJECT_ID);
        expect(result).toEqual({ hasApplied: false });
    });
});

// ════════════════════════════════════════════════════════════
//  findMine() — pagination & edge cases
// ════════════════════════════════════════════════════════════

describe('ApplicationsService.findMine — testeurs humains', () => {
    let service: ApplicationsService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();
        const module: TestingModule = await makeTestingModule(prisma);
        service = module.get(ApplicationsService);
    });

    // ─── Testeur 10 — Ibrahim : pas de candidateProfile ───
    test('Ibrahim — sans candidateProfile → retourne []', async () => {
        prisma.user.findUnique.mockResolvedValue({ candidateProfile: null });

        const result = await service.findMine(IBRAHIM_UID);
        expect(result).toEqual([]);
        expect(prisma.application.findMany).not.toHaveBeenCalled();
    });

    // ─── Testeur 7 — Marie : pagination limite max 20 ───
    test('Marie — demande 500 items → clippé à 20', async () => {
        prisma.user.findUnique.mockResolvedValue({ candidateProfile: { id: 'cp-marie' } });
        prisma.application.findMany.mockResolvedValue([]);

        await service.findMine(MARIE_UID, 500, 0);

        expect(prisma.application.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 20, skip: 0 }),
        );
    });
});
