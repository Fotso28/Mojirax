'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { PlanBadge } from '@/components/ui/plan-badge';
import { HideRightSidebar } from '@/context/sidebar-context';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { useToast } from '@/context/toast-context';
import { localized, localizedArray } from '@/lib/utils/localized';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface BillingTransaction {
    id: string;
    amount: number;
    currency: string;
    status: 'PAID' | 'FAILED' | 'REFUNDED';
    createdAt: string;
}

interface BillingData {
    plan: string;
    planStartedAt: string | null;
    planExpiresAt: string | null;
    isActive: boolean;
    transactions: BillingTransaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

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

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(amount);
}

export default function BillingPage() {
    const { user: firebaseUser, loading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const locale = useLocale();
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    const STATUS_CONFIG = useMemo(() => ({
        PAID: { label: t('common.status_paid'), icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
        FAILED: { label: t('common.status_failed'), icon: XCircle, color: 'text-red-600 bg-red-50' },
        REFUNDED: { label: t('common.status_refunded'), icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
    }), [t]);

    const fetchPlans = async () => {
        try {
            const { data } = await AXIOS_INSTANCE.get('/landing/plans');
            setPlans(data);
        } catch {
            // Plans fetch failed
        }
    };

    const handleSubscribe = async (planId: string) => {
        try {
            setLoadingPlanId(planId);
            const { data } = await AXIOS_INSTANCE.post('/payment/checkout', { planId });
            window.location.href = data.url;
        } catch (err: any) {
            showToast(err.response?.data?.message || t('dashboard.billing_payment_error'), 'error');
            setLoadingPlanId(null);
        }
    };

    const fetchBilling = async (p: number) => {
        try {
            const { data } = await AXIOS_INSTANCE.get(`/payment/billing?page=${p}&limit=20`);
            setBilling(data);
            setPage(p);
        } catch {
            // Billing fetch failed
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthLoading) {
            if (firebaseUser) {
                fetchBilling(1);
                fetchPlans();
            } else {
                setIsLoading(false);
            }
        }
    }, [firebaseUser, isAuthLoading]);

    if (isAuthLoading || (firebaseUser && isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
            </div>
        );
    }

    if (!firebaseUser) {
        router.replace('/login');
        return null;
    }

    if (!billing) {
        return (
            <div className="max-w-3xl mx-auto py-10 px-4">
                <p className="text-gray-500 text-center">{t('dashboard.billing_load_error')}</p>
            </div>
        );
    }

    const isFree = billing.plan === 'FREE';
    const isExpired = !isFree && !billing.isActive;

    return (
        <div className="max-w-3xl mx-auto pb-20">
            <HideRightSidebar />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/profile"
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.billing_title')}</h1>
                    <p className="text-sm text-gray-500">{t('dashboard.billing_subtitle')}</p>
                </div>
            </div>

            {/* Plan Card */}
            {isFree ? (
                /* FREE plan card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">{t('dashboard.billing_free_plan')}</h2>
                            <p className="text-sm text-gray-500">{t('dashboard.billing_free_plan_description')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                    >
                        {t('dashboard.billing_discover_offers')}
                    </button>
                </div>
            ) : (
                /* Paid plan card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-kezak-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-gray-900">{t('dashboard.billing_plan_name', { name: billing.plan })}</h2>
                                    <PlanBadge plan={billing.plan} showFree />
                                </div>
                                {billing.planStartedAt && (
                                    <p className="text-sm text-gray-500">
                                        {t('dashboard.billing_member_since', { date: formatDate(billing.planStartedAt) })}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                                <XCircle className="w-3 h-3" />
                                {t('common.status_expired')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('common.status_active')}
                            </span>
                        )}
                    </div>

                    {billing.planExpiresAt && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl ${isExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-gray-400'}`} />
                            <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                                {isExpired
                                    ? t('dashboard.billing_expired_on', { date: formatDate(billing.planExpiresAt) })
                                    : t('dashboard.billing_next_renewal', { date: formatDate(billing.planExpiresAt) })}
                            </span>
                        </div>
                    )}

                    {isExpired && (
                        <button
                            onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="mt-4 inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                        >
                            {t('dashboard.billing_renew')}
                        </button>
                    )}
                </div>
            )}

            {/* Plans Section */}
            {plans.length > 0 && (
                <div id="plans-section" className="mb-6">
                    <h2 className="font-bold text-gray-900 mb-4">
                        {isFree || isExpired ? t('dashboard.billing_choose_plan') : t('dashboard.billing_change_plan')}
                    </h2>
                    <div className={`grid gap-4 ${
                        plans.length <= 2
                            ? 'grid-cols-1 md:grid-cols-2'
                            : plans.length === 3
                                ? 'grid-cols-1 md:grid-cols-3'
                                : 'grid-cols-1 md:grid-cols-2'
                    }`}>
                        {plans.map((plan) => {
                            const isCurrentPlan = billing && billing.plan === plan.planKey;
                            return (
                                <div
                                    key={plan.id}
                                    className={`p-5 rounded-2xl flex flex-col ${
                                        plan.isPopular
                                            ? 'border-2 border-kezak-primary shadow-md bg-white relative'
                                            : 'bg-gray-50 border border-gray-100'
                                    }`}
                                >
                                    {plan.isPopular && (
                                        <span className="absolute top-4 right-4 bg-kezak-primary text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wide">
                                            {t('common.popular')}
                                        </span>
                                    )}
                                    <h3 className="text-base font-bold mb-1">{localized(plan.name, locale)}</h3>
                                    <div className="mb-1">
                                        <span className="text-2xl font-black text-gray-900">
                                            {plan.price === 0 ? '0' : plan.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-sm text-gray-400 ml-1">&euro;</span>
                                        {plan.price > 0 && (
                                            <span className="text-xs text-gray-400">/{localized(plan.period, locale)}</span>
                                        )}
                                    </div>
                                    {plan.description && (
                                        <p className="text-xs text-gray-500 mb-3">{localized(plan.description, locale)}</p>
                                    )}
                                    <div className="space-y-2 mb-4 flex-grow">
                                        {localizedArray(plan.features, locale).map((feature) => (
                                            <div key={feature} className="flex items-start gap-2 text-gray-600">
                                                <CircleCheck className="w-3.5 h-3.5 text-kezak-primary flex-shrink-0 mt-0.5" />
                                                <span className="text-xs leading-snug">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {isCurrentPlan ? (
                                        <button
                                            disabled
                                            className="w-full h-10 rounded-lg font-semibold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                                        >
                                            {t('common.current_plan')}
                                        </button>
                                    ) : plan.planKey === 'FREE' ? (
                                        <div />
                                    ) : (
                                        <button
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={loadingPlanId === plan.id}
                                            className={`w-full h-10 rounded-lg font-semibold flex items-center justify-center text-sm transition-all ${
                                                plan.isPopular
                                                    ? 'bg-kezak-primary text-white hover:bg-kezak-dark shadow-lg shadow-kezak-primary/20'
                                                    : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary hover:text-white'
                                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                                        >
                                            {loadingPlanId === plan.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                localized(plan.ctaLabel, locale)
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">{t('dashboard.billing_payment_history')}</h2>
                </div>

                {billing.transactions.length === 0 ? (
                    <div className="p-6 text-center">
                        <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('common.no_payment')}</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">{t('common.date')}</th>
                                        <th className="px-6 py-3">{t('common.amount')}</th>
                                        <th className="px-6 py-3">{t('common.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {billing.transactions.map((tx) => {
                                        const cfg = STATUS_CONFIG[tx.status];
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {formatDate(tx.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {formatAmount(tx.amount, tx.currency)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile list */}
                        <div className="sm:hidden divide-y divide-gray-50">
                            {billing.transactions.map((tx) => {
                                const cfg = STATUS_CONFIG[tx.status];
                                const Icon = cfg.icon;
                                return (
                                    <div key={tx.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatAmount(tx.amount, tx.currency)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(tx.createdAt)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                            <Icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {billing.pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    {t('common.page_of', { page: billing.pagination.page, total: billing.pagination.totalPages })}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fetchBilling(page - 1)}
                                        disabled={page <= 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => fetchBilling(page + 1)}
                                        disabled={page >= billing.pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
