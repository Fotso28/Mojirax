'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedStream } from '@/components/feed/feed-stream';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8 pt-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Découvrez les projets
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Des fondateurs passionnés cherchent leur binôme.
          </p>
        </header>
        <FeedStream />
      </div>
    </DashboardShell>
  );
}
