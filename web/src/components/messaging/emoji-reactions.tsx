'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmojiPicker } from './emoji-picker';

interface EmojiReactionsProps {
  reactions: { id: string; emoji: string; userId: string }[];
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReact: (messageId: string, emoji: string) => void;
}

export function EmojiReactions({ reactions, messageId, currentUserId, onReact, onRemoveReact }: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group by emoji
  const grouped = reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
    acc[r.emoji].count++;
    if (r.userId === currentUserId) acc[r.emoji].userReacted = true;
    return acc;
  }, {});

  const handleClick = (emoji: string, userReacted: boolean) => {
    if (userReacted) {
      onRemoveReact(messageId, emoji);
    } else {
      onReact(messageId, emoji);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1 relative">
      {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji, userReacted)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            userReacted
              ? 'border-kezak-primary/30 bg-kezak-primary/10 text-kezak-primary'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
      {showPicker && (
        <div className="absolute z-10 bottom-8 left-0">
          <EmojiPicker onSelect={(emoji) => { onReact(messageId, emoji); setShowPicker(false); }} />
        </div>
      )}
    </div>
  );
}
