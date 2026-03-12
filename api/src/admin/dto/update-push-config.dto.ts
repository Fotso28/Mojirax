import { IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdatePushConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes?: NotificationType[];
}
