import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CandidateModerationService } from './candidate-moderation.service';
import { ProfileViewsService } from './profile-views.service';
import { StatsService } from './stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { MatchingModule } from '../matching/matching.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [PrismaModule, UploadModule, MatchingModule, PaymentModule],
    controllers: [UsersController],
    providers: [UsersService, CandidateModerationService, ProfileViewsService, StatsService],
    exports: [UsersService, CandidateModerationService, ProfileViewsService, StatsService],
})
export class UsersModule { }
