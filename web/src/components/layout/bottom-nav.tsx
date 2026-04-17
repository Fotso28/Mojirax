'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, FolderKanban, User, Send } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { cn } from '@/lib/utils';

/**
 * Persistent bottom navigation for mobile (< md).
 *
 * 80% of MojiraX traffic is mobile; the previous pattern forced every
 * navigation through a hamburger → drawer → item sequence (3 taps).
 * This bar surfaces the 4 most-used destinations in 1 tap.
 *
 * Hidden on desktop via `md:hidden`. Hidden on /messages when a
 * conversation is open (chat takes the whole viewport on mobile).
 */
export function BottomNav() {
    const pathname = usePathname();
    const { dbUser } = useAuth();
    const { socket } = useSocket();
    const { t } = useTranslation();
    const [unreadCount, setUnreadCount] = useState(0);

    // Hide on /messages when a conversation is active (URL has ?conv=)
    const isChatOpen = pathname === '/messages' && typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('conv');

    useEffect(() => {
        if (!dbUser) return;
        AXIOS_INSTANCE.get('/messages/conversations/unread-count')
            .then((res) => setUnreadCount(res.data.count))
            .catch(() => {});
    }, [dbUser]);

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

    if (!dbUser || isChatOpen) return null;

    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    const items: { icon: typeof Home; label: string; path: string; badge?: number }[] = [
        { icon: Home, label: t('dashboard.nav_home'), path: '/' },
        {
            icon: FolderKanban,
            label: hasProject ? t('dashboard.nav_my_projects') : t('dashboard.nav_launch_project'),
            path: hasProject ? '/my-project' : '/create/project',
        },
        { icon: Send, label: t('dashboard.nav_my_applications'), path: '/applications' },
        {
            icon: MessageSquare,
            label: t('dashboard.nav_messages'),
            path: '/messages',
            badge: unreadCount,
        },
        { icon: User, label: t('dashboard.nav_profile'), path: '/profile' },
    ];

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/' || pathname === '/feed';
        return pathname === path || pathname.startsWith(path + '/');
    };

    return (
        <nav
            role="navigation"
            aria-label={t('dashboard.my_space')}
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]"
        >
            <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
                {items.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] rounded-lg px-2 transition-colors',
                                active ? 'text-kezak-primary' : 'text-gray-400',
                            )}
                        >
                            <item.icon className={cn('w-6 h-6', active && 'stroke-[2.5px]')} />
                            <span className={cn('text-[10px] font-medium leading-none', active && 'font-semibold')}>
                                {item.label}
                            </span>
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
