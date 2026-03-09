'use client';

import { Home, MessageSquare, User, Settings, LogOut, FolderKanban, Rocket, Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function SidebarLeft() {
    const pathname = usePathname();
    const { logout, dbUser } = useAuth();

    const isActive = (path: string) => pathname === path;

    const commonItems = [
        { icon: Home, label: 'Tableau de bord', path: '/' },
        { icon: MessageSquare, label: 'Messages', path: '/messages' },
        { icon: User, label: 'Mon Profil', path: '/profile' },
        { icon: Settings, label: 'Paramètres', path: '/settings' },
    ];

    // Build dynamic items based on role
    const dynamicItems: typeof commonItems = [];

    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    if (hasProject) {
        dynamicItems.push({ icon: FolderKanban, label: 'Mes Projets', path: '/my-project' });
    } else if (dbUser?.role !== 'CANDIDATE') {
        dynamicItems.push({ icon: Rocket, label: 'Lancer un projet', path: '/onboarding/project' });
    }

    // Toujours afficher "Mes Candidatures" — un fondateur peut aussi postuler
    dynamicItems.push({ icon: Send, label: 'Mes Candidatures', path: '/applications' });

    // Insert dynamic items after Dashboard (index 0)
    const navItems = [
        commonItems[0],
        ...dynamicItems,
        ...commonItems.slice(1),
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Profile Summary (Desktop Only) */}
            <div className="hidden lg:block p-6 border-b border-gray-50">
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">Mon Espace</h3>
                </div>
                <p className="text-xs text-gray-500">Gérez votre activité</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                        <span className="hidden lg:block text-sm">{item.label}</span>
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
                    <span className="hidden lg:block text-sm font-medium">Déconnexion</span>
                </button>
            </div>
        </div>
    );
}
