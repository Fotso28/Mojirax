'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, X, Clock, Target, Users, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { formatDate } from '@/lib/utils/format-date';

interface SearchProject {
    id: string;
    name: string;
    slug: string;
    pitch: string;
    sector: string;
    city?: string;
    country?: string;
    logoUrl?: string;
    similarity: number;
}

interface SearchCandidate {
    id: string;
    title?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    firstName?: string;
    lastName?: string;
    name?: string;
    image?: string;
    similarity: number;
}

interface SearchResult {
    projects: SearchProject[];
    candidates: SearchCandidate[];
}

interface SearchHistoryEntry {
    id: string;
    query: string;
    createdAt: string;
}

export default function SearchPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const locale = useLocale();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    // Semantic search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                performSearch(query);
            } else {
                setResults(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const fetchHistory = async () => {
        try {
            const res = await AXIOS_INSTANCE.get('/search/history');
            setHistory(res.data);
        } catch {
            // History not available (user not logged in, etc.)
        }
    };

    const performSearch = async (q: string) => {
        setLoading(true);
        try {
            const res = await AXIOS_INSTANCE.get(`/search?q=${encodeURIComponent(q)}`);
            setResults(res.data);
        } catch {
            setResults({ projects: [], candidates: [] });
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await AXIOS_INSTANCE.delete('/search/history');
            setHistory([]);
        } catch {
            // Silently fail
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col md:relative md:inset-auto md:bg-transparent md:z-auto">
            {/* Sticky search header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-4 flex items-center gap-3 border-b border-gray-100 md:border-none md:p-0 md:mb-6 z-10">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        autoFocus
                        placeholder={t('dashboard.search_placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-[52px] pl-10 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all text-base"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 md:p-0">
                {/* Suggestions Section (Show when typing but no results yet) */}
                {query.length > 0 && query.length < 3 && (
                    <section className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {t('dashboard.search_semantic_suggestions')}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {['Développeur Fullstack', 'Expert Marketing', 'Directeur Artistique', 'Growth Hacker', 'CTO à Douala'].map((term) => (
                                <button
                                    key={term}
                                    onClick={() => setQuery(term)}
                                    className="px-4 py-2 bg-kezak-primary/5 border border-kezak-primary/10 rounded-full text-sm text-kezak-primary hover:bg-kezak-primary/10 transition-colors"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Search Results */}
                {results && !loading && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Summary / Semantic interpretation */}
                        {query.length >= 3 && (
                            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex items-center gap-3">
                                <Search className="w-4 h-4 text-blue-500" />
                                <p className="text-xs text-blue-700">
                                    {t('dashboard.search_results_for')} <span className="font-bold">&quot;{query}&quot;</span> {t('dashboard.search_similar_terms', { example: query === 'Développeur' ? 'Webmaster, Codeur' : 'profils similaires' })}
                                </p>
                            </div>
                        )}

                        {/* Projects */}
                        {results.projects.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    {t('dashboard.search_projects', { count: results.projects.length })}
                                </h2>
                                <div className="grid gap-3">
                                    {results.projects.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => router.push(`/projects/${p.slug || p.id}`)}
                                            className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-kezak-primary/40 cursor-pointer transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                                                        {p.logoUrl ? (
                                                            <img src={p.logoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Target className="w-5 h-5 text-gray-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 group-hover:text-kezak-primary transition-colors">{p.name}</h3>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <span>{p.sector}</span>
                                                            <span className="w-0.5 h-0.5 bg-gray-300 rounded-full"></span>
                                                            <span>{p.city}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] bg-kezak-primary/10 text-kezak-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                        {t('common.match_percent', { percent: Math.round(Number(p.similarity) * 100) })}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.pitch}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Candidates */}
                        {results.candidates.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {t('dashboard.search_talents', { count: results.candidates.length })}
                                </h2>
                                <div className="grid gap-3">
                                    {results.candidates.map((c) => {
                                        const displayName = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || t('common.candidate');
                                        return (
                                            <div
                                                key={c.id}
                                                onClick={() => router.push(`/founders/${c.id}`)}
                                                className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-kezak-primary/40 cursor-pointer transition-all active:scale-[0.98] group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-kezak-primary/10 flex items-center justify-center text-kezak-primary font-bold text-sm overflow-hidden relative">
                                                            {displayName[0]?.toUpperCase()}
                                                            {c.image && (
                                                                <img
                                                                    src={c.image}
                                                                    alt=""
                                                                    className="absolute inset-0 w-full h-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 group-hover:text-kezak-primary transition-colors">{displayName}</h3>
                                                            <p className="text-xs text-kezak-primary font-medium">{c.title}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                        {t('common.match_percent', { percent: Math.round(Number(c.similarity) * 100) })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{c.bio}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {results.projects.length === 0 && results.candidates.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">{t('dashboard.search_no_results')} &quot;{query}&quot;</p>
                                <p className="text-sm text-gray-400 mt-1">{t('dashboard.search_try_broader')}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* History Section (Bottom) */}
                {!loading && history.length > 0 && (
                    <section className="pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t('dashboard.search_history')}
                            </h2>
                            <button
                                onClick={clearHistory}
                                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                {t('dashboard.search_clear_history')}
                            </button>
                        </div>
                        <div className="space-y-1">
                            {history.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setQuery(item.query)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <span className="text-gray-700 flex items-center gap-3">
                                        <Search className="w-4 h-4 text-gray-300 group-hover:text-kezak-primary transition-colors" />
                                        {item.query}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {formatDate(item.createdAt, locale)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {!query && history.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-medium">{t('dashboard.search_start_title')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('dashboard.search_start_subtitle')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
