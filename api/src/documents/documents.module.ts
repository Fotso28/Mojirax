import { Module, forwardRef } from '@nestjs/common';
import { DocumentStorageService } from './document-storage.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [PrismaModule, NotificationsModule, forwardRef(() => ProjectsModule), MatchingModule],
  controllers: [DocumentsController],
  providers: [DocumentStorageService, DocumentAnalysisService],
  exports: [DocumentStorageService, DocumentAnalysisService],
})
export class DocumentsModule {}
