import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CandidateModerationService } from './candidate-moderation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { AiService } from '../projects/ai.service';

@Module({
    imports: [PrismaModule, UploadModule],
    controllers: [UsersController],
    providers: [UsersService, CandidateModerationService, AiService],
    exports: [UsersService, CandidateModerationService],
})
export class UsersModule { }
