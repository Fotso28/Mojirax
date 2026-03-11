import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CandidateModerationService } from './candidate-moderation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { MatchingModule } from '../matching/matching.module';
import { UnlockModule } from '../unlock/unlock.module';

@Module({
    imports: [PrismaModule, UploadModule, MatchingModule, UnlockModule],
    controllers: [UsersController],
    providers: [UsersService, CandidateModerationService],
    exports: [UsersService, CandidateModerationService],
})
export class UsersModule { }
