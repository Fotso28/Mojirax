'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { useAdTracker } from '@/hooks/use-ad-tracker';
import { X } from 'lucide-react';

interface BannerAd {
  id: string;
  title: string;
  description?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
}

function BannerContent({ ad, onDismiss }: { ad: BannerAd; onDismiss: () => void }) {
  const { ref, onClick } = useAdTracker({
    adId: ad.id,
    placement: 'BANNER',
    source: 'banner',
  });

  const handleClick = () => {
    onClick();
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={ref}
      className="bg-kezak-primary text-white text-center py-2 px-4 relative"
    >
      <div
        onClick={handleClick}
        className="cursor-pointer inline-flex items-center gap-2 text-sm"
      >
        <span className="font-medium">{ad.title}</span>
        {ad.description && (
          <span className="hidden sm:inline text-white/80">— {ad.description}</span>
        )}
        {ad.ctaText && (
          <span className="font-bold underline ms-1">{ad.ctaText}</span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function AdBanner() {
  const [ad, setAd] = useState<BannerAd | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ne pas réafficher si déjà fermée cette session
    if (sessionStorage.getItem('ad_banner_dismissed')) return;

    api.get('/ads/banner')
      .then((res) => {
        if (res.data) setAd(res.data);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('ad_banner_dismissed', '1');
  };

  if (!ad || dismissed) return null;

  return <BannerContent ad={ad} onDismiss={handleDismiss} />;
}
