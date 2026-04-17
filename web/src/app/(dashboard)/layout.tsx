'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/context/sidebar-context';
import { SocketProvider } from '@/context/socket-context';
import { useAuth } from '@/context/auth-context';

export default function DashboardLayout({
    children,
    modal
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    const { user, dbUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
        // Rediriger vers l'onboarding seulement si :
        // - pas de title ET pas de bio
        // - ET pas de projets existants (user migré)
        // - ET pas de candidateProfile existant
        if (!loading && user && dbUser
            && !dbUser.title && !dbUser.bio
            && !(dbUser.projects?.length > 0)
            && !dbUser.candidateProfile
        ) {
            router.replace('/onboarding/start');
        }
    }, [loading, user, dbUser, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <SocketProvider>
            <SidebarProvider>
                <DashboardShell>
                    {children}
                    {modal}
                </DashboardShell>
            </SidebarProvider>
        </SocketProvider>
    );
}
