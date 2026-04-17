'use client';

import { useAuth } from '@/context/auth-context';
import { Button, Input } from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import { getPlanIntent, withPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';
import { getFirebaseErrorMessage } from '@/utils/firebase-errors';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { Rocket, Compass, CheckCircle, ArrowRight, Zap, ShieldCheck, Users } from 'lucide-react';
import { CountrySelect } from '@/components/ui/country-select';
import { COUNTRIES } from '@/lib/constants/countries';
import { useTranslation } from '@/context/i18n-context';
import { useToast } from '@/context/toast-context';
import { logger } from '@/lib/logger';
import Image from 'next/image';

// Icons
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const LinkedInIcon = () => (
    <svg className="w-5 h-5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
);

const CoFounderLogo = () => (
    <div className="flex items-center gap-2">
        <img src="/logo/logo.svg" alt="MojiraX Logo" className="w-10 h-10 object-contain" />
        <span className="text-xl font-bold text-slate-900">Mojira<span className="text-kezak-primary">X</span></span>
    </div>
);

// Required-field marker. Visible asterisk for sighted users,
// translated hint for screen readers.
function RequiredMark({ t }: { t: (k: string) => string }) {
    return <span aria-label={t('common.required')} className="text-red-500 ms-0.5">*</span>;
}


// Next 16.2+ requires components that call useSearchParams() to be wrapped
// in a Suspense boundary to allow CSR bailout during SSG.
export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}

function LoginPageContent() {
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const router = useRouter();
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [step, setStep] = useState<'auth' | 'role'>('auth');
    const [selectedIntention, setSelectedIntention] = useState<string | null>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedCountry = COUNTRIES.find(c => c.label === country);
    const dialCode = selectedCountry?.dialCode || '';

    const searchParams = useSearchParams();
    const planIntent = getPlanIntent(searchParams);

    const justSignedUp = useRef(false);

    useEffect(() => {
        if (!loading && user && !justSignedUp.current) {
            const isNewGoogleUser = sessionStorage.getItem('google_new_user');
            if (isNewGoogleUser) {
                sessionStorage.removeItem('google_new_user');
                justSignedUp.current = true;
                setStep('role');
                return;
            }
            // Existing user with plan intent → go straight to checkout
            if (planIntent) {
                triggerCheckoutByPlanKey(planIntent).then((ok) => {
                    if (!ok) router.push('/');
                });
                return;
            }
            router.push('/');
        }
    }, [user, loading, router, planIntent]);

    const handleLogin = async () => {
        setError('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail) { setError(t('auth.error_email_required')); return; }
        if (!password) { setError(t('auth.error_password_required')); return; }

        setIsSubmitting(true);
        justSignedUp.current = false;
        try {
            await signInWithEmail(trimmedEmail, password);
            // Existing user with plan intent → go straight to checkout
            if (planIntent) {
                const ok = await triggerCheckoutByPlanKey(planIntent);
                if (!ok) router.push('/');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            logger.error("Login error:", err);
            setError(getFirebaseErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async () => {
        setError('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail) { setError(t('auth.error_email_required')); return; }
        if (!password || password.length < 6) { setError(t('auth.error_password_min')); return; }

        setIsSubmitting(true);
        justSignedUp.current = true;
        try {
            await signUpWithEmail(trimmedEmail, password);
            setStep('role');
        } catch (err: any) {
            justSignedUp.current = false;
            logger.error("Signup error:", err);
            setError(getFirebaseErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContinueIntention = async () => {
        if (!selectedIntention || !user) return;
        setIsUpdatingProfile(true);
        setError('');
        try {
            const fullAddress = [address, country].filter(Boolean).join(', ') || undefined;
            await axiosInstance.patch('/users/profile', {
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                phone: phone || undefined,
                address: fullAddress,
            });
            // Store intention for post-onboarding redirect
            localStorage.setItem('onboarding_intention', selectedIntention);
            const onboardingPath = selectedIntention === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate';
            router.push(withPlanIntent(onboardingPath, planIntent));
        } catch (error) {
            logger.error('Failed to update profile:', error);
            setError(t('auth.error_profile_update'));
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (authMode === 'signin') {
            handleLogin();
        } else {
            handleSignup();
        }
    };

    if (loading || (user && !justSignedUp.current)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans text-slate-900 selection:bg-kezak-light selection:text-kezak-dark overflow-hidden">
            {/* Section Gauche : Authentification */}
            <div className="flex flex-col h-full overflow-y-auto relative bg-white lg:shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] z-20">
                <div className="flex flex-col p-6 lg:p-14 max-w-[500px] mx-auto w-full min-h-full">
                    <header className="mb-10 lg:mb-12 pt-4">
                        <CoFounderLogo />
                    </header>

                    <main className="flex-1 flex flex-col justify-center relative pb-8">
                        {step === 'auth' ? (
                            <div className="w-full transition-all duration-500 animate-in fade-in zoom-in-95">
                                <div className="mb-8">
                                    <h1 className="text-3xl lg:text-[2rem] font-bold tracking-tight text-slate-900 mb-2 leading-tight">
                                        {authMode === 'signin' ? t('auth.welcome_back') : t('auth.create_account')}
                                    </h1>
                                    <p className="text-slate-500 font-medium text-[15px]">
                                        {t('auth.welcome_subtitle_text')} <span className="text-slate-900 font-semibold">MojiraX</span>{t('auth.welcome_subtitle_suffix')}
                                    </p>
                                </div>

                                {/* Tabs */}
                                <div className="bg-slate-50 border border-slate-100 p-1 rounded-xl flex mb-8">
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('signin'); setError(''); }}
                                        className={`flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-300 ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        {t('auth.tab_signin')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('signup'); setError(''); }}
                                        className={`flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-300 ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        {t('auth.tab_signup')}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Social */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <button type="button" onClick={signInWithGoogle} className="group flex items-center justify-center gap-3 h-[46px] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[14px] text-slate-700 shadow-sm hover:shadow">
                                            <GoogleIcon />
                                            <span>Google</span>
                                        </button>
                                        <button type="button" onClick={() => showToast(t('auth.linkedin_coming_soon'), 'warning')} className="group flex items-center justify-center gap-3 h-[46px] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[14px] text-slate-700 shadow-sm hover:shadow">
                                            <LinkedInIcon />
                                            <span>LinkedIn</span>
                                        </button>
                                    </div>

                                    <div className="relative flex items-center py-1">
                                        <div className="flex-grow border-t border-slate-100"></div>
                                        <span className="flex-shrink-0 mx-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('auth.or_email')}</span>
                                        <div className="flex-grow border-t border-slate-100"></div>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4.5">
                                        {error && (
                                            <div className="p-4 text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-top-2">
                                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                {error}
                                            </div>
                                        )}

                                        {authMode === 'signup' && (
                                            <div className="grid grid-cols-2 gap-3.5 mb-4.5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.first_name')}<RequiredMark t={t} /></label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400" placeholder={t('auth.first_name_placeholder')} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.last_name')}<RequiredMark t={t} /></label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400" placeholder={t('auth.last_name_placeholder')} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5 mb-4.5">
                                            <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.email_label')}<RequiredMark t={t} /></label>
                                            <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400" placeholder={t('auth.email_placeholder')} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>

                                        {authMode === 'signup' && (
                                            <>
                                                <div className="space-y-1.5 mb-4.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.country_label')}<RequiredMark t={t} /></label>
                                                    <CountrySelect
                                                        value={country}
                                                        onChange={(val) => {
                                                            setCountry(val);
                                                            const c = COUNTRIES.find(ct => ct.label === val);
                                                            if (c?.dialCode && !phone) {
                                                                setPhone(c.dialCode + ' ');
                                                            } else if (c?.dialCode && phone) {
                                                                // Replace existing dial code prefix
                                                                const oldCountry = selectedCountry;
                                                                if (oldCountry?.dialCode && phone.startsWith(oldCountry.dialCode)) {
                                                                    setPhone(c.dialCode + phone.slice(oldCountry.dialCode.length));
                                                                } else if (!phone.startsWith('+')) {
                                                                    setPhone(c.dialCode + ' ' + phone);
                                                                }
                                                            }
                                                        }}
                                                        placeholder={t('auth.country_placeholder')}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3.5 mb-4.5">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.phone_label')}<RequiredMark t={t} /></label>
                                                        <div className="relative flex items-center">
                                                            {dialCode && (
                                                                <span className="absolute left-4 text-[15px] text-slate-500 font-medium pointer-events-none">{dialCode}</span>
                                                            )}
                                                            <input
                                                                className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400"
                                                                style={{ paddingLeft: dialCode ? `${dialCode.length * 10 + 20}px` : '16px', paddingRight: '16px' }}
                                                                placeholder={dialCode ? t('auth.phone_placeholder') : t('auth.phone_placeholder_full')}
                                                                required
                                                                type="tel"
                                                                value={dialCode && phone.startsWith(dialCode) ? phone.slice(dialCode.length).trimStart() : phone}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setPhone(dialCode ? dialCode + ' ' + val.replace(/^\s+/, '') : val);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[13px] font-semibold text-slate-700 ms-1">{t('auth.city_label')}<RequiredMark t={t} /></label>
                                                        <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400" placeholder={t('auth.city_placeholder')} required value={address} onChange={(e) => setAddress(e.target.value)} />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center ms-1 mb-0.5">
                                                <label className="text-[13px] font-semibold text-slate-700">{t('auth.password_label')}<RequiredMark t={t} /></label>
                                                {authMode === 'signin' && (
                                                    <a href="#" className="text-[13px] font-semibold text-kezak-primary hover:text-kezak-dark hover:underline transition-colors">{t('auth.forgot_password')}</a>
                                                )}
                                            </div>
                                            <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all placeholder:text-slate-400 tracking-wider" placeholder={t('auth.password_placeholder')} required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        </div>

                                        <div className="pt-5">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full h-[52px] bg-kezak-primary hover:bg-kezak-dark text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:hover:bg-kezak-primary flex items-center justify-center shadow-lg shadow-kezak-primary/20 hover:shadow-xl hover:shadow-kezak-primary/30 hover:-translate-y-px"
                                            >
                                                {isSubmitting ? t('auth.submitting') : (authMode === 'signin' ? t('auth.submit_signin') : t('auth.submit_signup'))}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="text-center pt-3">
                                        <p className="text-slate-500 font-medium text-[14px]">
                                            {authMode === 'signup' ? t('auth.already_have_account') : t('auth.no_account')}
                                            <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError(''); }} className="text-kezak-primary font-bold hover:underline hover:text-kezak-dark transition-colors">
                                                {authMode === 'signup' ? t('auth.switch_to_signin') : t('auth.switch_to_signup')}
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full transition-all duration-500 animate-in slide-in-from-right-8 fade-in">
                                <div className="text-center mb-10">
                                    <h2 className="text-[28px] font-bold tracking-tight text-slate-900 mb-2">{t('auth.what_do_you_want')}</h2>
                                    <p className="text-slate-500 font-medium text-[15px]">{t('auth.can_do_both_later')}</p>
                                </div>
                                <div className="space-y-4 mb-8">
                                    {[
                                        { id: 'PUBLISH', label: t('auth.intention_publish_label'), description: t('auth.intention_publish_desc'), icon: Rocket },
                                        { id: 'SEARCH', label: t('auth.intention_search_label'), description: t('auth.intention_search_desc'), icon: Compass },
                                    ].map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedIntention(item.id)}
                                            className={`relative p-5 rounded-2xl border-[2px] cursor-pointer transition-all duration-200 group flex items-start gap-4 bg-white
                                                ${selectedIntention === item.id ? 'border-kezak-primary shadow-md outline outline-4 outline-kezak-light/50 scale-[1.01]' : 'border-slate-200 hover:border-kezak-light hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedIntention === item.id ? 'bg-kezak-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-bold mb-1 tracking-tight ${selectedIntention === item.id ? 'text-slate-900' : 'text-slate-700'}`}>{item.label}</h3>
                                                <p className="text-slate-500 text-[14px] font-medium leading-relaxed">{item.description}</p>
                                            </div>
                                            {selectedIntention === item.id && (
                                                <div className="absolute top-5 right-5 text-kezak-primary animate-in zoom-in">
                                                    <CheckCircle className="w-5 h-5 bg-white rounded-full bg-blend-lighten" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleContinueIntention}
                                    disabled={!selectedIntention || isUpdatingProfile}
                                    className="w-full h-[52px] bg-kezak-primary hover:bg-kezak-dark text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-kezak-primary flex items-center justify-center gap-2 shadow-lg shadow-kezak-primary/20 hover:shadow-xl hover:-translate-y-px"
                                >
                                    {isUpdatingProfile ? t('auth.configuring') : t('common.continue')}
                                    {!isUpdatingProfile && <ArrowRight className="w-5 h-5 ms-1" />}
                                </button>
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={() => setStep('auth')}
                                        className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                                    >
                                        {t('auth.back_to_signup')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Section Droite : Mise en relation */}
            <div className="hidden lg:flex bg-gradient-to-b from-white to-slate-50 relative flex-col items-center justify-center p-12 overflow-hidden w-full h-full">
                {/* Subtle dot pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>

                <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
                    {/* Title */}
                    <h2 className="text-3xl lg:text-[36px] font-bold text-center text-slate-900 mb-3 leading-tight tracking-tight">
                        {t('auth.hero_title_start')}<span className="text-kezak-primary">{t('auth.hero_title_highlight')}</span>
                    </h2>
                    <p className="text-slate-500 text-center text-[15px] font-medium mb-12 max-w-sm leading-relaxed">
                        {t('auth.hero_subtitle')}
                    </p>

                    {/* Two profile cards with handshake */}
                    <div className="flex items-center gap-5 mb-14 w-full justify-center">
                        {/* Founder card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm w-[200px] animate-slide-in-left">
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-kezak-light flex-shrink-0 ring-2 ring-white shadow-sm">
                                    <Image
                                        src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=88&h=88&fit=crop&crop=faces&q=80"
                                        alt={t('auth.card_founder_name')}
                                        fill
                                        sizes="44px"
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-[14px] leading-tight">{t('auth.card_founder_name')}</p>
                                    <p className="text-[12px] text-slate-500 font-medium">{t('auth.card_founder_role')}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold bg-kezak-light text-kezak-dark px-2 py-0.5 rounded-md">FinTech</span>
                                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Douala</span>
                                </div>
                                <p className="text-[12px] text-slate-500 leading-relaxed">{t('auth.card_founder_desc')}</p>
                            </div>
                        </div>

                        {/* Handshake icon center */}
                        <div className="flex flex-col items-center gap-2 animate-pulse-slow">
                            <div className="w-14 h-14 rounded-full bg-kezak-primary flex items-center justify-center shadow-lg shadow-kezak-primary/25">
                                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-bold text-kezak-primary tracking-wide uppercase">Match</span>
                        </div>

                        {/* Candidate card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm w-[200px] animate-slide-in-right">
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 ring-2 ring-white shadow-sm">
                                    <Image
                                        src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=88&h=88&fit=crop&crop=faces&q=80"
                                        alt={t('auth.card_candidate_name')}
                                        fill
                                        sizes="44px"
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-[14px] leading-tight">{t('auth.card_candidate_name')}</p>
                                    <p className="text-[12px] text-slate-500 font-medium">{t('auth.card_candidate_role')}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">Dev Full-Stack</span>
                                </div>
                                <p className="text-[12px] text-slate-500 leading-relaxed">{t('auth.card_candidate_desc')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Match percentage bar */}
                    <div className="w-full max-w-xs mb-12">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[13px] font-semibold text-slate-700">{t('auth.compatibility')}</span>
                            <span className="text-[13px] font-bold text-kezak-primary">94%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-kezak-primary to-kezak-dark rounded-full animate-fill-bar" style={{ width: '94%' }}></div>
                        </div>
                    </div>

                    {/* 3 features */}
                    <div className="grid grid-cols-3 gap-6 w-full">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-kezak-light flex items-center justify-center">
                                <Zap className="w-5 h-5 text-kezak-primary" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-900 mb-0.5">{t('auth.feature_matching_title')}</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-snug">{t('auth.feature_matching_desc')}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-900 mb-0.5">{t('auth.feature_verified_title')}</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-snug">{t('auth.feature_verified_desc')}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-900 mb-0.5">{t('auth.feature_network_title')}</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-snug">{t('auth.feature_network_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fillBar {
                    from { width: 0%; }
                    to { width: 94%; }
                }
                .animate-slide-in-left {
                    animation: slideInLeft 0.8s ease-out both;
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.8s ease-out 0.2s both;
                }
                .animate-fill-bar {
                    animation: fillBar 1.5s ease-out 0.6s both;
                }
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
}
