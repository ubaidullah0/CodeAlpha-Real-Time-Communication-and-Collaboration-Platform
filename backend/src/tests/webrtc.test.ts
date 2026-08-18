import { Server as HttpServer } from 'http';
import { io as Client } from 'socket.io-client';
import app from '../app';
import { initializeSocket } from '../lib/socket';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
describe('WebRTC Signaling Integration', () => {
  let httpServer: HttpServer;
  let port: number;
  let serverSocketAddress: string;

  let callerToken: string;
  let callerId: string;
  let receiverToken: string;
  let receiverId: string;

  beforeAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);
    const caller = await prisma.user.create({
      data: { name: 'Caller User', email: 'caller@example.com', passwordHash }
    });
    const receiver = await prisma.user.create({
      data: { name: 'Receiver User', email: 'receiver@example.com', passwordHash }
    });

    callerId = caller.id;
    receiverId = receiver.id;

    callerToken = jwt.sign({ userId: caller.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    receiverToken = jwt.sign({ userId: receiver.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    httpServer = new HttpServer(app);
    initializeSocket(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address() as any;
        port = address.port;
        serverSocketAddress = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();
  });

  it('caller can initiate a call to receiver', (done) => {
    const callerSocket = Client(serverSocketAddress, {
      extraHeaders: { cookie: `token=${callerToken}` }
    });
    
    const receiverSocket = Client(serverSocketAddress, {
      extraHeaders: { cookie: `token=${receiverToken}` }
    });

    receiverSocket.on('incoming-call', (data) => {
      expect(data.callerId).toBe(callerId);
      expect(data.video).toBe(true);
      expect(data.audio).toBe(true);
      
      callerSocket.disconnect();
      receiverSocket.disconnect();
      done();
    });

    let connected = 0;
    const start = () => {
      connected++;
      if (connected === 2) {
        setTimeout(() => {
          callerSocket.emit('call-user', { targetUserId: receiverId, video: true, audio: true });
        }, 100);
      }
    };

    callerSocket.on('connect', start);
    receiverSocket.on('connect', start);
  });

  it('rejects call-user if target does not exist', (done) => {
    const callerSocket = Client(serverSocketAddress, {
      extraHeaders: { cookie: `token=${callerToken}` }
    });

    callerSocket.on('call-error', (data) => {
      expect(data.message).toBe('User does not exist');
      callerSocket.disconnect();
      done();
    });

    callerSocket.on('connect', () => {
      callerSocket.emit('call-user', { targetUserId: '00000000-0000-0000-0000-000000000000', video: true, audio: true });
    });
  });

  it('routes webrtc-offer correctly', (done) => {
    const callerSocket = Client(serverSocketAddress, { extraHeaders: { cookie: `token=${callerToken}` } });
    const receiverSocket = Client(serverSocketAddress, { extraHeaders: { cookie: `token=${receiverToken}` } });

    receiverSocket.on('webrtc-offer', (data) => {
      expect(data.senderId).toBe(callerId);
      expect(data.sdp).toEqual({ type: 'offer', sdp: 'fake-sdp' });
      callerSocket.disconnect();
      receiverSocket.disconnect();
      done();
    });

    let connected = 0;
    const start = () => {
      connected++;
      if (connected === 2) {
        setTimeout(() => {
          callerSocket.emit('webrtc-offer', { targetUserId: receiverId, sdp: { type: 'offer', sdp: 'fake-sdp' } });
        }, 100);
      }
    };

    callerSocket.on('connect', start);
    receiverSocket.on('connect', start);
  });
});
