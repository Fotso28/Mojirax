import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { UploadModule } from '../upload/upload.module';
import { DocumentsModule } from '../documents/documents.module';
import { MatchingModule } from '../matching/matching.module';
import { UnlockModule } from '../unlock/unlock.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
    imports: [PrismaModule, InteractionsModule, UploadModule, forwardRef(() => DocumentsModule), MatchingModule, UnlockModule, ModerationModule],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule { }
