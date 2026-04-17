'use client';

import { useEffect, useState } from 'react';
import { CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { PlanBadge } from '@/components/ui/plan-badge';
import { useTranslation } from '@/context/i18n-context';

interface PaymentStatus {
    plan: string;
    planExpiresAt: string | null;
    isActive: boolean;
}

export function SubscriptionSummary() {
    const { t, locale } = useTranslation();
    const [status, setStatus] = useState<PaymentStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AXIOS_INSTANCE.get('/payment/status')
            .then(({ data }) => setStatus(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
        );
    }

    if (!status) return null;

    const isFree = status.plan === 'FREE';
    const isExpired = !isFree && !status.isActive;

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-900 text-sm">{t('dashboard.subscription_title')}</h3>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <PlanBadge plan={status.plan} showFree />
                    {isExpired && (
                        <span className="text-xs text-red-500 font-medium">{t('dashboard.subscription_expired')}</span>
                    )}
                </div>

                {!isFree && status.planExpiresAt && (
                    <p className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                        {isExpired
                            ? t('dashboard.subscription_expired_on', { date: formatDate(status.planExpiresAt) })
                            : t('dashboard.subscription_renewal', { date: formatDate(status.planExpiresAt) })}
                    </p>
                )}

                {isFree && (
                    <p className="text-xs text-gray-500">{t('dashboard.subscription_free_plan')}</p>
                )}
            </div>

            <Link
                href="/settings/billing"
                className="mt-3 flex items-center gap-1 text-xs text-kezak-primary hover:underline font-medium"
            >
                {t('dashboard.subscription_manage')}
                <ArrowRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
