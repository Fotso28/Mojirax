import { IsOptional, IsString, IsInt, IsNumber, Min, Max, IsIn } from 'class-validator';
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
  success?: string;
}

export class AnalyticsPeriodDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}
