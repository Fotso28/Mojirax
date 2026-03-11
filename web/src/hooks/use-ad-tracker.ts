'use client';

import { useRef, useEffect, useCallback } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';

interface TrackOptions {
  adId: string;
  placement: 'FEED' | 'SIDEBAR' | 'BANNER' | 'SEARCH';
  position?: number;
  source?: string;
}

/**
 * Hook pour tracker les impressions (viewport 1s+) et les clics sur une pub.
 * Retourne une ref à attacher au conteneur de la pub + une fonction onClick.
 */
export function useAdTracker(options: TrackOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);
  const viewStart = useRef<number | null>(null);

  // Impression : IntersectionObserver → visible 1s → envoyer
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          viewStart.current = Date.now();
        } else if (viewStart.current && !impressionSent.current) {
          const viewportMs = Date.now() - viewStart.current;
          if (viewportMs >= 1000) {
            sendEvent('IMPRESSION', viewportMs);
            impressionSent.current = true;
          }
          viewStart.current = null;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      // Si toujours visible au démontage, envoyer l'impression
      if (viewStart.current && !impressionSent.current) {
        const viewportMs = Date.now() - viewStart.current;
        if (viewportMs >= 1000) {
          sendEvent('IMPRESSION', viewportMs);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.adId]);

  const sendEvent = useCallback(
    (type: 'IMPRESSION' | 'CLICK', viewportMs?: number) => {
      api.post('/ads/event', {
        adId: options.adId,
        type,
        placement: options.placement,
        position: options.position,
        viewportMs,
        source: options.source,
      }).catch(() => {});
    },
    [options.adId, options.placement, options.position, options.source],
  );

  const onClick = useCallback(() => {
    sendEvent('CLICK');
  }, [sendEvent]);

  return { ref, onClick };
}
