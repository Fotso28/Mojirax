'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Megaphone, Plus, Pencil, Trash2, Settings2,
  ChevronLeft, ChevronRight, Eye, EyeOff, MousePointerClick,
} from 'lucide-react';
import { ImageUploader } from '@/components/ui/image-uploader';
import type { ImagePresetKey } from '@/utils/image-processing';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaText: string | null;
  placement: string;
  priority: number;
  targetRoles: string[];
  targetSectors: string[];
  targetCities: string[];
  targetStages: string[];
  targetSkills: string[];
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  maxImpressionsPerUserPerDay: number;
  totalImpressions: number;
  totalClicks: number;
  createdAt: string;
}

interface AdConfig {
  feedInsertEvery: number;
  feedRandomize: boolean;
  sidebarMaxAds: number;
  bannerEnabled: boolean;
  searchInsertPosition: number;
}

const PLACEMENTS = ['', 'FEED', 'SIDEBAR', 'BANNER', 'SEARCH'];
const PLACEMENT_LABELS: Record<string, string> = {
  FEED: 'Feed', SIDEBAR: 'Sidebar', BANNER: 'Bannière', SEARCH: 'Recherche',
};
const PLACEMENT_COLORS: Record<string, string> = {
  FEED: 'bg-blue-50 text-blue-600',
  SIDEBAR: 'bg-purple-50 text-purple-600',
  BANNER: 'bg-amber-50 text-amber-600',
  SEARCH: 'bg-green-50 text-green-600',
};

const PLACEMENT_PRESET_MAP: Record<string, ImagePresetKey> = {
  FEED: 'adFeed',
  SIDEBAR: 'adSidebar',
  SEARCH: 'adSearch',
};

const PLACEMENT_ASPECT_HINT: Record<string, string> = {
  FEED: '1.91:1 (1200×628) — Format Facebook',
  SIDEBAR: '1:1 (600×600) — Carre',
  SEARCH: '1.91:1 (1200×628) — Format Facebook',
};

const emptyForm = {
  title: '', description: '', imageUrl: '', linkUrl: '', ctaText: '',
  placement: 'FEED', priority: 5, isActive: true,
  targetRoles: [] as string[], targetSectors: [] as string[],
  targetCities: [] as string[], targetStages: [] as string[],
  targetSkills: [] as string[],
  startDate: '', endDate: '', maxImpressionsPerUserPerDay: 3,
};

const TagInput = ({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type="text"
      placeholder="Séparer par des virgules..."
      value={value.join(', ')}
      onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
      className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
    />
  </div>
);

export default function AdminAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [placementFilter, setPlacementFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Error toast
  const [errorMsg, setErrorMsg] = useState('');

  // Config
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const PAGE_SIZE = 20;

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (placementFilter) params.placement = placementFilter;
      const { data } = await api.get('/admin/ads', { params });
      setAds(data.ads);
      setTotal(data.total);
    } catch { setErrorMsg('Erreur lors du chargement des publicités.'); } finally {
      setLoading(false);
    }
  }, [page, placementFilter]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  // ─── CRUD ──────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      description: ad.description || '',
      imageUrl: ad.imageUrl || '',
      linkUrl: ad.linkUrl || '',
      ctaText: ad.ctaText || '',
      placement: ad.placement,
      priority: ad.priority,
      isActive: ad.isActive,
      targetRoles: ad.targetRoles,
      targetSectors: ad.targetSectors,
      targetCities: ad.targetCities,
      targetStages: ad.targetStages,
      targetSkills: ad.targetSkills,
      startDate: ad.startDate ? ad.startDate.split('T')[0] : '',
      endDate: ad.endDate ? ad.endDate.split('T')[0] : '',
      maxImpressionsPerUserPerDay: ad.maxImpressionsPerUserPerDay,
    });
    setShowForm(true);
  };

  const saveAd = async () => {
    setSaving(true);
    try {
      // Ne pas envoyer null — omettre les champs vides pour que @IsOptional() fonctionne
      const payload: Record<string, unknown> = {
        title: form.title,
        placement: form.placement,
        priority: form.priority,
        isActive: form.isActive,
        maxImpressionsPerUserPerDay: form.maxImpressionsPerUserPerDay,
      };
      if (form.description) payload.description = form.description;
      if (form.imageUrl) payload.imageUrl = form.imageUrl;
      if (form.linkUrl) payload.linkUrl = form.linkUrl;
      if (form.ctaText) payload.ctaText = form.ctaText;
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;
      if (form.targetRoles.length > 0) payload.targetRoles = form.targetRoles;
      if (form.targetSectors.length > 0) payload.targetSectors = form.targetSectors;
      if (form.targetCities.length > 0) payload.targetCities = form.targetCities;
      if (form.targetStages.length > 0) payload.targetStages = form.targetStages;
      if (form.targetSkills.length > 0) payload.targetSkills = form.targetSkills;

      if (editingId) {
        await api.patch(`/admin/ads/${editingId}`, payload);
      } else {
        await api.post('/admin/ads', payload);
      }
      setShowForm(false);
      fetchAds();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de l\'enregistrement.';
      setErrorMsg(detail);
    } finally {
      setSaving(false);
    }
  };

  const deleteAd = async (id: string) => {
    try {
      await api.delete(`/admin/ads/${id}`);
      fetchAds();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const toggleActive = async (ad: Ad) => {
    try {
      await api.patch(`/admin/ads/${ad.id}`, { isActive: !ad.isActive });
      fetchAds();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  // ─── Config ────────────────────────────────────────

  const openConfig = async () => {
    setShowConfig(true);
    try {
      const { data } = await api.get('/admin/ads/config');
      setConfig(data);
    } catch { setErrorMsg('Erreur lors du chargement de la config.'); }
  };

  const saveConfig = async () => {
    if (!config) return;
    setConfigSaving(true);
    try {
      await api.patch('/admin/ads/config', {
        feedInsertEvery: config.feedInsertEvery,
        feedRandomize: config.feedRandomize,
        sidebarMaxAds: config.sidebarMaxAds,
        bannerEnabled: config.bannerEnabled,
        searchInsertPosition: config.searchInsertPosition,
      });
      setShowConfig(false);
    } catch { setErrorMsg('Erreur lors de la sauvegarde de la config.'); } finally {
      setConfigSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const ctr = (ad: Ad) =>
    ad.totalImpressions > 0
      ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(1) + '%'
      : '—';

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700 font-bold ml-4">&#x2715;</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Publicités</h1>
          <p className="text-sm text-gray-500 mt-1">{total} pub(s) au total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openConfig} className="flex items-center gap-2 h-[44px] px-4 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all duration-200">
            <Settings2 className="w-4 h-4" /> Config
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 h-[44px] px-4 rounded-lg bg-kezak-primary text-white font-semibold text-sm hover:bg-kezak-dark transition-all duration-200">
            <Plus className="w-4 h-4" /> Nouvelle pub
          </button>
        </div>
      </div>

      {/* Filter */}
      <select
        value={placementFilter}
        onChange={(e) => { setPlacementFilter(e.target.value); setPage(0); }}
        className="w-full sm:w-auto h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
      >
        <option value="">Tous les emplacements</option>
        {PLACEMENTS.filter(Boolean).map((p) => (
          <option key={p} value={p}>{PLACEMENT_LABELS[p] || p}</option>
        ))}
      </select>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))
        ) : ads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">Aucune publicité</p>
            <p className="text-sm text-gray-500 mt-1">Créez votre première pub sponsorisée</p>
          </div>
        ) : (
          ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/admin/ads/${ad.id}/stats`)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLACEMENT_COLORS[ad.placement] || 'bg-gray-100 text-gray-600'}`}>
                    {PLACEMENT_LABELS[ad.placement] || ad.placement}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ad.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {ad.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="text-xs text-gray-400">Priorité: {ad.priority}/10</span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleActive(ad)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title={ad.isActive ? 'Désactiver' : 'Activer'}>
                    {ad.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(ad)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(ad.id)} className="p-2 rounded-full hover:bg-red-50 text-red-400 transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-1">{ad.title}</h3>
              {ad.description && <p className="text-sm text-gray-600 line-clamp-1 mb-2">{ad.description}</p>}

              {/* Targeting tags */}
              {(ad.targetRoles.length > 0 || ad.targetSectors.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {ad.targetRoles.map((r) => <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{r}</span>)}
                  {ad.targetSectors.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{s}</span>)}
                  {ad.targetCities.map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">{c}</span>)}
                </div>
              )}

              {/* Metrics */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-2 border-t border-gray-50">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ad.totalImpressions} impressions</span>
                <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {ad.totalClicks} clics</span>
                <span>CTR: {ctr(ad)}</span>
                <span className="sm:ml-auto">{new Date(ad.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* ─── Create/Edit Modal ────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-6">{editingId ? 'Modifier la pub' : 'Nouvelle pub'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement *</label>
                <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value, imageUrl: '' })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary">
                  {PLACEMENTS.filter(Boolean).map((p) => <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité (1-10)</label>
                  <input type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 5 })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texte CTA</label>
                  <input type="text" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="En savoir plus" maxLength={50} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
              </div>

              {/* Image upload — masqué pour BANNER (texte uniquement) */}
              {form.placement !== 'BANNER' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image — {PLACEMENT_ASPECT_HINT[form.placement] || 'Sélectionner un emplacement'}
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <ImageUploader
                      key={form.placement}
                      preset={PLACEMENT_PRESET_MAP[form.placement]}
                      uploadEndpoint=""
                      localMode
                      onLocalResult={async (result) => {
                        setImageUploading(true);
                        setImageError('');
                        try {
                          const fd = new FormData();
                          const ext = result.blob.type === 'image/webp' ? 'webp' : 'jpg';
                          fd.append('file', result.blob, `ad-image.${ext}`);
                          fd.append('placement', form.placement);
                          const { data } = await api.post('/admin/ads/upload-image', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          });
                          setForm((f) => ({ ...f, imageUrl: data.url }));
                        } catch {
                          setImageError("Erreur lors de l'upload de l'image");
                        } finally {
                          setImageUploading(false);
                        }
                      }}
                      currentImageUrl={form.imageUrl || null}
                      onUploadComplete={() => {}}
                      onError={(err) => setImageError(err)}
                      variant="logo"
                      size="lg"
                      placeholder="Image pub"
                    />
                    <div className="flex-1 min-w-0">
                      {imageUploading && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-4 h-4 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />
                          <span className="text-xs text-gray-500">Upload en cours...</span>
                        </div>
                      )}
                      {form.imageUrl && !imageUploading && (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={form.imageUrl} alt="Aperçu" className="w-full h-auto max-h-40 object-contain" />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, imageUrl: '' })}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
                      {!form.imageUrl && !imageUploading && <p className="text-xs text-gray-400 mt-2">Cliquez ou glissez une image pour l&apos;uploader</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-700">La bannière est un bandeau texte — pas d&apos;image nécessaire.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL destination</label>
                <input type="url" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max vues/user/jour</label>
                  <input type="number" min={1} max={50} value={form.maxImpressionsPerUserPerDay} onChange={(e) => setForm({ ...form, maxImpressionsPerUserPerDay: parseInt(e.target.value) || 3 })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
              </div>

              {/* Ciblage */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Ciblage (laisser vide = tout le monde)</h3>
                <div className="space-y-3">
                  <TagInput label="Rôles (FOUNDER, CANDIDATE)" value={form.targetRoles} onChange={(v) => setForm({ ...form, targetRoles: v })} />
                  <TagInput label="Secteurs (Fintech, Health...)" value={form.targetSectors} onChange={(v) => setForm({ ...form, targetSectors: v })} />
                  <TagInput label="Villes" value={form.targetCities} onChange={(v) => setForm({ ...form, targetCities: v })} />
                  <TagInput label="Stages (MVP, Idea, Growth)" value={form.targetStages} onChange={(v) => setForm({ ...form, targetStages: v })} />
                  <TagInput label="Skills" value={form.targetSkills} onChange={(v) => setForm({ ...form, targetSkills: v })} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary" />
                  <span className="text-sm text-gray-700">Actif immédiatement</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="h-[44px] px-6 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all duration-200">
                Annuler
              </button>
              <button onClick={saveAd} disabled={saving || !form.title} className="h-[44px] px-10 rounded-lg bg-kezak-primary text-white font-semibold text-sm hover:bg-kezak-dark transition-all duration-200 disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ──────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer cette pub ?</h2>
            <p className="text-sm text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="h-[44px] px-6 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
              <button onClick={() => { deleteAd(deleteTarget); setDeleteTarget(null); }} className="h-[44px] px-6 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all duration-200">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Config Modal ─────────────────────────────── */}
      {showConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConfig(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-6">Configuration des pubs</h2>

            {!config ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feed : insérer tous les N projets</label>
                  <input type="number" min={3} max={30} value={config.feedInsertEvery} onChange={(e) => setConfig({ ...config, feedInsertEvery: parseInt(e.target.value) || 8 })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.feedRandomize} onChange={(e) => setConfig({ ...config, feedRandomize: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary" />
                  <span className="text-sm text-gray-700">Mode aléatoire (shuffle pondéré)</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sidebar : max pubs affichées</label>
                  <input type="number" min={1} max={5} value={config.sidebarMaxAds} onChange={(e) => setConfig({ ...config, sidebarMaxAds: parseInt(e.target.value) || 2 })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.bannerEnabled} onChange={(e) => setConfig({ ...config, bannerEnabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary" />
                  <span className="text-sm text-gray-700">Bannière header activée</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recherche : position d&apos;insertion</label>
                  <input type="number" min={1} max={10} value={config.searchInsertPosition} onChange={(e) => setConfig({ ...config, searchInsertPosition: parseInt(e.target.value) || 1 })} className="w-full h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setShowConfig(false)} className="h-[44px] px-6 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
                  <button onClick={saveConfig} disabled={configSaving} className="h-[44px] px-6 rounded-lg bg-kezak-primary text-white font-semibold text-sm hover:bg-kezak-dark transition-all duration-200 disabled:opacity-50">
                    {configSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
