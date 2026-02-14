'use client';

import { ReactNode, useState } from 'react';
import { Header } from './header';
import { SidebarLeft } from './sidebar-left';
import { SidebarRight } from './sidebar-right';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { MobileWidgetDrawer } from './mobile-widget-drawer';

interface DashboardShellProps {
    children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isMobileWidgetsOpen, setIsMobileWidgetsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header - Fixed Top */}
            <Header
                onOpenMobileNav={() => setIsMobileNavOpen(true)}
                onOpenMobileWidgets={() => setIsMobileWidgetsOpen(true)}
            />

            {/* Main Grid Layout */}
            <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 pt-20 md:pt-24 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] lg:grid-cols-[280px_1fr_300px] gap-6 items-start">

                    {/* Left Sidebar (Nav) - Hidden on Mobile */}
                    <aside className="hidden md:block sticky top-24 h-[calc(100vh-8rem)]">
                        <SidebarLeft />
                    </aside>

                    {/* Center Feed */}
                    <main className="w-full min-h-[50vh]">
                        {children}
                    </main>

                    {/* Right Sidebar (Widgets) - Hidden on Mobile & Tablet */}
                    <aside className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)]">
                        <SidebarRight />
                    </aside>

                </div>
            </div>

            {/* Mobile Drawers */}
            <MobileNavDrawer isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
            <MobileWidgetDrawer isOpen={isMobileWidgetsOpen} onClose={() => setIsMobileWidgetsOpen(false)} />
        </div>
    );
}
