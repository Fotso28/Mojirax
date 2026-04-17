'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Loader2, Quote, MapPin,
} from 'lucide-react';

type I18nString = { fr: string; en: string };

interface Testimonial {
  id: string;
  name: string;
  role: string | I18nString;
  location: string;
  quote: string | I18nString;
  imageUrl: string;
  isActive: boolean;
  order: number;
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

function initI18nField(value: unknown): I18nString {
  if (typeof value === 'string') return { fr: value, en: '' };
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, string>;
    return { fr: obj.fr || '', en: obj.en || '' };
  }
  return { fr: '', en: '' };
}

const EMPTY_FORM = {
  name: '',
  role: { fr: '', en: '' } as I18nString,
  location: '',
  quote: { fr: '', en: '' } as I18nString,
  imageUrl: '',
  isActive: true,
  order: 0,
};

export default function TemoignagesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<'fr' | 'en'>('fr');

  const hasEmptyEn = (f: typeof form) => {
    return !f.quote.en.trim() || !f.role.en.trim();
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/admin/testimonials');
      setItems(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, order: items.length });
    setEditLang('fr');
    setModalOpen(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      name: item.name,
      role: initI18nField(item.role),
      location: item.location,
      quote: initI18nField(item.quote),
      imageUrl: item.imageUrl || '',
      isActive: item.isActive,
      order: item.order,
    });
    setEditLang('fr');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/testimonials/${editing.id}`, form);
      } else {
        await api.post('/admin/testimonials', form);
      }
      setModalOpen(false);
      fetchItems();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/testimonials/${id}`);
      setDeleteConfirm(null);
      fetchItems();
    } catch { /* silent */ }
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((t) => t.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = sorted.map((t, i) => {
      if (i === idx) return { id: t.id, order: sorted[swapIdx].order };
      if (i === swapIdx) return { id: t.id, order: sorted[idx].order };
      return { id: t.id, order: t.order };
    });
    try {
      const res = await api.post('/admin/testimonials/reorder', { testimonials: reordered });
      setItems(res.data);
    } catch { /* silent */ }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/testimonials/${id}`, { isActive });
      fetchItems();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-kezak-primary" />
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.testimonials_title')}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{t('admin.testimonials_count', { count: items.length })}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-[44px] px-5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('admin.testimonials_new')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Quote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{t('admin.testimonials_no_items')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('admin.testimonials_create_first')}</p>
          <button onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm">
            <Plus className="w-4 h-4" /> {t('admin.testimonials_add')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm relative ${
                !item.isActive ? 'opacity-50 border-gray-200' : 'border-gray-100'
              }`}
            >
              {!item.isActive && (
                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-2 inline-block">{t('admin.testimonials_inactive')}</span>
              )}

              {/* Avatar + Info */}
              <div className="flex items-center gap-3 mb-3">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-bold text-sm">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{getLocalized(item.role)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 italic">&quot;{getLocalized(item.quote)}&quot;</p>

              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                {item.location}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title={t('common.move_up')}>
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => moveItem(item.id, 'down')} disabled={idx === sorted.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title={t('common.move_down')}>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => openEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title={t('common.edit')}>
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => toggleActive(item.id, !item.isActive)}
                  className={`ms-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    item.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={item.isActive ? t('common.deactivate') : t('common.activate')}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    item.isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
                <button onClick={() => setDeleteConfirm(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title={t('common.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Delete confirm overlay */}
              {deleteConfirm === item.id && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-5 z-10">
                  <p className="text-sm font-semibold text-gray-900 text-center mb-3">{t('admin.testimonials_delete_confirm')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      {t('common.cancel')}
                    </button>
                    <button onClick={() => handleDelete(item.id)}
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
                {editing ? t('admin.testimonials_edit_title', { name: editing.name }) : t('admin.testimonials_new_title')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Champs non-traduits : name, location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.testimonials_form_name')}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                    placeholder={t('admin.testimonials_form_name_placeholder')}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.testimonials_form_location')}</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                    placeholder={t('admin.testimonials_form_location_placeholder')}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Onglets langue pour champs traduits */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
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

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.testimonials_form_role')}</label>
                <input
                  value={form.role[editLang]}
                  onChange={(e) => setForm((f) => ({ ...f, role: { ...f.role, [editLang]: e.target.value } }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder={t('admin.testimonials_form_role_placeholder')}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.testimonials_form_quote')}</label>
                <textarea
                  value={form.quote[editLang]}
                  onChange={(e) => setForm((f) => ({ ...f, quote: { ...f.quote, [editLang]: e.target.value } }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary resize-none"
                  rows={4}
                  maxLength={1000}
                  placeholder={t('admin.testimonials_form_quote_placeholder')}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{t('admin.testimonials_form_image_url')}</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>

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

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="h-[44px] px-6 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.quote.fr.trim()}
                className="h-[44px] px-6 text-sm font-semibold text-white bg-kezak-primary rounded-xl hover:bg-kezak-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
