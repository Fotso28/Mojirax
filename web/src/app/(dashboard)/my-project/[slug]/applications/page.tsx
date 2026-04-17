'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useParams, useRouter } from 'next/navigation';
import {
    Loader2, ArrowLeft, UserCheck, UserX, MapPin,
    Clock, Inbox, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/context/i18n-context';

export default function ProjectApplicationsPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const [project, setProject] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

    const STATUS_CONFIG = useMemo(() => ({
        PENDING: { label: t('common.status_pending'), className: 'bg-amber-100 text-amber-700' },
        ACCEPTED: { label: t('common.status_accepted'), className: 'bg-emerald-100 text-emerald-700' },
        REJECTED: { label: t('common.status_rejected'), className: 'bg-red-100 text-red-700' },
    }), [t]);

    const timeAgo = (dateStr: string): string => {
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return t('common.time_just_now');
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return t('common.time_minutes_ago', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('common.time_hours_ago', { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 30) return t('common.time_days_ago', { count: days });
        return t('common.time_months_ago', { count: Math.floor(days / 30) });
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch project by slug to get the ID
                const { data: projectData } = await AXIOS_INSTANCE.get(`/projects/${slug}`);
                setProject(projectData);

                // Fetch applications for this project
                const { data: appsData } = await AXIOS_INSTANCE.get(
                    `/applications/project/${projectData.id}`,
                    { params: { take: 20 } }
                );
                setApplications(appsData);
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 403) {
                    showToast(t('dashboard.not_authorized_applications'), 'error');
                } else if (status === 404) {
                    showToast(t('dashboard.project_not_found'), 'error');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [slug, user, authLoading, router]);

    const handleStatusUpdate = async (applicationId: string, status: 'ACCEPTED' | 'REJECTED') => {
        setActionLoadingId(applicationId);
        try {
            await AXIOS_INSTANCE.patch(`/applications/${applicationId}/status`, { status });
            setApplications((prev) =>
                prev.map((app) =>
                    app.id === applicationId ? { ...app, status } : app
                )
            );
            showToast(
                status === 'ACCEPTED' ? t('dashboard.application_accepted_toast') : t('dashboard.application_rejected_toast'),
                'success'
            );
        } catch (err: any) {
            const msg = err?.response?.status === 400
                ? t('dashboard.application_already_processed')
                : t('dashboard.application_error');
            showToast(msg, 'error');
        } finally {
            setActionLoadingId(null);
            setConfirmRejectId(null);
        }
    };

    const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

    if (authLoading || isLoading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse shrink-0" />
                                <div className="flex-1">
                                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
                                    <div className="flex gap-2 mt-3">
                                        <div className="h-7 w-16 bg-gray-100 rounded-full animate-pulse" />
                                        <div className="h-7 w-20 bg-gray-100 rounded-full animate-pulse" />
                                        <div className="h-7 w-18 bg-gray-100 rounded-full animate-pulse" />
                                    </div>
                                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse mt-3" />
                                    <div className="flex gap-3 mt-4">
                                        <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
                                        <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
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
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                {canGoBack && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                        {t('dashboard.applications_title')}
                    </h1>
                    {project && (
                        <p className="mt-1 text-lg text-gray-500">
                            {project.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Applications list or empty state */}
            {applications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
                    <div className="mx-auto w-16 h-16 bg-kezak-light rounded-full flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-kezak-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {t('dashboard.no_applications_received_title')}
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {t('dashboard.no_applications_received_description')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((app: any) => {
                        const candidate = app.candidate;
                        const candidateUser = candidate?.user;
                        const status = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
                        const candidateName = candidateUser?.name
                            || [candidateUser?.firstName, candidateUser?.lastName].filter(Boolean).join(' ')
                            || t('common.candidate');
                        const skills: string[] = candidate?.skills ?? [];
                        const isActionLoading = actionLoadingId === app.id;

                        return (
                            <div
                                key={app.id}
                                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <Link
                                        href={`/founders/${candidateUser?.id}`}
                                        className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shrink-0 bg-gradient-to-br from-kezak-light to-gray-50 flex items-center justify-center hover:ring-2 hover:ring-kezak-primary/30 transition-all"
                                    >
                                        {candidateUser?.image ? (
                                            <img src={candidateUser.image} alt={candidateName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-kezak-primary font-bold text-lg">
                                                {candidateName.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </Link>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <Link
                                                href={`/founders/${candidateUser?.id}`}
                                                className="text-lg font-bold text-gray-900 truncate hover:text-kezak-primary transition-colors"
                                            >
                                                {candidateName}
                                            </Link>
                                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>

                                        {candidate?.title && (
                                            <p className="text-sm text-gray-600 mt-0.5">{candidate.title}</p>
                                        )}

                                        {/* Skills + location + date */}
                                        <div className="flex items-center flex-wrap gap-2 mt-2">
                                            {skills.slice(0, 5).map((skill: string) => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex text-xs font-medium text-kezak-dark bg-kezak-light/50 px-2.5 py-1 rounded-full"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {skills.length > 5 && (
                                                <span className="text-xs text-gray-400">
                                                    +{skills.length - 5}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center flex-wrap gap-3 mt-2">
                                            {candidate?.location && (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {candidate.location}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {timeAgo(app.createdAt)}
                                            </span>
                                        </div>

                                        {/* Message */}
                                        {app.message && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {app.message}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        {app.status === 'PENDING' && (
                                            <div className="flex items-center gap-3 mt-4">
                                                <button
                                                    onClick={() => handleStatusUpdate(app.id, 'ACCEPTED')}
                                                    disabled={isActionLoading}
                                                    className="inline-flex items-center justify-center gap-2 px-5 h-[40px] rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4" />
                                                    )}
                                                    {t('common.accept')}
                                                </button>

                                                {confirmRejectId === app.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                            {t('common.confirm')}
                                                        </span>
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                                                            disabled={isActionLoading}
                                                            className="inline-flex items-center justify-center gap-1 px-3 h-[32px] rounded-lg font-medium text-xs text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-60"
                                                        >
                                                            {t('common.yes')}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmRejectId(null)}
                                                            className="inline-flex items-center justify-center gap-1 px-3 h-[32px] rounded-lg font-medium text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                                                        >
                                                            {t('common.no')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmRejectId(app.id)}
                                                        disabled={isActionLoading}
                                                        className="inline-flex items-center justify-center gap-2 px-5 h-[40px] rounded-lg font-semibold text-sm text-red-600 bg-white border-2 border-red-200 hover:bg-red-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                        {t('common.reject')}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Already-decided status */}
                                        {app.status === 'ACCEPTED' && (
                                            <div className="flex items-center gap-2 mt-4 text-emerald-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('dashboard.application_accepted')}</span>
                                            </div>
                                        )}
                                        {app.status === 'REJECTED' && (
                                            <div className="flex items-center gap-2 mt-4 text-red-500">
                                                <XCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('dashboard.application_rejected')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
