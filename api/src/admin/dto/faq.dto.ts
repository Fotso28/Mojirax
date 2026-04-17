import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ArrayMaxSize,
  ValidateNested,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateFaqDto {
  @IsObject()
  @IsNotEmpty()
  question: Record<string, string>; // { "fr": "...", "en": "..." }

  @IsObject()
  @IsNotEmpty()
  answer: Record<string, string>; // { "fr": "...", "en": "..." }

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}

export class ReorderFaqItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderFaqsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReorderFaqItemDto)
  faqs: ReorderFaqItemDto[];
}
