import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsAdminController } from './ads-admin.controller';
import { AdsService } from './ads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [AdsController, AdsAdminController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
