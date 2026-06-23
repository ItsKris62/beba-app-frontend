'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { tokenStore } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = tokenStore.getAccess();
    const tenantId = user?.tenantId;

    if (!isAuthenticated || !token || !tenantId) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const nextSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_WS_URL}/support_chat`, {
      auth: { token },
      extraHeaders: { 'X-Tenant-ID': tenantId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
    });

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));
    nextSocket.on('connect_error', () => setConnected(false));

    setSocket(nextSocket);

    return () => {
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setConnected(false);
      setSocket(null);
    };
  }, [isAuthenticated, user?.tenantId]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
