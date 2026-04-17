'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './reveal';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { localized } from '@/lib/utils/localized';

interface FaqItem {
  id: string;
  question: string | Record<string, string>;
  answer: string | Record<string, string>;
}

interface Props {
  faqs: FaqItem[];
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse"
        >
          <div className="h-5 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-bold text-gray-900 pr-4">{localized(item.question, locale)}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5 px-5' : 'max-h-0'}`}
      >
        <p className="text-gray-600 leading-relaxed text-sm">{localized(item.answer, locale)}</p>
      </div>
    </div>
  );
}

export function FaqSection({ faqs, loading }: Props) {
  const { t } = useTranslation();

  return (
    <section id="faq" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('landing.faq_title')}
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              {t('landing.faq_subtitle')}
            </p>
          </div>
        </Reveal>

        {loading ? (
          <Skeleton />
        ) : faqs.length === 0 ? null : (
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={faq.id} animation="fade-up" delay={i * 100}>
                <FaqAccordionItem item={faq} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
