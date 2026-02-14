'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function DashboardLayout({
    children,
    modal
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <DashboardShell>
            {children}
            {modal}
        </DashboardShell>
    );
}
