'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';

export function useStartConversation() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const startConversation = async (targetUserId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await AXIOS_INSTANCE.post('/messages/conversations', { targetUserId });
      router.push(`/messages?conv=${data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Impossible de démarrer la conversation';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}
