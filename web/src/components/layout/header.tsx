'use client';

import { useState, useEffect } from 'react';
import { Menu, Grid, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/context/sidebar-context';
import { NotificationDropdown } from '@/components/layout/notification-dropdown';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useTranslation } from '@/context/i18n-context';

const UniversalSearch = dynamic(() =>
    import('@/components/search/universal-search').then(m => ({ default: m.UniversalSearch })),
    { ssr: false }
);

interface HeaderProps {
    onOpenMobileNav: () => void;
    onOpenMobileWidgets?: () => void;
}

export function Header({ onOpenMobileNav, onOpenMobileWidgets }: HeaderProps) {
    const { user, dbUser } = useAuth();
    const router = useRouter();
    const { hidden: isSidebarHidden } = useSidebar();
    const [showSearch, setShowSearch] = useState(false);
    const { t } = useTranslation();

    // Raccourci clavier Ctrl+K / Cmd+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">

                    {/* Left: Logo */}
                    <Link href="/feed" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-kezak-primary rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-kezak-dark">MojiraX</span>
                    </Link>

                    {/* Center: Search Bar (Desktop only — lg+) */}
                    <div className="hidden lg:flex flex-1 max-w-xl mx-8">
                        <button
                            onClick={() => setShowSearch(true)}
                            className="relative w-full h-11 ps-10 pe-4 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-400 text-left hover:border-gray-300 hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all cursor-pointer group"
                        >
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
                            <span>{t('dashboard.header_search_placeholder')}</span>
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-gray-400 bg-white/80 rounded border border-gray-200">
                                Ctrl K
                            </kbd>
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Search Icon — visible on mobile + tablet (below lg) */}
                        <button
                            onClick={() => setShowSearch(true)}
                            className="lg:hidden p-2 text-gray-400 hover:text-kezak-primary hover:bg-gray-50 rounded-full transition-colors"
                            aria-label={t('common.aria.search')}
                        >
                            <Search className="w-6 h-6" />
                        </button>

                        {/* Admin link — visible only for ADMIN role */}
                        {dbUser?.role === 'ADMIN' && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="p-2 text-gray-400 hover:text-kezak-primary hover:bg-gray-50 rounded-full transition-colors"
                                title={t('dashboard.feed.header_admin')}
                                aria-label={t('dashboard.feed.header_admin')}
                            >
                                <ShieldCheck className="w-5 h-5" />
                            </button>
                        )}

                        {/* Language Toggle */}
                        <LanguageToggle />

                        {/* Notifications (Mobile + Desktop) */}
                        <NotificationDropdown />

                        {/* Desktop: Profile */}
                        <div className="hidden md:flex items-center gap-3 ps-2 border-l border-gray-100">
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
                                aria-label={t('common.aria.widgets')}
                            >
                                <Grid className="w-6 h-6" />
                            </button>
                        )}

                        {/* Hamburger — far right (mobile only) */}
                        <button
                            onClick={onOpenMobileNav}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                            aria-label={t('common.aria.menu')}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Universal Search Modal */}
            {showSearch && <UniversalSearch onClose={() => setShowSearch(false)} />}
        </>
    );
}
