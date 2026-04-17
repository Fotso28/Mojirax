'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Star, Loader2, Tags, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

type I18nString = { fr: string; en: string };
type I18nArray = { fr: string[]; en: string[] };

interface PricingPlan {
  id: string;
  name: string | I18nString;
  price: number;
  period: string | I18nString;
  currency: string;
  description: string | I18nString | null;
  features: string[] | I18nArray;
  isPopular: boolean;
  isActive: boolean;
  order: number;
  ctaLabel: string | I18nString;
}

function getLocalized(field: unknown, locale: string = 'fr'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string>;
    return obj[locale] || obj['fr'] || '';
  }
  return '';
}

function getLocalizedArray(field: unknown, locale: string = 'fr'): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string[]>;
    return obj[locale] || obj['fr'] || [];
  }
  return [];
}

function initI18nField(value: unknown): I18nString {
  if (typeof value === 'string') return { fr: value, en: '' };
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, string>;
    return { fr: obj.fr || '', en: obj.en || '' };
  }
  return { fr: '', en: '' };
}

function initI18nArray(value: unknown): I18nArray {
  if (Array.isArray(value)) return { fr: value, en: [] };
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, string[]>;
    return { fr: obj.fr || [], en: obj.en || [] };
  }
  return { fr: [], en: [] };
}

const EMPTY_PLAN_FORM = {
  name: { fr: '', en: '' } as I18nString,
  price: 0,
  period: { fr: 'mois', en: 'month' } as I18nString,
  currency: 'EUR',
  description: { fr: '', en: '' } as I18nString,
  features: { fr: [''], en: [''] } as I18nArray,
  isPopular: false,
  isActive: true,
  ctaLabel: { fr: 'Commencer', en: 'Get Started' } as I18nString,
  order: 0,
};

export default function TarifsPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PLAN_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<'fr' | 'en'>('fr');

  const hasEmptyEn = (f: typeof form) => {
    return !f.name.en.trim() || !f.description.en.trim() || !f.ctaLabel.en.trim() || !f.period.en.trim()
      || f.features.en.filter((v) => v.trim()).length === 0;
  };

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
    setForm({ ...EMPTY_PLAN_FORM, features: { fr: [''], en: [''] }, order: plans.length });
    setEditLang('fr');
    setModalOpen(true);
  };

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    const featuresInit = initI18nArray(plan.features);
    setForm({
      name: initI18nField(plan.name),
      price: plan.price,
      period: initI18nField(plan.period),
      currency: plan.currency,
      description: initI18nField(plan.description),
      features: {
        fr: featuresInit.fr.length > 0 ? [...featuresInit.fr] : [''],
        en: featuresInit.en.length > 0 ? [...featuresInit.en] : [''],
      },
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      ctaLabel: initI18nField(plan.ctaLabel),
      order: plan.order,
    });
    setEditLang('fr');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        features: {
          fr: form.features.fr.filter((f) => f.trim() !== ''),
          en: form.features.en.filter((f) => f.trim() !== ''),
        },
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

  const addFeature = () => setForm((f) => ({
    ...f,
    features: { ...f.features, [editLang]: [...f.features[editLang], ''] },
  }));
  const removeFeature = (idx: number) => setForm((f) => ({
    ...f,
    features: { ...f.features, [editLang]: f.features[editLang].filter((_, i) => i !== idx) },
  }));
  const updateFeature = (idx: number, val: string) => setForm((f) => {
    const langFeatures = [...f.features[editLang]];
    langFeatures[idx] = val;
    return { ...f, features: { ...f.features, [editLang]: langFeatures } };
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
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.tarifs_title')}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{t('admin.tarifs_count', { count: plans.length })}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-[44px] px-5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('admin.tarifs_new_plan')}
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Tags className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{t('admin.tarifs_no_plans')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('admin.tarifs_create_first')}</p>
          <button onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm">
            <Plus className="w-4 h-4" /> {t('admin.tarifs_create_plan')}
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
                  <span className="bg-kezak-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">{t('admin.tarifs_popular')}</span>
                )}
                {!plan.isActive && (
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">{t('admin.tarifs_inactive')}</span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900">{getLocalized(plan.name)}</h3>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {plan.price === 0 ? '0' : plan.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                <span className="text-sm text-gray-400 font-normal ms-1">EUR</span>
                {plan.price > 0 && <span className="text-xs text-gray-400 font-medium">/{getLocalized(plan.period)}</span>}
              </p>
              {getLocalized(plan.description) && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{getLocalized(plan.description)}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{t('admin.tarifs_features_count', { count: getLocalizedArray(plan.features).length })}</p>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => movePlan(plan.id, 'up')} disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title={t('common.move_up')}>
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => movePlan(plan.id, 'down')} disabled={idx === sorted.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title={t('common.move_down')}>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => openEdit(plan)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title={t('common.edit')}>
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
                {!plan.isPopular && (
                  <button onClick={() => togglePopular(plan.id)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors" title={t('common.mark_popular')}>
                    <Star className="w-4 h-4 text-amber-500" />
                  </button>
                )}
                <button
                  onClick={() => toggleActive(plan.id, !plan.isActive)}
                  className={`ms-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    plan.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={plan.isActive ? t('common.deactivate') : t('common.activate')}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    plan.isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
                <button onClick={() => setDeleteConfirm(plan.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title={t('common.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Delete confirm overlay */}
              {deleteConfirm === plan.id && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-5 z-10">
                  <p className="text-sm font-semibold text-gray-900 text-center mb-3">{t('admin.tarifs_delete_confirm', { name: getLocalized(plan.name) })}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      {t('common.cancel')}
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                      {t('common.delete')}
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
                {editingPlan ? t('admin.tarifs_edit_title', { name: getLocalized(editingPlan.name) }) : t('admin.tarifs_new_title')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Onglets langue */}
              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setEditLang('fr')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition relative ${editLang === 'fr' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  FR Francais
                  {editLang === 'fr' && hasEmptyEn(form) && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-orange-400" title="Traduction EN incomplète" />
                  )}
                </button>
                <button
                  onClick={() => setEditLang('en')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${editLang === 'en' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  EN English
                </button>
              </div>

              {/* Nom */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_name')}</label>
                <input
                  value={form.name[editLang]}
                  onChange={(e) => setForm((f) => ({ ...f, name: { ...f.name, [editLang]: e.target.value } }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder={t('admin.tarifs_form_name_placeholder')}
                  maxLength={50}
                />
              </div>

              {/* Prix + Période */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_price')}</label>
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
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_period')}</label>
                  <input
                    value={form.period[editLang]}
                    onChange={(e) => setForm((f) => ({ ...f, period: { ...f.period, [editLang]: e.target.value } }))}
                    className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                    placeholder={editLang === 'fr' ? 'mois' : 'month'}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_description')}</label>
                <textarea
                  value={form.description[editLang]}
                  onChange={(e) => setForm((f) => ({ ...f, description: { ...f.description, [editLang]: e.target.value } }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary resize-none"
                  rows={2}
                  maxLength={200}
                  placeholder={t('admin.tarifs_form_description_placeholder')}
                />
              </div>

              {/* Features */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_features')}</label>
                <div className="space-y-2">
                  {form.features[editLang].map((feat, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={feat}
                        onChange={(e) => updateFeature(idx, e.target.value)}
                        className="flex-1 h-[40px] px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                        placeholder={t('admin.tarifs_form_feature_placeholder', { index: idx + 1 })}
                      />
                      {form.features[editLang].length > 1 && (
                        <button onClick={() => removeFeature(idx)} className="p-2 rounded-lg hover:bg-red-50" type="button">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addFeature} type="button"
                  className="mt-2 text-sm font-medium text-kezak-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> {t('admin.tarifs_form_add_feature')}
                </button>
              </div>

              {/* CTA Label */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.tarifs_form_cta')}</label>
                <input
                  value={form.ctaLabel[editLang]}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: { ...f.ctaLabel, [editLang]: e.target.value } }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder={t('admin.tarifs_form_cta_placeholder')}
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
                  <span className="text-sm font-medium text-gray-700">{t('common.popular')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-kezak-primary focus:ring-kezak-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('common.active')}</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="h-[44px] px-6 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.fr.trim()}
                className="h-[44px] px-6 text-sm font-semibold text-white bg-kezak-primary rounded-xl hover:bg-kezak-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPlan ? t('common.save') : t('admin.tarifs_create_plan_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
