'use client';

import { ReactNode, useState } from 'react';
import { Header } from './header';
import { SidebarLeft } from './sidebar-left';
import { SidebarRight } from './sidebar-right';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { MobileWidgetDrawer } from './mobile-widget-drawer';
import { AdBanner } from '@/components/ads/ad-banner';
import { useSidebar } from '@/context/sidebar-context';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
    children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isMobileWidgetsOpen, setIsMobileWidgetsOpen] = useState(false);
    const { hidden: isSidebarHidden } = useSidebar();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Banner Ad */}
            <AdBanner />

            {/* Header - Fixed Top */}
            <Header
                onOpenMobileNav={() => setIsMobileNavOpen(true)}
                onOpenMobileWidgets={isSidebarHidden ? undefined : () => setIsMobileWidgetsOpen(true)}
            />

            {/* Main Grid Layout */}
            <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start",
                    isSidebarHidden ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-[280px_1fr_300px]"
                )}>

                    {/* Left Sidebar (Nav) - Hidden on Mobile */}
                    <aside className="hidden md:block sticky top-24 h-[calc(100vh-8rem)]">
                        <SidebarLeft />
                    </aside>

                    {/* Center Feed */}
                    <main className="w-full min-h-[50vh]">
                        {children}
                    </main>

                    {/* Right Sidebar (Widgets) - Hidden on Mobile & Tablet */}
                    {!isSidebarHidden && (
                        <aside className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)]">
                            <SidebarRight />
                        </aside>
                    )}

                </div>
            </div>

            {/* Mobile Drawers */}
            <MobileNavDrawer isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
            <MobileWidgetDrawer isOpen={isMobileWidgetsOpen} onClose={() => setIsMobileWidgetsOpen(false)} />
        </div>
    );
}
