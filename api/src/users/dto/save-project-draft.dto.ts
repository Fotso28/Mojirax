import { IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class SaveProjectDraftDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  step?: number;
}
