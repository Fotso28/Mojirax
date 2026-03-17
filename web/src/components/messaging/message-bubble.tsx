'use client';

import { MessageStatus } from './message-status';
import { FilePreview } from './file-preview';
import { EmojiReactions } from './emoji-reactions';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    fileMimeType: string | null;
    status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    createdAt: string;
    senderId: string;
    reactions: { id: string; emoji: string; userId: string }[];
  };
  isMine: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReact: (messageId: string, emoji: string) => void;
  currentUserId: string;
}

export function MessageBubble({ message, isMine, onReact, onRemoveReact, currentUserId }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className="max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2 ${
            isMine
              ? 'bg-kezak-primary text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
          {message.fileUrl && message.fileName && message.fileSize && message.fileMimeType && (
            <div className={message.content ? 'mt-2' : ''}>
              <FilePreview
                fileUrl={message.fileUrl}
                fileName={message.fileName}
                fileSize={message.fileSize}
                fileMimeType={message.fileMimeType}
              />
            </div>
          )}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
            <span className="text-xs">{time}</span>
            {isMine && <MessageStatus status={message.status} />}
          </div>
        </div>
        {message.reactions?.length > 0 && (
          <EmojiReactions
            reactions={message.reactions}
            messageId={message.id}
            currentUserId={currentUserId}
            onReact={onReact}
            onRemoveReact={onRemoveReact}
          />
        )}
      </div>
    </div>
  );
}
