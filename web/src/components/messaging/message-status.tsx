'use client';

import { Check, CheckCheck } from 'lucide-react';

export function MessageStatus({ status }: { status: 'SENT' | 'DELIVERED' | 'READ' }) {
  if (status === 'SENT') return <Check className="h-4 w-4 text-gray-400" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-4 w-4 text-gray-400" />;
  return <CheckCheck className="h-4 w-4 text-kezak-primary" />;
}
