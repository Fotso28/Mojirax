'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Paperclip, Smile, X } from 'lucide-react';
import { useSocket } from '@/context/socket-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import { EmojiPicker } from './emoji-picker';
import { OnlineBadge } from './online-badge';

interface Message {
  id: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  senderId: string;
  reactions: { id: string; emoji: string; userId: string }[];
}

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    image: string | null;
  };
  isOnline: boolean;
  onBack: () => void;
}

const MESSAGES_LIMIT = 20;

export function ChatView({ conversationId, currentUserId, otherUser, isOnline, onBack }: ChatViewProps) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markedReadRef = useRef(false);

  const otherName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Utilisateur';

  // Load initial messages
  const loadMessages = useCallback(async (convId: string, cursorParam?: string) => {
    try {
      const params: Record<string, string | number> = { limit: MESSAGES_LIMIT };
      if (cursorParam) params.cursor = cursorParam;

      const { data } = await AXIOS_INSTANCE.get(`/messages/conversations/${convId}/messages`, { params });
      return data;
    } catch {
      return null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setCursor(null);
    setHasMore(false);
    markedReadRef.current = false;
    prevLengthRef.current = 0;

    loadMessages(conversationId).then((data) => {
      if (data) {
        const msgs: Message[] = (data.messages || []).slice().reverse();
        setMessages(msgs);
        prevLengthRef.current = msgs.length;
        setHasMore(data.hasMore ?? false);
        setCursor(data.nextCursor ?? null);
      }
      setLoading(false);
    });
  }, [conversationId, loadMessages]);

  // Scroll to bottom only for new messages (not load-more)
  useEffect(() => {
    if (messages.length > prevLengthRef.current && !loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (!loadingMore) {
      prevLengthRef.current = messages.length;
    }
  }, [messages, loadingMore]);

  // Mark as read — only once per conversation open
  useEffect(() => {
    if (!socket || !conversationId || markedReadRef.current) return;
    socket.emit('message:read', { conversationId });
    markedReadRef.current = true;
  }, [socket, conversationId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (msg.senderId !== currentUserId) {
        // Deliver then read
        socket.emit('message:delivered', { messageId: msg.id });
        socket.emit('message:read', { conversationId });
      }
      setMessages((prev) => {
        prevLengthRef.current = prev.length;
        return [...prev, msg];
      });
    };

    const handleStatus = ({ messageId, status }: { messageId: string; status: Message['status'] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m)),
      );
    };

    const handleTyping = ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (userId !== currentUserId) {
        setIsTyping(typing);
      }
    };

    const handleReaction = ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatus);
    socket.on('typing:indicator', handleTyping);
    socket.on('reaction:update', handleReaction);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatus);
      socket.off('typing:indicator', handleTyping);
      socket.off('reaction:update', handleReaction);
    };
  }, [socket, currentUserId, conversationId]);

  // Load more (older) messages
  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await loadMessages(conversationId, cursor);
    if (data) {
      const older: Message[] = (data.messages || []).slice().reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  };

  // Send text message
  const handleSend = () => {
    if (!socket || !input.trim()) return;
    socket.emit('message:send', { conversationId, content: input.trim() });
    setInput('');
    stopTyping();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Typing indicators
  const stopTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing:stop', { conversationId });
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [socket, conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!socket) return;

    socket.emit('typing:start', { conversationId });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  // File upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await AXIOS_INSTANCE.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket.emit('message:send', {
        conversationId,
        content: null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileMimeType: data.fileMimeType,
      });
    } catch {
      // Upload failed silently
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reactions
  const handleReact = (messageId: string, emoji: string) => {
    socket?.emit('reaction:add', { messageId, emoji });
  };

  const handleRemoveReact = (messageId: string, emoji: string) => {
    socket?.emit('reaction:remove', { messageId, emoji });
  };

  // Emoji insert
  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="relative flex-shrink-0">
          {otherUser.image ? (
            <img src={otherUser.image} alt={otherName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-semibold">
              {otherName.charAt(0).toUpperCase()}
            </div>
          )}
          <OnlineBadge isOnline={isOnline} />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{otherName}</p>
          <p className="text-xs text-gray-400">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-sm text-kezak-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? 'Chargement...' : 'Voir les messages précédents'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 rounded-full border-2 border-kezak-primary border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Commencez la conversation !
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
              currentUserId={currentUserId}
              onReact={handleReact}
              onRemoveReact={handleRemoveReact}
            />
          ))
        )}

        {isTyping && <TypingIndicator name={otherName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker overlay */}
      {showEmojiPicker && (
        <div className="relative">
          <div className="absolute bottom-0 right-4 z-20">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
          <button
            className="fixed inset-0 z-10"
            onClick={() => setShowEmojiPicker(false)}
            aria-label="Fermer le picker"
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          {/* File attachment */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>

          {/* Emoji toggle */}
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              showEmojiPicker
                ? 'text-kezak-primary bg-kezak-primary/10'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Text input */}
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || !socket}
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-kezak-primary text-white flex items-center justify-center hover:bg-kezak-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
