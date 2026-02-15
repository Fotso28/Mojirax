import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { UploadModule } from '../upload/upload.module';

@Module({
    imports: [PrismaModule, InteractionsModule, UploadModule],
    controllers: [ProjectsController],
    providers: [ProjectsService],
})
export class ProjectsModule { }
