'use client';

import { useState, useEffect } from 'react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from '@/context/i18n-context';
import { Flame } from 'lucide-react';
import Link from 'next/link';

interface TopActiveCandidate {
    id: string;
    shortPitch: string | null;
    roleType: string | null;
    qualityScore: number | null;
    weeklyActivity: number;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        name: string | null;
        image: string | null;
        title: string | null;
        skills: string[];
        city: string | null;
    };
}

export function TopActiveCandidates() {
    const { dbUser } = useAuth();
    const { t } = useTranslation();
    const [candidates, setCandidates] = useState<TopActiveCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isPro = dbUser?.plan === 'PRO' || dbUser?.plan === 'ELITE';

    useEffect(() => {
        if (!isPro) {
            setIsLoading(false);
            return;
        }

        AXIOS_INSTANCE.get<TopActiveCandidate[]>('/users/top-active')
            .then(({ data }) => setCandidates(data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [isPro]);

    if (!isPro || isLoading || candidates.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{t('dashboard.feed.top_active_title')}</h3>
                    <p className="text-xs text-gray-500">{t('dashboard.feed.top_active_subtitle')}</p>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {candidates.map((candidate) => {
                    const displayName = candidate.user.name
                        || `${candidate.user.firstName ?? ''} ${candidate.user.lastName ?? ''}`.trim()
                        || t('dashboard.feed.anonymous');

                    return (
                        <Link
                            key={candidate.id}
                            href={`/founders/${candidate.user.id}`}
                            className="flex-shrink-0 w-32 group"
                        >
                            <div className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 hover:border-kezak-primary/30 hover:bg-kezak-light/30 transition-all">
                                <div className="relative mb-2">
                                    {candidate.user.image ? (
                                        <img
                                            src={candidate.user.image}
                                            alt={displayName}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-bold text-sm">
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                        <Flame className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-900 truncate w-full">
                                    {displayName}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate w-full">
                                    {candidate.user.title ?? candidate.roleType ?? ''}
                                </span>
                                {candidate.user.skills?.length > 0 && (
                                    <span className="text-[10px] text-kezak-primary mt-1 truncate w-full">
                                        {candidate.user.skills.slice(0, 2).join(', ')}
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
