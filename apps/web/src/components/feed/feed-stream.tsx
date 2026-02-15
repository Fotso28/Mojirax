'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectCard } from './project-card';
import { NativeAd } from './native-ad';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { Loader2 } from 'lucide-react';

interface FeedResponse {
    projects: any[];
    nextCursor: string | null;
    total: number;
}

export function FeedStream() {
    const [projects, setProjects] = useState<any[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<HTMLDivElement>(null);

    const loadFeed = useCallback(async (cursor: string | null = null) => {
        if (cursor) {
            setIsLoadingMore(true);
        }

        try {
            const params = new URLSearchParams();
            if (cursor) params.set('cursor', cursor);
            params.set('limit', '7');

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
        } catch (error) {
            console.error('Failed to load feed', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadFeed();
    }, [loadFeed]);

    // Infinite scroll observer
    useEffect(() => {
        if (!observerRef.current || !hasMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && nextCursor) {
                    loadFeed(nextCursor);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, nextCursor, loadFeed]);

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
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

    // Empty state
    if (projects.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun projet pour le moment</h3>
                <p className="text-gray-500">Les projets apparaîtront ici dès qu'ils seront publiés.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {projects.map((project, index) => {
                const showAd = index > 0 && index % 5 === 0;

                return (
                    <div key={project.id} className="space-y-6">
                        {showAd && <NativeAd />}
                        <ProjectCard project={project} position={index} />
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
                    Vous avez tout vu !
                </div>
            )}
        </div>
    );
}
