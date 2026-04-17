'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getPlanIntent, withPlanIntent } from '@/lib/utils/plan-intent';
import { Rocket, Compass, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/context/i18n-context';

export default function OnboardingStartPage() {
    return (
        <Suspense fallback={null}>
            <OnboardingStartContent />
        </Suspense>
    );
}

function OnboardingStartContent() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planIntent = getPlanIntent(searchParams);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = async () => {
        if (!selected || !user) return;

        setLoading(true);
        setError('');
        try {
            // Store intention in localStorage for post-onboarding redirect
            localStorage.setItem('onboarding_intention', selected);
            // Go to profile onboarding (same for everyone)
            const path = selected === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate';
            router.push(withPlanIntent(path, planIntent));
        } catch {
            setError(t('auth.error_generic'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-kezak-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-kezak-accent/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <div className="text-center mb-16">
                    <img src="/logo/logo.svg" alt="MojiraX" className="mx-auto h-12 w-12 mb-8 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold text-kezak-dark mb-4 tracking-tight">
                        {t('auth.what_do_you_want')}
                    </h1>
                    <p className="text-lg text-gray-500 max-w-xl mx-auto">
                        {t('auth.can_do_both_later_long')}
                    </p>
                </div>

                {error && (
                    <div className="mb-8 max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                    {[
                        { id: 'PUBLISH', label: t('auth.intention_publish_label'), description: t('auth.intention_publish_desc_alt'), icon: Rocket },
                        { id: 'SEARCH', label: t('auth.intention_search_label'), description: t('auth.intention_search_desc_alt'), icon: Compass },
                    ].map((item) => (
                        <div
                            key={item.id}
                            onClick={() => { setSelected(item.id); setError(''); }}
                            className={`
                                relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                                ${selected === item.id
                                    ? 'bg-white border-kezak-primary ring-4 ring-kezak-primary/10 shadow-xl scale-[1.02]'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300
                                    ${selected === item.id ? 'bg-kezak-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-kezak-light group-hover:text-kezak-primary'}
                                `}>
                                    <item.icon className="w-7 h-7" />
                                </div>
                                {selected === item.id && (
                                    <div className="text-kezak-primary">
                                        <CheckCircle className="w-6 h-6 fill-kezak-primary text-white" />
                                    </div>
                                )}
                            </div>

                            <h3 className={`text-xl font-bold mb-3 transition-colors ${selected === item.id ? 'text-kezak-dark' : 'text-gray-900'}`}>
                                {item.label}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button
                        onClick={handleContinue}
                        disabled={!selected || loading}
                        className="!h-14 !px-12 text-lg !rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {loading ? t('auth.submitting') : (
                            <>
                                {t('common.continue')} <ArrowRight className="ms-2 w-5 h-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
