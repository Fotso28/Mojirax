import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { BoostModule } from '../boost/boost.module';

@Module({
    imports: [PrismaModule, AiModule, InteractionsModule, BoostModule],
    controllers: [SearchController],
    providers: [SearchService],
})
export class SearchModule { }
