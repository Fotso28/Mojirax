import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [PrismaModule, NotificationsModule, forwardRef(() => MessagingModule)],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
