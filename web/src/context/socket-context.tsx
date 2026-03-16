'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged } from 'firebase/auth';
import { useAuth } from '@/context/auth-context';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  recovered: boolean;
  joinConversation: (conversationId: string) => void;
  /** Fires when a reconnection happens without CSR recovery — consumers should refetch data */
  onReconnectRefetch: (callback: () => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  recovered: false,
  joinConversation: () => {},
  onReconnectRefetch: () => () => {},
});

/** Play a short notification beep using the Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);

    // Clean up after playback
    oscillator.onended = () => ctx.close();
  } catch {
    // Silently fail — audio is optional
  }
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const { dbUser } = useAuth();
  const dbUserIdRef = useRef<string | null>(null);
  const refetchCallbacksRef = useRef<Set<() => void>>(new Set());

  // Keep ref in sync with dbUser.id
  useEffect(() => {
    dbUserIdRef.current = dbUser?.id ?? null;
  }, [dbUser]);

  /** Register a callback for reconnect-without-recovery events */
  const onReconnectRefetch = useCallback((callback: () => void) => {
    refetchCallbacksRef.current.add(callback);
    return () => { refetchCallbacksRef.current.delete(callback); };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', { conversationId });
    }
  }, []);

  const handleNewMessage = useCallback((message: { id: string; senderId: string; conversationId: string }) => {
    const currentUserId = dbUserIdRef.current;
    if (!currentUserId || message.senderId === currentUserId) return;

    // Mark as DELIVERED — the recipient's client received the message via WebSocket
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:delivered', { messageId: message.id });
    }

    // Play notification sound if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      playNotificationSound();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (socketRef.current) {
          socketRef.current.off('message:new', handleNewMessage);
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocketInstance(null);
          setConnected(false);
        }
        return;
      }

      const token = await user.getIdToken();

      // If already connected, just refresh the token
      if (socketRef.current?.connected) {
        socketRef.current.emit('auth:refresh', { token });
        return;
      }

      // New connection
      const socket = io(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/messaging`,
        {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: Infinity,
        },
      );

      socket.on('connect', () => {
        setConnected(true);
        const wasRecovered = socket.recovered;
        setRecovered(wasRecovered);

        // If not recovered (disconnected > CSR window), notify consumers to refetch data
        if (!wasRecovered) {
          for (const cb of refetchCallbacksRef.current) {
            try { cb(); } catch { /* consumer error — ignore */ }
          }
        }
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('error', (err: { message: string }) => {
        if (err.message === 'auth_expired') {
          socket.disconnect();
        }
      });

      // Notification sound for incoming messages
      socket.on('message:new', handleNewMessage);

      socketRef.current = socket;
      setSocketInstance(socket);
    });

    return () => {
      unsubscribe();
      if (socketRef.current) {
        socketRef.current.off('message:new', handleNewMessage);
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, [handleNewMessage]);

  return (
    <SocketContext.Provider value={{ socket: socketInstance, connected, recovered, joinConversation, onReconnectRefetch }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
