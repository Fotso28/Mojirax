'use client';

import { useAuth } from '@/context/auth-context';
import { Button, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getFirebaseErrorMessage } from '@/utils/firebase-errors';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { Rocket, Compass, CheckCircle, ArrowRight } from 'lucide-react';

const roles = [
    {
        id: 'FOUNDER',
        label: 'Je suis un Fondateur',
        description: 'J\'ai une vision et je cherche des partenaires pour la concrétiser.',
        icon: Rocket,
    },
    {
        id: 'CANDIDATE',
        label: 'Je suis un Candidat',
        description: 'Je veux rejoindre un projet ambitieux en tant que co-fondateur technique ou business.',
        icon: Compass,
    }
];

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
        <span className="text-xl font-bold text-slate-900">Mojira<span className="text-blue-600">X</span></span>
    </div>
);

const slides = [
    {
        title: "Le Hub Premium pour les Fondateurs au Cameroun",
        description: "MojiraX : Là où les fondateurs se connectent. Propulser la prochaine génération de startups camerounaises.",
        icon: (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )
    },
    {
        title: "Trouvez votre Co-fondateur Idéal",
        description: "Utilisez notre algorithme de matching pour trouver des partenaires qui partagent votre vision.",
        icon: (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    },
    {
        title: "Élargissez votre Réseau Elite",
        description: "Rejoignez une communauté d'entrepreneurs passionnés et accédez à des opportunités uniques.",
        icon: (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )
    }
];

export default function LoginPage() {
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const router = useRouter();
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [step, setStep] = useState<'auth' | 'role'>('auth');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const justSignedUp = useRef(false);

    useEffect(() => {
        if (!loading && user && !justSignedUp.current) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = async () => {
        setError('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail) { setError('Veuillez entrer une adresse email.'); return; }
        if (!password) { setError('Veuillez entrer votre mot de passe.'); return; }

        setIsSubmitting(true);
        justSignedUp.current = false;
        try {
            await signInWithEmail(trimmedEmail, password);
            router.push('/');
        } catch (err: any) {
            console.error("Login error:", err);
            setError(getFirebaseErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async () => {
        setError('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail) { setError('Veuillez entrer une adresse email.'); return; }
        if (!password || password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

        setIsSubmitting(true);
        justSignedUp.current = true;
        try {
            await signUpWithEmail(trimmedEmail, password);
            setStep('role');
        } catch (err: any) {
            justSignedUp.current = false;
            console.error("Signup error:", err);
            setError(getFirebaseErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContinueRole = async () => {
        if (!selectedRole || !user) return;
        setIsUpdatingRole(true);
        setError('');
        try {
            await axiosInstance.patch('/users/profile', { role: selectedRole });
            router.push(selectedRole === 'FOUNDER' ? '/onboarding/founder' : '/onboarding/candidate');
        } catch (error) {
            console.error('Failed to update role:', error);
            setError('Une erreur est survenue lors de la mise à jour du rôle.');
        } finally {
            setIsUpdatingRole(false);
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
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
                                        {authMode === 'signin' ? 'Bon retour' : 'Créer un compte'}
                                    </h1>
                                    <p className="text-slate-500 font-medium text-[15px]">
                                        Bienvenue sur <span className="text-slate-900 font-semibold">MojiraX</span>, le hub exclusif des fondateurs.
                                    </p>
                                </div>

                                {/* Tabs */}
                                <div className="bg-slate-50 border border-slate-100 p-1 rounded-xl flex mb-8">
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('signin'); setError(''); }}
                                        className={`flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-300 ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        Connexion
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('signup'); setError(''); }}
                                        className={`flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-300 ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        Inscription
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Social */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <button type="button" onClick={signInWithGoogle} className="group flex items-center justify-center gap-3 h-[46px] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[14px] text-slate-700 shadow-sm hover:shadow">
                                            <GoogleIcon />
                                            <span>Google</span>
                                        </button>
                                        <button type="button" onClick={() => alert('LinkedIn login coming soon')} className="group flex items-center justify-center gap-3 h-[46px] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[14px] text-slate-700 shadow-sm hover:shadow">
                                            <LinkedInIcon />
                                            <span>LinkedIn</span>
                                        </button>
                                    </div>

                                    <div className="relative flex items-center py-1">
                                        <div className="flex-grow border-t border-slate-100"></div>
                                        <span className="flex-shrink-0 mx-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ou email</span>
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
                                                    <label className="text-[13px] font-semibold text-slate-700 ml-1">Prénom</label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ml-1">Nom</label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5 mb-4.5">
                                            <label className="text-[13px] font-semibold text-slate-700 ml-1">Adresse Email</label>
                                            <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="nom@entreprise.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>

                                        {authMode === 'signup' && (
                                            <div className="grid grid-cols-2 gap-3.5 mb-4.5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ml-1">Téléphone</label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="+237 600 000 000" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[13px] font-semibold text-slate-700 ml-1">Ville</label>
                                                    <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="Douala" required value={address} onChange={(e) => setAddress(e.target.value)} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center ml-1 mb-0.5">
                                                <label className="text-[13px] font-semibold text-slate-700">Mot de passe</label>
                                                {authMode === 'signin' && (
                                                    <a href="#" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">Mot de passe oublié ?</a>
                                                )}
                                            </div>
                                            <input className="flex h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 tracking-wider" placeholder="••••••••" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        </div>

                                        <div className="pt-5">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full h-[48px] bg-[#0D6EFD] hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:hover:bg-[#0D6EFD] flex items-center justify-center shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-px"
                                            >
                                                {isSubmitting ? 'Traitement...' : (authMode === 'signin' ? 'Accéder au Dashboard' : "Créer le compte")}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="text-center pt-3">
                                        <p className="text-slate-500 font-medium text-[14px]">
                                            {authMode === 'signup' ? 'Vous avez déjà un compte ? ' : 'Vous n\'avez pas de compte ? '}
                                            <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError(''); }} className="text-blue-600 font-bold hover:underline hover:text-blue-700 transition-colors">
                                                {authMode === 'signup' ? 'Connectez-vous' : 'Inscrivez-vous'}
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full transition-all duration-500 animate-in slide-in-from-right-8 fade-in">
                                <div className="text-center mb-10">
                                    <h2 className="text-[28px] font-bold tracking-tight text-slate-900 mb-2">Configurez votre profil</h2>
                                    <p className="text-slate-500 font-medium text-[15px]">Sélectionnez votre rôle pour personnaliser l'expérience.</p>
                                </div>
                                <div className="space-y-4 mb-8">
                                    {roles.map((role) => (
                                        <div
                                            key={role.id}
                                            onClick={() => setSelectedRole(role.id)}
                                            className={`relative p-5 rounded-2xl border-[2px] cursor-pointer transition-all duration-200 group flex items-start gap-4 bg-white
                                                ${selectedRole === role.id ? 'border-blue-600 shadow-md outline outline-4 outline-blue-50/50 scale-[1.01]' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedRole === role.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                <role.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-bold mb-1 tracking-tight ${selectedRole === role.id ? 'text-slate-900' : 'text-slate-700'}`}>{role.label}</h3>
                                                <p className="text-slate-500 text-[14px] font-medium leading-relaxed">{role.description}</p>
                                            </div>
                                            {selectedRole === role.id && (
                                                <div className="absolute top-5 right-5 text-blue-600 animate-in zoom-in">
                                                    <CheckCircle className="w-5 h-5 bg-white rounded-full bg-blend-lighten" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleContinueRole}
                                    disabled={!selectedRole || isUpdatingRole}
                                    className="w-full h-[48px] bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-px"
                                >
                                    {isUpdatingRole ? 'Configuration...' : 'Ouvrir mon tableau de bord'}
                                    {!isUpdatingRole && <ArrowRight className="w-5 h-5 ml-1" />}
                                </button>
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={() => setStep('auth')}
                                        className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                                    >
                                        Retour à l'inscription
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Section Droite : Showcase AI Premium */}
            <div className="hidden lg:flex bg-[#0B1121] relative flex-col items-center justify-center p-12 overflow-hidden w-full h-full border-l border-white/5">
                {/* Subtle Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.15]"></div>

                <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                    {/* Sleek AI Tag */}
                    <div className="mb-10 inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.03] border border-white/10 shadow-lg">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></div>
                        <span className="text-[13px] font-medium text-slate-300 tracking-[0.05em]">PROPULSÉ PAR STITCH AI</span>
                    </div>

                    <h2 className="text-5xl lg:text-[60px] font-bold text-center text-white mb-6 leading-[1.15] tracking-tight">
                        L'intelligence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#818CF8] to-[#C084FC]">
                            au service du design.
                        </span>
                    </h2>

                    <p className="text-xl text-slate-400 text-center leading-relaxed mb-16 max-w-[500px] font-light">
                        MojiraX intègre désormais des capacités avancées de génération d'interface. Créez, itérez et déployez à la vitesse de la pensée.
                    </p>

                    {/* Floating Premium Terminal Animation */}
                    <div className="w-full max-w-[600px] rounded-[1.25rem] bg-[#161B28] border border-white/10 shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/5">
                        {/* Terminal Header */}
                        <div className="h-11 border-b border-white/[0.08] flex items-center px-4 relative bg-[#1A2133]/80">
                            <div className="flex gap-2 absolute left-4">
                                <div className="w-3 h-3 rounded-full bg-[#ED6A5E]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#F4BF4F]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#61C554]"></div>
                            </div>
                            <div className="flex-1 text-center font-mono text-[13px] text-slate-400/80 font-medium">
                                stitch-generate --ui
                            </div>
                        </div>

                        {/* Animated Code/Blocks */}
                        <div className="p-7 flex flex-col gap-6 bg-[#0E131F] shadow-inner">
                            {/* Header fake skeleton */}
                            <div className="flex gap-4 items-center">
                                <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/20 border border-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] flex-shrink-0"></div>
                                <div className="w-[42%] h-3.5 bg-white/[0.06] rounded-full"></div>
                                <div className="w-[42%] h-3.5 bg-white/[0.06] rounded-full"></div>
                            </div>

                            {/* Main large visualizer block */}
                            <div className="w-full h-48 bg-[#1B2338]/60 rounded-xl border border-white/[0.03] relative flex items-center justify-center shadow-inner mt-1 mb-2">
                                <div className="w-[72px] h-[72px] border-[4px] border-[#2A3654] border-l-[#3B82F6] rounded-full animate-spin"></div>
                            </div>

                            {/* Footer horizontal lines */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-6 bg-white/[0.04] rounded-md border border-white/[0.02]"></div>
                                <div className="h-6 bg-white/[0.04] rounded-md border border-white/[0.02]"></div>
                                <div className="h-6 bg-white/[0.04] rounded-md border border-white/[0.02]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes shimmer {
                    100% { background-position: -200% 0; }
                }
                .animate-blob {
                    animation: blob 10s infinite alternate ease-in-out;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .bg-shimmer {
                    background-image: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
                }
                .animate-shimmer {
                    animation: shimmer 2.5s infinite linear;
                }
            `}</style>
        </div>
    );
}
