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
    // Ensure singleton exists
    await this.getConfig();

    const data: Record<string, unknown> = {};
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
      return this.prisma.aiPrompt.create({
        data: {
          action,
          content: dto.content,
          version: 1,
          previousVersions: [],
        },
      });
    }

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
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
  }

  // ─── Logs ────────────────────────────────────────────

  async getCallLogs(dto: ListAiLogsDto) {
    const take = Math.min(dto.take ?? 20, 50);
    const where: Record<string, unknown> = {};

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
      avgDuration,
      costThisMonth,
      byProvider,
      byAction,
      recentErrors,
    ] = await Promise.all([
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiCallLog.count({ where: { createdAt: { gte: since }, success: true } }),
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
