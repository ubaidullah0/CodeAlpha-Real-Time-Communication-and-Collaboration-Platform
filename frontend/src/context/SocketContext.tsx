/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { User } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: User[];
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendChannelMessage: (channelId: string, content: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    let newSocket: Socket | null = null;

    if (user) {
      // Create socket connection when authenticated
      newSocket = io('/', {
        withCredentials: true,
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        setOnlineUsers([]);
      });

      newSocket.on('get-online-users', (users: User[]) => {
        setOnlineUsers(users);
      });

      newSocket.on('user-online', (data: { userId: string; name: string }) => {
        setOnlineUsers((prev) => {
          if (!prev.find(u => u.id === data.userId)) {
            // we don't have the full user object (email), but for presence id/name is sufficient
            return [...prev, { id: data.userId, name: data.name, email: '' }];
          }
          return prev;
        });
      });

      newSocket.on('user-offline', (data: { userId: string }) => {
        setOnlineUsers((prev) => prev.filter(u => u.id !== data.userId));
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  const joinWorkspace = (workspaceId: string) => {
    if (socket) socket.emit('join-workspace', { workspaceId });
  };

  const leaveWorkspace = (workspaceId: string) => {
    if (socket) socket.emit('leave-workspace', { workspaceId });
  };

  const joinChannel = (channelId: string) => {
    if (socket) socket.emit('join-channel', { channelId });
  };

  const leaveChannel = (channelId: string) => {
    if (socket) socket.emit('leave-channel', { channelId });
  };

  const sendChannelMessage = (channelId: string, content: string) => {
    if (socket) socket.emit('channel-message-send', { channelId, content });
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      onlineUsers,
      joinWorkspace,
      leaveWorkspace,
      joinChannel,
      leaveChannel,
      sendChannelMessage
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
