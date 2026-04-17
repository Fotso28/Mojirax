'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogItem {
  id: string;
  action: string;
  targetId: string;
  details: any;
  createdAt: string;
  admin: { id: string; name: string | null; image: string | null };
}

const ACTION_COLORS: Record<string, string> = {
  CHANGE_ROLE: 'bg-purple-50 text-purple-600',
  MODERATE_PROJECT: 'bg-blue-50 text-blue-600',
  MODERATE_CANDIDATE: 'bg-indigo-50 text-indigo-600',
};

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/logs', { params: { take: PAGE_SIZE, skip: page * PAGE_SIZE } });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDetails = (log: LogItem) => {
    if (!log.details) return '';
    const d = log.details as any;

    switch (log.action) {
      case 'CHANGE_ROLE':
        return `${d.userName || t('admin.logs_user_label')} : ${d.oldRole} → ${d.newRole}`;
      case 'MODERATE_PROJECT':
        return `${d.projectName || t('admin.moderation_entity_project')} : ${d.previousStatus} → ${d.newStatus}${d.reason ? ` (${d.reason})` : ''}`;
      case 'MODERATE_CANDIDATE':
        return `${d.candidateTitle || t('admin.moderation_entity_candidate')} : ${d.previousStatus} → ${d.newStatus}${d.reason ? ` (${d.reason})` : ''}`;
      default:
        return JSON.stringify(d);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('admin.logs_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.logs_count', { count: total })}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-full max-w-96 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ScrollText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            {t('admin.logs_no_logs')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  {log.admin.image ? (
                    <img src={log.admin.image} alt="" className="w-8 h-8 rounded-full object-cover mt-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
                      {(log.admin.name || 'A')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{log.admin.name || 'Admin'}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{formatDetails(log)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
    </div>
  );
}
