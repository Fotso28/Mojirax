'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Loader2 } from 'lucide-react';
import { Reveal } from './reveal';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { useToast } from '@/context/toast-context';
import { localized, localizedArray } from '@/lib/utils/localized';

interface PricingPlan {
  id: string;
  name: string | Record<string, string>;
  price: number;
  period: string | Record<string, string>;
  currency: string;
  description: string | Record<string, string> | null;
  features: string[] | Record<string, string[]>;
  isPopular: boolean;
  ctaLabel: string | Record<string, string>;
  planKey: string | null;
}

interface Props {
  plans: PricingPlan[];
  loading: boolean;
}

function formatPrice(price: number): string {
  if (price === 0) return '0';
  return price.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 rounded-2xl p-8 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-3 bg-gray-200 rounded w-3/4 mb-6" />
          <div className="space-y-3 mb-6">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-3 bg-gray-200 rounded w-4/5" />
            ))}
          </div>
          <div className="h-11 bg-gray-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PricingSection({ plans, loading }: Props) {
  const { dbUser } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const locale = useLocale();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    try {
      setLoadingPlanId(planId);
      const { data } = await AXIOS_INSTANCE.post('/payment/checkout', { planId });
      window.location.href = data.url;
    } catch (err: any) {
      showToast(err.response?.data?.message || t('landing.pricing_payment_error'), 'error');
      setLoadingPlanId(null);
    }
  };

  const gridCols =
    plans.length <= 2
      ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
      : plans.length === 3
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto';

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('landing.pricing_title')}
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              {t('landing.pricing_subtitle')}
            </p>
          </div>
        </Reveal>

        {loading ? (
          <Skeleton />
        ) : plans.length === 0 ? null : (
          <div className={`grid gap-6 ${gridCols}`}>
            {plans.map((plan, i) => (
              <Reveal key={plan.id} animation="scale-up" delay={i * 150}>
                <div
                  className={`p-8 rounded-2xl flex flex-col transition-all duration-300 h-full ${
                    plan.isPopular
                      ? 'border-2 border-kezak-primary shadow-xl lg:scale-105 bg-white relative'
                      : 'bg-gray-50 border border-gray-100 hover:shadow-lg'
                  }`}
                >
                  {plan.isPopular && (
                    <span className="absolute top-5 right-5 bg-kezak-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wide">
                      {t('landing.pricing_popular')}
                    </span>
                  )}
                  <h3 className="text-lg font-bold mb-2">{localized(plan.name, locale)}</h3>
                  <div className="mb-1">
                    <span className="text-3xl font-black text-gray-900">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-base text-gray-400 font-normal ml-1">
                      €
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-gray-400 font-medium">
                        /{localized(plan.period, locale)}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      {localized(plan.description, locale)}
                    </p>
                  )}
                  {!plan.description && <div className="mb-6" />}
                  <div className="space-y-3 mb-8 flex-grow">
                    {localizedArray(plan.features, locale).map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2.5 text-gray-600"
                      >
                        <CircleCheck className="w-4 h-4 text-kezak-primary flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                  {plan.planKey === 'FREE' ? (
                    <Link
                      href="/register"
                      className={`w-full h-11 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 text-sm ${
                        plan.isPopular
                          ? 'bg-kezak-primary text-white hover:bg-kezak-dark shadow-lg shadow-kezak-primary/20'
                          : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary hover:text-white'
                      }`}
                    >
                      {localized(plan.ctaLabel, locale)}
                    </Link>
                  ) : dbUser && dbUser.plan === plan.planKey ? (
                    <button
                      disabled
                      className="w-full h-11 rounded-lg font-semibold flex items-center justify-center text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      {t('landing.pricing_current_plan')}
                    </button>
                  ) : dbUser ? (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loadingPlanId === plan.id}
                      className={`w-full h-11 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 text-sm ${
                        plan.isPopular
                          ? 'bg-kezak-primary text-white hover:bg-kezak-dark shadow-lg shadow-kezak-primary/20'
                          : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary hover:text-white'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {loadingPlanId === plan.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        localized(plan.ctaLabel, locale)
                      )}
                    </button>
                  ) : (
                    <Link
                      href={`/login?plan=${plan.planKey}`}
                      className={`w-full h-11 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 text-sm ${
                        plan.isPopular
                          ? 'bg-kezak-primary text-white hover:bg-kezak-dark shadow-lg shadow-kezak-primary/20'
                          : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary hover:text-white'
                      }`}
                    >
                      {localized(plan.ctaLabel, locale)}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
