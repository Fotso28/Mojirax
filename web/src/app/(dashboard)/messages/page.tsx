'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { ConversationList } from '@/components/messaging/conversation-list';
import { ChatView } from '@/components/messaging/chat-view';

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  founderId: string;
  candidateId: string;
  founder: { id: string; firstName: string; lastName: string; image: string | null };
  candidate: { id: string; firstName: string; lastName: string; image: string | null };
}

export default function MessagesPage() {
  const { dbUser } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false); // mobile toggle
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Load conversations on mount
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await AXIOS_INSTANCE.get('/messages/conversations');
      setConversations(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: {
      id: string;
      conversationId: string;
      content: string | null;
      createdAt: string;
    }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
          // Refetch to get full conversation data
          fetchConversations();
          return prev;
        }
        const updated = { ...prev[idx], lastMessageAt: msg.createdAt, lastMessagePreview: msg.content };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, fetchConversations]);

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const currentUserId = dbUser?.id ?? '';

  const getOtherUser = (conv: Conversation) => {
    if (!currentUserId) return conv.founder;
    return conv.founderId === currentUserId ? conv.candidate : conv.founder;
  };

  if (!dbUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="h-8 w-8 rounded-full border-2 border-kezak-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-4 my-4">
      {/* Conversation list — hidden on mobile when chat is active */}
      <div
        className={`flex-shrink-0 w-full md:w-[300px] ${
          showChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 rounded-full border-2 border-kezak-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            activeId={activeConvId}
            onlineUsers={onlineUsers}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${showChat ? 'flex flex-col' : 'hidden md:flex md:flex-col'}`}>
        {activeConversation && currentUserId ? (
          <ChatView
            key={activeConversation.id}
            conversationId={activeConversation.id}
            currentUserId={currentUserId}
            otherUser={getOtherUser(activeConversation)}
            isOnline={onlineUsers.has(getOtherUser(activeConversation).id)}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <MessageSquare className="h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium">Sélectionnez une conversation</p>
            <p className="text-xs">Vos échanges avec vos co-fondateurs apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
}
