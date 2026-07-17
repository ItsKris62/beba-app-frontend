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

// The support-chat gateway has no separate port config — it rides on the
// same NestJS HTTP server as the REST API, just ws(s):// instead of
// http(s)://. Falls back to deriving that from NEXT_PUBLIC_API_URL so this
// doesn't silently try to connect to "wss://undefined" when the
// WS-specific env var isn't set.
function resolveWsBaseUrl(): string | null {
  if (process.env.NEXT_PUBLIC_BACKEND_WS_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  }
  if (!process.env.NEXT_PUBLIC_API_URL) return null;
  try {
    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return apiUrl.origin;
  } catch {
    return null;
  }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = tokenStore.getAccess();
    const tenantId = user?.tenantId;
    const wsBaseUrl = resolveWsBaseUrl();

    if (!isAuthenticated || !token || !tenantId || !wsBaseUrl) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const nextSocket = io(`${wsBaseUrl}/support_chat`, {
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
