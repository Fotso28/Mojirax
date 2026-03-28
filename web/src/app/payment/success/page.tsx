'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi !</h1>
        <p className="text-gray-500 mb-6">
          Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités de votre plan.
        </p>
        <Link
          href="/feed"
          className="inline-block w-full py-3 px-6 bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-colors"
        >
          Explorer les projets
        </Link>
      </div>
    </div>
  );
}
