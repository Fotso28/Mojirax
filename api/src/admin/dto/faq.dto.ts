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
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateFaqDto {
  @IsString()
  @MaxLength(300)
  question: string;

  @IsString()
  @MaxLength(2000)
  answer: string;

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
