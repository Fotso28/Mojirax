'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisionView } from './vision-view';
import { ExpertiseView } from './expertise-view';
import { ConditionsView } from './conditions-view';
import { DocumentView } from './document-view';
import { FounderSidebar } from './founder-sidebar';
import { ApplyModal } from '@/components/applications/apply-modal';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { Loader2, ArrowLeft, Share2, Bookmark, BookmarkCheck, MapPin, Briefcase, Users, CheckCircle2, AlertCircle, Pencil, Clock, XCircle, FileEdit, MessageCircle, Lock } from 'lucide-react';
import { useStartConversation } from '@/hooks/use-start-conversation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useUpsell } from '@/context/upsell-context';
import { useToast } from '@/context/toast-context';
import { HideRightSidebar } from '@/context/sidebar-context';
import { cn } from '@/lib/utils';
import { getSectorLabel } from '@/lib/constants/sectors';
import { useTranslation } from '@/context/i18n-context';

function formatRoleLabels(lookingForRole: string, t: (key: string) => string): string {
    return lookingForRole.split(',').filter(Boolean)
        .map((r) => t(`project.role.${r}`) !== `project.role.${r}` ? t(`project.role.${r}`) : r).join(', ');
}

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return t('project.timeAgo.just_now');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('project.timeAgo.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('project.timeAgo.hours', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('project.timeAgo.days', { count: days });
    return t('project.timeAgo.months', { count: Math.floor(days / 30) });
}

function trackInteraction(projectId: string, action: string, extra?: Record<string, any>) {
    AXIOS_INSTANCE.post('/interactions', {
        projectId, action, source: 'DIRECT', ...extra,
    }).catch(() => { });
}

export default function ProjectDeck({ projectId }: { projectId: string }) {
    const { t } = useTranslation();
    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('vision');
    const [isSaved, setIsSaved] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [profileWarning, setProfileWarning] = useState<string[] | null>(null);
    const router = useRouter();
    const { user, dbUser } = useAuth();
    const { openUpsell } = useUpsell();
    const isFreeUser = !dbUser?.plan || dbUser.plan === 'FREE';
    const { showToast } = useToast();
    const { startConversation, loading: messageLoading } = useStartConversation();
    const viewStartRef = useRef(Date.now());
    const scrollRef = useRef<HTMLDivElement>(null);

    const BASE_TABS = [
        { id: 'vision', label: t('project.tabs.vision') },
        { id: 'expertise', label: t('project.tabs.expertise') },
        { id: 'conditions', label: t('project.tabs.conditions') },
    ];

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const { data } = await AXIOS_INSTANCE.get(`/projects/${projectId}`);
                setProject(data);
                trackInteraction(projectId, 'CLICK');
            } catch {
                // Project load failed
            } finally {
                setIsLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    // Charger l'état sauvegardé depuis le backend
    useEffect(() => {
        if (!user) return;
        AXIOS_INSTANCE.get<string[]>('/interactions/saved')
            .then(({ data }) => setIsSaved(data.includes(projectId)))
            .catch(() => {});
    }, [user, projectId]);

    useEffect(() => {
        const start = viewStartRef.current;
        return () => {
            const dwellTimeMs = Date.now() - start;
            if (dwellTimeMs > 3000) {
                trackInteraction(projectId, 'VIEW', { dwellTimeMs });
            }
        };
    }, [projectId]);

    // Check if user has already applied to this project (uses resolved project.id)
    useEffect(() => {
        if (!user || !project) return;
        AXIOS_INSTANCE.get(`/applications/check/${project.id}`)
            .then(({ data }) => {
                setHasApplied(data?.hasApplied === true);
            })
            .catch(() => {
                // Silently fail — button remains in default state
            });
    }, [project, user]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || el.scrollHeight <= el.clientHeight) return;
        const depth = el.scrollTop / (el.scrollHeight - el.clientHeight);
        if (depth > 0.8) {
            trackInteraction(projectId, 'VIEW', { scrollDepth: Math.min(1, depth) });
        }
    }, [projectId]);

    const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
    const goBack = () => router.back();

    const handleSave = () => {
        const next = !isSaved;
        setIsSaved(next);
        trackInteraction(projectId, next ? 'SAVE' : 'UNSAVE');
        showToast(next ? t('project.saved') : t('project.unsaved'), 'success');
    };

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        trackInteraction(projectId, 'SHARE');
        showToast(t('project.link_copied'), 'success');
    };

    if (isLoading) {
        return (
            <>
                <HideRightSidebar />
                <div className="flex flex-col h-full bg-white rounded-2xl">
                    <div className="flex-1 flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
                    </div>
                </div>
            </>
        );
    }

    if (!project) {
        return (
            <>
                <HideRightSidebar />
                <div className="flex flex-col h-full bg-white rounded-2xl items-center justify-center p-12">
                    <p className="text-gray-500 mb-4">{t('project.not_found')}</p>
                    {canGoBack && (
                        <button onClick={goBack} className="text-kezak-primary font-semibold hover:underline">
                            {t('project.back')}
                        </button>
                    )}
                </div>
            </>
        );
    }

    const founderName = project.founder?.name
        || [project.founder?.firstName, project.founder?.lastName].filter(Boolean).join(' ')
        || t('project.founder_default');

    const tabs = (project.aiSummary || project.documentUrl)
        ? [...BASE_TABS, { id: 'document', label: t('project.tabs.document') }]
        : BASE_TABS;

    const ActiveView = activeTab === 'vision' ? VisionView : activeTab === 'expertise' ? ExpertiseView : activeTab === 'conditions' ? ConditionsView : activeTab === 'document' ? DocumentView : VisionView;

    const appCount = project._count?.applications || 0;

    return (
        <>
            {/* Hide the global right sidebar + widget button */}
            <HideRightSidebar />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] lg:gap-6 items-start">
                {/* Main project content */}
                <div className="flex flex-col bg-white rounded-2xl overflow-hidden">
                    {/* Hero */}
                    <div className="relative bg-gradient-to-br from-kezak-dark to-kezak-primary px-6 pt-5 pb-6 rounded-t-2xl">
                        {/* Top bar: back + actions */}
                        <div className="flex items-center justify-between mb-6">
                            {canGoBack ? (
                                <button onClick={goBack} aria-label={t('common.aria.back')} className="p-2 -ms-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all duration-200">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            ) : <div />}
                            <div className="flex items-center gap-1">
                                <button onClick={handleShare} aria-label={t('common.aria.share')} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all duration-200">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSave}
                                    aria-label={isSaved ? t('common.aria.unsave') : t('common.aria.save')}
                                    aria-pressed={isSaved}
                                    className={cn(
                                        "p-2 rounded-full transition-all duration-200",
                                        isSaved ? "text-yellow-400 bg-white/15 saved-glow" : "text-white/70 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Logo + Project info */}
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg shadow-black/10 shrink-0">
                                {project.logoUrl ? (
                                    <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white font-bold text-3xl backdrop-blur-sm">
                                        {project.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <h1 className="text-2xl font-bold text-white leading-tight mb-1.5">{project.name}</h1>
                                <p className="text-white/70 text-sm line-clamp-2 leading-relaxed">{project.pitch}</p>
                            </div>
                        </div>

                        {/* Founder strip */}
                        <Link href={`/founders/${project.founder?.id}`} className="flex items-center gap-3 mt-5 group/founder">
                            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/30 shadow-md shadow-black/10 shrink-0 group-hover/founder:ring-white/60 transition-all">
                                {project.founder?.image ? (
                                    <img src={project.founder.image} alt={founderName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center text-white font-semibold text-lg">
                                        {founderName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white group-hover/founder:underline">{founderName}</p>
                                <p className="text-xs text-white/60">{project.founderRole || t('project.founder_default')} · {timeAgo(project.createdAt, t)}</p>
                            </div>
                        </Link>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/10">
                            {project.sector && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                    <Briefcase className="w-3 h-3" /> {getSectorLabel(project.sector)}
                                </span>
                            )}
                            {project.stage && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                    {t(`project.stage.${project.stage}`) !== `project.stage.${project.stage}` ? t(`project.stage.${project.stage}`) : project.stage}
                                </span>
                            )}
                            {project.location && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                    <MapPin className="w-3 h-3" /> {project.location}
                                </span>
                            )}
                            {project.lookingForRole && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                    <Users className="w-3 h-3" /> {t('project.looking_for')} {formatRoleLabels(project.lookingForRole, t)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Moderation status banner */}
                    {project.status === 'DRAFT' && dbUser?.id === project.founderId && (
                        <div className="mx-6 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FileEdit className="w-5 h-5 text-gray-500 shrink-0" />
                                <p className="text-sm text-gray-600">
                                    {t('project.status_banner.DRAFT')}
                                </p>
                            </div>
                        </div>
                    )}
                    {project.status === 'PENDING_AI' && (
                        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-700">
                                    {t('project.status_banner.PENDING_AI')}
                                </p>
                            </div>
                        </div>
                    )}
                    {project.status === 'REJECTED' && (
                        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-700">
                                        {t('project.status_banner.REJECTED')}
                                    </p>
                                    {project.moderationReason && (
                                        <p className="text-sm text-red-600 mt-1">
                                            {t('project.status_banner.REJECTED_reason', { reason: project.moderationReason })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {project.status === 'ANALYZING' && (
                        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
                                <p className="text-sm text-blue-700">
                                    {t('project.status_banner.ANALYZING')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-gray-100 px-4 sm:px-6 bg-white overflow-x-auto scrollbar-hide">
                        <nav className="flex space-x-1 sm:space-x-8 min-w-max">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                                        activeTab === tab.id
                                            ? "border-kezak-primary text-kezak-primary"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div ref={scrollRef} onScroll={handleScroll} className="p-3 sm:p-6 md:p-8 bg-gray-50/30">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ActiveView project={project} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Profile incomplete warning */}
                    {profileWarning && (
                        <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-amber-800">
                                        {t('project.profile_incomplete')}
                                    </p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        {t('project.profile_incomplete_hint')}
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        {profileWarning.map((field) => (
                                            <li key={field} className="text-sm text-amber-700 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                                                {field}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => router.push('/profile')}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                                    >
                                        {t('project.complete_profile')}
                                    </button>
                                </div>
                                <button
                                    onClick={() => setProfileWarning(null)}
                                    className="text-amber-400 hover:text-amber-600 transition-colors"
                                >
                                    <span className="sr-only">{t('project.close')}</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer CTA */}
                    <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {appCount !== 1
                                ? t('project.applications_count_plural', { count: appCount })
                                : t('project.applications_count', { count: appCount })}
                        </div>
                        {dbUser?.id === project.founderId ? (
                            <Link
                                href={`/modify/project?projectId=${project.id}`}
                                className="inline-flex items-center gap-2 bg-kezak-primary text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-kezak-primary/20 hover:bg-kezak-dark hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                <Pencil className="w-4 h-4" />
                                {t('project.edit_project')}
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2">
                                {dbUser && dbUser.id !== project.founderId && (
                                    <button
                                        onClick={() => startConversation(project.founderId)}
                                        disabled={messageLoading}
                                        className="flex items-center gap-2 px-5 h-[44px] rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        {t('dashboard.feed.message_button')}
                                    </button>
                                )}
                                {hasApplied ? (
                                    <Link
                                        href="/applications"
                                        className="inline-flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-6 py-3 rounded-xl font-semibold transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{t('project.already_applied')}</span>
                                        <span className="text-xs font-normal text-green-600/80 hidden sm:inline">
                                            · {t('dashboard.nav_my_applications')}
                                        </span>
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                router.push('/login');
                                                return;
                                            }
                                            if (isFreeUser) {
                                                openUpsell('apply');
                                                return;
                                            }
                                            // Check profile completeness before opening modal
                                            const missing: string[] = [];
                                            if (!dbUser?.firstName) missing.push(t('project.missing_firstName'));
                                            if (!dbUser?.lastName) missing.push(t('project.missing_lastName'));
                                            if (!dbUser?.title) missing.push(t('project.missing_title'));
                                            if (!dbUser?.bio) missing.push(t('project.missing_bio'));
                                            if (!dbUser?.skills || dbUser.skills.length === 0) missing.push(t('project.missing_skills'));

                                            if (missing.length > 0) {
                                                setProfileWarning(missing);
                                                return;
                                            }
                                            setProfileWarning(null);
                                            setShowApplyModal(true);
                                        }}
                                        className="inline-flex items-center gap-2 bg-kezak-primary text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-kezak-primary/20 hover:bg-kezak-dark hover:-translate-y-0.5 transition-all active:scale-95"
                                    >
                                        {isFreeUser && <Lock className="w-4 h-4" />}
                                        {t('project.apply')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Founder CV sidebar — desktop: sticky right column, mobile: inline below */}
                {project.founder && (
                    <div className="lg:sticky lg:top-24">
                        <FounderSidebar founder={project.founder} />
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            <ApplyModal
                projectId={project.id}
                projectName={project.name ?? t('dashboard.feed.default_project_name')}
                isOpen={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                onSuccess={() => setHasApplied(true)}
                onIncompleteProfile={(fields) => setProfileWarning(fields)}
            />
        </>
    );
}
