import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, Request, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdsService } from './ads.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateAdDto, UpdateAdDto, ListAdsDto, UpdateAdConfigDto,
} from './dto/ads.dto';

@Controller('admin/ads')
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdsAdminController {
  constructor(
    private readonly adsService: AdsService,
    private readonly uploadService: UploadService,
  ) {}

  // Routes statiques AVANT les routes paramétrées

  @Get()
  listAds(@Query() dto: ListAdsDto) {
    return this.adsService.listAds(dto);
  }

  @Get('config')
  getConfig() {
    return this.adsService.getConfig();
  }

  @Patch('config')
  updateConfig(@Request() req, @Body() dto: UpdateAdConfigDto) {
    return this.adsService.updateConfig(req.user.dbId, dto);
  }

  @Post()
  createAd(@Request() req, @Body() dto: CreateAdDto) {
    return this.adsService.createAd(req.user.dbId, dto);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG ou WebP.'), false);
      }
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('placement') placement: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    const validPlacements = ['FEED', 'SIDEBAR', 'SEARCH'];
    if (!placement || !validPlacements.includes(placement)) {
      throw new BadRequestException('Placement invalide.');
    }
    const identifier = `ad-${Date.now()}`;
    const url = await this.uploadService.uploadAdImage(identifier, file.buffer, placement);
    return { url };
  }

  // Routes paramétrées APRÈS

  @Get(':id/stats')
  getAdStats(@Param('id') id: string) {
    return this.adsService.getAdStats(id);
  }

  @Patch(':id')
  updateAd(@Request() req, @Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.adsService.updateAd(req.user.dbId, id, dto);
  }

  @Delete(':id')
  deleteAd(@Request() req, @Param('id') id: string) {
    return this.adsService.deleteAd(req.user.dbId, id);
  }
}
