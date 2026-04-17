'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { CandidateProfileForm, StatusBadge, CompletenessBar } from '@/components/profile/candidate-profile-form';
import { useToast } from '@/context/toast-context';
import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { HideRightSidebar } from '@/context/sidebar-context';
import { Eye, Send, Star } from 'lucide-react';
import { SubscriptionSummary } from '@/components/profile/subscription-summary';
import { useTranslation } from '@/context/i18n-context';

export default function ProfilePage() {
    const { user: firebaseUser, loading: isAuthLoading, refreshDbUser } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const [dbUser, setDbUser] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const fetchProfile = async () => {
        if (!firebaseUser) return;
        try {
            const { data } = await AXIOS_INSTANCE.get('/users/profile');
            setDbUser(data);
            return data;
        } catch {
            // Profile fetch failed — fallback to Firebase user data
            return null;
        } finally {
            setIsLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (!isAuthLoading) {
            if (firebaseUser) {
                fetchProfile();
            } else {
                setIsLoadingProfile(false);
            }
        }
    }, [firebaseUser, isAuthLoading]);

    // Auto-refresh quand le profil candidat est en cours d'analyse (max 2 min)
    useEffect(() => {
        const status = dbUser?.candidateProfile?.status;
        if (status !== 'ANALYZING') return;

        let retries = 0;
        const maxRetries = 24; // 24 x 5s = 2 minutes

        const interval = setInterval(async () => {
            retries++;
            const data = await fetchProfile();
            if (data?.candidateProfile?.status !== 'ANALYZING' || retries >= maxRetries) {
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [dbUser?.candidateProfile?.status]);

    const handleAvatarUploaded = (data: any) => {
        setDbUser(data);
        localStorage.setItem('db_user', JSON.stringify(data));
        refreshDbUser();
        showToast(t('dashboard.profile_photo_updated'));
    };

    const handleProfileSaved = (data: any) => {
        setDbUser(data);
        localStorage.setItem('db_user', JSON.stringify(data));
        refreshDbUser();
    };

    if (isAuthLoading || (firebaseUser && isLoadingProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary"></div>
            </div>
        );
    }

    if (!firebaseUser) {
        router.replace('/login');
        return null;
    }

    const displayUser = dbUser ? {
        ...dbUser,
        firstName: dbUser.firstName || firebaseUser.displayName?.split(' ')[0] || '',
        lastName: dbUser.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        email: dbUser.email || firebaseUser.email,
        image: dbUser.image || firebaseUser.photoURL,
    } : {
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        email: firebaseUser.email,
        image: firebaseUser.photoURL,
        role: 'USER'
    };

    const hasCandidate = !!displayUser.candidateProfile;
    const cp = displayUser.candidateProfile;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <HideRightSidebar />
            <ProfileHeader
                user={displayUser}
                onAvatarUploaded={handleAvatarUploaded}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* General + Professional — always shown */}
                    <ProfileForm user={displayUser} onSaved={handleProfileSaved} />

                    {/* Candidate section — shown if candidateProfile exists */}
                    {hasCandidate ? (
                        <CandidateProfileForm user={displayUser} onSaved={handleProfileSaved} />
                    ) : (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.profile_looking_for_project')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('dashboard.profile_activate_candidate')}</p>
                            <button
                                onClick={() => router.push('/onboarding/candidate')}
                                className="px-6 h-[44px] bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-all"
                            >
                                {t('dashboard.profile_activate_candidate_button')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <SubscriptionSummary />
                    {hasCandidate && cp && (
                        <>
                            {/* Status du profil candidat */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">{t('dashboard.profile_candidate_profile')}</h3>
                                <div className="space-y-4">
                                    <StatusBadge status={cp.status || 'DRAFT'} />
                                    <CompletenessBar value={cp.profileCompleteness || 0} />
                                </div>
                            </div>

                            {/* Statistiques candidat */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">{t('dashboard.profile_candidate_stats')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Star className="w-4 h-4" />
                                            {t('dashboard.profile_quality_score')}
                                        </span>
                                        <span className="font-semibold text-gray-900">{Math.round(cp.qualityScore || 0)}/100</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Eye className="w-4 h-4" />
                                            {t('dashboard.profile_views')}
                                        </span>
                                        <span className="font-medium">0</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Send className="w-4 h-4" />
                                            {t('common.applications')}
                                        </span>
                                        <span className="font-medium">{displayUser._count?.applications || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* General stats — always shown */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">{t('dashboard.profile_stats')}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{t('dashboard.profile_published_projects')}</span>
                                <span className="font-medium">{displayUser.projects?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
