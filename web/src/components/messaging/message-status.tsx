'use client';

import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

export function MessageStatus({ status }: { status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' }) {
  if (status === 'SENDING') return <Clock className="h-4 w-4 text-gray-300" />;
  if (status === 'FAILED') return <AlertCircle className="h-4 w-4 text-red-400" />;
  if (status === 'SENT') return <Check className="h-4 w-4 text-gray-400" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-4 w-4 text-gray-400" />;
  return <CheckCheck className="h-4 w-4 text-kezak-primary" />;
}
