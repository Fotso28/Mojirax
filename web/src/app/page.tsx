'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedStream } from '@/components/feed/feed-stream';
import { LandingPage } from '@/components/landing/landing-page';
import { useTranslation } from '@/context/i18n-context';

export default function Home() {
  const { user, dbUser, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user && dbUser && !dbUser.title && !dbUser.bio && !(dbUser.projects?.length > 0) && !dbUser.candidateProfile) {
      router.replace('/onboarding/start');
    }
  }, [loading, user, dbUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8 pt-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t('landing.feed_title')}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            {t('landing.feed_subtitle')}
          </p>
        </header>
        <FeedStream />
      </div>
    </DashboardShell>
  );
}
