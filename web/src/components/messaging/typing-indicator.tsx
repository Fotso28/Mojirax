'use client';

import { useTranslation } from '@/context/i18n-context';

export function TypingIndicator({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <span>{t('dashboard.messaging_typing', { name })}</span>
    </div>
  );
}
