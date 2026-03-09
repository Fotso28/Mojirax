'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
    hidden: boolean;
    setHidden: (hidden: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
    hidden: false,
    setHidden: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [hidden, setHidden] = useState(false);
    return (
        <SidebarContext.Provider value={{ hidden, setHidden }}>
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => useContext(SidebarContext);

/**
 * Drop-in component: mount it to hide the global right sidebar.
 * Automatically restores on unmount.
 */
export function HideRightSidebar() {
    const { setHidden } = useSidebar();

    useEffect(() => {
        setHidden(true);
        return () => setHidden(false);
    }, [setHidden]);

    return null;
}
