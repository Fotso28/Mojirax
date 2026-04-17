'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/context/i18n-context';

export function NativeAd() {
    const { t } = useTranslation();

    return (
        <article className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {t('dashboard.native_ad_sponsored')}
            </div>

            <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-kezak-primary flex items-center justify-center text-white font-bold shrink-0">
                    MX
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{t('dashboard.native_ad_title')}</h3>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                        {t('dashboard.native_ad_desc')}
                    </p>
                    <a
                        href="/settings/billing"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-kezak-primary hover:text-kezak-dark"
                    >
                        {t('dashboard.native_ad_cta')} <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </article>
    );
}
