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
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePlanDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  period?: string = 'mois';

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string = 'EUR';

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsBoolean()
  @IsOptional()
  isPopular?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ctaLabel?: string = 'Commencer';

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;
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
