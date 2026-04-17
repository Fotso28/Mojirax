'use client';

import Link from 'next/link';
import { Reveal } from './reveal';
import { useTranslation } from '@/context/i18n-context';

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <Reveal animation="scale-up" duration={800}>
        <div className="max-w-6xl mx-auto rounded-[2rem] lg:rounded-[3rem] bg-gradient-to-br from-kezak-primary to-kezak-accent p-10 md:p-16 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          {/* Background decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {t('landing.cta_title')}
            </h2>
            <p className="text-base sm:text-lg opacity-80 mb-10 max-w-lg mx-auto">
              {t('landing.cta_subtitle')}
            </p>
            <Link
              href="/login"
              className="inline-flex bg-white text-kezak-primary px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              {t('landing.cta_button')}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
