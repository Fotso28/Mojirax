import {
  IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsIn,
  IsDateString, Min, Max, MaxLength, ArrayMaxSize, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────

export enum AdPlacementEnum {
  FEED = 'FEED',
  SIDEBAR = 'SIDEBAR',
  BANNER = 'BANNER',
  SEARCH = 'SEARCH',
}

export enum AdEventTypeEnum {
  IMPRESSION = 'IMPRESSION',
  CLICK = 'CLICK',
}

// ─── Admin CRUD ──────────────────────────────────────────

export class CreateAdDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ctaText?: string;

  @IsEnum(AdPlacementEnum)
  placement: AdPlacementEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number = 5;

  // Ciblage
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetSectors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetCities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetStages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetSkills?: string[];

  // Diffusion
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @ValidateIf((o) => o.startDate !== null)
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.endDate !== null)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxImpressionsPerUserPerDay?: number = 3;
}

export class UpdateAdDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ctaText?: string;

  @IsOptional()
  @IsEnum(AdPlacementEnum)
  placement?: AdPlacementEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetSectors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetCities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetStages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetSkills?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.startDate !== null)
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.endDate !== null)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxImpressionsPerUserPerDay?: number;
}

// ─── Pagination admin ────────────────────────────────────

export class ListAdsDto {
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
  @IsEnum(AdPlacementEnum)
  placement?: AdPlacementEnum;

  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}

// ─── Config globale ──────────────────────────────────────

export class UpdateAdConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(30)
  feedInsertEvery?: number;

  @IsOptional()
  @IsBoolean()
  feedRandomize?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  sidebarMaxAds?: number;

  @IsOptional()
  @IsBoolean()
  bannerEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  searchInsertPosition?: number;
}

// ─── Event tracking (public) ─────────────────────────────

export class TrackAdEventDto {
  @IsString()
  adId: string;

  @IsEnum(AdEventTypeEnum)
  type: AdEventTypeEnum;

  @IsEnum(AdPlacementEnum)
  placement: AdPlacementEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  viewportMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsIn(['feed', 'sidebar', 'banner', 'search'], { message: 'Source invalide' })
  source?: string;
}
