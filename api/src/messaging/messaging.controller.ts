import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { MessagingService } from './messaging.service';
import { UploadService } from '../upload/upload.service';
import { GetMessagesDto } from './dto/get-messages.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';
import { PlanGuard } from '../payment/guards/plan.guard';
import { RequiresPlan } from '../payment/decorators/requires-plan.decorator';
import { UserPlan } from '@prisma/client';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('messages')
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('conversations')
  @UseGuards(FirebaseAuthGuard, PlanGuard)
  @RequiresPlan(UserPlan.PLUS)
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    const userId = await this.messagingService.resolveUserId(req.user.uid);
    return this.messagingService.findOrCreateConversation(userId, dto.targetUserId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any, @Query() dto: GetConversationsQueryDto) {
    const userId = await this.messagingService.resolveUserId(req.user.uid);
    return this.messagingService.getConversations(userId, dto.cursor, dto.limit, dto.active);
  }

  @Get('conversations/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = await this.messagingService.resolveUserId(req.user.uid);
    const count = await this.messagingService.getUnreadCount(userId);
    return { count };
  }

  @Get(':conversationId')
  async getMessages(
    @Req() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() dto: GetMessagesDto,
  ) {
    const userId = await this.messagingService.resolveUserId(req.user.uid);
    return this.messagingService.getMessages(conversationId, userId, dto.cursor, dto.limit);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé (PDF, DOCX, JPEG, PNG ou WebP)');
    }
    if (file.size > 5_242_880) {
      throw new BadRequestException('Fichier trop volumineux (5 MB max)');
    }

    const userId = await this.messagingService.resolveUserId(req.user.uid);
    this.logger.log(`File upload initiated by user ${userId}: ${file.originalname}`);

    const fileUrl = await this.uploadService.uploadFile(
      'messages',
      `${userId}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
      file.buffer,
      file.mimetype,
    );

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
    };
  }
}
