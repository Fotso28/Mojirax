import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { WsAuthGuard } from './ws-auth.guard';
import { WsRateLimiter } from './ws-rate-limiter';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UploadModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, WsAuthGuard, WsRateLimiter],
  exports: [MessagingService],
})
export class MessagingModule {}
