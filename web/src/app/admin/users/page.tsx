'use client';

import { useEffect, useState, useCallback } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Users, Search, ChevronLeft, ChevronRight, Shield, Eye,
  MousePointerClick, BookOpen, Bookmark, Share2, Unlock, SkipForward,
  Clock, Activity, SearchIcon, Globe, Monitor, Smartphone, Tablet,
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  createdAt: string;
  _count: { projects: number; transactions: number; notifications: number };
}

interface ProjectView {
  projectId: string;
  projectName: string;
  sector: string | null;
  status: string;
  action: string;
  dwellTimeMs: number | null;
  source: string | null;
  viewedAt: string;
}

interface RecentSearch {
  query: string;
  type: string;
  resultsCount: number;
  clickedResult: string | null;
  searchedAt: string;
}

interface VisitItem {
  device: string | null;
  browser: string | null;
  os: string | null;
  loginAt: string;
  lastSeenAt: string;
  durationMin: number;
}

interface Visits {
  totalVisits: number;
  recentVisits: VisitItem[];
}

interface Engagement {
  totalInteractions: number;
  byAction: Record<string, number>;
  lastActivityAt: string | null;
  recentProjectViews: ProjectView[];
  recentSearches: RecentSearch[];
}

interface UserDetail {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  candidateProfile: { id: string; title: string; status: string; skills: string[]; qualityScore: number; createdAt: string } | null;
  projects: { id: string; name: string; status: string; sector: string; qualityScore: number; createdAt: string }[];
  _count: { transactions: number; unlocks: number; notifications: number };
  engagement: Engagement;
  visits: Visits;
}

const ROLES = ['', 'ADMIN', 'FOUNDER', 'CANDIDATE', 'USER'];
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-600',
  FOUNDER: 'bg-blue-50 text-blue-600',
  CANDIDATE: 'bg-purple-50 text-purple-600',
  USER: 'bg-gray-100 text-gray-600',
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  VIEW: { label: 'Vues', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  CLICK: { label: 'Clics', icon: MousePointerClick, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  SAVE: { label: 'Sauvegardés', icon: Bookmark, color: 'text-amber-600', bg: 'bg-amber-50' },
  APPLY: { label: 'Candidatures', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  SHARE: { label: 'Partages', icon: Share2, color: 'text-purple-600', bg: 'bg-purple-50' },
  UNLOCK: { label: 'Unlocks', icon: Unlock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SKIP: { label: 'Skips', icon: SkipForward, color: 'text-gray-500', bg: 'bg-gray-50' },
  UNSAVE: { label: 'Retirés', icon: Bookmark, color: 'text-gray-400', bg: 'bg-gray-50' },
};

function formatDwell(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(date).toLocaleDateString('fr-FR');
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'activity' | 'searches' | 'visits'>('info');

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailTab('info');
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setSelectedUser(data);
    } catch {
      // handled
    } finally {
      setDetailLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    setRoleChanging(true);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (selectedUser?.id === userId) {
        const { data } = await api.get(`/admin/users/${userId}`);
        setSelectedUser(data);
      }
      fetchUsers();
    } catch {
      // handled
    } finally {
      setRoleChanging(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-1">{total} utilisateur(s) au total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full h-[44px] pl-10 pr-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="w-full sm:w-auto h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">Tous les rôles</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Utilisateur</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Rôle</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Projets</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Inscrit le</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(u.name || u.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{u.name || 'Sans nom'}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role] || ROLE_COLORS.USER}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{u._count.projects}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openDetail(u.id)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-all duration-200"
                        title="Voir détail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
            <p className="text-xs text-gray-500">Page {page + 1} sur {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── User Detail Modal ──────────────────────────── */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-2" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />
              </div>
            ) : selectedUser && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Détail utilisateur</h2>
                  <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">✕</button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {selectedUser.image ? (
                    <img src={selectedUser.image} alt="" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                      {(selectedUser.name || selectedUser.email)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-lg truncate">{selectedUser.name || 'Sans nom'}</p>
                    <p className="text-sm text-gray-500 truncate">{selectedUser.email}</p>
                    {selectedUser.engagement.lastActivityAt && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Activity className="w-3 h-3" />
                        Dernière activité : {timeAgo(selectedUser.engagement.lastActivityAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role changer */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">Rôle :</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) => changeRole(selectedUser.id, e.target.value)}
                      disabled={roleChanging}
                      className="h-[36px] px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary disabled:opacity-50"
                    >
                      {ROLES.filter(Boolean).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanging && <div className="w-4 h-4 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
                  {([
                    { key: 'info' as const, label: 'Infos' },
                    { key: 'activity' as const, label: `Activité (${selectedUser.engagement.totalInteractions})` },
                    { key: 'searches' as const, label: `Recherches (${selectedUser.engagement.recentSearches.length})` },
                    { key: 'visits' as const, label: `Visites (${selectedUser.visits?.totalVisits || 0})` },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        detailTab === tab.key
                          ? 'border-kezak-primary text-kezak-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ─── Tab: Infos ─────────────────────────── */}
                {detailTab === 'info' && (
                  <div className="space-y-4">
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <p className="text-2xl font-bold text-blue-600">{selectedUser.engagement.totalInteractions}</p>
                        <p className="text-xs text-blue-600">Interactions</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-xl">
                        <p className="text-2xl font-bold text-green-600">{selectedUser.projects?.length || 0}</p>
                        <p className="text-xs text-green-600">Projets</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-xl">
                        <p className="text-2xl font-bold text-purple-600">{selectedUser._count.unlocks}</p>
                        <p className="text-xs text-purple-600">Unlocks</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-xl">
                        <p className="text-2xl font-bold text-amber-600">{selectedUser._count.transactions}</p>
                        <p className="text-xs text-amber-600">Transactions</p>
                      </div>
                    </div>

                    {/* Engagement breakdown */}
                    {selectedUser.engagement.totalInteractions > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Engagement par type</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedUser.engagement.byAction)
                            .sort(([, a], [, b]) => b - a)
                            .map(([action, count]) => {
                              const cfg = ACTION_CONFIG[action];
                              if (!cfg) return null;
                              const Icon = cfg.icon;
                              return (
                                <div key={action} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${cfg.bg}`}>
                                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label} : {count}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Projects list */}
                    {selectedUser.projects && selectedUser.projects.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Projets créés</h3>
                        <div className="space-y-2">
                          {selectedUser.projects.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.sector} · Score: {p.qualityScore}/100</p>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                p.status === 'PUBLISHED' ? 'bg-green-50 text-green-600' :
                                p.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Inscrit le {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')} · MAJ {new Date(selectedUser.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                {/* ─── Tab: Activité (projets consultés) ── */}
                {detailTab === 'activity' && (
                  <div>
                    {selectedUser.engagement.recentProjectViews.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Eye className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Aucune activité enregistrée</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.engagement.recentProjectViews.map((v, i) => (
                          <div key={`${v.projectId}-${i}`} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                            <div className="flex-shrink-0">
                              {v.action === 'CLICK' ? (
                                <MousePointerClick className="w-4 h-4 text-indigo-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{v.projectName}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {v.sector && <span>{v.sector}</span>}
                                {v.source && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{v.source}</span>}
                                {v.dwellTimeMs && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" /> {formatDwell(v.dwellTimeMs)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs text-gray-400">{timeAgo(v.viewedAt)}</p>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                v.status === 'PUBLISHED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {v.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Tab: Recherches ────────────────────── */}
                {detailTab === 'searches' && (
                  <div>
                    {selectedUser.engagement.recentSearches.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <SearchIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Aucune recherche enregistrée</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.engagement.recentSearches.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                            <SearchIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">&quot;{s.query}&quot;</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{s.resultsCount} résultat(s)</span>
                                {s.type && <span className="px-1.5 py-0.5 rounded bg-gray-100">{s.type}</span>}
                                {s.clickedResult && <span className="text-green-600">→ clic sur résultat</span>}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(s.searchedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Tab: Visites ─────────────────────────── */}
                {detailTab === 'visits' && (
                  <div>
                    {!selectedUser.visits || selectedUser.visits.recentVisits.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Globe className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Aucune visite enregistrée</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-teal-500" />
                          <span className="text-sm font-bold text-gray-900">
                            {selectedUser.visits.totalVisits} visite(s) au total
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedUser.visits.recentVisits.map((v, i) => {
                            const DeviceIcon = v.device === 'MOBILE' ? Smartphone : v.device === 'TABLET' ? Tablet : Monitor;
                            return (
                              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                                <DeviceIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">{v.browser || 'Inconnu'}</span>
                                    <span className="text-xs text-gray-400">sur</span>
                                    <span className="text-sm text-gray-700">{v.os || 'Inconnu'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{v.device || 'UNKNOWN'}</span>
                                    {v.durationMin > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Clock className="w-3 h-3" />
                                        {v.durationMin < 60 ? `${v.durationMin}min` : `${Math.floor(v.durationMin / 60)}h${v.durationMin % 60}min`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-xs text-gray-400">{timeAgo(v.loginAt)}</p>
                                  <p className="text-[10px] text-gray-300">
                                    {new Date(v.loginAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
