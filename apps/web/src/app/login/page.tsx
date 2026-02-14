'use client';

import { useAuth } from '@/context/auth-context';
import { Button, Divider, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getFirebaseErrorMessage } from '@/utils/firebase-errors';

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
        <span className="text-xl font-bold text-kezak-dark">MojiraX</span>
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

    // Auto-redirect removed to handle flow manually
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

        if (!trimmedEmail) {
            setError('Veuillez entrer une adresse email.');
            return;
        }
        if (!password) {
            setError('Veuillez entrer votre mot de passe.');
            return;
        }

        setIsSubmitting(true);
        // Ensure redirect happens via useEffect or manual push
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

        if (!trimmedEmail) {
            setError('Veuillez entrer une adresse email.');
            return;
        }
        if (!password || password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setIsSubmitting(true);
        justSignedUp.current = true; // Prevent auto-redirect to '/'
        try {
            await signUpWithEmail(trimmedEmail, password);
            // TODO: Handle additional profile info (firstName, lastName, phone, address)
            // ideally by saving to a user profile in Firestore or backend
            router.push('/onboarding/role');
        } catch (err: any) {
            justSignedUp.current = false; // Reset on error
            console.error("Signup error:", err);
            setError(getFirebaseErrorMessage(err));
        } finally {
            setIsSubmitting(false);
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

    if (loading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            {/* Section Gauche : Authentification */}
            <div className="flex flex-col h-full overflow-y-auto">
                <div className="flex flex-col p-8 lg:p-16 max-w-2xl mx-auto w-full min-h-full">
                    <header className="mb-12">
                        <CoFounderLogo />
                    </header>

                    <main className="flex-1 flex flex-col justify-center">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl lg:text-4xl font-bold text-kezak-dark mb-3">
                                {authMode === 'signin' ? 'Bienvenue' : 'Créer votre compte'}
                            </h1>
                            <p className="text-gray-500"><strong>MojiraX</strong>, Là où les fondateurs se connectent.</p>
                        </div>

                        {/* Bascule Connexion / Inscription */}
                        <div className="bg-gray-100 p-1.5 rounded-xl flex mb-8">
                            <button
                                onClick={() => { setAuthMode('signin'); setError(''); }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMode === 'signin' ? 'bg-white text-kezak-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Connexion
                            </button>
                            <button
                                onClick={() => { setAuthMode('signup'); setError(''); }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMode === 'signup' ? 'bg-white text-kezak-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Inscription
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Boutons Sociaux - PLACÉS EN PREMIER */}
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={signInWithGoogle} className="flex items-center justify-center gap-3 h-[52px] border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm">
                                    <GoogleIcon />
                                    Google
                                </button>
                                <button
                                    onClick={() => alert('LinkedIn login coming soon')}
                                    className="flex items-center justify-center gap-3 h-[52px] border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
                                >
                                    <LinkedInIcon />
                                    LinkedIn
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
                                </div>
                            </div>

                            {/* Formulaire - PLACÉ EN DEUXIÈME */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                {authMode === 'signup' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Prénom"
                                            placeholder="Votre prénom"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                        <Input
                                            label="Nom"
                                            placeholder="Votre nom"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                )}

                                <Input
                                    label="Adresse Email"
                                    placeholder="votre@email.com"
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                />

                                {authMode === 'signup' && (
                                    <>
                                        <Input
                                            label="Téléphone"
                                            placeholder="+237 6XX XXX XXX"
                                            required
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                        <Input
                                            label="Adresse"
                                            placeholder="Ville, Quartier"
                                            required
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </>
                                )}

                                <Input
                                    label="Mot de passe"
                                    placeholder="••••••••"
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                                />

                                <Button fullWidth disabled={isSubmitting} onClick={handleSubmit}>
                                    {isSubmitting ? 'Chargement...' : (authMode === 'signin' ? 'Se connecter' : "S'inscrire")}
                                </Button>
                            </form>
                        </div>
                    </main>

                    <footer className="mt-12 text-sm text-gray-400 py-4">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <span>Copyright : MojiraX, Tous droits réservés</span>
                            <a href="#" className="text-kezak-primary hover:underline">Conditions d'Utilisation</a>
                            <a href="#" className="text-kezak-primary hover:underline">Politique de Confidentialité</a>
                        </div>
                    </footer>
                </div>
            </div>

            {/* Section Droite : Carrousel Marketing */}
            <div className="hidden lg:flex flex-col h-full bg-kezak-dark relative overflow-hidden p-16 bg-grid-white overflow-y-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kezak-primary/10 blur-[120px] rounded-full"></div>

                <div className="relative z-10 w-full max-w-lg space-y-12 m-auto">
                    {/* Visual Showcase (Dynamic based on slide) */}
                    <div className="space-y-6">
                        <div className="glass p-6 rounded-2xl shadow-xl transform hover:-translate-y-1 transition-transform border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-white/70 text-sm">Project Match</span>
                                <span className="text-white/50 text-xs">Aujourd'hui</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full border-4 border-kezak-accent border-r-transparent flex items-center justify-center">
                                    <span className="text-white font-bold">98%</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-kezak-accent"></div>
                                        <span className="text-white/70 text-xs">Alignement des Compétences</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                        <span className="text-white/70 text-xs">Match de la Vision</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-6 rounded-2xl shadow-xl transform hover:-translate-y-1 transition-transform ml-12 border border-white/10">
                            <div className="mb-4">
                                <span className="text-white/70 text-sm">Croissance du Réseau</span>
                                <div className="text-2xl font-bold text-white mt-1">+125 Fondateurs</div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                                    <span className="text-white/70">Nouveaux Projets à Douala</span>
                                    <span className="text-white">12</span>
                                </div>
                                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                                    <span className="text-white/70">Candidats Premium</span>
                                    <span className="text-kezak-accent">+15%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-4 min-h-[200px] flex flex-col justify-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-kezak-primary/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-kezak-primary/30 animate-pulse">
                                {slides[currentSlide].icon}
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight transition-all duration-500">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-white/60 text-lg transition-all duration-500">
                            {slides[currentSlide].description}
                        </p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-3 mt-12">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'w-12 bg-white' : 'w-6 bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
