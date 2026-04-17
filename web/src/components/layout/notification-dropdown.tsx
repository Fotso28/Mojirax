'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    UserPlus,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Check,
    FileCheck,
    FileWarning,
} from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useTranslation } from '@/context/i18n-context';
import { formatDate } from '@/lib/utils/format-date';

interface Notification {
    id: string;
    type: 'APPLICATION_RECEIVED' | 'APPLICATION_ACCEPTED' | 'APPLICATION_REJECTED' | 'MODERATION_ALERT' | 'SYSTEM' | 'DOCUMENT_ANALYZED' | 'DOCUMENT_ANALYSIS_FAILED';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: {
        projectId?: string;
        applicationId?: string;
    };
}

const NOTIFICATION_ICONS: Record<Notification['type'], { icon: typeof Bell; color: string }> = {
    APPLICATION_RECEIVED: { icon: UserPlus, color: 'text-blue-500 bg-blue-50' },
    APPLICATION_ACCEPTED: { icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
    APPLICATION_REJECTED: { icon: XCircle, color: 'text-red-500 bg-red-50' },
    MODERATION_ALERT: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
    DOCUMENT_ANALYZED: { icon: FileCheck, color: 'text-green-500 bg-green-50' },
    DOCUMENT_ANALYSIS_FAILED: { icon: FileWarning, color: 'text-amber-500 bg-amber-50' },
    SYSTEM: { icon: Bell, color: 'text-gray-500 bg-gray-50' },
};

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return t('dashboard.notifications_now');
    if (diff < 3600) return t('common.time_minutes_ago', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('common.time_hours_ago', { count: Math.floor(diff / 3600) });
    if (diff < 604800) return t('common.time_days_ago', { count: Math.floor(diff / 86400) });
    return formatDate(dateStr, locale, { day: 'numeric', month: 'short' });
}

export function NotificationDropdown() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const { t, locale } = useTranslation();

    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Prevent hydration mismatch — render static bell on server
    useEffect(() => setMounted(true), []);

    // --- Fetch unread count ---
    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await AXIOS_INSTANCE.get('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch {
            // silently fail
        }
    }, [user]);

    // --- Polling every 30s + on window focus ---
    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        fetchUnreadCount();

        const interval = setInterval(fetchUnreadCount, 30_000);

        const onFocus = () => fetchUnreadCount();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [user, fetchUnreadCount]);

    // --- Fetch notifications on open ---
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await AXIOS_INSTANCE.get('/notifications', {
                params: { limit: 10 },
            });
            setNotifications(data.items ?? []);
        } catch {
            showToast(t('dashboard.notifications_load_error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        const willOpen = !open;
        setOpen(willOpen);
        if (willOpen) fetchNotifications();
    };

    // --- Close on click outside ---
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // --- Mark one as read ---
    const markAsRead = async (notif: Notification) => {
        if (!notif.isRead) {
            try {
                await AXIOS_INSTANCE.patch(`/notifications/${notif.id}/read`);
                setNotifications(prev =>
                    prev.map(n => (n.id === notif.id ? { ...n, isRead: true } : n))
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch {
                // silently fail
            }
        }

        // Navigate
        if (notif.data?.projectId) {
            router.push(`/projects/${notif.data.projectId}`);
        } else if (notif.data?.applicationId) {
            router.push('/applications');
        }

        setOpen(false);
    };

    // --- Mark all as read ---
    const markAllAsRead = async () => {
        try {
            await AXIOS_INSTANCE.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            showToast(t('dashboard.notifications_all_read_success'));
        } catch {
            showToast(t('dashboard.notifications_mark_error'), 'error');
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell button */}
            <button
                onClick={mounted ? handleToggle : undefined}
                className="p-2 text-gray-400 hover:text-kezak-primary hover:bg-gray-50 rounded-full transition-colors relative"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {mounted && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-14 sm:top-full sm:mt-2 w-auto sm:w-[360px] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-kezak-dark">{t('dashboard.notifications_title')}</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-1 text-xs text-kezak-primary hover:text-kezak-dark transition-colors font-medium"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {t('dashboard.notifications_mark_all_read')}
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-5 h-5 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <Bell className="w-8 h-8 mb-2 opacity-40" />
                                    <p className="text-sm">{t('dashboard.notifications_none')}</p>
                                </div>
                            ) : (
                                notifications.map(notif => {
                                    const config = NOTIFICATION_ICONS[notif.type] ?? NOTIFICATION_ICONS.SYSTEM;
                                    const Icon = config.icon;

                                    return (
                                        <button
                                            key={notif.id}
                                            onClick={() => markAsRead(notif)}
                                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                                                !notif.isRead ? 'bg-kezak-primary/[0.03]' : ''
                                            }`}
                                        >
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm truncate ${!notif.isRead ? 'font-semibold text-kezak-dark' : 'font-medium text-gray-700'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.isRead && (
                                                        <span className="shrink-0 w-2 h-2 rounded-full bg-kezak-primary" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-1">
                                                    {timeAgo(notif.createdAt, t, locale)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
