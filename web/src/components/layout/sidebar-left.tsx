'use client';

import { Home, MessageSquare, User, LogOut, FolderKanban, Rocket, Send, Lock } from 'lucide-react';
import Link from 'next/link';
import { PlanBadge } from '@/components/ui/plan-badge';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { useTranslation } from '@/context/i18n-context';
import { useUpsell } from '@/context/upsell-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

export function SidebarLeft({ expanded = false }: { expanded?: boolean }) {
    const pathname = usePathname();
    const { logout, dbUser } = useAuth();
    const { socket } = useSocket();
    const { t } = useTranslation();
    const { openUpsell } = useUpsell();
    const [unreadCount, setUnreadCount] = useState(0);
    const isFreeUser = !dbUser?.plan || dbUser.plan === 'FREE';

    useEffect(() => {
        AXIOS_INSTANCE.get('/messages/conversations/unread-count')
            .then((res) => setUnreadCount(res.data.count))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!socket || !dbUser?.id) return;
        const currentUserId = dbUser.id;
        const handleNew = (message: { senderId: string }) => {
            if (message.senderId !== currentUserId) {
                setUnreadCount((c) => c + 1);
            }
        };
        const handleRead = ({ readBy }: { readBy: string }) => {
            if (readBy === currentUserId) {
                // Refetch accurate count from server
                AXIOS_INSTANCE.get('/messages/conversations/unread-count')
                    .then((res) => setUnreadCount(res.data.count))
                    .catch(() => {});
            }
        };
        socket.on('message:new', handleNew);
        socket.on('message:read', handleRead);
        return () => {
            socket.off('message:new', handleNew);
            socket.off('message:read', handleRead);
        };
    }, [socket, dbUser?.id]);

    const isActive = (path: string) => pathname === path;

    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    const navItems = useMemo(() => {
        const commonItems = [
            { icon: Home, label: t('dashboard.nav_home'), path: '/' },
            { icon: MessageSquare, label: t('dashboard.nav_messages'), path: '/messages' },
            { icon: User, label: t('dashboard.nav_profile'), path: '/profile' },
        ];

        const dynamicItems: typeof commonItems = [];

        if (hasProject) {
            dynamicItems.push({ icon: FolderKanban, label: t('dashboard.nav_my_projects'), path: '/my-project' });
        } else {
            dynamicItems.push({ icon: Rocket, label: t('dashboard.nav_launch_project'), path: '/create/project' });
        }

        dynamicItems.push({ icon: Send, label: t('dashboard.nav_my_applications'), path: '/applications' });

        return [
            commonItems[0],
            ...dynamicItems,
            ...commonItems.slice(1),
        ];
    }, [t, hasProject]);

    const labelClass = expanded ? 'block' : 'hidden md:block';

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Profile Summary (Tablet + Desktop) */}
            <div className={`${expanded ? 'block' : 'hidden md:block'} p-6 border-b border-gray-50`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-900 truncate">{t('dashboard.my_space')}</h3>
                    <Link href="/settings/billing" aria-label={t('dashboard.billing_title')}>
                        <PlanBadge plan={dbUser?.plan} showFree />
                    </Link>
                </div>
                <p className="text-xs text-gray-500">{t('dashboard.manage_activity')}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-hidden">
                {navItems.map((item) => {
                    const locked = item.path === '/create/project' && isFreeUser;
                    const commonClass = `
                        flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group w-full text-left
                        ${isActive(item.path)
                            ? 'bg-kezak-primary/10 text-kezak-primary font-semibold'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }
                    `;
                    const content = (
                        <>
                            <item.icon className={`w-6 h-6 shrink-0 ${isActive(item.path) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className={`${labelClass} text-sm`}>{item.label}</span>
                            {locked && <Lock className={`${labelClass} w-3.5 h-3.5 ms-auto text-gray-400`} />}
                            {item.path === '/messages' && unreadCount > 0 && (
                                <span className="ms-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </>
                    );
                    if (locked) {
                        return (
                            <button
                                key={item.path}
                                onClick={() => openUpsell('create_project')}
                                className={commonClass}
                            >
                                {content}
                            </button>
                        );
                    }
                    return (
                        <Link key={item.path} href={item.path} className={commonClass}>
                            {content}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-gray-50">
                <button
                    onClick={() => logout()}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
                >
                    <LogOut className="w-6 h-6 shrink-0" />
                    <span className={`${labelClass} text-sm font-medium`}>{t('common.logout')}</span>
                </button>
            </div>
        </div>
    );
}
