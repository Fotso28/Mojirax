'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Rocket, Briefcase, MapPin, Clock, ChevronRight, Inbox } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Acceptee', className: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Refusee', className: 'bg-red-100 text-red-700' },
};

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "A l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days}j`;
    return `Il y a ${Math.floor(days / 30)} mois`;
}

export default function ApplicationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchApplications = async () => {
            try {
                const { data } = await AXIOS_INSTANCE.get('/applications/mine', {
                    params: { take: 20 },
                });
                setApplications(data);
            } catch {
                // Silently fail — empty state will show
            } finally {
                setIsLoading(false);
            }
        };
        fetchApplications();
    }, [user, authLoading, router]);

    if (authLoading || isLoading) {
        return (
            <div className="space-y-8 p-4 sm:p-8">
                <div>
                    <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-5 w-72 bg-gray-100 rounded-lg animate-pulse mt-2" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                                <div className="flex-1">
                                    <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse mt-3" />
                                    <div className="flex gap-3 mt-3">
                                        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                                        <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8 p-4 sm:p-8"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Mes Candidatures
                </h1>
                <p className="mt-2 text-lg text-gray-500">
                    Suivez l&apos;etat de vos candidatures
                </p>
            </div>

            {/* List or empty state */}
            {applications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
                    <div className="mx-auto w-16 h-16 bg-kezak-light rounded-full flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-kezak-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Aucune candidature
                    </h2>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Vous n&apos;avez pas encore postule a un projet. Explorez le feed pour trouver des projets qui vous correspondent.
                    </p>
                    <button
                        onClick={() => router.push('/feed')}
                        className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-8 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary"
                    >
                        <Rocket className="w-5 h-5" />
                        Explorer les projets
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((app: any) => {
                        const status = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.PENDING;
                        const project = app.project;

                        return (
                            <button
                                key={app.id}
                                onClick={() => router.push(`/projects/${project?.slug ?? project?.id}`)}
                                className="w-full text-left bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Project logo */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gradient-to-br from-kezak-light to-gray-50 flex items-center justify-center">
                                        {project?.logoUrl ? (
                                            <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-kezak-primary font-bold text-lg">
                                                {project?.name?.charAt(0)?.toUpperCase() ?? '?'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-kezak-primary transition-colors">
                                                {project?.name ?? 'Projet'}
                                            </h3>
                                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex items-center flex-wrap gap-3 mt-2">
                                            {project?.sector && (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    {project.sector}
                                                </span>
                                            )}
                                            {project?.stage && (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                                    {project.stage}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {timeAgo(app.createdAt)}
                                            </span>
                                        </div>

                                        {/* Message */}
                                        {app.message && (
                                            <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                                                {app.message.length > 100
                                                    ? `${app.message.substring(0, 100)}...`
                                                    : app.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-kezak-primary shrink-0 mt-1 transition-colors" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
