'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';
import { useToast } from '@/context/toast-context';

/**
 * Persistent banner that appears when the browser reports offline.
 * Shows a toast when connection is restored.
 *
 * Critical on Cameroon 3G/4G where connectivity drops are frequent —
 * without this the app silently fails (failed uploads, stale feeds,
 * chat messages stuck in SENDING).
 */
export function OfflineBanner() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Initial state — navigator.onLine can be unreliable but a good starting point.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
        }

        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => {
            setIsOffline(false);
            showToast(t('common.offline.reconnected'), 'success');
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [showToast, t]);

    if (!isOffline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-white text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-md"
        >
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>{t('common.offline.banner')}</span>
        </div>
    );
}
