'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisionView } from './vision-view';
import { ExpertiseView } from './expertise-view';
import { ConditionsView } from './conditions-view';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { Loader2, ArrowLeft, Share2, Bookmark, BookmarkCheck, MapPin, Briefcase, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'vision', label: 'Vision' },
    { id: 'expertise', label: 'Expertise' },
    { id: 'conditions', label: 'Conditions' },
];

const STAGE_LABELS: Record<string, string> = {
    IDEA: 'Idée', PROTOTYPE: 'Prototype', MVP_BUILD: 'MVP en cours',
    MVP_LIVE: 'MVP lancé', TRACTION: 'Traction', SCALE: 'Scale',
};
const ROLE_LABELS: Record<string, string> = {
    TECH: 'Profil Tech (CTO/Dev)', BIZ: 'Business (Sales/Marketing)',
    PRODUCT: 'Produit', FINANCE: 'Finance',
};

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

function trackInteraction(projectId: string, action: string, extra?: Record<string, any>) {
    AXIOS_INSTANCE.post('/interactions', {
        projectId, action, source: 'DIRECT', ...extra,
    }).catch(() => {});
}

export default function ProjectDeck({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('vision');
    const [isSaved, setIsSaved] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();
    const viewStartRef = useRef(Date.now());
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const { data } = await AXIOS_INSTANCE.get(`/projects/${projectId}`);
                setProject(data);
                trackInteraction(projectId, 'CLICK');
            } catch {
                console.error('Failed to load project');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    useEffect(() => {
        const start = viewStartRef.current;
        return () => {
            const dwellTimeMs = Date.now() - start;
            if (dwellTimeMs > 3000) {
                trackInteraction(projectId, 'VIEW', { dwellTimeMs });
            }
        };
    }, [projectId]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || el.scrollHeight <= el.clientHeight) return;
        const depth = el.scrollTop / (el.scrollHeight - el.clientHeight);
        if (depth > 0.8) {
            trackInteraction(projectId, 'VIEW', { scrollDepth: Math.min(1, depth) });
        }
    }, [projectId]);

    const handleSave = () => {
        const next = !isSaved;
        setIsSaved(next);
        trackInteraction(projectId, next ? 'SAVE' : 'UNSAVE');
        showToast(next ? 'Projet sauvegardé' : 'Projet retiré', 'success');
    };

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        trackInteraction(projectId, 'SHARE');
        showToast('Lien copié !', 'success');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white rounded-2xl">
                <div className="flex-1 flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col h-full bg-white rounded-2xl items-center justify-center p-12">
                <p className="text-gray-500 mb-4">Projet introuvable.</p>
                <button onClick={() => router.back()} className="text-kezak-primary font-semibold hover:underline">
                    Retour
                </button>
            </div>
        );
    }

    const founderName = project.founder?.name
        || [project.founder?.firstName, project.founder?.lastName].filter(Boolean).join(' ')
        || 'Fondateur';

    const VIEWS: Record<string, React.ComponentType<{ project: any }>> = {
        vision: VisionView,
        expertise: ExpertiseView,
        conditions: ConditionsView,
    };
    const ActiveView = VIEWS[activeTab] || VisionView;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-kezak-dark to-kezak-primary px-6 pt-5 pb-6">
                <div className="flex items-center justify-between mb-5">
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                        <button onClick={handleShare} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button onClick={handleSave} className={cn(
                            "p-2 rounded-full transition-colors",
                            isSaved ? "text-yellow-400 bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}>
                            {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xl shrink-0">
                        {project.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-white leading-tight mb-1">{project.name}</h1>
                        <p className="text-white/70 text-sm line-clamp-2 leading-relaxed">{project.pitch}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    {project.sector && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                            <Briefcase className="w-3 h-3" /> {project.sector}
                        </span>
                    )}
                    {project.stage && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                            {STAGE_LABELS[project.stage] || project.stage}
                        </span>
                    )}
                    {project.location && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                            <MapPin className="w-3 h-3" /> {project.location}
                        </span>
                    )}
                    {project.lookingForRole && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/20">
                            <Users className="w-3 h-3" /> Cherche: {ROLE_LABELS[project.lookingForRole] || project.lookingForRole}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/10">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                        {project.founder?.image ? (
                            <img src={project.founder.image} alt={founderName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/70 font-semibold text-sm">
                                {founderName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{founderName}</p>
                        <p className="text-xs text-white/50">{project.founderRole || 'Fondateur'} · {timeAgo(project.createdAt)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 px-6 bg-white sticky top-0 z-10">
                <nav className="flex space-x-8">
                    {TABS.map((tab) => (
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
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
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

            {/* Footer CTA */}
            <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {project._count?.applications || 0} candidature{(project._count?.applications || 0) !== 1 ? 's' : ''}
                </div>
                <button className="bg-kezak-dark text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-kezak-dark/20 hover:bg-kezak-dark/80 hover:-translate-y-0.5 transition-all active:scale-95">
                    Postuler
                </button>
            </div>
        </div>
    );
}
