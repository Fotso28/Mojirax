'use client';

import { OnlineBadge } from './online-badge';

interface ConversationItemProps {
  conversation: {
    id: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    founder: { id: string; firstName: string; lastName: string; image: string | null };
    candidate: { id: string; firstName: string; lastName: string; image: string | null };
    founderId: string;
    candidateId: string;
  };
  currentUserId: string;
  isActive: boolean;
  isOnline: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, currentUserId, isActive, isOnline, onClick }: ConversationItemProps) {
  const other = conversation.founderId === currentUserId ? conversation.candidate : conversation.founder;
  const name = `${other.firstName || ''} ${other.lastName || ''}`.trim() || 'Utilisateur';

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
        isActive ? 'bg-kezak-primary/10' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        {other.image ? (
          <img src={other.image} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <OnlineBadge isOnline={isOnline} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate">{name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{getTimeAgo(conversation.lastMessageAt)}</span>
        </div>
        {conversation.lastMessagePreview && (
          <p className="text-sm text-gray-500 truncate">{conversation.lastMessagePreview}</p>
        )}
      </div>
    </button>
  );
}
