'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Crown, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

const PLAN_DETAILS: Record<string, { name: string; icon: typeof Crown; color: string; features: string[] }> = {
    PLUS: {
        name: 'Plus',
        icon: Zap,
        color: 'text-blue-600 bg-blue-100',
        features: ['Voir qui a consulté votre profil', 'Badge vérifié', 'Filtres avancés'],
    },
    PRO: {
        name: 'Pro',
        icon: Crown,
        color: 'text-kezak-primary bg-kezak-light',
        features: ['Tout Plus +', 'Statistiques détaillées', 'Priorité dans le feed', 'Contact illimité'],
    },
    ELITE: {
        name: 'Elite',
        icon: Shield,
        color: 'text-purple-600 bg-purple-100',
        features: ['Tout Pro +', 'Mode invisible', 'Support prioritaire', 'Matching IA avancé'],
    },
};

export default function PaymentSuccessPage() {
    const { refreshDbUser } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [planKey, setPlanKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                    {details ? `Votre plan ${details.name} est actif !` : 'Paiement réussi !'}
                </h1>

                <p className="text-gray-500 mb-6">
                    Merci pour votre confiance. Profitez de toutes vos nouvelles fonctionnalités.
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
                    Accéder au feed
                </Link>
            </div>
        </div>
    );
}
