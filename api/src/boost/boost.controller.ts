import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PlanGuard } from '../payment/guards/plan.guard';
import { RequiresPlan } from '../payment/decorators/requires-plan.decorator';
import { UserPlan } from '@prisma/client';
import { BoostService } from './boost.service';

@Controller('boost')
export class BoostController {
  constructor(private readonly boostService: BoostService) {}

  @UseGuards(FirebaseAuthGuard, PlanGuard)
  @RequiresPlan(UserPlan.PRO)
  @Post(':projectId')
  async activateBoost(@Request() req, @Param('projectId') projectId: string) {
    return this.boostService.activateBoost(req.user.uid, projectId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('remaining')
  async getRemainingBoosts(@Request() req) {
    return this.boostService.getRemainingBoosts(req.user.uid);
  }
}
