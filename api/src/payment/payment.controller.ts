import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Headers,
  Req,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('checkout')
  @ApiOperation({ summary: 'Créer une session Stripe Checkout' })
  @ApiResponse({ status: 200, description: '{ url: string }' })
  async createCheckout(@Request() req, @Body() dto: CreateCheckoutDto) {
    return this.paymentService.createCheckoutSession(req.user.uid, dto.planId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook Stripe (public, vérifié par signature)' })
  @ApiResponse({ status: 200, description: 'Webhook traité' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }

  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  @Post('portal')
  @ApiOperation({ summary: 'Créer un lien vers le Stripe Customer Portal' })
  @ApiResponse({ status: 200, description: '{ url: string }' })
  async createPortalSession(@Request() req) {
    return this.paymentService.createPortalSession(req.user.uid);
  }

  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  @Get('status')
  @ApiOperation({ summary: "Statut de l'abonnement de l'utilisateur" })
  @ApiResponse({ status: 200, description: '{ plan, planExpiresAt, isActive }' })
  async getStatus(@Request() req) {
    return this.paymentService.getStatus(req.user.uid);
  }

  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  @Get('billing')
  @ApiOperation({ summary: "Détails complets de l'abonnement + historique paiements" })
  @ApiResponse({ status: 200, description: 'Billing info with transaction history' })
  async getBilling(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentService.getBilling(
      req.user.uid,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
