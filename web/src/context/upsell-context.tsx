'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UpsellModal, UpsellFeature } from '@/components/ui/upsell-modal';

interface UpsellContextType {
    openUpsell: (feature: UpsellFeature) => void;
    closeUpsell: () => void;
}

const UpsellContext = createContext<UpsellContextType>({
    openUpsell: () => {},
    closeUpsell: () => {},
});

export const UpsellProvider = ({ children }: { children: React.ReactNode }) => {
    const [feature, setFeature] = useState<UpsellFeature | null>(null);

    const openUpsell = useCallback((f: UpsellFeature) => setFeature(f), []);
    const closeUpsell = useCallback(() => setFeature(null), []);

    // Listen for 403 PLAN_REQUIRED events dispatched by the axios interceptor
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ feature?: UpsellFeature }>).detail;
            openUpsell(detail?.feature ?? 'generic');
        };
        window.addEventListener('upsell:required', handler);
        return () => window.removeEventListener('upsell:required', handler);
    }, [openUpsell]);

    return (
        <UpsellContext.Provider value={{ openUpsell, closeUpsell }}>
            {children}
            <UpsellModal feature={feature} onClose={closeUpsell} />
        </UpsellContext.Provider>
    );
};

export const useUpsell = () => useContext(UpsellContext);
