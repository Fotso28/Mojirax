import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { EmailService } from './email/email.service';
import { EmailCompilerService } from './email/email-compiler.service';

@Module({
    controllers: [NotificationsController],
    providers: [NotificationsService, PushService, EmailService, EmailCompilerService],
    exports: [NotificationsService, PushService, EmailService],
})
export class NotificationsModule { }
