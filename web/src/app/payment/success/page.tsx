'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Crown, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useTranslation } from '@/context/i18n-context';

function usePlanDetails() {
    const { t } = useTranslation();
    return {
        PLUS: {
            name: 'Plus',
            icon: Zap,
            color: 'text-blue-600 bg-blue-100',
            features: [t('landing.plan_plus_feat1'), t('landing.plan_plus_feat2'), t('landing.plan_plus_feat3')],
        },
        PRO: {
            name: 'Pro',
            icon: Crown,
            color: 'text-kezak-primary bg-kezak-light',
            features: [t('landing.plan_pro_feat1'), t('landing.plan_pro_feat2'), t('landing.plan_pro_feat3'), t('landing.plan_pro_feat4')],
        },
        ELITE: {
            name: 'Elite',
            icon: Shield,
            color: 'text-purple-600 bg-purple-100',
            features: [t('landing.plan_elite_feat1'), t('landing.plan_elite_feat2'), t('landing.plan_elite_feat3'), t('landing.plan_elite_feat4')],
        },
    } as Record<string, { name: string; icon: typeof Crown; color: string; features: string[] }>;
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={null}>
            <PaymentSuccessContent />
        </Suspense>
    );
}

function PaymentSuccessContent() {
    const { refreshDbUser } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [planKey, setPlanKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();
    const PLAN_DETAILS = usePlanDetails();

    useEffect(() => {
        async function fetchSession() {
            try {
                await refreshDbUser();
                const { data } = await AXIOS_INSTANCE.get('/payment/status');
                setPlanKey(data.plan);
            } catch {
                // Fallback — page still works without plan details
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-kezak-primary" />
            </div>
        );
    }

    const details = planKey ? PLAN_DETAILS[planKey] : null;
    const PlanIcon = details?.icon || CheckCircle;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-md w-full text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${details?.color || 'bg-green-100 text-green-600'}`}>
                    <PlanIcon size={32} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {details ? t('landing.payment_success_plan_active', { plan: details.name }) : t('landing.payment_success_generic')}
                </h1>

                <p className="text-gray-500 mb-6">
                    {t('landing.payment_success_desc')}
                </p>

                {details && (
                    <ul className="text-left space-y-2 mb-6">
                        {details.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                )}

                <Link
                    href="/feed"
                    className="inline-block w-full py-3 px-6 bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-colors"
                >
                    {t('landing.payment_success_cta')}
                </Link>
            </div>
        </div>
    );
}
