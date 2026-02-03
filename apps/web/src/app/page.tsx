'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6 fixed top-0 w-full bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-kezak-primary rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-kezak-dark">
              MojiraX
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-semibold text-gray-600 hover:text-kezak-primary transition-colors">Découvrir</a>
            <a href="#" className="text-sm font-semibold text-gray-600 hover:text-kezak-primary transition-colors">Mes Projets</a>
            <a href="#" className="text-sm font-semibold text-gray-600 hover:text-kezak-primary transition-colors">Messages</a>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={() => logout()}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
              Déconnexion
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden ring-2 ring-kezak-light ring-offset-2">
              {user.photoURL && <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto py-12">
          <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-kezak-light/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>

            <div className="relative z-10">
              <h1 className="text-4xl lg:text-5xl font-bold text-kezak-dark mb-4 tracking-tight">
                Bienvenue, {user.displayName?.split(' ')[0] || 'sur MojiraX'} !
              </h1>
              <p className="text-lg text-gray-500 max-w-2xl mb-8 leading-relaxed">
                MojiraX : Là où les fondateurs se connectent. Trouvez le partenaire idéal pour votre prochaine aventure entrepreneuriale au Cameroun.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button>
                  Explorer les projets
                </Button>
                <Button variant="secondary">
                  Créer un projet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
