import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LandingService } from './landing.service';
import { I18nService, Locale } from '../i18n/i18n.service';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(
    private readonly landingService: LandingService,
    private readonly i18nService: I18nService,
  ) {}

  @Get('plans')
  getPlans(@Headers('accept-language') acceptLanguage?: string) {
    const locale: Locale = this.i18nService.resolveLocale(acceptLanguage);
    return this.landingService.getPlans(locale);
  }

  @Get('faq')
  getFaq(@Headers('accept-language') acceptLanguage?: string) {
    const locale: Locale = this.i18nService.resolveLocale(acceptLanguage);
    return this.landingService.getFaq(locale);
  }

  @Get('testimonials')
  getTestimonials(@Headers('accept-language') acceptLanguage?: string) {
    const locale: Locale = this.i18nService.resolveLocale(acceptLanguage);
    return this.landingService.getTestimonials(locale);
  }
}
