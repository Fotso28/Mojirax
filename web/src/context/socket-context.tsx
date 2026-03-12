'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged } from 'firebase/auth';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  recovered: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  recovered: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (socketRef.current) {
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
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/messaging`,
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
        setRecovered(socket.recovered);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('error', (err: { message: string }) => {
        if (err.message === 'auth_expired') {
          socket.disconnect();
        }
      });

      socketRef.current = socket;
      setSocketInstance(socket);
    });

    return () => {
      unsubscribe();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketInstance, connected, recovered }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
