'use client';

import { useAdTracker } from '@/hooks/use-ad-tracker';
import { Megaphone, ExternalLink } from 'lucide-react';

interface AdSearchCardProps {
  ad: {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    ctaText?: string | null;
  };
  position: number;
}

export function AdSearchCard({ ad, position }: AdSearchCardProps) {
  const { ref, onClick } = useAdTracker({
    adId: ad.id,
    placement: 'SEARCH',
    position,
    source: 'search',
  });

  const handleClick = () => {
    onClick();
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      ref={ref}
      onClick={handleClick}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* Sponsored label */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
        <Megaphone className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Sponsorisé</span>
      </div>

      {/* Image — ratio 1.91:1 comme Facebook */}
      {ad.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: '1.91 / 1' }}>
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3">
        <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">
          {ad.title}
        </h3>

        {ad.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {ad.description}
          </p>
        )}

        {/* CTA button */}
        {ad.ctaText && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-900 rounded-lg transition-colors">
              {ad.ctaText}
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
