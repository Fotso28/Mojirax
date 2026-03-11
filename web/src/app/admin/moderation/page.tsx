'use client';

import { useEffect, useState, useCallback } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { Shield, Check, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface ModerationItem {
  id: string;
  entityType: 'project' | 'candidate';
  name?: string;
  title?: string;
  pitch?: string;
  bio?: string;
  status: string;
  sector?: string;
  skills?: string[];
  qualityScore: number;
  createdAt: string;
  founder?: { id: string; name: string; email: string; image: string | null };
  user?: { id: string; name: string; email: string; image: string | null };
  moderationLogs: {
    id: string;
    aiScore: number;
    aiReason: string | null;
    status: string;
    reviewedAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_AI: 'bg-amber-50 text-amber-600',
  REJECTED: 'bg-red-50 text-red-600',
  PUBLISHED: 'bg-green-50 text-green-600',
  DRAFT: 'bg-gray-100 text-gray-600',
  ANALYZING: 'bg-blue-50 text-blue-600',
};

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'' | 'project' | 'candidate'>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const PAGE_SIZE = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/admin/moderation', { params });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const approve = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      await api.patch(`/admin/moderation/${itemId}`, { action: 'PUBLISHED' });
      fetchItems();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      await api.patch(`/admin/moderation/${itemId}`, {
        action: 'REJECTED',
        reason: rejectReason || undefined,
      });
      setRejectingId(null);
      setRejectReason('');
      fetchItems();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Modération</h1>
        <p className="text-sm text-gray-500 mt-1">{total} élément(s) en attente</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as any); setPage(0); }}
          className="h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">Tous</option>
          <option value="project">Projets</option>
          <option value="candidate">Candidats</option>
        </select>
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Shield className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <p className="text-lg font-medium text-gray-900">File vide</p>
          <p className="text-sm text-gray-500 mt-1">Aucun élément en attente de modération</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const owner = item.entityType === 'project' ? item.founder : item.user;
            const displayName = item.entityType === 'project' ? item.name : item.title;
            const displayDesc = item.entityType === 'project' ? item.pitch : item.bio;

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      item.entityType === 'project' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {item.entityType === 'project' ? 'Projet' : 'Candidat'}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT}`}>
                      {item.status}
                    </span>
                    {item.qualityScore > 0 && (
                      <span className="text-xs text-gray-400">Score: {item.qualityScore.toFixed(1)}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">{displayName}</h3>
                {displayDesc && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{displayDesc}</p>
                )}

                {/* Skills for candidates */}
                {item.skills && item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.skills.slice(0, 6).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>
                    ))}
                  </div>
                )}

                {/* Owner */}
                {owner && (
                  <div className="flex items-center gap-2 mb-3">
                    {owner.image ? (
                      <img src={owner.image} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        {(owner.name || owner.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">{owner.name || owner.email}</span>
                  </div>
                )}

                {/* Moderation Logs */}
                {item.moderationLogs && item.moderationLogs.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-2">Historique IA :</p>
                    {item.moderationLogs.map((log) => (
                      <div key={log.id} className="text-xs text-gray-600 mb-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded ${STATUS_COLORS[log.status] || ''}`}>
                          {log.status}
                        </span>
                        {' '}Score: {log.aiScore.toFixed(2)}
                        {log.aiReason && <span> — {log.aiReason}</span>}
                        <span className="text-gray-400 ml-2">{new Date(log.reviewedAt).toLocaleString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => approve(item.id)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-2 h-[44px] px-4 rounded-lg bg-green-50 text-green-600 font-semibold text-sm hover:bg-green-100 transition-all duration-200 disabled:opacity-50"
                  >
                    {actionLoading === item.id ? (
                      <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approuver
                  </button>

                  {rejectingId === item.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="Raison du rejet (optionnel)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="flex-1 h-[44px] px-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                        autoFocus
                      />
                      <button
                        onClick={() => reject(item.id)}
                        disabled={actionLoading === item.id}
                        className="h-[44px] px-4 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="h-[44px] px-3 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all duration-200"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(item.id)}
                      className="flex items-center gap-2 h-[44px] px-4 rounded-lg border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                      Rejeter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page + 1} sur {totalPages}</p>
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
  );
}
