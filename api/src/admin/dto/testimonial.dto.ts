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
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateTestimonialDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  role: string;

  @IsString()
  @MaxLength(100)
  location: string;

  @IsString()
  @MaxLength(1000)
  quote: string;

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
