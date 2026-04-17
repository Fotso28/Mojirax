'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { formatDate } from '@/lib/utils/format-date';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Briefcase, Search, ChevronLeft, ChevronRight, Filter,
  Eye, MousePointerClick, Bookmark, FileText,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  sector: string | null;
  stage: string | null;
  status: string;
  qualityScore: number;
  createdAt: string;
  founder: { id: string; name: string | null; image: string | null };
  _count: { applications: number; userInteractions: number };
  interactions: { views: number; clicks: number; saves: number; shares: number };
}

interface Kpis {
  total: number;
  published: number;
  pendingAi: number;
  rejected: number;
  archivedByAdmin: number;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-50 text-green-600',
  PENDING_AI: 'bg-amber-50 text-amber-600',
  REJECTED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-gray-100 text-gray-600',
  ANALYZING: 'bg-blue-50 text-blue-600',
  REMOVED_BY_ADMIN: 'bg-orange-50 text-orange-600',
};

const STATUSES = ['', 'PUBLISHED', 'PENDING_AI', 'REJECTED', 'DRAFT', 'ANALYZING', 'REMOVED_BY_ADMIN'];

export default function AdminProjectsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [archivingProjectId, setArchivingProjectId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    api.get('/admin/kpis')
      .then((res) => setKpis({
        total: res.data.projects.total,
        published: res.data.projects.published,
        pendingAi: res.data.projects.pendingAi,
        rejected: res.data.moderation.rejectedToday,
        archivedByAdmin: res.data.projects.archivedByAdmin,
      }))
      .catch(() => {});
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (sectorFilter) params.sector = sectorFilter;
      if (search) params.search = search;
      const { data } = await api.get('/admin/projects', { params });
      setProjects(data.projects);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sectorFilter, search]);

  const handleArchive = async () => {
    if (!archivingProjectId || archiveReason.length < 5) return;
    setArchiveLoading(true);
    try {
      await api.patch(`/admin/projects/${archivingProjectId}/archive`, { reason: archiveReason });
      setArchivingProjectId(null);
      setArchiveReason('');
      fetchProjects();
    } catch {
      // handled silently
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoringProjectId) return;
    setRestoreLoading(true);
    try {
      await api.patch(`/admin/projects/${restoringProjectId}/restore`);
      setRestoringProjectId(null);
      fetchProjects();
    } catch {
      // handled silently
    } finally {
      setRestoreLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const kpiCards = kpis ? [
    { label: t('admin.stat_total'), value: kpis.total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('admin.stat_published'), value: kpis.published, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('admin.stat_pending'), value: kpis.pendingAi, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('admin.projects_rejected_today'), value: kpis.rejected, icon: Briefcase, color: 'text-red-600', bg: 'bg-red-50' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('admin.projects_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.projects_count', { count: total })}</p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.projects_search_placeholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full h-[44px] ps-10 pe-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
            >
              <option value="">{t('admin.projects_all_statuses')}</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder={t('admin.projects_sector_placeholder')}
            value={sectorFilter}
            onChange={(e) => { setSectorFilter(e.target.value); setPage(0); }}
            className="h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary w-full sm:w-36"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.projects_col_project')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.projects_col_status')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500" title={t('admin.users_action_views')}><Eye className="w-4 h-4 mx-auto" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-500" title={t('admin.users_action_clicks')}><MousePointerClick className="w-4 h-4 mx-auto" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-500" title={t('admin.section_applications')}><FileText className="w-4 h-4 mx-auto" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-500" title={t('admin.users_action_saves')}><Bookmark className="w-4 h-4 mx-auto" /></th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.projects_col_score')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.projects_col_date')}</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">{t('admin.projects_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    {t('admin.projects_no_projects')}
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.founder.image ? (
                          <img src={p.founder.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(p.founder.name || 'F')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.founder.name || t('admin.projects_no_name')}{p.sector ? ` · ${p.sector}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-gray-600">{p.interactions.views}</td>
                    <td className="px-3 py-4 text-center text-gray-600">{p.interactions.clicks}</td>
                    <td className="px-3 py-4 text-center text-gray-600">{p._count.applications}</td>
                    <td className="px-3 py-4 text-center text-gray-600">{p.interactions.saves}</td>
                    <td className="px-5 py-4">
                      {p.qualityScore > 0 ? (
                        <span className="text-xs font-semibold text-gray-700">{p.qualityScore.toFixed(1)}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {formatDate(p.createdAt, locale)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === 'PUBLISHED' && (
                          <button
                            onClick={() => setArchivingProjectId(p.id)}
                            className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100"
                          >
                            {t('admin.projects_archive')}
                          </button>
                        )}
                        {p.status === 'REMOVED_BY_ADMIN' && (
                          <button
                            onClick={() => setRestoringProjectId(p.id)}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                          >
                            {t('admin.projects_restore')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{t('admin.page_of', { current: page + 1, total: totalPages })}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {archivingProjectId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.projects_archive_title')}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {t('admin.projects_archive_desc')}
            </p>
            <textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder={t('admin.projects_archive_placeholder')}
              className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setArchivingProjectId(null); setArchiveReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleArchive}
                disabled={archiveReason.length < 5 || archiveLoading}
                className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
              >
                {archiveLoading ? t('admin.projects_archiving') : t('admin.projects_confirm_archive')}
              </button>
            </div>
          </div>
        </div>
      )}

      {restoringProjectId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.projects_restore_title')}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {t('admin.projects_restore_desc')}
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setRestoringProjectId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {restoreLoading ? t('admin.projects_restoring') : t('admin.projects_confirm_restore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
