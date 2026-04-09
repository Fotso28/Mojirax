'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { PlanBadge } from '@/components/ui/plan-badge';
import { HideRightSidebar } from '@/context/sidebar-context';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
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

const STATUS_CONFIG = {
    PAID: { label: 'Payé', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    FAILED: { label: 'Échoué', icon: XCircle, color: 'text-red-600 bg-red-50' },
    REFUNDED: { label: 'Remboursé', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
};

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
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);

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
                <p className="text-gray-500 text-center">Impossible de charger les informations de facturation.</p>
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
                    <h1 className="text-2xl font-bold text-gray-900">Mon abonnement</h1>
                    <p className="text-sm text-gray-500">Gérez votre plan et consultez vos paiements</p>
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
                            <h2 className="font-bold text-gray-900">Plan gratuit</h2>
                            <p className="text-sm text-gray-500">Vous utilisez actuellement le plan gratuit</p>
                        </div>
                    </div>
                    <Link
                        href="/#pricing"
                        className="inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                    >
                        Découvrir nos offres
                    </Link>
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
                                    <h2 className="font-bold text-gray-900">Plan {billing.plan}</h2>
                                    <PlanBadge plan={billing.plan} showFree />
                                </div>
                                {billing.planStartedAt && (
                                    <p className="text-sm text-gray-500">
                                        Membre depuis le {formatDate(billing.planStartedAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                                <XCircle className="w-3 h-3" />
                                Expiré
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Actif
                            </span>
                        )}
                    </div>

                    {billing.planExpiresAt && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl ${isExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-gray-400'}`} />
                            <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                                {isExpired
                                    ? `Expiré le ${formatDate(billing.planExpiresAt)}`
                                    : `Prochain renouvellement le ${formatDate(billing.planExpiresAt)}`}
                            </span>
                        </div>
                    )}

                    {isExpired && (
                        <Link
                            href="/#pricing"
                            className="mt-4 inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                        >
                            Renouveler
                        </Link>
                    )}
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Historique des paiements</h2>
                </div>

                {billing.transactions.length === 0 ? (
                    <div className="p-6 text-center">
                        <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Aucun paiement</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Montant</th>
                                        <th className="px-6 py-3">Statut</th>
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
                                    Page {billing.pagination.page} sur {billing.pagination.totalPages}
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
