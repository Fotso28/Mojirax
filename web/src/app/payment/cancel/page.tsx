'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

export default function PaymentCancelPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.payment_cancel_title')}</h1>
        <p className="text-gray-500 mb-6">
          {t('landing.payment_cancel_desc')}
        </p>
        <Link
          href="/settings/billing"
          className="inline-block w-full py-3 px-6 bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-colors"
        >
          {t('landing.payment_cancel_cta')}
        </Link>
      </div>
    </div>
  );
}
