'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Reveal } from './reveal';
import { useTranslation } from '@/context/i18n-context';

export function WhyMojiraxSection() {
  const { t } = useTranslation();

  const points = [
    t('landing.why_point_1'),
    t('landing.why_point_2'),
    t('landing.why_point_3'),
  ];

  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Images grid — hidden on mobile */}
          <Reveal animation="fade-right" duration={900}>
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-5">
                  <Image
                    src="https://images.unsplash.com/photo-1613592237018-bbf8973eef4f?w=500&h=700&fit=crop&auto=format&q=80"
                    alt="Fondatrice africaine en réflexion stratégique"
                    width={500}
                    height={700}
                    className="w-full h-72 object-cover rounded-3xl shadow-xl"
                  />
                  <Image
                    src="https://images.unsplash.com/photo-1739298061740-5ed03045b280?w=900&h=640&fit=crop&auto=format&q=80"
                    alt="Équipe africaine en réunion de travail"
                    width={900}
                    height={640}
                    className="w-full h-56 object-cover rounded-3xl shadow-xl translate-x-8"
                  />
                </div>
                <div className="pt-10">
                  <Image
                    src="https://images.unsplash.com/photo-1655720357761-f18ea9e5e7e6?w=500&h=900&fit=crop&auto=format&q=80"
                    alt="Cofondateurs africains en collaboration"
                    width={500}
                    height={900}
                    className="w-full h-[30rem] object-cover rounded-3xl shadow-xl -translate-x-8"
                  />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-kezak-accent/5 rounded-[42%_58%_70%_30%/45%_45%_55%_55%] -z-10" />
            </div>
          </Reveal>

          {/* Text */}
          <div>
            <Reveal animation="fade-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-gray-900">
                {t('landing.why_title_1')}{' '}
                <span className="text-kezak-primary">
                  {t('landing.why_title_highlight')}
                </span>
              </h2>
            </Reveal>
            <Reveal animation="fade-up" delay={150}>
              <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
                {t('landing.why_subtitle')}
              </p>
            </Reveal>
            <ul className="space-y-4 mb-10">
              {points.map((point, i) => (
                <Reveal key={point} animation="fade-left" delay={300 + i * 120}>
                  <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-gray-700">{point}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
            <Reveal animation="fade-up" delay={700}>
              <Link
                href="/login"
                className="inline-flex h-[48px] px-8 rounded-lg bg-kezak-primary text-white font-semibold items-center hover:bg-kezak-dark transition-all duration-200 shadow-lg shadow-kezak-primary/20 hover:-translate-y-0.5"
              >
                {t('landing.why_cta')}
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
