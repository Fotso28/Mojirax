'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ProjectCard } from './project-card';
import { AdFeedCard } from '@/components/ads/ad-feed-card';
import { FeedFilters } from './feed-filters';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from '@/context/i18n-context';
import { Loader2, Rocket, AlertCircle } from 'lucide-react';

interface FeedAd {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    ctaText?: string | null;
}

interface FeedResponse {
    projects: any[];
    nextCursor: string | null;
    total: number;
}

interface Filters {
    city?: string;
    sector?: string;
    skills?: string[];
}

export function FeedStream() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [projects, setProjects] = useState<any[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filters, setFilters] = useState<Filters>({});
    const [feedAds, setFeedAds] = useState<FeedAd[]>([]);
    const [insertEvery, setInsertEvery] = useState(8);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const observerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Charger les pubs feed
    useEffect(() => {
        AXIOS_INSTANCE.get('/ads/feed')
            .then(({ data }) => {
                setFeedAds(data.ads || []);
                if (data.insertEvery) setInsertEvery(data.insertEvery);
            })
            .catch(() => {});
    }, []);

    // Charger les projets sauvegardés par l'utilisateur
    useEffect(() => {
        if (!user) {
            setSavedIds(new Set());
            return;
        }
        AXIOS_INSTANCE.get<string[]>('/interactions/saved')
            .then(({ data }) => setSavedIds(new Set(data)))
            .catch(() => {});
    }, [user]);

    const loadFeed = useCallback(async (cursor: string | null = null, currentFilters: Filters = {}) => {
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

            const { data } = await AXIOS_INSTANCE.get<FeedResponse>(`/projects/feed?${params}`);

            if (cursor) {
                setProjects(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newProjects = data.projects.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newProjects];
                });
            } else {
                setProjects(data.projects);
            }

            setNextCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch {
            // Initial load errored — surface in the UI (cursor pagination stays silent)
            if (!cursor) setLoadError(true);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Initial load + refresh on navigation (e.g. returning from project creation)
    // Wait for Firebase user to be ready before calling authenticated endpoint
    useEffect(() => {
        if (!user) return;
        setProjects([]);
        setNextCursor(null);
        setHasMore(true);
        loadFeed(null, filters);
    }, [user, loadFeed, filters, pathname]);

    // Refresh feed when window regains focus (e.g. after creating a project).
    // Debounced: a user alt-tabbing across tabs would otherwise re-fetch on
    // every focus event, burning mobile data on 3G/4G. Skip if we refreshed
    // in the last 30s.
    const lastFocusRefreshRef = useRef(0);
    useEffect(() => {
        if (!user) return;
        const handleFocus = () => {
            const now = Date.now();
            if (now - lastFocusRefreshRef.current < 30_000) return;
            lastFocusRefreshRef.current = now;
            setProjects([]);
            setNextCursor(null);
            setHasMore(true);
            loadFeed(null, filters);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, loadFeed, filters]);

    // Infinite scroll observer
    useEffect(() => {
        if (!observerRef.current || !hasMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && nextCursor) {
                    loadFeed(nextCursor, filters);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, nextCursor, loadFeed, filters]);

    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
        setProjects([]);
        setNextCursor(null);
        setHasMore(true);
    }, []);

    // Loading skeleton (show while waiting for user auth or initial data)
    if (isLoading && user) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-100 rounded" />
                                <div className="h-3 w-20 bg-gray-100 rounded" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-5 w-3/4 bg-gray-100 rounded" />
                            <div className="h-4 w-full bg-gray-100 rounded" />
                            <div className="h-4 w-5/6 bg-gray-100 rounded" />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <div className="h-8 w-20 bg-gray-100 rounded-full" />
                            <div className="h-8 w-24 bg-gray-100 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Error state — network/server failed, offer retry
    if (loadError && projects.length === 0) {
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
                        onClick={() => loadFeed(null, filters)}
                        className="inline-flex items-center justify-center h-[44px] px-6 rounded-xl bg-kezak-primary hover:bg-kezak-dark text-white font-semibold transition-colors"
                    >
                        {t('dashboard.feed.load_error_retry')}
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (projects.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-kezak-light rounded-full flex items-center justify-center mx-auto mb-4">
                        <Rocket className="w-7 h-7 text-kezak-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.feed.projects_empty_title')}</h3>
                    <p className="text-gray-500">
                        {Object.values(filters).some(Boolean)
                            ? t('dashboard.feed.projects_empty_filtered')
                            : t('dashboard.feed.projects_empty_description')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <FeedFilters onFilterChange={handleFilterChange} />
            {projects.map((project, index) => {
                // Première pub après 3 projets, puis toutes les insertEvery positions
                const firstAdAt = Math.min(3, insertEvery);
                let adIndex = -1;
                if (feedAds.length > 0 && index === firstAdAt) {
                    adIndex = 0;
                } else if (feedAds.length > 0 && index > firstAdAt && (index - firstAdAt) % insertEvery === 0) {
                    adIndex = Math.floor((index - firstAdAt) / insertEvery) + 1;
                }
                const ad = adIndex >= 0 ? feedAds[adIndex % feedAds.length] : null;

                return (
                    <div key={project.id} className="space-y-6">
                        {ad && <AdFeedCard ad={ad} position={adIndex} />}
                        <ProjectCard project={project} position={index} initialSaved={savedIds.has(project.id)} />
                    </div>
                );
            })}

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="py-4">
                {isLoadingMore && (
                    <div className="flex justify-center">
                        <Loader2 className="w-6 h-6 text-kezak-primary animate-spin" />
                    </div>
                )}
            </div>

            {!hasMore && projects.length > 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    {t('dashboard.feed.end_reached')}
                </div>
            )}
        </div>
    );
}
