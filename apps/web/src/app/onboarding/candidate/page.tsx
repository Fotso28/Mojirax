'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui';

export default function CandidateOnboardingPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-kezak-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-kezak-accent/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 text-center max-w-md">
                <div className="w-20 h-20 bg-kezak-light rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <svg className="w-10 h-10 text-kezak-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-kezak-dark mb-4">
                    Espace Candidat
                </h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Nous construisons l'expérience ultime pour vous permettre d'importer votre profil LinkedIn et trouver le projet idéal.
                </p>
                <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-gray-600 text-sm mb-10 shadow-sm">
                    🚧 Module en cours de construction
                </div>
                <Button onClick={() => window.location.href = '/'}>
                    Retour à l'accueil
                </Button>
            </div>
        </div>
    );
}
