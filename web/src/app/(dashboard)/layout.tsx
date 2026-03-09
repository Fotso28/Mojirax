'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/context/sidebar-context';

export default function DashboardLayout({
    children,
    modal
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <DashboardShell>
                {children}
                {modal}
            </DashboardShell>
        </SidebarProvider>
    );
}
