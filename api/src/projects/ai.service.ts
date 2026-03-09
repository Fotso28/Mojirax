import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ─── Types ──────────────────────────────────────────────

type AiProvider = 'claude' | 'gpt' | 'deepseek';

interface AiProviderConfig {
    name: AiProvider;
    available: boolean;
}

export interface ValidationFeedback {
    score: number;             // 0-100
    summary: string;           // Résumé global
    suggestions: FieldFeedback[];
    strengths: string[];       // Points forts
}

export interface FieldFeedback {
    field: string;
    status: 'good' | 'warning' | 'error';
    message: string;
}

export interface LegalityCheckResult {
    isLegal: boolean;
    confidence: number;
    reason?: string;
}

// ─── Prompts ────────────────────────────────────────────

const EXTRACTION_PROMPT = `Tu es un expert en analyse de dossiers de projets entrepreneuriaux en Afrique.

À partir du document de projet fourni, extrais les informations structurées au format JSON.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après.

Les champs à extraire (laisse null si l'information n'est pas disponible) :

{
  "sector": "FINTECH | AGRITECH | HEALTH | EDTECH | LOGISTICS | ECOMMERCE | OTHER",
  "stage": "IDEA | PROTOTYPE | MVP_BUILD | MVP_LIVE | TRACTION | SCALE",
  "scope": "LOCAL | DIASPORA | HYBRID",
  "problem": "Description du problème résolu (max 600 caractères)",
  "target": "Public cible / persona (max 200 caractères)",
  "solution_current": "Solutions existantes utilisées par la cible (max 400 caractères)",
  "solution_desc": "Description de la solution proposée (max 600 caractères)",
  "uvp": "Proposition de valeur unique (max 200 caractères)",
  "anti_scope": "Ce que le projet NE fait PAS (max 300 caractères)",
  "market_type": "B2C | B2B | B2G | MARKETPLACE",
  "business_model": "SUBSCRIPTION | COMMISSION | SALES | FREEMIUM | ADS",
  "competitors": "Description des concurrents (max 400 caractères)",
  "founder_role": "CEO | CTO | CPO | CMO | COO",
  "time_availability": "2-5H | 5-10H | 10-20H | FULLTIME",
  "traction": "Preuve de traction (max 400 caractères)",
  "looking_for_role": "TECH | BIZ | PRODUCT | FINANCE",
  "collab_type": "EQUITY | PAID | HYBRID",
  "vision": "Vision à 3 ans (max 400 caractères)",
  "description": "Résumé global du projet (max 800 caractères)"
}

Pour les champs enum, utilise EXACTEMENT une des valeurs listées ou null.
Pour les champs texte, résume en français de manière claire et concise.`;

const SUMMARY_PROMPT = `Tu es un expert en communication et en pitch de startups africaines.

À partir du document de projet fourni, génère 6 blocs de synthèse engageants qui donnent envie de lire le dossier complet.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après.

Le texte doit être clair, percutant, en français, rédigé pour capter l'attention d'un potentiel co-fondateur ou investisseur.

{
  "problem": "Description du problème en 2-3 phrases percutantes (max 300 chars)",
  "solution": "La solution + proposition de valeur unique (max 400 chars)",
  "market": "Marché cible, taille, modèle économique (max 300 chars)",
  "traction": "Stade actuel, métriques, partenariats (max 300 chars)",
  "team": "Fondateur, parcours, expertise (max 300 chars)",
  "cofounder": "Profil recherché, compétences, type de collab (max 300 chars)"
}

Règles :
- Chaque bloc doit être autonome et compréhensible seul
- Utilise des chiffres et données concrètes quand disponibles
- Pas de jargon inutile — sois direct et impactant
- Si une information n'est pas dans le document, déduis-la intelligemment ou indique "Non précisé dans le dossier"
- Ne dépasse JAMAIS la limite de caractères de chaque bloc`;

function buildRegenerationPrompt(
    blockKey: string,
    documentText: string,
    currentBlocks: Record<string, string>,
): string {
    const blockLimits: Record<string, number> = {
        problem: 300,
        solution: 400,
        market: 300,
        traction: 300,
        team: 300,
        cofounder: 300,
    };

    return `Tu es un expert en communication et en pitch de startups africaines.

Régénère UNIQUEMENT le bloc "${blockKey}" à partir du document ci-dessous.

IMPORTANT : Réponds UNIQUEMENT avec le texte du bloc, sans JSON, sans guillemets, sans markdown, sans backticks.

Contexte — voici les autres blocs existants pour cohérence :
${JSON.stringify(currentBlocks, null, 2)}

Règles :
- Maximum ${blockLimits[blockKey] || 300} caractères
- Le texte doit être engageant, clair, en français
- Propose une reformulation DIFFÉRENTE de la version actuelle
- Reste cohérent avec les autres blocs

DOCUMENT :
---
${documentText.substring(0, 50000)}
---`;
}

function buildLegalityPrompt(projectData: Record<string, any>): string {
    return `Tu es un expert en conformité légale et éthique des projets entrepreneuriaux.

Analyse les données de ce projet et détermine s'il est légal et éthique.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après.

Données du projet :
${JSON.stringify(projectData, null, 2)}

Vérifie si le projet implique :
- Des activités illégales (trafic, contrebande, etc.)
- De la fraude ou des arnaques
- Des drogues illicites ou substances contrôlées
- Des armes ou munitions
- De l'exploitation humaine ou du travail forcé
- De la discrimination
- Du blanchiment d'argent
- Du contenu pour adultes non régulé
- Des schémas de Ponzi ou pyramidaux
- Toute autre activité contraire à la loi ou à l'éthique

Réponds avec ce JSON exact :
{
  "isLegal": true ou false,
  "confidence": 0.0 à 1.0,
  "reason": "explication si le projet n'est pas légal ou si la confiance est faible"
}

Règles :
- Si le projet semble légitime et éthique, isLegal = true avec une confidence élevée (>= 0.8)
- Si le projet est clairement illégal, isLegal = false avec une confidence élevée
- Si tu as des doutes, mets une confidence faible (< 0.7) pour déclencher une vérification manuelle
- Sois vigilant mais pas excessivement restrictif — la plupart des projets entrepreneuriaux sont légitimes`;
}

function buildValidationPrompt(projectData: Record<string, any>): string {
    return `Tu es un mentor expert en entrepreneuriat africain et en startup studio.

Analyse ce projet soumis par un entrepreneur et fournis un feedback structuré.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks.

Données du projet :
${JSON.stringify(projectData, null, 2)}

Réponds avec ce JSON exact :
{
  "score": <nombre entre 0 et 100 — qualité globale du dossier>,
  "summary": "<2-3 phrases résumant la qualité globale du dossier>",
  "strengths": ["<point fort 1>", "<point fort 2>", ...],
  "suggestions": [
    {
      "field": "<nom du champ — ex: problem, uvp, target>",
      "status": "good | warning | error",
      "message": "<feedback concis et actionnable en français>"
    }
  ]
}

Règles :
- "good" : le champ est bien rempli et pertinent
- "warning" : le champ est acceptable mais pourrait être amélioré
- "error" : le champ est vide, trop vague ou incohérent
- Ne mets en "suggestions" QUE les champs avec warning ou error
- Le score reflète : complétude (30%), clarté (25%), cohérence (25%), potentiel marché (20%)
- Sois constructif et bienveillant, adapté au contexte africain
- Maximum 8 suggestions`;
}

// ─── Service ────────────────────────────────────────────

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private anthropic: Anthropic | null = null;
    private openai: OpenAI | null = null;
    private embeddingClient: OpenAI | null = null;
    private deepseek: OpenAI | null = null;
    private providers: AiProviderConfig[] = [];

    constructor(private config: ConfigService) {
        // Initialiser les providers disponibles
        const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
        if (anthropicKey) {
            this.anthropic = new Anthropic({ apiKey: anthropicKey });
            this.providers.push({ name: 'claude', available: true });
            this.logger.log('AI Provider: Claude (Anthropic) ✓');
        }

        const openaiKey = this.config.get<string>('OPENAI_API_KEY');
        if (openaiKey) {
            this.openai = new OpenAI({ apiKey: openaiKey });
            this.embeddingClient = new OpenAI({ apiKey: openaiKey });
            this.providers.push({ name: 'gpt', available: true });
            this.logger.log('AI Provider: GPT (OpenAI) ✓');
            this.logger.log('AI Provider: Embeddings (OpenAI) ✓');
        }

        const deepseekKey = this.config.get<string>('DEEPSEEK_API_KEY');
        if (deepseekKey) {
            this.deepseek = new OpenAI({
                apiKey: deepseekKey,
                baseURL: 'https://api.deepseek.com',
            });
            this.providers.push({ name: 'deepseek', available: true });
            this.logger.log('AI Provider: DeepSeek ✓');
        }

        if (this.providers.length === 0) {
            this.logger.warn('Aucun provider IA configuré ! Ajoutez ANTHROPIC_API_KEY, OPENAI_API_KEY ou DEEPSEEK_API_KEY');
        } else {
            this.logger.log(`${this.providers.length} provider(s) IA actif(s) — fallback automatique activé`);
        }
    }

    // ─── Document Extraction ────────────────────────────

    async analyzeFromBuffer(buffer: Buffer, mimetype: string): Promise<Record<string, any>> {
        if (this.providers.length === 0) {
            throw new BadRequestException('Aucun service IA configuré. Contactez l\'administrateur.');
        }

        // Pour les DOCX, extraire le texte d'abord
        let documentText: string | null = null;
        if (
            mimetype === 'application/msword' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            documentText = result.value;
            if (!documentText || documentText.trim().length < 50) {
                throw new BadRequestException('Le document Word semble vide ou trop court.');
            }
        } else if (mimetype !== 'application/pdf') {
            throw new BadRequestException('Format non supporté. Utilisez PDF ou Word.');
        }

        // Pour les PDF, extraire le texte pour les providers non-Claude
        if (mimetype === 'application/pdf' && !documentText) {
            // Import from lib/pdf-parse.js directly to avoid pdf-parse/index.js loading a test PDF file
            const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
            const pdfResult = await pdfParse(buffer);
            documentText = pdfResult.text;
            if (!documentText || documentText.trim().length < 50) {
                throw new BadRequestException('Le document PDF semble vide ou trop court.');
            }
        }

        // Essayer chaque provider avec fallback
        for (const provider of this.providers) {
            try {
                this.logger.log(`Extraction via ${provider.name}...`);
                const result = await this.extractWithProvider(provider.name, buffer, mimetype, documentText);
                this.logger.log(`Extraction réussie via ${provider.name} — ${Object.keys(result).length} champs`);
                return result;
            } catch (error) {
                this.logger.warn(`${provider.name} a échoué: ${error.message}`);
                continue;
            }
        }

        throw new BadRequestException('Tous les services IA ont échoué. Veuillez réessayer plus tard.');
    }

    private async extractWithProvider(
        provider: AiProvider,
        buffer: Buffer,
        mimetype: string,
        documentText: string | null,
    ): Promise<Record<string, any>> {
        switch (provider) {
            case 'claude':
                return this.extractWithClaude(buffer, mimetype, documentText);
            case 'gpt':
                return this.extractWithOpenAI(this.openai!, 'gpt-4o', buffer, mimetype, documentText);
            case 'deepseek':
                return this.extractWithOpenAI(this.deepseek!, 'deepseek-chat', buffer, mimetype, documentText);
        }
    }

    private async extractWithClaude(
        buffer: Buffer,
        mimetype: string,
        documentText: string | null,
    ): Promise<Record<string, any>> {
        let messages: Anthropic.MessageCreateParams['messages'];

        if (mimetype === 'application/pdf') {
            // Claude supporte nativement les PDF
            messages = [{
                role: 'user',
                content: [
                    {
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: 'application/pdf',
                            data: buffer.toString('base64'),
                        },
                    },
                    { type: 'text', text: EXTRACTION_PROMPT },
                ],
            }];
        } else {
            messages = [{
                role: 'user',
                content: `${EXTRACTION_PROMPT}\n\nDOCUMENT :\n---\n${documentText!.substring(0, 50000)}\n---`,
            }];
        }

        const response = await this.anthropic!.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages,
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
        return this.parseJsonResponse(textBlock.text);
    }

    private async extractWithOpenAI(
        client: OpenAI,
        model: string,
        _buffer: Buffer,
        _mimetype: string,
        documentText: string | null,
    ): Promise<Record<string, any>> {
        // GPT et DeepSeek : texte seulement (pas de support PDF natif)
        // Pour les PDF, on utilise le texte extrait par Claude ou on force le text extraction
        let text = documentText;
        if (!text) {
            // PDF : extraction texte basique via mammoth ne marchera pas, on essaie pdf-parse
            // En fallback, on envoie un message d'erreur clair
            throw new Error(`${model} ne supporte pas les PDF natifs et le texte n'a pas pu être extrait`);
        }

        const response = await client.chat.completions.create({
            model,
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: `${EXTRACTION_PROMPT}\n\nDOCUMENT :\n---\n${text.substring(0, 50000)}\n---`,
            }],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response content');
        return this.parseJsonResponse(content);
    }

    // ─── Form Validation ────────────────────────────────

    async validateProject(projectData: Record<string, any>): Promise<ValidationFeedback> {
        if (this.providers.length === 0) {
            throw new BadRequestException('Aucun service IA configuré.');
        }

        const prompt = buildValidationPrompt(projectData);

        for (const provider of this.providers) {
            try {
                this.logger.log(`Validation via ${provider.name}...`);
                const result = await this.promptProvider(provider.name, prompt);
                const feedback = this.parseJsonResponse(result) as ValidationFeedback;

                // Vérifier la structure
                if (typeof feedback.score !== 'number' || !feedback.summary) {
                    throw new Error('Structure de réponse invalide');
                }

                this.logger.log(`Validation réussie via ${provider.name} — score: ${feedback.score}/100`);
                return feedback;
            } catch (error) {
                this.logger.warn(`${provider.name} validation failed: ${error.message}`);
                continue;
            }
        }

        throw new BadRequestException('Tous les services IA ont échoué pour la validation.');
    }

    // ─── Legality Check ────────────────────────────────

    async checkLegality(projectData: Record<string, any>): Promise<LegalityCheckResult> {
        if (this.providers.length === 0) {
            this.logger.warn('Aucun provider IA disponible pour la vérification de légalité — projet considéré comme légal par défaut');
            return { isLegal: true, confidence: 1.0 };
        }

        const prompt = buildLegalityPrompt(projectData);

        for (const provider of this.providers) {
            try {
                this.logger.log(`Vérification de légalité via ${provider.name}...`);
                const result = await this.promptProvider(provider.name, prompt);
                const parsed = this.parseJsonResponse(result) as LegalityCheckResult;

                // Vérifier la structure
                if (typeof parsed.isLegal !== 'boolean' || typeof parsed.confidence !== 'number') {
                    throw new Error('Structure de réponse invalide pour la vérification de légalité');
                }

                this.logger.log(
                    `Vérification de légalité via ${provider.name} — isLegal: ${parsed.isLegal}, confidence: ${parsed.confidence}`,
                );
                return parsed;
            } catch (error) {
                this.logger.warn(`${provider.name} legality check failed: ${error.message}`);
                continue;
            }
        }

        // Si tous les providers échouent, on considère le projet comme légal pour ne pas bloquer l'utilisateur
        this.logger.warn('Tous les providers IA ont échoué pour la vérification de légalité — projet considéré comme légal par défaut');
        return { isLegal: true, confidence: 1.0 };
    }

    // ─── Generic Provider Call ───────────────────────────

    private async promptProvider(provider: AiProvider, prompt: string): Promise<string> {
        switch (provider) {
            case 'claude': {
                const response = await this.anthropic!.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                const block = response.content.find((c) => c.type === 'text');
                if (!block || block.type !== 'text') throw new Error('No text response');
                return block.text;
            }
            case 'gpt': {
                const response = await this.openai!.chat.completions.create({
                    model: 'gpt-4o',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error('No response');
                return content;
            }
            case 'deepseek': {
                const response = await this.deepseek!.chat.completions.create({
                    model: 'deepseek-chat',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error('No response');
                return content;
            }
        }
    }

    // ─── Embeddings ─────────────────────────────────────

    async getEmbedding(text: string): Promise<number[]> {
        if (!this.embeddingClient) {
            throw new BadRequestException('Le service d\'embeddings OpenAI n\'est pas configuré.');
        }

        try {
            const response = await this.embeddingClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: text.replace(/\n/g, ' '),
                encoding_format: 'float',
            });

            return response.data[0].embedding;
        } catch (error) {
            this.logger.error(`Erreur lors de la génération de l'embedding: ${error.message}`);
            throw new BadRequestException('Erreur lors de la génération de l\'embedding sémantique.');
        }
    }

    // ─── Summary Blocks (6 blocs) ─────────────────────

    async generateSummaryBlocks(buffer: Buffer, mimetype: string): Promise<Record<string, string>> {
        if (this.providers.length === 0) {
            throw new BadRequestException('Aucun service IA configuré. Contactez l\'administrateur.');
        }

        // Extraire le texte du document
        let documentText: string | null = null;
        if (
            mimetype === 'application/msword' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            documentText = result.value;
            if (!documentText || documentText.trim().length < 50) {
                throw new BadRequestException('Le document Word semble vide ou trop court.');
            }
        } else if (mimetype === 'application/pdf') {
            // Extraire le texte pour les providers non-Claude
            // Import from lib/pdf-parse.js directly to avoid pdf-parse/index.js loading a test PDF file
            const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
            const pdfResult = await pdfParse(buffer);
            documentText = pdfResult.text;
            if (!documentText || documentText.trim().length < 50) {
                throw new BadRequestException('Le document PDF semble vide ou trop court.');
            }
        } else {
            throw new BadRequestException('Format non supporté. Utilisez PDF ou Word.');
        }

        // Prioriser DeepSeek, puis fallback Claude → GPT
        const orderedProviders = this.getSummaryProviderOrder();

        for (const provider of orderedProviders) {
            try {
                this.logger.log(`Génération des blocs synthèse via ${provider.name}...`);

                let result: string;

                if (provider.name === 'claude' && mimetype === 'application/pdf') {
                    // Claude supporte nativement les PDF
                    const response = await this.anthropic!.messages.create({
                        model: 'claude-sonnet-4-5-20250929',
                        max_tokens: 4096,
                        messages: [{
                            role: 'user',
                            content: [
                                {
                                    type: 'document',
                                    source: {
                                        type: 'base64',
                                        media_type: 'application/pdf',
                                        data: buffer.toString('base64'),
                                    },
                                },
                                { type: 'text', text: SUMMARY_PROMPT },
                            ],
                        }],
                    });
                    const textBlock = response.content.find((c) => c.type === 'text');
                    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
                    result = textBlock.text;
                } else {
                    // Providers texte (DeepSeek, GPT, Claude avec DOCX)
                    const text = documentText;
                    if (!text) {
                        throw new Error(`${provider.name} ne supporte pas les PDF natifs et le texte n'a pas pu être extrait`);
                    }
                    const prompt = `${SUMMARY_PROMPT}\n\nDOCUMENT :\n---\n${text.substring(0, 50000)}\n---`;
                    result = await this.promptProvider(provider.name, prompt);
                }

                const blocks = this.parseJsonResponse(result) as Record<string, string>;

                // Vérifier la structure attendue
                const requiredKeys = ['problem', 'solution', 'market', 'traction', 'team', 'cofounder'];
                const missingKeys = requiredKeys.filter(k => !blocks[k]);
                if (missingKeys.length > 0) {
                    throw new Error(`Blocs manquants: ${missingKeys.join(', ')}`);
                }

                this.logger.log(`Blocs synthèse générés via ${provider.name} — ${Object.keys(blocks).length} blocs`);
                return blocks;
            } catch (error) {
                this.logger.warn(`${provider.name} a échoué pour les blocs synthèse: ${error.message}`);
                continue;
            }
        }

        throw new BadRequestException('Tous les services IA ont échoué pour la génération des blocs synthèse.');
    }

    async regenerateSummaryBlock(
        blockKey: string,
        documentText: string,
        currentBlocks: Record<string, string>,
    ): Promise<string> {
        if (this.providers.length === 0) {
            throw new BadRequestException('Aucun service IA configuré.');
        }

        const validKeys = ['problem', 'solution', 'market', 'traction', 'team', 'cofounder'];
        if (!validKeys.includes(blockKey)) {
            throw new BadRequestException(`Bloc invalide: ${blockKey}. Blocs valides: ${validKeys.join(', ')}`);
        }

        const prompt = buildRegenerationPrompt(blockKey, documentText, currentBlocks);

        // Prioriser DeepSeek, puis fallback Claude → GPT
        const orderedProviders = this.getSummaryProviderOrder();

        for (const provider of orderedProviders) {
            try {
                this.logger.log(`Régénération du bloc "${blockKey}" via ${provider.name}...`);
                const result = await this.promptProvider(provider.name, prompt);
                const cleanedResult = result.trim().replace(/^["']|["']$/g, '');
                this.logger.log(`Bloc "${blockKey}" régénéré via ${provider.name}`);
                return cleanedResult;
            } catch (error) {
                this.logger.warn(`${provider.name} a échoué pour la régénération: ${error.message}`);
                continue;
            }
        }

        throw new BadRequestException('Tous les services IA ont échoué pour la régénération du bloc.');
    }

    /**
     * Retourne les providers dans l'ordre de priorité pour les blocs synthèse :
     * DeepSeek en priorité, puis Claude, puis GPT.
     */
    private getSummaryProviderOrder(): AiProviderConfig[] {
        const order: AiProvider[] = ['deepseek', 'claude', 'gpt'];
        return order
            .map(name => this.providers.find(p => p.name === name))
            .filter((p): p is AiProviderConfig => !!p);
    }

    // ─── JSON Parsing ───────────────────────────────────

    private parseJsonResponse(text: string): Record<string, any> {
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const parsed = JSON.parse(jsonText);
            // Filtrer les null
            const cleaned: Record<string, any> = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (value !== null && value !== undefined && value !== '') {
                    cleaned[key] = value;
                }
            }
            return cleaned;
        } catch {
            this.logger.error('JSON parse failed:', jsonText.substring(0, 200));
            throw new Error('Réponse IA invalide (JSON parsing failed)');
        }
    }
}
