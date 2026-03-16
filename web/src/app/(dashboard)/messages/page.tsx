'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { HideRightSidebar } from '@/context/sidebar-context';
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
  const { socket, onReconnectRefetch } = useSocket();
  const searchParams = useSearchParams();
  const convParam = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fetchConversations = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      if (convParam) params.set('active', convParam);
      const { data } = await AXIOS_INSTANCE.get(`/messages/conversations?${params.toString()}`);
      setConversations(data?.items ?? data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [convParam]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    return onReconnectRefetch(fetchConversations);
  }, [onReconnectRefetch, fetchConversations]);

  useEffect(() => {
    if (convParam && conversations.length > 0 && !activeConvId) {
      const target = conversations.find(c => c.id === convParam);
      if (target) {
        setActiveConvId(target.id);
        setShowChat(true);
      }
    }
  }, [convParam, conversations, activeConvId]);

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
          fetchConversations();
          return prev;
        }
        const updated = { ...prev[idx], lastMessageAt: msg.createdAt, lastMessagePreview: msg.content };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    };

    const handlePresenceUpdate = ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('presence:update', handlePresenceUpdate);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('presence:update', handlePresenceUpdate);
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
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="h-8 w-8 rounded-full border-2 border-kezak-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Masque la sidebar droite sur cette page */}
      <HideRightSidebar />

      {/* Container pleine hauteur, prend tout l'espace disponible */}
      <div className="relative h-[calc(100vh-6rem)] flex bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ===== Liste conversations ===== */}
        {/* Desktop/Tablet: colonne fixe 30%. Mobile: plein écran statique. */}
        <div
          className={`
            flex-shrink-0 flex flex-col
            w-full md:w-[300px] lg:w-[30%] lg:max-w-[340px]
            md:border-r md:border-gray-100
            ${showChat ? 'hidden md:flex' : 'flex'}
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 rounded-full border-2 border-kezak-primary border-t-transparent animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
              <p className="text-sm text-gray-500">Impossible de charger les conversations</p>
              <button onClick={fetchConversations} className="text-sm text-kezak-primary hover:underline">
                Réessayer
              </button>
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

        {/* ===== Zone chat ===== */}
        {/* Desktop/Tablet: flex naturel à droite de la liste */}
        {/* Mobile: overlay absolu avec transition slide depuis la droite */}
        <div
          className={`
            absolute inset-0 md:relative md:inset-auto
            flex-1 flex flex-col bg-white
            transition-transform duration-300 ease-in-out
            ${showChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
          style={{ zIndex: showChat ? 10 : undefined }}
        >
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
    </>
  );
}
