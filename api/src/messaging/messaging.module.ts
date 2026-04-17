import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { WsAuthGuard } from './ws-auth.guard';
import { WsRateLimiter } from './ws-rate-limiter';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [UploadModule, NotificationsModule, PaymentModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, WsAuthGuard, WsRateLimiter],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
