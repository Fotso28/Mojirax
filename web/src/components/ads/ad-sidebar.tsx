'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { useAdTracker } from '@/hooks/use-ad-tracker';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

interface SidebarAd {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
}

function SidebarAdCard({ ad, index }: { ad: SidebarAd; index: number }) {
  const { t } = useTranslation();
  const { ref, onClick } = useAdTracker({
    adId: ad.id,
    placement: 'SIDEBAR',
    position: index,
    source: 'sidebar',
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
      onClick={handleClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* Sponsored label */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5">
        <Megaphone className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{t('dashboard.ad_sponsored')}</span>
      </div>

      {/* Image — carré 1:1 */}
      {ad.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2.5">
        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{ad.title}</h4>

        {ad.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
        )}

        {ad.ctaText && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-kezak-primary hover:text-kezak-dark transition-colors">
            {ad.ctaText} <ExternalLink className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}

export function AdSidebar() {
  const [ads, setAds] = useState<SidebarAd[]>([]);

  useEffect(() => {
    api.get('/ads/sidebar')
      .then((res) => setAds(res.data))
      .catch(() => {});
  }, []);

  if (ads.length === 0) return null;

  return (
    <div className="space-y-3">
      {ads.map((ad, i) => (
        <SidebarAdCard key={ad.id} ad={ad} index={i} />
      ))}
    </div>
  );
}
