'use client';

import Link from 'next/link';
import { FeedStream } from '@/components/feed/feed-stream';
import { Users } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

export default function FeedPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 md:px-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {t('dashboard.feed_title')}
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        {t('dashboard.feed_subtitle')}
                    </p>
                </div>
                <Link
                    href="/feed/candidates"
                    className="mb-1 text-sm font-medium text-kezak-primary hover:underline flex items-center gap-1"
                >
                    <Users className="w-4 h-4" />
                    {t('dashboard.feed_view_talents')}
                </Link>
            </header>

            <FeedStream />
        </div>
    );
}
