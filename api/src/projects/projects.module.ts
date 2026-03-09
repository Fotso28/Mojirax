import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { UploadModule } from '../upload/upload.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
    imports: [PrismaModule, InteractionsModule, UploadModule, forwardRef(() => DocumentsModule)],
    controllers: [ProjectsController],
    providers: [ProjectsService, AiService],
    exports: [AiService, ProjectsService],
})
export class ProjectsModule { }
