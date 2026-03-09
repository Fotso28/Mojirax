'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
    AlertCircle,
    Lightbulb,
    TrendingUp,
    Rocket,
    Users,
    UserPlus,
    RefreshCw,
    Loader2,
    Save,
    Send,
    ArrowLeft,
} from 'lucide-react';

interface BlockConfig {
    key: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

const BLOCKS: BlockConfig[] = [
    { key: 'problem', label: 'Probl\u00e8me', icon: AlertCircle, color: 'text-red-500 bg-red-50' },
    { key: 'solution', label: 'Solution', icon: Lightbulb, color: 'text-amber-500 bg-amber-50' },
    { key: 'market', label: 'March\u00e9', icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
    { key: 'traction', label: 'Traction', icon: Rocket, color: 'text-emerald-500 bg-emerald-50' },
    { key: 'team', label: '\u00c9quipe', icon: Users, color: 'text-purple-500 bg-purple-50' },
    { key: 'cofounder', label: 'Cofondateur recherch\u00e9', icon: UserPlus, color: 'text-indigo-500 bg-indigo-50' },
];

const MAX_CHARS = 2000;

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();

    const slug = params?.slug as string;

    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [summaryData, setSummaryData] = useState<Record<string, string>>({});
    const [regeneratingBlock, setRegeneratingBlock] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const fetchProject = useCallback(async () => {
        try {
            const { data } = await AXIOS_INSTANCE.get(`/projects/by-slug/${slug}`);
            setProject(data);
            if (data.aiSummary) {
                const initial: Record<string, string> = {};
                for (const block of BLOCKS) {
                    initial[block.key] = data.aiSummary[block.key] || '';
                }
                setSummaryData(initial);
            }
        } catch {
            showToast('Impossible de charger le projet.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [slug, showToast]);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        fetchProject();
    }, [user, fetchProject, router]);

    const handleBlockChange = (key: string, value: string) => {
        if (value.length <= MAX_CHARS) {
            setSummaryData(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleRegenerate = async (blockKey: string) => {
        if (!project?.id) return;
        setRegeneratingBlock(blockKey);
        try {
            const { data } = await AXIOS_INSTANCE.post(`/projects/${project.id}/regenerate-block`, {
                block: blockKey,
            });
            if (data?.[blockKey]) {
                setSummaryData(prev => ({ ...prev, [blockKey]: data[blockKey] }));
                showToast('Bloc r\u00e9g\u00e9n\u00e9r\u00e9 avec succ\u00e8s.', 'success');
            }
        } catch {
            showToast('Erreur lors de la r\u00e9g\u00e9n\u00e9ration.', 'error');
        } finally {
            setRegeneratingBlock(null);
        }
    };

    const handleSave = async () => {
        if (!project?.id) return;
        setIsSaving(true);
        try {
            await AXIOS_INSTANCE.patch(`/projects/${project.id}/summary`, {
                aiSummary: summaryData,
            });
            showToast('Modifications enregistr\u00e9es.', 'success');
        } catch {
            showToast('Erreur lors de la sauvegarde.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!project?.id) return;
        setIsPublishing(true);
        try {
            // Sauvegarder d'abord les modifications
            await AXIOS_INSTANCE.patch(`/projects/${project.id}/summary`, {
                aiSummary: summaryData,
            });
            // Puis publier
            await AXIOS_INSTANCE.post(`/projects/${project.id}/publish`);
            showToast('Projet publi\u00e9 avec succ\u00e8s !', 'success');
            router.push(`/projects/${slug}`);
        } catch {
            showToast('Erreur lors de la publication.', 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Projet introuvable.</p>
                <button
                    onClick={() => router.push('/my-project')}
                    className="mt-4 text-kezak-primary font-semibold hover:underline"
                >
                    Retour
                </button>
            </div>
        );
    }

    const analysisInProgress = !project.aiSummary;

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
            >
                <button
                    onClick={() => router.push('/my-project')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au projet
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    V\u00e9rifiez la synth\u00e8se de votre projet
                </h1>
                <p className="text-gray-500">
                    {project.name} — Relisez et ajustez chaque bloc avant de publier.
                </p>
            </motion.div>

            {/* Analyse en cours */}
            {analysisInProgress ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"
                >
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-amber-900 mb-2">
                        Analyse en cours...
                    </h3>
                    <p className="text-amber-700 max-w-md mx-auto">
                        Notre IA analyse votre document. Cette page se mettra \u00e0 jour automatiquement
                        une fois l'analyse termin\u00e9e.
                    </p>
                    <button
                        onClick={fetchProject}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualiser
                    </button>
                </motion.div>
            ) : (
                <>
                    {/* Blocs \u00e9ditables */}
                    <div className="space-y-5">
                        {BLOCKS.map((block, index) => {
                            const Icon = block.icon;
                            const isRegenerating = regeneratingBlock === block.key;
                            const charCount = (summaryData[block.key] || '').length;
                            const [iconColor, iconBg] = block.color.split(' ');

                            return (
                                <motion.div
                                    key={block.key}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                                >
                                    {/* En-t\u00eate du bloc */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                                                <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                                            </div>
                                            <h3 className="font-semibold text-gray-900">
                                                {block.label}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => handleRegenerate(block.key)}
                                            disabled={isRegenerating}
                                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-kezak-primary disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                                            <span className="hidden sm:inline">R\u00e9g\u00e9n\u00e9rer</span>
                                        </button>
                                    </div>

                                    {/* Textarea */}
                                    <div className="relative">
                                        {isRegenerating && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-2xl">
                                                <div className="flex items-center gap-3">
                                                    <Loader2 className="w-5 h-5 text-kezak-primary animate-spin" />
                                                    <span className="text-sm font-medium text-gray-600">
                                                        R\u00e9g\u00e9n\u00e9ration en cours...
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <textarea
                                            value={summaryData[block.key] || ''}
                                            onChange={(e) => handleBlockChange(block.key, e.target.value)}
                                            rows={4}
                                            maxLength={MAX_CHARS}
                                            className="w-full px-5 py-4 text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 placeholder:text-gray-400 text-sm sm:text-base"
                                            placeholder={`Contenu du bloc "${block.label}"...`}
                                        />
                                        <div className="px-5 pb-3 flex justify-end">
                                            <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {charCount} / {MAX_CHARS}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.35 }}
                        className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end"
                    >
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Enregistrer les modifications
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="flex items-center justify-center gap-2 px-8 py-3 bg-kezak-primary text-white rounded-xl font-bold hover:bg-kezak-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-kezak-primary/20"
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Publier le projet
                        </button>
                    </motion.div>
                </>
            )}
        </div>
    );
}
