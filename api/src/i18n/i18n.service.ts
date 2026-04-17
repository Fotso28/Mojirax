import { Injectable } from '@nestjs/common';
import * as fr from './messages/fr.json';
import * as en from './messages/en.json';
import * as es from './messages/es.json';
import * as pt from './messages/pt.json';
import * as ar from './messages/ar.json';

export type Locale = 'fr' | 'en' | 'es' | 'pt' | 'ar';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'en', 'es', 'pt', 'ar'];

@Injectable()
export class I18nService {
  private messages: Record<Locale, Record<string, string>> = {
    fr: fr as Record<string, string>,
    en: en as Record<string, string>,
    es: es as Record<string, string>,
    pt: pt as Record<string, string>,
    ar: ar as Record<string, string>,
  };

  /**
   * Resolves the locale from the Accept-Language header.
   * Defaults to 'fr' (French) if no header or unrecognized.
   */
  resolveLocale(acceptLanguage?: string): Locale {
    if (!acceptLanguage) return 'fr';
    const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(lang as Locale)) return lang as Locale;
    return 'fr';
  }

  /**
   * Translates a message key with optional interpolation.
   * Falls back to French, then returns the raw key if not found.
   */
  t(
    key: string,
    locale: Locale = 'fr',
    params?: Record<string, string | number>,
  ): string {
    let msg =
      this.messages[locale]?.[key] ||
      this.messages['fr']?.[key] ||
      key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }

    return msg;
  }
}
