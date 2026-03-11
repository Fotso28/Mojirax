import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseAuthOptionalGuard } from '../auth/firebase-auth-optional.guard';
import { AdsService } from './ads.service';
import { TrackAdEventDto } from './dto/ads.dto';

@Throttle({ default: { ttl: 60000, limit: 30 } })
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @UseGuards(FirebaseAuthOptionalGuard)
  @Get('feed')
  async getFeedAds(@Request() req) {
    const visitor = await this.adsService.buildVisitorProfile(req.user?.uid || null);
    return this.adsService.getFeedAds(visitor);
  }

  @UseGuards(FirebaseAuthOptionalGuard)
  @Get('sidebar')
  async getSidebarAds(@Request() req) {
    const visitor = await this.adsService.buildVisitorProfile(req.user?.uid || null);
    return this.adsService.getSidebarAds(visitor);
  }

  @UseGuards(FirebaseAuthOptionalGuard)
  @Get('banner')
  async getBannerAd(@Request() req) {
    const visitor = await this.adsService.buildVisitorProfile(req.user?.uid || null);
    return this.adsService.getBannerAd(visitor);
  }

  @UseGuards(FirebaseAuthOptionalGuard)
  @Get('search')
  async getSearchAds(@Request() req) {
    const visitor = await this.adsService.buildVisitorProfile(req.user?.uid || null);
    return this.adsService.getSearchAds(visitor);
  }

  @UseGuards(FirebaseAuthOptionalGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Post('event')
  async trackEvent(@Request() req, @Body() dto: TrackAdEventDto) {
    const userId = req.user?.uid || null;
    // Résoudre l'ID interne si connecté
    let internalUserId: string | null = null;
    if (userId) {
      const visitor = await this.adsService.buildVisitorProfile(userId);
      internalUserId = visitor.userId;
    }
    await this.adsService.trackEvent(dto, internalUserId);
    return { success: true };
  }
}
