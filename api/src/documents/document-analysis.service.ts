import {
    Injectable,
    Inject,
    Logger,
    NotFoundException,
    ForbiddenException,
    forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import { DocumentStorageService } from './document-storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchingService } from '../matching/matching.service';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class DocumentAnalysisService {
    private readonly logger = new Logger(DocumentAnalysisService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly storageService: DocumentStorageService,
        private readonly notificationsService: NotificationsService,
        @Inject(forwardRef(() => ProjectsService))
        private readonly projectsService: ProjectsService,
        private readonly matchingService: MatchingService,
        private readonly i18n: I18nService,
    ) {}

    /**
     * Analyse asynchrone complète d'un projet :
     * 1. Lit le document depuis le storage
     * 2. Génère les 6 blocs de synthèse (aiSummary) via generateSummaryBlocks
     * 3. Extrait les champs structurés (sector, stage, etc.) via analyzeFromBuffer
     * 4. Met à jour le projet en base avec status PENDING_AI
     * 5. Notifie le fondateur
     *
     * En cas d'erreur : status → DRAFT, notification DOCUMENT_ANALYSIS_FAILED.
     * Cette méthode ne doit JAMAIS crash silencieusement.
     */
    async analyzeProject(projectId: string): Promise<void> {
        let founderId: string | null = null;

        try {
            // 1. Récupérer le projet
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    founderId: true,
                    documentUrl: true,
                    documentMimeType: true,
                    documentName: true,
                    name: true,
                },
            });

            if (!project) {
                this.logger.error(`Projet non trouvé pour analyse: ${projectId}`);
                return;
            }

            founderId = project.founderId;

            if (!project.documentUrl || !project.documentMimeType) {
                this.logger.error(`Projet ${projectId} sans document attaché`);
                await this.markAsFailed(projectId, founderId, 'Aucun document attaché au projet');
                return;
            }

            // Mettre le statut en ANALYZING
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: 'ANALYZING' },
            });

            // 2. Lire le document depuis le storage
            const { projectId: storageProjectId, filename } = this.parseDocumentUrl(project.documentUrl);
            const buffer = await this.storageService.getBuffer(storageProjectId, filename);

            this.logger.log(`Document lu pour projet ${projectId}: ${project.documentName} (${project.documentMimeType})`);

            // 3. Générer les 6 blocs de synthèse via le prompt dédié
            const summaryBlocks = await this.aiService.generateSummaryBlocks(
                buffer,
                project.documentMimeType,
            );

            this.logger.log(`Blocs synthèse générés pour projet ${projectId}`);

            // 4. Extraire les champs structurés (sector, stage, etc.)
            const structuredFields = await this.aiService.analyzeFromBuffer(
                buffer,
                project.documentMimeType,
            );

            this.logger.log(`Champs structurés extraits pour projet ${projectId}: ${Object.keys(structuredFields).length} champs`);

            // 5. Vérification de légalité du projet
            const legalityCheck = await this.aiService.checkLegality(structuredFields);
            const isProjectLegal = legalityCheck.isLegal && legalityCheck.confidence >= 0.7;
            const projectStatus = isProjectLegal ? 'PUBLISHED' : 'PENDING_AI';

            this.logger.log(
                `Vérification légalité projet ${projectId}: isLegal=${legalityCheck.isLegal}, confidence=${legalityCheck.confidence} → statut: ${projectStatus}`,
            );

            // 6. Mettre à jour le projet en base (avec archivage transactionnel si PUBLISHED)
            await this.prisma.$transaction(async (tx) => {
                if (projectStatus === 'PUBLISHED' && founderId) {
                    await this.projectsService.archivePublishedProjects(tx, founderId);
                }

                await tx.project.update({
                    where: { id: projectId },
                    data: {
                        aiSummary: summaryBlocks,
                        // Champs structurés (uniquement ceux extraits, sans écraser les valeurs existantes)
                        ...(structuredFields.sector && { sector: structuredFields.sector }),
                        ...(structuredFields.stage && { stage: structuredFields.stage }),
                        ...(structuredFields.scope && { scope: structuredFields.scope }),
                        ...(structuredFields.problem && { problem: structuredFields.problem }),
                        ...(structuredFields.target && { target: structuredFields.target }),
                        ...(structuredFields.solution_current && { solutionCurrent: structuredFields.solution_current }),
                        ...(structuredFields.solution_desc && { solutionDesc: structuredFields.solution_desc }),
                        ...(structuredFields.uvp && { uvp: structuredFields.uvp }),
                        ...(structuredFields.anti_scope && { antiScope: structuredFields.anti_scope }),
                        ...(structuredFields.market_type && { marketType: structuredFields.market_type }),
                        ...(structuredFields.business_model && { businessModel: structuredFields.business_model }),
                        ...(structuredFields.competitors && { competitors: structuredFields.competitors }),
                        ...(structuredFields.founder_role && { founderRole: structuredFields.founder_role }),
                        ...(structuredFields.time_availability && { timeAvailability: structuredFields.time_availability }),
                        ...(structuredFields.traction && { traction: structuredFields.traction }),
                        ...(structuredFields.looking_for_role && { lookingForRole: structuredFields.looking_for_role }),
                        ...(structuredFields.collab_type && { collabType: structuredFields.collab_type }),
                        ...(structuredFields.vision && { vision: structuredFields.vision }),
                        ...(structuredFields.description && { description: structuredFields.description }),
                        status: projectStatus,
                    },
                });
            });

            this.logger.log(`Projet ${projectId} analysé avec succès — statut: ${projectStatus}`);

            // 7. Calculer les match scores (fire-and-forget)
            if (isProjectLegal) {
                this.matchingService.calculateForProject(projectId).catch((err) => {
                    this.logger.warn(`Match scores calculation failed for project ${projectId}: ${err.message}`);
                });
            }

            // 8. Notifier le fondateur
            const founderLocale = await this.notificationsService.getUserLocale(founderId);
            if (isProjectLegal) {
                await this.notificationsService.notify(
                    founderId,
                    'DOCUMENT_ANALYZED',
                    this.i18n.t('notification.document_analyzed_title', founderLocale),
                    this.i18n.t('notification.document_analyzed_body', founderLocale, { projectName: project.name }),
                    { projectId },
                );
            } else {
                await this.notificationsService.notify(
                    founderId,
                    'DOCUMENT_ANALYSIS_FAILED',
                    this.i18n.t('notification.document_review_title', founderLocale),
                    this.i18n.t('notification.document_review_body', founderLocale, { projectName: project.name }),
                    { projectId, reason: legalityCheck.reason?.substring(0, 500) },
                );
            }
        } catch (error) {
            this.logger.error(
                `Erreur lors de l'analyse du projet ${projectId}: ${error.message}`,
                error.stack,
            );

            // Fallback : remettre en DRAFT et notifier l'échec
            try {
                if (!founderId) {
                    const project = await this.prisma.project.findUnique({
                        where: { id: projectId },
                        select: { founderId: true },
                    });
                    founderId = project?.founderId ?? null;
                }

                if (founderId) {
                    await this.markAsFailed(projectId, founderId, error.message);
                }
            } catch (innerError) {
                this.logger.error(
                    `Erreur critique lors du fallback pour projet ${projectId}: ${innerError.message}`,
                );
            }
        }
    }

    /**
     * Régénère un seul bloc de la synthèse IA.
     * Vérifie l'ownership via firebaseUid → user → project.founderId.
     */
    async regenerateBlock(
        firebaseUid: string,
        projectId: string,
        blockKey: string,
    ): Promise<Record<string, string>> {
        // 1. Vérifier l'ownership
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                founderId: true,
                documentUrl: true,
                documentMimeType: true,
                aiSummary: true,
            },
        });

        if (!project) {
            throw new NotFoundException('Projet non trouvé');
        }

        if (project.founderId !== user.id) {
            this.logger.warn(`Tentative de régénération non autorisée: user=${user.id} project=${projectId}`);
            throw new ForbiddenException('Ce projet ne vous appartient pas');
        }

        if (!project.documentUrl || !project.documentMimeType) {
            throw new NotFoundException('Aucun document attaché à ce projet');
        }

        if (!project.aiSummary) {
            throw new NotFoundException('Aucune synthèse IA existante pour ce projet');
        }

        // 2. Lire le document original et extraire le texte
        const { projectId: storageProjectId, filename } = this.parseDocumentUrl(project.documentUrl);
        const buffer = await this.storageService.getBuffer(storageProjectId, filename);
        const documentText = await this.extractText(buffer, project.documentMimeType);

        // 3. Régénérer le bloc via AiService
        const currentBlocks = project.aiSummary as Record<string, string>;
        const newBlockText = await this.aiService.regenerateSummaryBlock(
            blockKey,
            documentText,
            currentBlocks,
        );

        // 4. Mettre à jour le bloc dans aiSummary
        const updatedBlocks = { ...currentBlocks, [blockKey]: newBlockText };

        await this.prisma.project.update({
            where: { id: projectId },
            data: { aiSummary: updatedBlocks },
        });

        this.logger.log(`Bloc "${blockKey}" régénéré pour projet ${projectId}`);

        // 5. Retourner le aiSummary mis à jour
        return updatedBlocks;
    }

    // ─── Private helpers ────────────────────────────────

    /**
     * Parse le documentUrl pour en extraire le projectId et le filename.
     * Format dev:  /documents/{projectId}/{filename}
     * Format prod: {MINIO_PUBLIC_URL}/co-founder-documents/documents/{projectId}/{filename}
     */
    private parseDocumentUrl(documentUrl: string): { projectId: string; filename: string } {
        const match = documentUrl.match(/documents\/([^/]+)\/([^/]+)$/);
        if (!match) {
            throw new NotFoundException(`URL de document invalide: ${documentUrl}`);
        }
        return { projectId: match[1], filename: match[2] };
    }

    /**
     * Extrait le texte brut d'un document (PDF ou Word).
     * Utilisé pour le prompt de régénération de bloc.
     */
    private async extractText(buffer: Buffer, mimetype: string): Promise<string> {
        if (
            mimetype === 'application/msword' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        }

        if (mimetype === 'application/pdf') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                // Import from lib/pdf-parse.js directly to avoid pdf-parse/index.js loading a test PDF file
                const pdfParse = require('pdf-parse/lib/pdf-parse.js');
                const parsed = await pdfParse(buffer);
                return parsed.text;
            } catch {
                this.logger.warn('pdf-parse indisponible, extraction texte PDF impossible');
                throw new Error('Impossible d\'extraire le texte du PDF pour la régénération');
            }
        }

        throw new Error(`Format non supporté: ${mimetype}`);
    }

    /**
     * Marque un projet comme échoué et notifie le fondateur.
     */
    private async markAsFailed(
        projectId: string,
        founderId: string,
        errorMessage: string,
    ): Promise<void> {
        await this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'DRAFT' },
        });

        const founderLocale = await this.notificationsService.getUserLocale(founderId);
        await this.notificationsService.notify(
            founderId,
            'DOCUMENT_ANALYSIS_FAILED',
            this.i18n.t('notification.document_analysis_failed_title', founderLocale),
            this.i18n.t('notification.document_analysis_failed_body', founderLocale),
            { projectId, error: errorMessage.substring(0, 500) },
        );

        this.logger.warn(`Projet ${projectId} marqué comme DRAFT après échec d'analyse`);
    }
}
