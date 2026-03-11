'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { TrendingUp, Eye, Star, Briefcase, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { AdSidebar } from '@/components/ads/ad-sidebar';

interface TrendingProject {
    id: string;
    name: string;
    slug: string;
    sector: string | null;
    stage: string | null;
    logoUrl: string | null;
    qualityScore: number | null;
    founder: { id: string; name: string | null; image: string | null };
    views: number;
}

interface TrendingCandidate {
    id: string;
    userId: string;
    name: string | null;
    image: string | null;
    title: string | null;
    skills: string[];
    qualityScore: number | null;
}

export function SidebarRight() {
    const [projects, setProjects] = useState<TrendingProject[]>([]);
    const [candidates, setCandidates] = useState<TrendingCandidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/projects/trending').then((r) => r.data).catch(() => []),
            api.get('/users/candidates/trending').then((r) => r.data).catch(() => []),
        ]).then(([p, c]) => {
            setProjects(p);
            setCandidates(c);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6 h-full overflow-y-auto pb-4 scrollbar-hide">

            {/* Projets tendance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">Projets tendance</h3>
                    <Briefcase className="w-4 h-4 text-kezak-primary" />
                </div>
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-28 bg-gray-100 rounded" />
                                    <div className="h-3 w-20 bg-gray-50 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Aucun projet pour le moment</p>
                ) : (
                    <div className="space-y-3">
                        {projects.map((p, i) => (
                            <Link
                                key={p.id}
                                href={`/projects/${p.slug || p.id}`}
                                className="flex items-start gap-3 group rounded-lg p-1.5 -mx-1.5 hover:bg-gray-50 transition-colors"
                            >
                                {/* Rang ou logo */}
                                {p.logoUrl ? (
                                    <img src={p.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-kezak-light flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-kezak-primary">{i + 1}</span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-kezak-primary transition-colors">
                                        {p.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {p.sector}{p.stage ? ` · ${p.stage}` : ''}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                            <Eye className="w-3 h-3" /> {p.views}
                                        </span>
                                        {p.qualityScore != null && p.qualityScore > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] text-amber-500">
                                                <Star className="w-3 h-3" /> {p.qualityScore}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Candidats à suivre */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">Profils à suivre</h3>
                    <TrendingUp className="w-4 h-4 text-kezak-primary" />
                </div>
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-24 bg-gray-100 rounded" />
                                    <div className="h-3 w-32 bg-gray-50 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : candidates.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Aucun profil pour le moment</p>
                ) : (
                    <div className="space-y-3">
                        {candidates.map((c) => (
                            <Link
                                key={c.id}
                                href={`/users/${c.userId}/public`}
                                className="flex items-start gap-3 group rounded-lg p-1.5 -mx-1.5 hover:bg-gray-50 transition-colors"
                            >
                                {c.image ? (
                                    <img src={c.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-gray-500">
                                            {(c.name || '?')[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-kezak-primary transition-colors">
                                        {c.name || 'Anonyme'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{c.title || 'Candidat'}</p>
                                    {c.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {c.skills.map((s) => (
                                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Pubs dynamiques */}
            <AdSidebar />

            {/* Footer Links */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-2">
                {['À propos', 'Aide', 'Confidentialité', 'CGU', 'Publicité'].map((link) => (
                    <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600">
                        {link}
                    </a>
                ))}
                <p className="text-xs text-gray-300 w-full mt-2">© 2026 MojiraX Inc.</p>
            </div>
        </div>
    );
}
