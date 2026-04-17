import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type SupportedLocale = 'fr' | 'en' | 'es' | 'pt' | 'ar';
const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'es', 'pt', 'ar'];

/**
 * Parameter decorator that extracts the locale from the Accept-Language header.
 * Usage: @Locale() locale: 'fr' | 'en' | 'es' | 'pt' | 'ar'
 */
export const Locale = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SupportedLocale => {
    const request = ctx.switchToHttp().getRequest();
    const acceptLanguage: string =
      request.headers['accept-language'] || 'fr';
    const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) return lang as SupportedLocale;
    return 'fr';
  },
);
