import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PlanGuard } from './guards/plan.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, PlanGuard],
  exports: [PaymentService, PlanGuard],
})
export class PaymentModule {}
