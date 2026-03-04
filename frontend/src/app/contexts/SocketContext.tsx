import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/api/client';
import { useUser } from './UserContext';

export const SOCKET_EVENTS = {
  NOTIFICATION: 'notification',
  CHAT_MESSAGE: 'chat:message',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
} as const;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

/**
 * Provides a single Socket.IO connection when the user is authenticated.
 * Connects with JWT on login; disconnects on logout.
 * Use useSocket() to access the socket and subscribe to events (e.g. notification, chat:message).
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    const url = window.location.origin;
    const socketInstance = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });
    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });
    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
