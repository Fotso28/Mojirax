'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MoreHorizontal, MapPin, Briefcase, Calendar, Eye, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import Link from 'next/link';

interface ProjectCardProps {
    project: {
        id: string;
        slug?: string;
        name: string;
        pitch: string;
        sector?: string;
        stage?: string;
        location?: string;
        lookingForRole?: string;
        collabType?: string;
        requiredSkills?: string[];
        isUrgent?: boolean;
        createdAt: string;
        founder: {
            id: string;
            firstName?: string;
            lastName?: string;
            name?: string;
            image?: string;
        };
    };
    position?: number;
}

// Format relative time
function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days}j`;
    return `Il y a ${Math.floor(days / 30)} mois`;
}

// Role labels
const ROLE_LABELS: Record<string, string> = {
    TECH: 'Profil Tech',
    BIZ: 'Business',
    PRODUCT: 'Produit',
    FINANCE: 'Finance',
};

const STAGE_LABELS: Record<string, string> = {
    IDEA: 'Idée',
    PROTOTYPE: 'Prototype',
    MVP_BUILD: 'MVP en cours',
    MVP_LIVE: 'MVP lancé',
    TRACTION: 'Traction',
    SCALE: 'Scale',
};

// Silent tracker — fire and forget
function trackInteraction(projectId: string, action: string, extra?: Record<string, any>) {
    AXIOS_INSTANCE.post('/interactions', {
        projectId,
        action,
        source: 'FEED',
        ...extra,
    }).catch(() => { /* silent */ });
}

export function ProjectCard({ project, position }: ProjectCardProps) {
    const cardRef = useRef<HTMLElement>(null);
    const viewStartRef = useRef<number | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    const founderName = project.founder.name
        || [project.founder.firstName, project.founder.lastName].filter(Boolean).join(' ')
        || 'Fondateur';

    // Track VIEW + dwell time via IntersectionObserver
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    viewStartRef.current = Date.now();
                    trackInteraction(project.id, 'VIEW', { position });
                } else if (viewStartRef.current) {
                    const dwellTimeMs = Date.now() - viewStartRef.current;
                    if (dwellTimeMs > 2000) {
                        trackInteraction(project.id, 'VIEW', { dwellTimeMs, position });
                    }
                    viewStartRef.current = null;
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [project.id, position]);

    const handleSave = useCallback(() => {
        const action = isSaved ? 'UNSAVE' : 'SAVE';
        setIsSaved(!isSaved);
        trackInteraction(project.id, action);
    }, [isSaved, project.id]);

    const handleClick = useCallback(() => {
        trackInteraction(project.id, 'CLICK');
    }, [project.id]);

    // Build tags from available data
    const tags: string[] = [];
    if (project.lookingForRole) {
        tags.push(`Cherche: ${ROLE_LABELS[project.lookingForRole] || project.lookingForRole}`);
    }
    if (project.collabType) {
        const collabLabel = project.collabType === 'EQUITY' ? 'Equity' : project.collabType === 'PAID' ? 'Rémunéré' : 'Hybride';
        tags.push(collabLabel);
    }
    if (project.requiredSkills) {
        tags.push(...project.requiredSkills.slice(0, 3));
    }

    return (
        <article ref={cardRef} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                        {project.founder.image ? (
                            <img src={project.founder.image} alt={founderName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-kezak-light text-kezak-primary font-bold text-lg">
                                {founderName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{founderName}</h3>
                        <p className="text-xs text-gray-500">Fondateur</p>
                    </div>
                </div>
                {project.isUrgent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                        Urgent
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-kezak-dark mb-2 group-hover:text-kezak-primary transition-colors leading-tight">
                    {project.name}
                </h2>
                <p className="text-gray-600 leading-relaxed text-base line-clamp-4">
                    {project.pitch}
                </p>
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-500 mb-6">
                {project.sector && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{project.sector}</span>
                    </div>
                )}
                {project.location && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{project.location}</span>
                    </div>
                )}
                {project.stage && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        <span>{STAGE_LABELS[project.stage] || project.stage}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{timeAgo(project.createdAt)}</span>
                </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {tags.map(tag => (
                        <span key={tag} className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 mt-auto">
                <Link href={`/projects/${project.slug || project.id}`} onClick={handleClick} className="flex-1">
                    <Button className="w-full rounded-xl h-11 text-base font-semibold shadow-lg shadow-blue-500/20">
                        Voir le projet
                    </Button>
                </Link>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 h-11 rounded-xl text-base font-semibold border transition-all duration-200 ${isSaved
                            ? 'bg-kezak-primary/5 border-kezak-primary text-kezak-primary'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    {isSaved ? 'Sauvé' : 'Sauver'}
                </button>
            </div>
        </article>
    );
}
