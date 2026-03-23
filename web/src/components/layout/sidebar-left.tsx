'use client';

import { Home, MessageSquare, User, LogOut, FolderKanban, Rocket, Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

export function SidebarLeft({ expanded = false }: { expanded?: boolean }) {
    const pathname = usePathname();
    const { logout, dbUser } = useAuth();
    const { socket } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);

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

    const commonItems = [
        { icon: Home, label: 'Accueil', path: '/' },
        { icon: MessageSquare, label: 'Messages', path: '/messages' },
        { icon: User, label: 'Mon Profil', path: '/profile' },
    ];

    // Build dynamic items based on role
    const dynamicItems: typeof commonItems = [];

    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    if (hasProject) {
        dynamicItems.push({ icon: FolderKanban, label: 'Mes Projets', path: '/my-project' });
    } else if (dbUser?.role !== 'CANDIDATE') {
        dynamicItems.push({ icon: Rocket, label: 'Lancer un projet', path: '/create/project' });
    }

    // Toujours afficher "Mes Candidatures" — un fondateur peut aussi postuler
    dynamicItems.push({ icon: Send, label: 'Mes Candidatures', path: '/applications' });

    // Insert dynamic items after Dashboard (index 0)
    const navItems = [
        commonItems[0],
        ...dynamicItems,
        ...commonItems.slice(1),
    ];

    const labelClass = expanded ? 'block' : 'hidden md:block';

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Profile Summary (Tablet + Desktop) */}
            <div className={`${expanded ? 'block' : 'hidden md:block'} p-6 border-b border-gray-50`}>
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">Mon Espace</h3>
                </div>
                <p className="text-xs text-gray-500">Gérez votre activité</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-hidden">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`
                            flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                            ${isActive(item.path)
                                ? 'bg-kezak-primary/10 text-kezak-primary font-semibold'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }
                        `}
                    >
                        <item.icon className={`w-6 h-6 shrink-0 ${isActive(item.path) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className={`${labelClass} text-sm`}>{item.label}</span>
                        {item.path === '/messages' && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-gray-50">
                <button
                    onClick={() => logout()}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
                >
                    <LogOut className="w-6 h-6 shrink-0" />
                    <span className={`${labelClass} text-sm font-medium`}>Déconnexion</span>
                </button>
            </div>
        </div>
    );
}
