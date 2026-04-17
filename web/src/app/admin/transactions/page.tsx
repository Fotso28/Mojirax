'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import { CreditCard, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface TransactionItem {
  id: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  externalId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  _count: { unlocks: number };
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-50 text-green-600',
  PENDING: 'bg-amber-50 text-amber-600',
  FAILED: 'bg-red-50 text-red-600',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'];

function formatEUR(value: string | number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value));
}

export default function AdminTransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/transactions', { params });
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('admin.transactions_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.transactions_count', { count: total })}</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="h-[44px] px-4 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">{t('admin.transactions_all_statuses')}</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_user')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_amount')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_status')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_provider')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_unlocks')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('admin.transactions_col_date')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    {t('admin.transactions_no_transactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {tx.user.image ? (
                          <img src={tx.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(tx.user.name || tx.user.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{tx.user.name || t('admin.transactions_no_name')}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">{tx.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">{formatEUR(tx.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[tx.status] || STATUS_COLORS.PENDING}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">{tx.provider}</td>
                    <td className="px-5 py-4 text-gray-600">{tx._count.unlocks}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(tx.createdAt).toLocaleString('fr-FR')}
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
    </div>
  );
}
