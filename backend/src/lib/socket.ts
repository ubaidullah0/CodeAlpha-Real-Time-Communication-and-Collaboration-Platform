import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { socketAuthMiddleware } from '../middleware/socketAuth.middleware';
import { presenceService } from '../services/presence.service';
import { checkWorkspaceMembership, requireChannelAccess } from '../services/authorization.service';
import { prisma } from './prisma';

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: 'http://localhost:5173', // Vite default port
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Join user room for message delivery
    socket.join(`user:${user.id}`);

    const isFirstConnection = presenceService.addSocket(user, socket.id);

    if (isFirstConnection) {
      io.emit('user-online', { userId: user.id, name: user.name });
    }

    socket.emit('get-online-users', presenceService.getOnlineUsers());

    socket.on('get-online-users', () => {
      socket.emit('get-online-users', presenceService.getOnlineUsers());
    });

    socket.on('send-message', async (data: { receiverId: string, content: string, fileUrl?: string, fileName?: string, fileType?: string }) => {
      try {
        const { receiverId, content, fileUrl, fileName, fileType } = data;

        if (!receiverId || typeof receiverId !== 'string') {
          return socket.emit('message-error', { message: 'Invalid receiver ID' });
        }

        if (content === undefined || typeof content !== 'string') {
          return socket.emit('message-error', { message: 'Invalid message content' });
        }

        const trimmedContent = content.trim();
        // Allow empty content if there is a file attached
        if (trimmedContent.length === 0 && !fileUrl) {
          return socket.emit('message-error', { message: 'Message content cannot be empty' });
        }

        if (trimmedContent.length > 2000) {
          return socket.emit('message-error', { message: 'Message content exceeds 2000 characters' });
        }

        // Check if receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { id: true }
        });

        if (!receiver) {
          return socket.emit('message-error', { message: 'Receiver does not exist' });
        }

        // Persist message
        const message = await prisma.message.create({
          data: {
            content: trimmedContent,
            senderId: user.id,
            receiverId,
            fileUrl,
            fileName,
            fileType
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
            createdAt: true
          }
        });

        // Broadcast to receiver and sender (all their tabs)
        io.to(`user:${receiverId}`).to(`user:${user.id}`).emit('message-received', message);

      } catch (error) {
        console.error('Error in send-message:', error);
        socket.emit('message-error', { message: 'Internal server error while sending message' });
      }
    });

    socket.on('delete-message', async (data: { messageId: string, receiverId: string }) => {
      try {
        const { messageId, receiverId } = data;
        if (!messageId || !receiverId) return;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== user.id) {
          return socket.emit('message-error', { message: 'Unauthorized to delete this message' });
        }

        await prisma.message.delete({ where: { id: messageId } });

        io.to(`user:${receiverId}`).to(`user:${user.id}`).emit('message-deleted', { messageId, receiverId, senderId: user.id });
      } catch (error) {
        console.error('Error in delete-message:', error);
        socket.emit('message-error', { message: 'Internal server error while deleting message' });
      }
    });

    socket.on('mark-messages-seen', async (data: { senderId: string }) => {
      try {
        const { senderId } = data;
        if (!senderId) return;

        await prisma.message.updateMany({
          where: {
            senderId: senderId,
            receiverId: user.id,
            read: false
          },
          data: {
            read: true
          }
        });

        io.to(`user:${senderId}`).emit('messages-seen', { readerId: user.id });
      } catch (error) {
        console.error('Error in mark-messages-seen:', error);
      }
    });

    // --- WebRTC Signaling ---

    socket.on('call-user', async (data: { targetUserId: string, video?: boolean, audio?: boolean }) => {
      try {
        const { targetUserId, video = true, audio = true } = data;
        if (!targetUserId || targetUserId === user.id) {
          return socket.emit('call-error', { message: 'Invalid call target' });
        }
        
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
        if (!targetUser) {
          return socket.emit('call-error', { message: 'User does not exist' });
        }

        io.to(`user:${targetUserId}`).emit('incoming-call', {
          callerId: user.id,
          callerName: user.name,
          video,
          audio
        });
      } catch (error) {
        console.error('Error in call-user:', error);
        socket.emit('call-error', { message: 'Internal server error' });
      }
    });

    socket.on('accept-call', (data: { targetUserId: string }) => {
      if (!data?.targetUserId) return;
      io.to(`user:${data.targetUserId}`).emit('call-accepted', { answererId: user.id });
    });

    socket.on('reject-call', (data: { targetUserId: string }) => {
      if (!data?.targetUserId) return;
      io.to(`user:${data.targetUserId}`).emit('call-rejected', { rejecterId: user.id });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('webrtc-offer', (data: { targetUserId: string, sdp: any }) => {
      if (!data?.targetUserId || !data?.sdp) return;
      io.to(`user:${data.targetUserId}`).emit('webrtc-offer', { senderId: user.id, sdp: data.sdp });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('webrtc-answer', (data: { targetUserId: string, sdp: any }) => {
      if (!data?.targetUserId || !data?.sdp) return;
      io.to(`user:${data.targetUserId}`).emit('webrtc-answer', { senderId: user.id, sdp: data.sdp });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('ice-candidate', (data: { targetUserId: string, candidate: any }) => {
      if (!data?.targetUserId || !data?.candidate) return;
      io.to(`user:${data.targetUserId}`).emit('ice-candidate', { senderId: user.id, candidate: data.candidate });
    });

    socket.on('end-call', (data: { targetUserId: string }) => {
      if (!data?.targetUserId) return;
      io.to(`user:${data.targetUserId}`).emit('call-ended', { senderId: user.id });
    });

    // --- Multi-User Calls ---
    socket.on('join-call', (data: { channelId: string }) => {
      if (data?.channelId) {
        socket.join(`call:${data.channelId}`);
        socket.to(`call:${data.channelId}`).emit('user-joined-call', { userId: user.id, userName: user.name });
      }
    });

    socket.on('leave-call', (data: { channelId: string }) => {
      if (data?.channelId) {
        socket.leave(`call:${data.channelId}`);
        socket.to(`call:${data.channelId}`).emit('user-left-call', { userId: user.id });
      }
    });

    // --- Workspace & Channel Rooms ---

    socket.on('join-workspace', async (data: { workspaceId: string }) => {
      try {
        const { workspaceId } = data;
        if (!workspaceId) return socket.emit('socket-error', { message: 'workspaceId required' });

        const membership = await checkWorkspaceMembership(user.id, workspaceId);
        if (!membership) {
          return socket.emit('socket-error', { message: 'Forbidden: You are not a member of this workspace' });
        }

        socket.join(`workspace:${workspaceId}`);
        socket.emit('workspace-joined', { workspaceId });
      } catch (error) {
        console.error('Error joining workspace:', error);
        socket.emit('socket-error', { message: 'Internal error joining workspace' });
      }
    });

    socket.on('leave-workspace', (data: { workspaceId: string }) => {
      if (data?.workspaceId) {
        socket.leave(`workspace:${data.workspaceId}`);
        socket.emit('workspace-left', { workspaceId: data.workspaceId });
      }
    });

    socket.on('join-channel', async (data: { channelId: string }) => {
      try {
        const { channelId } = data;
        if (!channelId) return socket.emit('socket-error', { message: 'channelId required' });

        const access = await requireChannelAccess(user.id, channelId);
        if (!access) {
          return socket.emit('socket-error', { message: 'Forbidden: Cannot access this channel' });
        }

        socket.join(`channel:${channelId}`);
        socket.emit('channel-joined', { channelId });
      } catch (error) {
        console.error('Error joining channel:', error);
        socket.emit('socket-error', { message: 'Internal error joining channel' });
      }
    });

    socket.on('leave-channel', (data: { channelId: string }) => {
      if (data?.channelId) {
        socket.leave(`channel:${data.channelId}`);
        socket.emit('channel-left', { channelId: data.channelId });
      }
    });

    socket.on('channel-message-send', async (data: { channelId: string, content: string, fileUrl?: string, fileName?: string, fileType?: string }) => {
      try {
        const { channelId, content, fileUrl, fileName, fileType } = data;
        
        if (!channelId || typeof channelId !== 'string') {
          return socket.emit('socket-error', { message: 'Invalid channel ID' });
        }

        if (content === undefined || typeof content !== 'string') {
          return socket.emit('socket-error', { message: 'Invalid message content' });
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0 && !fileUrl) {
          return socket.emit('socket-error', { message: 'Message content cannot be empty' });
        }

        if (trimmedContent.length > 2000) {
          return socket.emit('socket-error', { message: 'Message content exceeds 2000 characters' });
        }

        const access = await requireChannelAccess(user.id, channelId);
        if (!access) {
          return socket.emit('socket-error', { message: 'Forbidden: Cannot send messages to this channel' });
        }

        const message = await prisma.channelMessage.create({
          data: {
            content: trimmedContent,
            senderId: user.id,
            channelId,
            fileUrl,
            fileName,
            fileType
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            channelId: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
            createdAt: true
          }
        });

        io.to(`channel:${channelId}`).emit('channel-message-received', message);
      } catch (error) {
        console.error('Error in channel-message-send:', error);
        socket.emit('socket-error', { message: 'Internal server error while sending channel message' });
      }
    });

    socket.on('channel-message-delete', async (data: { channelId: string, messageId: string }) => {
      try {
        const { channelId, messageId } = data;
        if (!channelId || !messageId) return;

        const hasAccess = await requireChannelAccess(user.id, channelId);
        if (!hasAccess) return;

        const message = await prisma.channelMessage.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== user.id) {
          return socket.emit('socket-error', { message: 'Unauthorized to delete this message' });
        }

        await prisma.channelMessage.delete({ where: { id: messageId } });

        io.to(`channel:${channelId}`).emit('channel-message-deleted', { messageId, channelId });
      } catch (error) {
        console.error('Error in channel-message-delete:', error);
        socket.emit('socket-error', { message: 'Internal server error while deleting message' });
      }
    });

    // --- Whiteboard ---

    socket.on('whiteboard-draw', (data: { channelId: string, x0: number, y0: number, x1: number, y1: number, color: string }) => {
      if (data?.channelId) {
        socket.to(`channel:${data.channelId}`).emit('whiteboard-draw', data);
      }
    });

    socket.on('whiteboard-clear', (data: { channelId: string }) => {
      if (data?.channelId) {
        socket.to(`channel:${data.channelId}`).emit('whiteboard-clear', data);
      }
    });

    // ------------------------

    socket.on('disconnect', () => {
      const isLastConnection = presenceService.removeSocket(user.id, socket.id);
      
      if (isLastConnection) {
        io.emit('user-offline', { userId: user.id });
      }
    });
  });

  return io;
};
