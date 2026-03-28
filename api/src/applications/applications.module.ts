import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
    imports: [PrismaModule, forwardRef(() => UsersModule), NotificationsModule],
    controllers: [ApplicationsController],
    providers: [ApplicationsService],
    exports: [ApplicationsService],
})
export class ApplicationsModule { }
