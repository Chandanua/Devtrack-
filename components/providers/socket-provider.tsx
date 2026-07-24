'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/auth-provider';
import { SOCKET_EVENTS, type OnlineUser } from '@/lib/socket/events';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  joinTask: (taskId: string) => void;
  leaveTask: (taskId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  joinTask: () => {},
  leaveTask: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, currentOrgId } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const socketInstance = io({
      path: '/api/socket/io',
      addTrailingSlash: false,
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      if (currentOrgId) {
        socketInstance.emit(SOCKET_EVENTS.JOIN_ORG, { orgId: currentOrgId });
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      setOnlineUsers([]);
    });

    socketInstance.on(SOCKET_EVENTS.PRESENCE_UPDATE, (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    setSocket(socketInstance);

    return () => {
      if (currentOrgId) {
        socketInstance.emit(SOCKET_EVENTS.LEAVE_ORG, { orgId: currentOrgId });
      }
      socketInstance.disconnect();
    };
  }, [user, currentOrgId]);

  const joinTask = (taskId: string) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.JOIN_TASK, { taskId });
    }
  };

  const leaveTask = (taskId: string) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.LEAVE_TASK, { taskId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        joinTask,
        leaveTask,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
