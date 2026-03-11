# Admin AI Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une page admin `/admin/ai` avec monitoring, configuration, prompts versionnés et analytics pour tous les appels IA de MojiraX.

**Architecture:** 3 nouveaux modèles Prisma (AiConfig, AiPrompt, AiCallLog). Un nouveau module `AiConfig` avec service + controller admin. Modification du `AiService` existant pour lire config/prompts depuis la DB et logger chaque appel. Frontend avec 4 onglets (Dashboard, Configuration, Prompts, Logs).

**Tech Stack:** NestJS 11, Prisma, Next.js 16, Recharts, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-10-admin-ai-monitoring-design.md`

---

## File Structure

### Backend — New files
- `api/prisma/schema.prisma` — Ajouter 3 modèles (AiConfig, AiPrompt, AiCallLog)
- `api/src/ai-config/ai-config.module.ts` — Module NestJS
- `api/src/ai-config/ai-config.service.ts` — Service CRUD config, prompts, logs, analytics
- `api/src/ai-config/ai-config.controller.ts` — Endpoints admin `/admin/ai/*`
- `api/src/ai-config/dto/ai-config.dto.ts` — DTOs avec class-validator

### Backend — Modified files
- `api/src/ai/ai.module.ts` — Importer AiConfigModule
- `api/src/ai/ai.service.ts` — Injecter AiConfigService, lire config/prompts depuis DB, logger les appels
- `api/src/app.module.ts` — Importer AiConfigModule

### Frontend — New files
- `web/src/app/admin/ai/page.tsx` — Page admin IA avec 4 onglets

### Frontend — Modified files
- `web/src/app/admin/layout.tsx` — Ajouter lien "IA" dans la sidebar

---

## Task 1: Modèles Prisma + Migration

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Ajouter les 3 modèles au schema Prisma**

Ajouter à la fin du fichier `api/prisma/schema.prisma` :

```prisma
// --------------------------------------
// 10. AI Configuration & Monitoring
// --------------------------------------

model AiConfig {
  id                    String   @id @default("singleton")
  defaultProvider       String   @default("DEEPSEEK") @map("default_provider")
  embeddingProvider     String   @default("JINA") @map("embedding_provider")
  providerPerAction     Json     @default("{}") @map("provider_per_action") @db.JsonB
  models                Json     @default("{}") @db.JsonB
  maxTokens             Int      @default(4096) @map("max_tokens")
  temperature           Float?
  moderationThresholds  Json     @default("{\"publishMin\":0.7,\"rejectMax\":0.3}") @map("moderation_thresholds") @db.JsonB
  matchingWeights       Json     @default("{\"skills\":40,\"experience\":20,\"location\":15,\"culture\":25}") @map("matching_weights") @db.JsonB
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("ai_config")
}

model AiPrompt {
  id               String   @id @default(cuid())
  action           String   @unique
  content          String   @db.Text
  version          Int      @default(1)
  previousVersions Json     @default("[]") @map("previous_versions") @db.JsonB
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("ai_prompts")
}

model AiCallLog {
  id               String   @id @default(cuid())
  action           String
  provider         String
  model            String
  success          Boolean
  durationMs       Int      @map("duration_ms")
  inputTokens      Int?     @map("input_tokens")
  outputTokens     Int?     @map("output_tokens")
  estimatedCostUsd Float?   @map("estimated_cost_usd")
  error            String?  @db.Text
  resourceType     String?  @map("resource_type")
  resourceId       String?  @map("resource_id")
  createdAt        DateTime @default(now()) @map("created_at")

  @@map("ai_call_logs")
  @@index([action])
  @@index([provider])
  @@index([createdAt])
  @@index([success])
}
```

- [ ] **Step 2: Générer et appliquer la migration**

Run: `cd api && npx prisma migrate dev --name add_ai_config_monitoring`
Expected: Migration créée et appliquée avec succès.

- [ ] **Step 3: Vérifier que Prisma Client est à jour**

Run: `cd api && npx prisma generate`
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat: add AiConfig, AiPrompt, AiCallLog Prisma models"
```

---

## Task 2: AiConfigService — Backend

**Files:**
- Create: `api/src/ai-config/ai-config.module.ts`
- Create: `api/src/ai-config/ai-config.service.ts`
- Create: `api/src/ai-config/dto/ai-config.dto.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Créer les DTOs**

Créer `api/src/ai-config/dto/ai-config.dto.ts` :

```typescript
import { IsOptional, IsString, IsInt, IsNumber, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsIn(['DEEPSEEK', 'CLAUDE', 'GPT'])
  defaultProvider?: string;

  @IsOptional()
  @IsIn(['JINA', 'OPENAI'])
  embeddingProvider?: string;

  @IsOptional()
  providerPerAction?: Record<string, string>;

  @IsOptional()
  models?: Record<string, string>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(256)
  @Max(16384)
  maxTokens?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number | null;

  @IsOptional()
  moderationThresholds?: { publishMin: number; rejectMax: number };

  @IsOptional()
  matchingWeights?: { skills: number; experience: number; location: number; culture: number };
}

export class UpdatePromptDto {
  @IsString()
  content: string;
}

export class RollbackPromptDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;
}

export class ListAiLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number = 20;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  success?: string; // 'true' | 'false'
}

export class AnalyticsPeriodDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}
```

- [ ] **Step 2: Créer le service AiConfigService**

Créer `api/src/ai-config/ai-config.service.ts` :

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateAiConfigDto,
  UpdatePromptDto,
  RollbackPromptDto,
  ListAiLogsDto,
  AnalyticsPeriodDto,
} from './dto/ai-config.dto';

// Tarifs par million de tokens (USD)
const COST_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'gpt-4o': { input: 2.50, output: 10.0 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'jina-embeddings-v3': { input: 0.02, output: 0 },
};

// Prompts par défaut (les constantes actuelles de ai.service.ts)
// Seront utilisés comme seed si la DB est vide
const DEFAULT_PROMPTS: Record<string, string> = {};
// Rempli dynamiquement au démarrage par AiService

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Config ──────────────────────────────────────────

  async getConfig() {
    let config = await this.prisma.aiConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await this.prisma.aiConfig.create({
        data: {
          id: 'singleton',
          providerPerAction: {
            EXTRACTION: 'DEEPSEEK',
            SUMMARY: 'DEEPSEEK',
            REGENERATION: 'DEEPSEEK',
            LEGALITY: 'DEEPSEEK',
            PROJECT_VALIDATION: 'DEEPSEEK',
            CANDIDATE_VALIDATION: 'DEEPSEEK',
          },
          models: {
            DEEPSEEK: 'deepseek-chat',
            CLAUDE: 'claude-sonnet-4-5-20250929',
            GPT: 'gpt-4o',
            JINA: 'jina-embeddings-v3',
            OPENAI_EMBEDDING: 'text-embedding-3-small',
          },
        },
      });
      this.logger.log('AiConfig singleton created with defaults');
    }
    return config;
  }

  async updateConfig(dto: UpdateAiConfigDto) {
    const data: any = {};
    if (dto.defaultProvider !== undefined) data.defaultProvider = dto.defaultProvider;
    if (dto.embeddingProvider !== undefined) data.embeddingProvider = dto.embeddingProvider;
    if (dto.providerPerAction !== undefined) data.providerPerAction = dto.providerPerAction;
    if (dto.models !== undefined) data.models = dto.models;
    if (dto.maxTokens !== undefined) data.maxTokens = dto.maxTokens;
    if (dto.temperature !== undefined) data.temperature = dto.temperature;
    if (dto.moderationThresholds !== undefined) data.moderationThresholds = dto.moderationThresholds;
    if (dto.matchingWeights !== undefined) data.matchingWeights = dto.matchingWeights;

    return this.prisma.aiConfig.update({
      where: { id: 'singleton' },
      data,
    });
  }

  // ─── Prompts ─────────────────────────────────────────

  async getPrompts() {
    return this.prisma.aiPrompt.findMany({ orderBy: { action: 'asc' } });
  }

  async getPrompt(action: string): Promise<string | null> {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { action } });
    return prompt?.content ?? null;
  }

  async getPromptDetail(action: string) {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { action } });
    if (!prompt) throw new NotFoundException(`Prompt "${action}" introuvable`);
    return prompt;
  }

  async updatePrompt(action: string, dto: UpdatePromptDto) {
    const existing = await this.prisma.aiPrompt.findUnique({ where: { action } });

    if (!existing) {
      // Premier enregistrement en DB
      return this.prisma.aiPrompt.create({
        data: {
          action,
          content: dto.content,
          version: 1,
          previousVersions: [],
        },
      });
    }

    // Push la version actuelle dans l'historique
    const history = (existing.previousVersions as any[]) || [];
    history.push({
      version: existing.version,
      content: existing.content,
      updatedAt: existing.updatedAt.toISOString(),
    });

    return this.prisma.aiPrompt.update({
      where: { action },
      data: {
        content: dto.content,
        version: existing.version + 1,
        previousVersions: history,
      },
    });
  }

  async rollbackPrompt(action: string, dto: RollbackPromptDto) {
    const existing = await this.prisma.aiPrompt.findUnique({ where: { action } });
    if (!existing) throw new NotFoundException(`Prompt "${action}" introuvable`);

    const history = (existing.previousVersions as any[]) || [];
    const target = history.find((h: any) => h.version === dto.version);
    if (!target) throw new NotFoundException(`Version ${dto.version} introuvable`);

    // Sauvegarder la version actuelle dans l'historique
    history.push({
      version: existing.version,
      content: existing.content,
      updatedAt: existing.updatedAt.toISOString(),
    });

    return this.prisma.aiPrompt.update({
      where: { action },
      data: {
        content: target.content,
        version: existing.version + 1,
        previousVersions: history,
      },
    });
  }

  // ─── Seed prompts ────────────────────────────────────

  async seedPromptIfMissing(action: string, content: string) {
    const exists = await this.prisma.aiPrompt.findUnique({ where: { action } });
    if (!exists) {
      await this.prisma.aiPrompt.create({
        data: { action, content, version: 1, previousVersions: [] },
      });
      this.logger.log(`Prompt "${action}" seeded in DB`);
    }
  }

  // ─── Call Logging ────────────────────────────────────

  async logCall(data: {
    action: string;
    provider: string;
    model: string;
    success: boolean;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    const cost = this.estimateCost(data.model, data.inputTokens, data.outputTokens);

    await this.prisma.aiCallLog.create({
      data: {
        ...data,
        estimatedCostUsd: cost,
      },
    });
  }

  private estimateCost(model: string, inputTokens?: number, outputTokens?: number): number | null {
    const pricing = COST_PER_MILLION_TOKENS[model];
    if (!pricing || (!inputTokens && !outputTokens)) return null;
    const inputCost = ((inputTokens || 0) / 1_000_000) * pricing.input;
    const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimals
  }

  // ─── Logs ────────────────────────────────────────────

  async getCallLogs(dto: ListAiLogsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: any = {};

    if (dto.action) where.action = dto.action;
    if (dto.provider) where.provider = dto.provider;
    if (dto.success === 'true') where.success = true;
    if (dto.success === 'false') where.success = false;

    const [logs, total] = await Promise.all([
      this.prisma.aiCallLog.findMany({
        where,
        take,
        skip: dto.skip ?? 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiCallLog.count({ where }),
    ]);

    return { logs, total, take, skip: dto.skip ?? 0 };
  }

  // ─── Analytics ───────────────────────────────────────

  async getAnalytics(dto: AnalyticsPeriodDto) {
    const days = dto.days ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const [
      callsToday,
      callsPeriod,
      successCount,
      failCount,
      avgDuration,
      costThisMonth,
      byProvider,
      byAction,
      recentErrors,
    ] = await Promise.all([
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: since }, success: true } }),
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: since }, success: false } }),
      this.prisma.aiCallLog.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { durationMs: true },
      }),
      this.prisma.aiCallLog.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { estimatedCostUsd: true },
      }),
      this.prisma.aiCallLog.groupBy({
        by: ['provider'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.aiCallLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.aiCallLog.findMany({
        where: { success: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          provider: true,
          model: true,
          error: true,
          durationMs: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      callsToday,
      callsPeriod,
      successRate: callsPeriod > 0 ? Math.round((successCount / callsPeriod) * 100) : 100,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      costThisMonthUsd: Number(costThisMonth._sum.estimatedCostUsd ?? 0),
      byProvider: byProvider.map((p) => ({ provider: p.provider, count: p._count })),
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      recentErrors,
      period: days,
    };
  }
}
```

- [ ] **Step 3: Créer le module**

Créer `api/src/ai-config/ai-config.module.ts` :

```typescript
import { Global, Module } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { AiConfigController } from './ai-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AiConfigController],
  providers: [AiConfigService],
  exports: [AiConfigService],
})
export class AiConfigModule {}
```

- [ ] **Step 4: Enregistrer dans AppModule**

Dans `api/src/app.module.ts`, ajouter `AiConfigModule` dans les imports.

- [ ] **Step 5: Commit**

```bash
git add api/src/ai-config/ api/src/app.module.ts
git commit -m "feat: add AiConfigService with config, prompts, logs, analytics"
```

---

## Task 3: AiConfigController — Endpoints Admin

**Files:**
- Create: `api/src/ai-config/ai-config.controller.ts`

- [ ] **Step 1: Créer le controller**

Créer `api/src/ai-config/ai-config.controller.ts` :

```typescript
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AiConfigService } from './ai-config.service';
import {
  UpdateAiConfigDto,
  UpdatePromptDto,
  RollbackPromptDto,
  ListAiLogsDto,
  AnalyticsPeriodDto,
} from './dto/ai-config.dto';

@Controller('admin/ai')
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get('config')
  getConfig() {
    return this.aiConfigService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateAiConfigDto) {
    return this.aiConfigService.updateConfig(dto);
  }

  @Get('prompts')
  getPrompts() {
    return this.aiConfigService.getPrompts();
  }

  @Get('prompts/:action')
  getPromptDetail(@Param('action') action: string) {
    return this.aiConfigService.getPromptDetail(action);
  }

  @Patch('prompts/:action')
  updatePrompt(@Param('action') action: string, @Body() dto: UpdatePromptDto) {
    return this.aiConfigService.updatePrompt(action, dto);
  }

  @Post('prompts/:action/rollback')
  rollbackPrompt(@Param('action') action: string, @Body() dto: RollbackPromptDto) {
    return this.aiConfigService.rollbackPrompt(action, dto);
  }

  @Get('logs')
  getCallLogs(@Query() dto: ListAiLogsDto) {
    return this.aiConfigService.getCallLogs(dto);
  }

  @Get('analytics')
  getAnalytics(@Query() dto: AnalyticsPeriodDto) {
    return this.aiConfigService.getAnalytics(dto);
  }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `cd api && npx tsc --noEmit`
Expected: Pas d'erreurs.

- [ ] **Step 3: Commit**

```bash
git add api/src/ai-config/ai-config.controller.ts
git commit -m "feat: add admin AI controller with all endpoints"
```

---

## Task 4: Modifier AiService — Config DB + Logging

**Files:**
- Modify: `api/src/ai/ai.service.ts`
- Modify: `api/src/ai/ai.module.ts`

- [ ] **Step 1: Injecter AiConfigService dans AiService**

Dans `api/src/ai/ai.service.ts`, modifier le constructor pour injecter `AiConfigService` et seed les prompts par défaut au démarrage :

```typescript
import { AiConfigService } from '../ai-config/ai-config.service';

// Dans le constructor, ajouter :
constructor(
    private config: ConfigService,
    private aiConfig: AiConfigService,
) {
    // ... code existant d'initialisation des providers ...

    // Seed les prompts par défaut en DB si absents
    this.seedDefaultPrompts();
}

private async seedDefaultPrompts() {
    await this.aiConfig.seedPromptIfMissing('EXTRACTION', EXTRACTION_PROMPT);
    await this.aiConfig.seedPromptIfMissing('SUMMARY', SUMMARY_PROMPT);
    // REGENERATION est dynamique (template), on seed un placeholder
    await this.aiConfig.seedPromptIfMissing('REGENERATION', 'TEMPLATE — voir code source');
    await this.aiConfig.seedPromptIfMissing('LEGALITY', 'TEMPLATE — voir code source');
    await this.aiConfig.seedPromptIfMissing('PROJECT_VALIDATION', 'TEMPLATE — voir code source');
    await this.aiConfig.seedPromptIfMissing('CANDIDATE_VALIDATION', 'TEMPLATE — voir code source');
}
```

Note : Les prompts LEGALITY, PROJECT_VALIDATION, CANDIDATE_VALIDATION et REGENERATION sont des fonctions templates (ils prennent des paramètres). Pour ceux-là, on garde la construction dynamique dans le code mais on lit le template de base depuis la DB.

- [ ] **Step 2: Modifier promptProvider pour logger les appels**

Wrapper chaque appel provider avec un log :

```typescript
private async promptProvider(provider: AiProvider, prompt: string, action?: string, resourceType?: string, resourceId?: string): Promise<string> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let model = '';

    try {
        switch (provider) {
            case 'claude': {
                model = 'claude-sonnet-4-5-20250929';
                const response = await this.anthropic!.messages.create({
                    model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                inputTokens = response.usage?.input_tokens;
                outputTokens = response.usage?.output_tokens;
                const block = response.content.find((c) => c.type === 'text');
                if (!block || block.type !== 'text') throw new Error('No text response');
                return block.text;
            }
            case 'gpt': {
                model = 'gpt-4o';
                const response = await this.openai!.chat.completions.create({
                    model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                inputTokens = response.usage?.prompt_tokens;
                outputTokens = response.usage?.completion_tokens;
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error('No response');
                return content;
            }
            case 'deepseek': {
                model = 'deepseek-chat';
                const response = await this.deepseek!.chat.completions.create({
                    model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                });
                inputTokens = response.usage?.prompt_tokens;
                outputTokens = response.usage?.completion_tokens;
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error('No response');
                return content;
            }
        }
    } catch (err) {
        success = false;
        error = err.message;
        throw err;
    } finally {
        const durationMs = Date.now() - startTime;
        // Fire-and-forget log
        this.aiConfig.logCall({
            action: action || 'UNKNOWN',
            provider: provider.toUpperCase(),
            model,
            success,
            durationMs,
            inputTokens,
            outputTokens,
            error,
            resourceType,
            resourceId,
        }).catch((e) => this.logger.warn(`Failed to log AI call: ${e.message}`));
    }
}
```

- [ ] **Step 3: Propager l'action/resource dans les méthodes publiques**

Modifier chaque méthode publique pour passer l'action et la ressource au promptProvider. Exemples :

- `validateProject()` : passer `action: 'PROJECT_VALIDATION'`, `resourceType: 'PROJECT'`
- `checkLegality()` : passer `action: 'LEGALITY'`, `resourceType: 'PROJECT'`
- `validateCandidateProfile()` : passer `action: 'CANDIDATE_VALIDATION'`, `resourceType: 'CANDIDATE'`
- `generateSummaryBlocks()` : passer `action: 'SUMMARY'`, `resourceType: 'PROJECT'`
- `regenerateSummaryBlock()` : passer `action: 'REGENERATION'`, `resourceType: 'PROJECT'`
- `analyzeFromBuffer()` : passer `action: 'EXTRACTION'`, `resourceType: 'PROJECT'`

Pour les embeddings, logger directement dans `getEmbedding()` avec `action: 'EMBEDDING'`.

- [ ] **Step 4: Vérifier la compilation**

Run: `cd api && npx tsc --noEmit`
Expected: Pas d'erreurs.

- [ ] **Step 5: Commit**

```bash
git add api/src/ai/ai.service.ts api/src/ai/ai.module.ts
git commit -m "feat: integrate AiConfigService into AiService for logging and config"
```

---

## Task 5: Frontend — Page Admin IA

**Files:**
- Create: `web/src/app/admin/ai/page.tsx`
- Modify: `web/src/app/admin/layout.tsx`

- [ ] **Step 1: Ajouter le lien dans la sidebar**

Dans `web/src/app/admin/layout.tsx`, ajouter `Brain` dans les imports lucide et ajouter l'entrée dans `adminNav` :

```typescript
import { ..., Brain } from 'lucide-react';

const adminNav = [
  // ... existants ...
  { href: '/admin/ai', label: 'IA', icon: Brain },
  // ... reste ...
];
```

Positionner après "Publicités".

- [ ] **Step 2: Créer la page `/admin/ai`**

Créer `web/src/app/admin/ai/page.tsx` avec 4 onglets :
- **Dashboard** : 4 KPI cards + bar chart (appels/provider) + pie chart (par action) + table erreurs récentes
- **Configuration** : formulaire avec selects providers, inputs modèles, seuils, poids
- **Prompts** : 6 accordéons avec textarea + historique + rollback
- **Logs** : filtres + tableau paginé

Le fichier est long (~600 lignes) car il contient les 4 onglets. Utiliser un state `activeTab` pour switcher.

Les composants principaux dans le fichier :
- `DashboardTab` : appelle `GET /admin/ai/analytics`
- `ConfigTab` : appelle `GET/PATCH /admin/ai/config`
- `PromptsTab` : appelle `GET/PATCH /admin/ai/prompts`
- `LogsTab` : appelle `GET /admin/ai/logs`

Charts : utiliser `Recharts` (déjà installé — utilisé dans le dashboard principal).

- [ ] **Step 3: Vérifier la compilation**

Run: `cd web && npx tsc --noEmit`
Expected: Seules les erreurs Playwright pré-existantes.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/admin/ai/ web/src/app/admin/layout.tsx
git commit -m "feat: add admin AI monitoring page with 4 tabs"
```

---

## Task 6: Test end-to-end + Review

- [ ] **Step 1: Démarrer le serveur API**

Run: `cd api && npm run start:dev`
Expected: Serveur démarre sur port 3001, les prompts sont seeded en DB.

- [ ] **Step 2: Tester les endpoints**

Vérifier via curl (avec token admin) :
- `GET /admin/ai/config` → retourne le singleton avec défauts
- `GET /admin/ai/prompts` → retourne les 6 prompts
- `GET /admin/ai/analytics` → retourne les KPIs (probablement vides)
- `GET /admin/ai/logs` → retourne liste vide

- [ ] **Step 3: Vérifier le frontend**

Run: `cd web && npm run dev`
Naviguer vers `/admin/ai` et vérifier :
- Les 4 onglets s'affichent
- Dashboard montre les KPIs (0 si pas d'appels)
- Configuration charge et permet de modifier
- Prompts affiche les 6 prompts
- Logs affiche la table vide

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: complete admin AI monitoring with config, prompts, logs and analytics"
```
