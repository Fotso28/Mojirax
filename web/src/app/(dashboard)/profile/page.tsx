'use client';

import { useAuth } from '@/context/auth-context';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { useToast } from '@/context/toast-context';
import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { HideRightSidebar } from '@/context/sidebar-context';

export default function ProfilePage() {
    const { user: firebaseUser, loading: isAuthLoading, refreshDbUser } = useAuth();
    const { showToast } = useToast();
    const [dbUser, setDbUser] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!firebaseUser) return;

            try {
                const { data } = await AXIOS_INSTANCE.get('/users/profile');
                setDbUser(data);
            } catch {
                // Profile fetch failed — fallback to Firebase user data
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

    const handleAvatarUploaded = (data: any) => {
        setDbUser(data);
        localStorage.setItem('db_user', JSON.stringify(data));
        refreshDbUser();
        showToast('Photo de profil mise à jour');
    };

    if (isAuthLoading || (firebaseUser && isLoadingProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary"></div>
            </div>
        );
    }

    if (!firebaseUser) {
        return <div>Veuillez vous connecter.</div>;
    }

    const displayUser = dbUser || {
        firstName: firebaseUser.displayName?.split(' ')[0],
        lastName: firebaseUser.displayName?.split(' ')[1],
        email: firebaseUser.email,
        image: firebaseUser.photoURL,
        role: 'USER'
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <HideRightSidebar />
            <ProfileHeader
                user={displayUser}
                onAvatarUploaded={handleAvatarUploaded}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <ProfileForm user={displayUser} />
                </div>

                <div className="space-y-6">
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
