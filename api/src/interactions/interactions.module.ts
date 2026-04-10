import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [PrismaModule, PaymentModule],
    controllers: [InteractionsController],
    providers: [InteractionsService],
    exports: [InteractionsService],
})
export class InteractionsModule { }
