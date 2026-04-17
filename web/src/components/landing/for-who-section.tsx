'use client';

import { Lightbulb, TrendingUp, Globe } from 'lucide-react';
import { Reveal } from './reveal';
import { useTranslation } from '@/context/i18n-context';

export function ForWhoSection() {
  const { t } = useTranslation();

  const personas = [
    {
      icon: Lightbulb,
      title: t('landing.for_who_persona_1_title'),
      description: t('landing.for_who_persona_1_desc'),
      hoverBg: 'hover:bg-kezak-primary',
    },
    {
      icon: TrendingUp,
      title: t('landing.for_who_persona_2_title'),
      description: t('landing.for_who_persona_2_desc'),
      hoverBg: 'hover:bg-kezak-accent',
    },
    {
      icon: Globe,
      title: t('landing.for_who_persona_3_title'),
      description: t('landing.for_who_persona_3_desc'),
      hoverBg: 'hover:bg-gray-900',
    },
  ];

  return (
    <section id="for-who" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('landing.for_who_title')}
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              {t('landing.for_who_subtitle')}
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {personas.map((p, i) => (
            <Reveal key={p.title} animation="fade-up" delay={i * 150}>
              <div
                className={`group p-8 lg:p-10 rounded-2xl bg-gray-50 ${p.hoverBg} hover:text-white transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="w-14 h-14 bg-kezak-primary/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-6 transition-colors">
                  <p.icon className="w-6 h-6 text-kezak-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                <p className="text-gray-500 group-hover:text-white/80 leading-relaxed text-sm">
                  {p.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
