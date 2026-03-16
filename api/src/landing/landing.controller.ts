import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LandingService } from './landing.service';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get('plans')
  getPlans() {
    return this.landingService.getPlans();
  }

  @Get('faq')
  getFaq() {
    return this.landingService.getFaq();
  }

  @Get('testimonials')
  getTestimonials() {
    return this.landingService.getTestimonials();
  }
}
