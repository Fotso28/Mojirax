import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ required: false, description: 'Message de motivation', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
