'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CandidateCard } from './candidate-card';
import { FeedFilters } from './feed-filters';
import { TopActiveCandidates } from './top-active-candidates';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useTranslation } from '@/context/i18n-context';
import { Loader2, Users2, AlertCircle } from 'lucide-react';

interface CandidateFeedResponse {
    candidates: any[];
    nextCursor: string | null;
}

interface Filters {
    city?: string;
    sector?: string;
    skills?: string[];
}

export function CandidateStream() {
    const { t } = useTranslation();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filters, setFilters] = useState<Filters>({});
    const observerRef = useRef<HTMLDivElement>(null);

    const loadCandidates = useCallback(async (cursor: string | null = null, currentFilters: Filters = {}) => {
        if (cursor) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setLoadError(false);
        }

        try {
            const params = new URLSearchParams();
            if (cursor) params.set('cursor', cursor);
            params.set('limit', '7');
            if (currentFilters.city) params.set('city', currentFilters.city);
            if (currentFilters.sector) params.set('sector', currentFilters.sector);
            if (currentFilters.skills?.length) {
                currentFilters.skills.forEach(s => params.append('skills', s));
            }

            const { data } = await AXIOS_INSTANCE.get<CandidateFeedResponse>(`/users/candidates/feed?${params}`);

            if (cursor) {
                setCandidates(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCandidates = data.candidates.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newCandidates];
                });
            } else {
                setCandidates(data.candidates);
            }

            setNextCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch {
            // Initial load errored — surface in the UI
            if (!cursor) setLoadError(true);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        loadCandidates(null, filters);
    }, [loadCandidates, filters]);

    useEffect(() => {
        if (!observerRef.current || !hasMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && nextCursor) {
                    loadCandidates(nextCursor, filters);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, nextCursor, loadCandidates, filters]);

    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
        setCandidates([]);
        setNextCursor(null);
        setHasMore(true);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <TopActiveCandidates />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse h-48" />
                ))}
            </div>
        );
    }

    // Error state — network/server failed, offer retry
    if (loadError && candidates.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.feed.load_error_title')}</h3>
                    <p className="text-gray-500 mb-5">{t('dashboard.feed.load_error_description')}</p>
                    <button
                        onClick={() => loadCandidates(null, filters)}
                        className="inline-flex items-center justify-center h-[44px] px-6 rounded-xl bg-kezak-primary hover:bg-kezak-dark text-white font-semibold transition-colors"
                    >
                        {t('dashboard.feed.load_error_retry')}
                    </button>
                </div>
            </div>
        );
    }

    if (candidates.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <TopActiveCandidates />
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-kezak-light rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users2 className="w-7 h-7 text-kezak-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.feed.candidates_empty_title')}</h3>
                    <p className="text-gray-500">
                        {Object.values(filters).some(Boolean)
                            ? t('dashboard.feed.candidates_empty_filtered')
                            : t('dashboard.feed.candidates_empty_description')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <FeedFilters onFilterChange={handleFilterChange} />
            <TopActiveCandidates />
            {candidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
            ))}

            <div ref={observerRef} className="py-4">
                {isLoadingMore && (
                    <div className="flex justify-center">
                        <Loader2 className="w-6 h-6 text-kezak-primary animate-spin" />
                    </div>
                )}
            </div>

            {!hasMore && candidates.length > 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    {t('dashboard.feed.end_reached')}
                </div>
            )}
        </div>
    );
}
