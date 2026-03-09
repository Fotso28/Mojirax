'use client';

import { Menu, Grid, Search } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/context/sidebar-context';
import { NotificationDropdown } from '@/components/layout/notification-dropdown';

interface HeaderProps {
    onOpenMobileNav: () => void;
    onOpenMobileWidgets?: () => void;
}

export function Header({ onOpenMobileNav, onOpenMobileWidgets }: HeaderProps) {
    const { user, dbUser } = useAuth();
    const router = useRouter();
    const { hidden: isSidebarHidden } = useSidebar();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
            <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-kezak-primary rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-kezak-dark">MojiraX</span>
                </div>

                {/* Center: Search Bar (Desktop only — lg+) */}
                <div className="hidden lg:flex flex-1 max-w-xl mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un projet, un talent, une idée..."
                            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all cursor-pointer"
                            readOnly
                            onClick={() => router.push('/feed/search')}
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Search Icon — visible on mobile + tablet (below lg) */}
                    <button
                        onClick={() => router.push('/feed/search')}
                        className="lg:hidden p-2 text-gray-400 hover:text-kezak-primary hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <Search className="w-6 h-6" />
                    </button>

                    {/* Notifications (Mobile + Desktop) */}
                    <NotificationDropdown />

                    {/* Desktop: Profile */}
                    <div className="hidden md:flex items-center gap-3 pl-2 border-l border-gray-100">
                        <div
                            onClick={() => router.push('/profile')}
                            className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 overflow-hidden ring-2 ring-transparent hover:ring-kezak-primary/20 transition-all cursor-pointer relative"
                        >
                            <div className="absolute inset-0 flex items-center justify-center bg-kezak-primary text-white text-sm font-bold uppercase">
                                {(dbUser?.firstName?.[0] || user?.displayName?.[0] || 'U')}
                            </div>
                            {(dbUser?.image || user?.photoURL) && (
                                <img
                                    src={dbUser?.image || user?.photoURL}
                                    alt="Profile"
                                    className="absolute inset-0 w-full h-full object-cover z-10"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.opacity = '0';
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Widget Drawer Toggle (tablet) */}
                    {onOpenMobileWidgets && !isSidebarHidden && (
                        <button
                            onClick={onOpenMobileWidgets}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        >
                            <Grid className="w-6 h-6" />
                        </button>
                    )}

                    {/* Hamburger — far right (mobile only) */}
                    <button
                        onClick={onOpenMobileNav}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
}
