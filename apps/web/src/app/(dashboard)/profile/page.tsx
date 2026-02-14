'use client';

import { useAuth } from '@/context/auth-context';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const { user: firebaseUser, isLoading: isAuthLoading } = useAuth();
    const [dbUser, setDbUser] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!firebaseUser) return;

            try {
                const token = await firebaseUser.getIdToken();
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setDbUser(data);
                } else {
                    console.error("Failed to fetch profile:", response.status);
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        if (!isAuthLoading) {
            if (firebaseUser) {
                fetchProfile();
            } else {
                setIsLoadingProfile(false);
            }
        }
    }, [firebaseUser, isAuthLoading]);

    if (isAuthLoading || (firebaseUser && isLoadingProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!firebaseUser) {
        return <div>Veuillez vous connecter.</div>;
    }

    // Merge firebase info (like email/photo) if missing in DB, 
    // but usually DB has it if synced.
    // Fallback to null if db fetch failed but we have firebase user (unlikely if synced)
    const displayUser = dbUser || {
        firstName: firebaseUser.displayName?.split(' ')[0],
        lastName: firebaseUser.displayName?.split(' ')[1],
        email: firebaseUser.email,
        image: firebaseUser.photoURL,
        role: 'USER' // default
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <ProfileHeader user={displayUser} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <ProfileForm user={displayUser} />
                </div>

                <div className="space-y-6">
                    {/* Placeholder for Stats or Side Widgets */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Statistiques</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Projets vus</span>
                                <span className="font-medium">0</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Candidatures</span>
                                <span className="font-medium">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
