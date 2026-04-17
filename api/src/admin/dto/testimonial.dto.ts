import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateTestimonialDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsObject()
  @IsNotEmpty()
  role: Record<string, string>; // { "fr": "Développeur", "en": "Developer" }

  @IsString()
  @MaxLength(100)
  location: string;

  @IsObject()
  @IsNotEmpty()
  quote: Record<string, string>; // { "fr": "...", "en": "..." }

  @IsString()
  @IsOptional()
  @MaxLength(500)
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}

export class ReorderTestimonialItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderTestimonialsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReorderTestimonialItemDto)
  testimonials: ReorderTestimonialItemDto[];
}
