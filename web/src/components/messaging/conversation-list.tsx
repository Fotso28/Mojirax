'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ConversationItem } from './conversation-item';
import { useTranslation } from '@/context/i18n-context';

interface ConversationSummary {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  founderId: string;
  candidateId: string;
  founder: { id: string; firstName: string; lastName: string; image: string | null };
  candidate: { id: string; firstName: string; lastName: string; image: string | null };
}

interface ConversationListProps {
  conversations: ConversationSummary[];
  currentUserId: string;
  activeId: string | null;
  onlineUsers: Set<string>;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, currentUserId, activeId, onlineUsers, onSelect }: ConversationListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const other = c.founderId === currentUserId ? c.candidate : c.founder;
    const name = `${other.firstName} ${other.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full md:border-r md:border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.messaging_title')}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('dashboard.messaging_search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-8">{t('dashboard.messaging_no_conversations')}</p>
        ) : (
          filtered.map((c) => {
            const otherId = c.founderId === currentUserId ? c.candidateId : c.founderId;
            return (
              <ConversationItem
                key={c.id}
                conversation={c}
                currentUserId={currentUserId}
                isActive={c.id === activeId}
                isOnline={onlineUsers.has(otherId)}
                onClick={() => onSelect(c.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
