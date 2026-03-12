import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsString,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateEmailConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes?: NotificationType[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromName?: string;

  @IsOptional()
  @IsEmail()
  fromEmail?: string;
}
