import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsEnum,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { UserPlan } from '@prisma/client';

export class CreatePlanDto {
  @IsObject()
  @IsNotEmpty()
  name: Record<string, string>; // { "fr": "Plan Plus", "en": "Plus Plan" }

  @IsNumber()
  @Min(0)
  price: number;

  @IsObject()
  @IsNotEmpty()
  period: Record<string, string>; // { "fr": "mois", "en": "month" }

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string = 'EUR';

  @IsObject()
  @IsOptional()
  description?: Record<string, string>; // { "fr": "...", "en": "..." }

  @IsObject()
  @IsNotEmpty()
  features: Record<string, string[]>; // { "fr": ["Feature 1"], "en": ["Feature 1"] }

  @IsBoolean()
  @IsOptional()
  isPopular?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsObject()
  @IsNotEmpty()
  ctaLabel: Record<string, string>; // { "fr": "Commencer", "en": "Get Started" }

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  stripePriceId?: string;

  @IsEnum(UserPlan)
  @IsOptional()
  planKey?: UserPlan;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}

export class ReorderPlanItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderPlansDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReorderPlanItemDto)
  plans: ReorderPlanItemDto[];
}
