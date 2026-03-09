import { Module, forwardRef } from '@nestjs/common';
import { DocumentStorageService } from './document-storage.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiService } from '../projects/ai.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, NotificationsModule, forwardRef(() => ProjectsModule)],
  controllers: [DocumentsController],
  providers: [DocumentStorageService, DocumentAnalysisService, AiService],
  exports: [DocumentStorageService, DocumentAnalysisService],
})
export class DocumentsModule {}
