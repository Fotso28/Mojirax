'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MoreHorizontal, MapPin, Briefcase, Calendar, Eye, Bookmark, BookmarkCheck, MessageCircle } from 'lucide-react';
import { Button, PlanBadge } from '@/components/ui';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { getSectorLabel } from '@/lib/constants/sectors';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useStartConversation } from '@/hooks/use-start-conversation';
import { useTranslation } from '@/context/i18n-context';

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
            plan?: string;
        };
    };
    position?: number;
    initialSaved?: boolean;
}

// Format relative time using translation function
function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return t('dashboard.card_time_now');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('dashboard.card_time_minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('dashboard.card_time_hours', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('dashboard.card_time_days', { count: days });
    return t('dashboard.card_time_months', { count: Math.floor(days / 30) });
}

// Role labels keyed to translation
const ROLE_KEYS: Record<string, string> = {
    TECH: 'dashboard.role_tech',
    BIZ: 'dashboard.role_biz',
    PRODUCT: 'dashboard.role_product',
    FINANCE: 'dashboard.role_finance',
};

function formatRoleLabels(lookingForRole: string, t: (key: string) => string): string {
    return lookingForRole.split(',').filter(Boolean)
        .map((r) => ROLE_KEYS[r] ? t(ROLE_KEYS[r]) : r).join(', ');
}

const STAGE_KEYS: Record<string, string> = {
    IDEA: 'dashboard.stage_idea',
    PROTOTYPE: 'dashboard.stage_prototype',
    MVP_BUILD: 'dashboard.stage_mvp_build',
    MVP_LIVE: 'dashboard.stage_mvp_live',
    TRACTION: 'dashboard.stage_traction',
    SCALE: 'dashboard.stage_scale',
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

export function ProjectCard({ project, position, initialSaved = false }: ProjectCardProps) {
    const cardRef = useRef<HTMLElement>(null);
    const viewStartRef = useRef<number | null>(null);
    const [isSaved, setIsSaved] = useState(initialSaved);
    const { showToast } = useToast();
    const { dbUser } = useAuth();
    const { startConversation, loading: messageLoading } = useStartConversation();
    const { t } = useTranslation();

    // Sync if initialSaved changes after async load
    useEffect(() => {
        setIsSaved(initialSaved);
    }, [initialSaved]);

    const founderName = project.founder.name
        || [project.founder.firstName, project.founder.lastName].filter(Boolean).join(' ')
        || t('dashboard.card_founder');

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
        const next = !isSaved;
        setIsSaved(next);
        trackInteraction(project.id, next ? 'SAVE' : 'UNSAVE');
        showToast(next ? t('dashboard.card_project_saved') : t('dashboard.card_project_removed'), 'success');
    }, [isSaved, project.id, showToast]);

    const handleClick = useCallback(() => {
        trackInteraction(project.id, 'CLICK');
    }, [project.id]);

    // Build tags from available data
    const tags: string[] = [];
    if (project.lookingForRole) {
        tags.push(`${t('dashboard.card_looking_for')} ${formatRoleLabels(project.lookingForRole, t)}`);
    }
    if (project.collabType) {
        const collabLabel = project.collabType === 'EQUITY' ? t('dashboard.card_collab_equity') : project.collabType === 'PAID' ? t('dashboard.card_collab_paid') : t('dashboard.card_collab_hybrid');
        tags.push(collabLabel);
    }
    if (project.requiredSkills) {
        tags.push(...project.requiredSkills.slice(0, 3));
    }

    return (
        <article ref={cardRef} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <Link href={`/founders/${project.founder.id}`} className="flex items-center gap-3 group/founder" onClick={e => e.stopPropagation()}>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden ring-2 ring-transparent group-hover/founder:ring-kezak-primary/20 transition-all">
                        {project.founder.image ? (
                            <img src={project.founder.image} alt={founderName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-kezak-light text-kezak-primary font-bold text-lg">
                                {founderName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-gray-900 leading-tight group-hover/founder:text-kezak-primary transition-colors">{founderName}</h3>
                            <PlanBadge plan={project.founder.plan} />
                        </div>
                        <p className="text-xs text-gray-500">{t('dashboard.card_founder')}</p>
                    </div>
                </Link>
                {project.isUrgent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                        {t('dashboard.card_urgent')}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="mb-4">
                <Link href={`/projects/${project.slug || project.id}`} onClick={handleClick}>
                    <h2 className="text-xl font-bold text-kezak-dark mb-2 hover:text-kezak-primary transition-colors leading-tight">
                        {project.name}
                    </h2>
                </Link>
                <p className="text-gray-600 leading-relaxed text-base line-clamp-4">
                    {project.pitch}
                </p>
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-500 mb-6">
                {project.sector && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{getSectorLabel(project.sector)}</span>
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
                        <span>{STAGE_KEYS[project.stage] ? t(STAGE_KEYS[project.stage]) : project.stage}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{timeAgo(project.createdAt, t)}</span>
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
            <div className="flex items-center gap-3 pt-4 mt-auto">
                <Link href={`/projects/${project.slug || project.id}`} onClick={handleClick} className="flex-1">
                    <Button className="w-full rounded-xl h-11 text-base font-semibold shadow-lg shadow-blue-500/20">
                        {t('dashboard.card_view_project')}
                    </Button>
                </Link>
                {dbUser && dbUser.id !== project.founder?.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startConversation(project.founder.id); }}
                    disabled={messageLoading}
                    className="flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 flex-shrink-0 disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('dashboard.card_message')}</span>
                  </button>
                )}
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-4 sm:px-5 h-11 rounded-xl text-sm sm:text-base font-semibold border transition-all duration-200 flex-shrink-0 ${isSaved
                        ? 'bg-kezak-primary/10 border-kezak-primary text-kezak-primary saved-glow'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isSaved ? t('dashboard.card_saved') : t('dashboard.card_save')}</span>
                </button>
            </div>
        </article>
    );
}
