import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from '../projects/ai.service';

@Module({
    imports: [PrismaModule],
    controllers: [SearchController],
    providers: [SearchService, AiService],
})
export class SearchModule { }
