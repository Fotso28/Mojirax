'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { formatDate } from '@/lib/utils/format-date';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  ArrowLeft, Eye, MousePointerClick, Users as UsersIcon, TrendingUp,
} from 'lucide-react';

interface AdStats {
  ad: { id: string; title: string; placement: string; createdAt: string };
  metrics: { totalImpressions: number; totalClicks: number; ctr: string; uniqueUsers: number };
  last7Days: { type: string; count: number }[];
  byPlacement: { placement: string; type: string; count: number }[];
}

const PLACEMENT_LABELS_MAP: Record<string, string> = {
  FEED: 'ads_placement_feed',
  SIDEBAR: 'ads_placement_sidebar',
  BANNER: 'ads_placement_banner',
  SEARCH: 'ads_placement_search',
};

const PLACEMENT_COLORS: Record<string, string> = {
  FEED: 'bg-blue-50 text-blue-600',
  SIDEBAR: 'bg-purple-50 text-purple-600',
  BANNER: 'bg-amber-50 text-amber-600',
  SEARCH: 'bg-green-50 text-green-600',
};

export default function AdStatsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const adId = params.id as string;

  const [stats, setStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getPlacementLabel = (placement: string) => {
    const key = PLACEMENT_LABELS_MAP[placement];
    return key ? t(`admin.${key}`) : placement;
  };

  useEffect(() => {
    if (!adId) return;
    setLoading(true);
    api.get(`/admin/ads/${adId}/stats`)
      .then((res) => setStats(res.data))
      .catch(() => setError(t('admin.ad_stats_loading_error')))
      .finally(() => setLoading(false));
  }, [adId, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/admin/ads')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('admin.ad_stats_back')}
        </button>
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">{error || t('admin.ad_stats_not_found')}</p>
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: t('admin.ad_stats_impressions'), value: stats.metrics.totalImpressions, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('admin.ad_stats_clicks'), value: stats.metrics.totalClicks, icon: MousePointerClick, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('admin.ad_stats_ctr'), value: stats.metrics.ctr, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: t('admin.ad_stats_unique_users'), value: stats.metrics.uniqueUsers, icon: UsersIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const last7Impressions = stats.last7Days.find((d) => d.type === 'IMPRESSION')?.count ?? 0;
  const last7Clicks = stats.last7Days.find((d) => d.type === 'CLICK')?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/admin/ads')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('admin.ad_stats_back')}
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{stats.ad.title}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full self-start ${PLACEMENT_COLORS[stats.ad.placement] || 'bg-gray-100 text-gray-600'}`}>
            {getPlacementLabel(stats.ad.placement)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {t('admin.ad_stats_created_at', { date: formatDate(stats.ad.createdAt, locale) })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* 7 derniers jours */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.ad_stats_last_7_days')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex justify-between items-center py-3 px-4 bg-blue-50 rounded-xl">
            <span className="text-sm text-blue-600">{t('admin.ad_stats_impressions')}</span>
            <span className="text-lg font-bold text-blue-600">{last7Impressions}</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-xl">
            <span className="text-sm text-green-600">{t('admin.ad_stats_clicks')}</span>
            <span className="text-lg font-bold text-green-600">{last7Clicks}</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 bg-purple-50 rounded-xl">
            <span className="text-sm text-purple-600">{t('admin.ad_stats_ctr_7d')}</span>
            <span className="text-lg font-bold text-purple-600">
              {last7Impressions > 0 ? ((last7Clicks / last7Impressions) * 100).toFixed(1) + '%' : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Par emplacement */}
      {stats.byPlacement.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.ad_stats_by_placement')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ad_stats_col_placement')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ad_stats_col_type')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('admin.ad_stats_col_count')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.byPlacement.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[row.placement] || 'bg-gray-100 text-gray-600'}`}>
                        {getPlacementLabel(row.placement)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.type === 'IMPRESSION' ? t('admin.ad_stats_type_impression') : t('admin.ad_stats_type_click')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
