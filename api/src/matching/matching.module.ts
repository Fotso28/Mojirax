import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UnlockModule } from '../unlock/unlock.module';

@Module({
    imports: [PrismaModule, UnlockModule],
    controllers: [MatchingController],
    providers: [MatchingService],
    exports: [MatchingService],
})
export class MatchingModule {}
