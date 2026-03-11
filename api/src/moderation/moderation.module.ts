import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    providers: [ModerationService],
    exports: [ModerationService],
})
export class ModerationModule {}
