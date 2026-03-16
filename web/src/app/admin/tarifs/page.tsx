'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Star, Loader2, Tags, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  currency: string;
  description: string | null;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  order: number;
  ctaLabel: string;
}

const EMPTY_PLAN_FORM = {
  name: '', price: 0, period: 'mois', currency: 'EUR', description: '',
  features: [''], isPopular: false, isActive: true, ctaLabel: 'Commencer', order: 0,
};

export default function TarifsPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PLAN_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...EMPTY_PLAN_FORM, order: plans.length });
    setModalOpen(true);
  };

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price: plan.price,
      period: plan.period,
      currency: plan.currency,
      description: plan.description || '',
      features: plan.features.length > 0 ? [...plan.features] : [''],
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      ctaLabel: plan.ctaLabel,
      order: plan.order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        features: form.features.filter((f) => f.trim() !== ''),
      };
      if (editingPlan) {
        await api.patch(`/admin/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/admin/plans', payload);
      }
      setModalOpen(false);
      fetchPlans();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/plans/${id}`);
      setDeleteConfirm(null);
      fetchPlans();
    } catch { /* silent */ }
  };

  const movePlan = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...plans].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((p) => p.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = sorted.map((p, i) => {
      if (i === idx) return { id: p.id, order: sorted[swapIdx].order };
      if (i === swapIdx) return { id: p.id, order: sorted[idx].order };
      return { id: p.id, order: p.order };
    });
    try {
      const res = await api.post('/admin/plans/reorder', { plans: reordered });
      setPlans(res.data);
    } catch { /* silent */ }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/plans/${id}`, { isActive });
      fetchPlans();
    } catch { /* silent */ }
  };

  const togglePopular = async (id: string) => {
    try {
      await api.patch(`/admin/plans/${id}`, { isPopular: true });
      fetchPlans();
    } catch { /* silent */ }
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ''] }));
  const removeFeature = (idx: number) => setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  const updateFeature = (idx: number, val: string) => setForm((f) => {
    const features = [...f.features];
    features[idx] = val;
    return { ...f, features };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
      </div>
    );
  }

  const sorted = [...plans].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-kezak-primary" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion des tarifs</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{plans.length} plan(s) configuré(s)</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-[44px] px-5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Tags className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Aucun plan tarifaire configuré</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre premier plan pour commencer</p>
          <button onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm">
            <Plus className="w-4 h-4" /> Créer un plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {sorted.map((plan, idx) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm relative ${
                !plan.isActive ? 'opacity-50 border-gray-200' : plan.isPopular ? 'border-kezak-primary border-2' : 'border-gray-100'
              }`}
            >
              {/* Badges */}
              <div className="flex gap-1.5 mb-3 min-h-[20px]">
                {plan.isPopular && (
                  <span className="bg-kezak-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Populaire</span>
                )}
                {!plan.isActive && (
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Inactif</span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {plan.price === 0 ? '0' : plan.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                <span className="text-sm text-gray-400 font-normal ml-1">€</span>
                {plan.price > 0 && <span className="text-xs text-gray-400 font-medium">/{plan.period}</span>}
              </p>
              {plan.description && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{plan.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{plan.features.length} feature(s)</p>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => movePlan(plan.id, 'up')} disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Monter">
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => movePlan(plan.id, 'down')} disabled={idx === sorted.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Descendre">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => openEdit(plan)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Modifier">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
                {!plan.isPopular && (
                  <button onClick={() => togglePopular(plan.id)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors" title="Marquer populaire">
                    <Star className="w-4 h-4 text-amber-500" />
                  </button>
                )}
                <button
                  onClick={() => toggleActive(plan.id, !plan.isActive)}
                  className={`ml-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    plan.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={plan.isActive ? 'Désactiver' : 'Activer'}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    plan.isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
                <button onClick={() => setDeleteConfirm(plan.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Delete confirm overlay */}
              {deleteConfirm === plan.id && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-5 z-10">
                  <p className="text-sm font-semibold text-gray-900 text-center mb-3">Supprimer &quot;{plan.name}&quot; ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      Annuler
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPlan ? `Modifier "${editingPlan.name}"` : 'Nouveau plan'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nom */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom du plan</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder="Ex: Pro"
                  maxLength={50}
                />
              </div>

              {/* Prix + Période */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Prix (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Période</label>
                  <input
                    value={form.period}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                    placeholder="mois"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary resize-none"
                  rows={2}
                  maxLength={200}
                  placeholder="Sous-titre du plan..."
                />
              </div>

              {/* Features */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Features</label>
                <div className="space-y-2">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={feat}
                        onChange={(e) => updateFeature(idx, e.target.value)}
                        className="flex-1 h-[40px] px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                        placeholder={`Feature ${idx + 1}`}
                      />
                      {form.features.length > 1 && (
                        <button onClick={() => removeFeature(idx)} className="p-2 rounded-lg hover:bg-red-50" type="button">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addFeature} type="button"
                  className="mt-2 text-sm font-medium text-kezak-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Ajouter une feature
                </button>
              </div>

              {/* CTA Label */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Texte du bouton</label>
                <input
                  value={form.ctaLabel}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder="Commencer"
                  maxLength={50}
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Populaire</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Actif</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="h-[44px] px-6 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="h-[44px] px-6 text-sm font-semibold text-white bg-kezak-primary rounded-xl hover:bg-kezak-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPlan ? 'Enregistrer' : 'Créer le plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
