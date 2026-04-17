'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Briefcase, Code, Star } from 'lucide-react';
import { PlanBadge } from '@/components/ui';
import { useTranslation } from '@/context/i18n-context';

interface CandidateProfile {
    id: string;
    title: string;
    bio: string;
    location: string | null;
    skills: string[];
    user: {
        id?: string;
        firstName: string | null;
        lastName: string | null;
        name: string | null;
        image: string | null;
        plan?: string;
    };
}

export function CandidateCard({ candidate }: { candidate: CandidateProfile }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { user } = candidate;
    const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || t('dashboard.feed.default_name');

    return (
        <div
            onClick={() => router.push(`/founders/${candidate.id}`)}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
        >
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0 relative bg-gray-50">
                    <div className="absolute inset-0 flex items-center justify-center bg-kezak-primary/10 text-kezak-primary font-bold text-xl uppercase">
                        {displayName[0]}
                    </div>
                    {user.image && (
                        <img
                            src={user.image}
                            alt={displayName}
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.opacity = '0';
                            }}
                        />
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-gray-900 group-hover:text-kezak-primary transition-colors">
                                    {displayName}
                                </h3>
                                <PlanBadge plan={user.plan} />
                            </div>
                            <p className="text-kezak-primary font-medium text-sm">{candidate.title}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="text-gray-300 hover:text-yellow-400 transition-colors"
                        >
                            <Star size={20} />
                        </button>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span>{candidate.location || t('dashboard.feed.remote')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Briefcase size={12} />
                            <span>{t('dashboard.feed.available')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {candidate.bio}
                </p>
            </div>

            {candidate.skills?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 4).map((skill, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-[11px] font-medium text-gray-600"
                            >
                                <Code size={10} className="text-kezak-primary/60" />
                                {skill}
                            </span>
                        ))}
                        {candidate.skills.length > 4 && (
                            <span className="text-[10px] text-gray-400 self-center">
                                {t('dashboard.feed.skills_more', { count: candidate.skills.length - 4 })}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/founders/${candidate.id}`);
                }}
                className="mt-5 w-full py-2.5 bg-gray-50 hover:bg-kezak-primary hover:text-white rounded-xl text-sm font-bold text-gray-900 transition-all active:scale-[0.98]"
            >
                {t('dashboard.feed.view_profile')}
            </button>
        </div>
    );
}
