'use client';

import { useEffect } from 'react';
import { useLocale } from '@/context/i18n-context';

const COOKIE_KEY = 'mojirax-lang';

export function HtmlLangUpdater() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    // Mirror to cookie so the next SSR render picks up the right locale
    // for <html lang/dir> and metadata before React hydrates.
    document.cookie = `${COOKIE_KEY}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }, [locale]);

  return null;
}
