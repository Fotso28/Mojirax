'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement annulé</h1>
        <p className="text-gray-500 mb-6">
          Votre paiement a été annulé. Vous pouvez réessayer à tout moment.
        </p>
        <Link
          href="/#pricing"
          className="inline-block w-full py-3 px-6 bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-colors"
        >
          Voir les plans
        </Link>
      </div>
    </div>
  );
}
