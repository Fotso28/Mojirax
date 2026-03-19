'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/context/sidebar-context';
import { SocketProvider } from '@/context/socket-context';
import { SearchX, Home, ArrowLeft } from 'lucide-react';

function NotFoundContent() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-kezak-light flex items-center justify-center mb-6">
                <SearchX className="w-12 h-12 text-kezak-primary" />
            </div>

            <h1 className="text-7xl font-bold text-gray-900 tracking-tight">404</h1>

            <p className="mt-4 text-xl text-gray-600 max-w-md">
                Oups ! Cette page n&apos;existe pas ou a été déplacée.
            </p>

            <p className="mt-2 text-sm text-gray-400">
                Vérifiez l&apos;URL ou retournez vers une page connue.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-8 rounded-lg font-semibold transition-all duration-200"
                >
                    <Home className="w-5 h-5" />
                    Retour à l&apos;accueil
                </Link>

                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 h-[44px] px-6 rounded-lg font-medium transition-all duration-200"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Page précédente
                </button>
            </div>
        </div>
    );
}

export default function NotFound() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
            </div>
        );
    }

    // Utilisateur connecté : afficher dans le layout dashboard complet
    if (user) {
        return (
            <SocketProvider>
                <SidebarProvider>
                    <DashboardShell>
                        <NotFoundContent />
                    </DashboardShell>
                </SidebarProvider>
            </SocketProvider>
        );
    }

    // Utilisateur non connecté : écran simple centré
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
            <NotFoundContent />
        </div>
    );
}
