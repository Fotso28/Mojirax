'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/context/sidebar-context';
import { SocketProvider } from '@/context/socket-context';

export default function DashboardLayout({
    children,
    modal
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <SocketProvider>
            <SidebarProvider>
                <DashboardShell>
                    {children}
                    {modal}
                </DashboardShell>
            </SidebarProvider>
        </SocketProvider>
    );
}
