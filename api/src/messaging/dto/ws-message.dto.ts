import { IsString, IsUUID, IsOptional, IsNotEmpty, MaxLength, MinLength, IsUrl, IsInt, Min, Max, IsIn } from 'class-validator';

export class WsSendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;

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
  @Min(1)
  @Max(5_242_880)
  fileSize?: number;

  @IsOptional()
  @IsIn(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  fileMimeType?: string;
}

export class WsConversationIdDto {
  @IsUUID()
  conversationId: string;
}

export class WsMessageIdDto {
  @IsUUID()
  messageId: string;
}

export class WsReactionDto {
  @IsUUID()
  messageId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}

export class WsAuthRefreshDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
