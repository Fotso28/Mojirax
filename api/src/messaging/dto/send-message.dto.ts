import { IsString, IsOptional, IsUUID, MaxLength, IsUrl, IsInt, Max, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Max(5_242_880)
  fileSize?: number;

  @IsOptional()
  @IsIn(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  fileMimeType?: string;
}
