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
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
  senderId: string;
  reactions: { id: string; emoji: string; userId: string }[];
  uploadProgress?: number;
  _retryFile?: File;
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
const TYPING_TIMEOUT = 4000; // 4s — slightly longer than server TTL (3s)
const SEND_TIMEOUT_MS = 8000; // timeout for server ack
const MAX_SEND_RETRIES = 2; // retry attempts on ack failure
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
  const [uploadError, setUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markedReadRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Utilisateur';

  // Load messages with AbortController
  const loadMessages = useCallback(async (convId: string, cursorParam?: string, signal?: AbortSignal) => {
    try {
      const params: Record<string, string | number> = { limit: MESSAGES_LIMIT };
      if (cursorParam) params.cursor = cursorParam;

      const { data } = await AXIOS_INSTANCE.get(`/messages/${convId}`, { params, signal });
      return data;
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return null;
      return null;
    }
  }, []);

  // Initial load with abort on conversation switch
  useEffect(() => {
    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setMessages([]);
    setCursor(null);
    setHasMore(false);
    markedReadRef.current = false;
    prevLengthRef.current = 0;

    loadMessages(conversationId, undefined, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data) {
        const msgs: Message[] = (data.items || []).slice().reverse();
        setMessages(msgs);
        prevLengthRef.current = msgs.length;
        setHasMore(data.hasMore ?? false);
        setCursor(data.nextCursor ?? null);
      }
      setLoading(false);
    });

    return () => controller.abort();
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

  // Debounced markRead — avoids spamming the server when multiple messages arrive
  const emitMarkRead = useCallback(() => {
    if (!socket || !conversationId) return;
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      socket.emit('message:read', { conversationId });
      markReadTimerRef.current = null;
    }, 300);
  }, [socket, conversationId]);

  // Mark as read — only AFTER messages are loaded successfully (not before)
  useEffect(() => {
    if (!socket || !conversationId || markedReadRef.current || loading) return;
    if (messages.length > 0) {
      emitMarkRead();
      markedReadRef.current = true;
    }
  }, [socket, conversationId, loading, messages.length, emitMarkRead]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message & { conversationId?: string }) => {
      // Ignore messages from other conversations
      if (msg.conversationId && msg.conversationId !== conversationId) return;

      setMessages((prev) => {
        // Dedup: if a message with this real ID already exists (ack arrived before broadcast), skip
        if (msg.id && !msg.id.startsWith('optimistic-') && prev.some((m) => m.id === msg.id)) {
          return prev;
        }

        // Replace optimistic message if it matches (by senderId + content for text, or senderId + fileName for files)
        const optimisticIdx = prev.findIndex(
          (m) =>
            (m.status === 'SENDING' || m.status === 'FAILED') &&
            m.senderId === msg.senderId &&
            (m.content
              ? m.content === msg.content
              : m.fileName != null && m.fileName === msg.fileName),
        );
        if (optimisticIdx !== -1) {
          const updated = [...prev];
          updated[optimisticIdx] = msg;
          return updated;
        }
        prevLengthRef.current = prev.length;
        return [...prev, msg];
      });

      if (msg.senderId !== currentUserId) {
        emitMarkRead();
      }
    };

    const handleStatus = ({ messageId, status }: { messageId: string; status: Message['status'] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m)),
      );
    };

    const handleTyping = ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (userId !== currentUserId) {
        setIsTyping(typing);

        // Auto-clear typing indicator after timeout (safety net)
        if (typing) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_TIMEOUT);
        } else {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
        }
      }
    };

    const handleReaction = ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatus);
    socket.on('typing:update', handleTyping);
    socket.on('reaction:update', handleReaction);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatus);
      socket.off('typing:update', handleTyping);
      socket.off('reaction:update', handleReaction);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [socket, currentUserId, conversationId, emitMarkRead]);

  // Load more (older) messages
  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await loadMessages(conversationId, cursor);
    if (data) {
      const older: Message[] = (data.items || []).slice().reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  };

  // Send text message with optimistic UI + server ack + retry
  const handleSend = () => {
    if (!socket || !input.trim()) return;
    const content = input.trim();

    // Optimistic append
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      content,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      fileMimeType: null,
      status: 'SENDING',
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      reactions: [],
    };
    setMessages((prev) => {
      prevLengthRef.current = prev.length;
      return [...prev, optimisticMsg];
    });

    setInput('');
    stopTyping();

    // Emit with ack + retry logic (clientMessageId for server-side idempotency)
    const clientMessageId = `${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { conversationId, content, clientMessageId };
    let attempt = 0;

    const emitWithRetry = () => {
      attempt++;
      socket.timeout(SEND_TIMEOUT_MS).emit(
        'message:send',
        payload,
        (err: Error | null, response: { status: string; message?: Message; error?: string } | undefined) => {
          if (err) {
            // Timeout — no ack from server
            if (attempt <= MAX_SEND_RETRIES) {
              emitWithRetry();
              return;
            }
            // All retries exhausted — mark FAILED
            setMessages((prev) =>
              prev.map((m) => (m.id === optimisticId && m.status === 'SENDING' ? { ...m, status: 'FAILED' as const } : m)),
            );
            return;
          }

          if (response?.status === 'error') {
            // Server explicitly rejected
            setMessages((prev) =>
              prev.map((m) => (m.id === optimisticId && m.status === 'SENDING' ? { ...m, status: 'FAILED' as const } : m)),
            );
            return;
          }

          // Server ack received — replace optimistic with real message
          // (the message:new broadcast might arrive before or after this ack,
          //  the handleNewMessage listener handles dedup via senderId+content match)
          if (response?.message) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === optimisticId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = response.message!;
                return updated;
              }
              return prev;
            });
          }
        },
      );
    };

    emitWithRetry();
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
    socket.volatile.emit('typing:stop', { conversationId });
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [socket, conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!socket) return;

    socket.volatile.emit('typing:start', { conversationId });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  // File upload with optimistic UI (WhatsApp/Telegram style)
  const uploadFileWithOptimistic = useCallback(async (file: File, existingOptimisticId?: string) => {
    if (!socket) return;

    // Create or reuse optimistic message
    const optimisticId = existingOptimisticId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (!existingOptimisticId) {
      const optimisticMsg: Message = {
        id: optimisticId,
        content: null,
        fileUrl: null,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type,
        status: 'SENDING',
        createdAt: new Date().toISOString(),
        senderId: currentUserId,
        reactions: [],
        uploadProgress: 0,
        _retryFile: file,
      };
      setMessages((prev) => {
        prevLengthRef.current = prev.length;
        return [...prev, optimisticMsg];
      });
    } else {
      // Retry: reset status to SENDING
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, status: 'SENDING' as const, uploadProgress: 0 } : m,
        ),
      );
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await AXIOS_INSTANCE.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? progressEvent.loaded));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...m, uploadProgress: percent } : m,
            ),
          );
        },
      });

      const fileClientMessageId = `${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filePayload = {
        conversationId,
        clientMessageId: fileClientMessageId,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileMimeType: data.fileMimeType,
      };

      socket.timeout(SEND_TIMEOUT_MS).emit(
        'message:send',
        filePayload,
        (ackErr: Error | null, response: { status: string; message?: Message; error?: string } | undefined) => {
          if (ackErr || response?.status === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId ? { ...m, status: 'FAILED' as const, uploadProgress: undefined } : m,
              ),
            );
            return;
          }
          // Replace optimistic with server message on ack
          if (response?.message) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === optimisticId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = response.message!;
                return updated;
              }
              return prev;
            });
          }
        },
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, status: 'FAILED' as const, uploadProgress: undefined } : m,
        ),
      );
    }
  }, [socket, currentUserId, conversationId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    // Client-side validation: MIME type (toast for validation errors only)
    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      setUploadError('Type de fichier non autorisé. Formats acceptés : PDF, DOCX, JPEG, PNG, WebP.');
      setTimeout(() => setUploadError(null), 5000);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Client-side validation: file size (max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Le fichier est trop volumineux. Taille maximale : 5 Mo.');
      setTimeout(() => setUploadError(null), 5000);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await uploadFileWithOptimistic(file);
  };

  // Retry a failed file upload
  const handleRetryFileUpload = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?._retryFile) return;
    uploadFileWithOptimistic(msg._retryFile, messageId);
  }, [messages, uploadFileWithOptimistic]);

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
            <img
              src={otherUser.image}
              alt={otherName}
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`h-10 w-10 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-semibold ${otherUser.image ? 'hidden' : ''}`}>
            {otherName.charAt(0).toUpperCase()}
          </div>
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
              onRetryFileUpload={handleRetryFileUpload}
            />
          ))
        )}

        {isTyping && <TypingIndicator name={otherName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Upload error toast */}
      {uploadError && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-2 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Emoji picker overlay */}
      {showEmojiPicker && (
        <div className="relative">
          <div className="absolute bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:w-auto z-20">
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
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          {/* File attachment */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="PDF, DOCX, JPEG, PNG, WebP · 5 Mo max"
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
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
