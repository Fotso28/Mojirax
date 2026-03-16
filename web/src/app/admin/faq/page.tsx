'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Loader2, HelpCircle,
} from 'lucide-react';

interface Faq {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
}

const EMPTY_FAQ_FORM = {
  question: '', answer: '', isActive: true, order: 0,
};

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FAQ_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchFaqs = async () => {
    try {
      const res = await api.get('/admin/faqs');
      setFaqs(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFaqs(); }, []);

  const openCreate = () => {
    setEditingFaq(null);
    setForm({ ...EMPTY_FAQ_FORM, order: faqs.length });
    setModalOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive,
      order: faq.order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingFaq) {
        await api.patch(`/admin/faqs/${editingFaq.id}`, form);
      } else {
        await api.post('/admin/faqs', form);
      }
      setModalOpen(false);
      fetchFaqs();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/faqs/${id}`);
      setDeleteConfirm(null);
      fetchFaqs();
    } catch { /* silent */ }
  };

  const moveFaq = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...faqs].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = sorted.map((f, i) => {
      if (i === idx) return { id: f.id, order: sorted[swapIdx].order };
      if (i === swapIdx) return { id: f.id, order: sorted[idx].order };
      return { id: f.id, order: f.order };
    });
    try {
      const res = await api.post('/admin/faqs/reorder', { faqs: reordered });
      setFaqs(res.data);
    } catch { /* silent */ }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/faqs/${id}`, { isActive });
      fetchFaqs();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
      </div>
    );
  }

  const sorted = [...faqs].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-kezak-primary" />
            <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{faqs.length} question(s) configurée(s)</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-[44px] px-5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle question
        </button>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Aucune FAQ configurée</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre première question pour commencer</p>
          <button onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors text-sm">
            <Plus className="w-4 h-4" /> Créer une question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((faq, idx) => (
            <div
              key={faq.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm relative ${
                !faq.isActive ? 'opacity-50 border-gray-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {!faq.isActive && (
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-2 inline-block">Inactif</span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900">{faq.question}</h3>
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveFaq(faq.id, 'up')} disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Monter">
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => moveFaq(faq.id, 'down')} disabled={idx === sorted.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Descendre">
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => openEdit(faq)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => toggleActive(faq.id, !faq.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      faq.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={faq.isActive ? 'Désactiver' : 'Activer'}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      faq.isActive ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <button onClick={() => setDeleteConfirm(faq.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Delete confirm overlay */}
              {deleteConfirm === faq.id && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-5 z-10">
                  <p className="text-sm font-semibold text-gray-900 text-center mb-3">Supprimer cette question ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      Annuler
                    </button>
                    <button onClick={() => handleDelete(faq.id)}
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
                {editingFaq ? 'Modifier la question' : 'Nouvelle question'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Question</label>
                <input
                  value={form.question}
                  onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  className="w-full h-[44px] px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
                  placeholder="Ex: Comment fonctionne le matching ?"
                  maxLength={300}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Réponse</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary resize-none"
                  rows={5}
                  maxLength={2000}
                  placeholder="Réponse détaillée..."
                />
              </div>

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

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="h-[44px] px-6 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !form.question.trim() || !form.answer.trim()}
                className="h-[44px] px-6 text-sm font-semibold text-white bg-kezak-primary rounded-xl hover:bg-kezak-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingFaq ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
