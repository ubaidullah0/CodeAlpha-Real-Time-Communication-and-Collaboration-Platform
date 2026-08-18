import { Server as HttpServer } from 'http';
import { io as Client } from 'socket.io-client';
import app from '../app';
import { initializeSocket } from '../lib/socket';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { ChannelType, WorkspaceRole } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

describe('Socket.io Workspace & Channel Messaging', () => {
  let io: any;
  let serverSocketAddress: string;
  let httpServer: HttpServer;

  let user1: any; // Workspace owner
  let user2: any; // Non-member
  let user3: any; // Workspace member
  
  let validCookie1: string;
  let validCookie2: string;
  let validCookie3: string;
  
  let workspace: any;
  let publicChannel: any;
  let privateChannel: any;

  let client1: any;
  let client2: any;
  let client3: any;

  beforeAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);
    user1 = await prisma.user.create({ data: { name: 'Owner', email: 'o@example.com', passwordHash } });
    user2 = await prisma.user.create({ data: { name: 'Stranger', email: 's@example.com', passwordHash } });
    user3 = await prisma.user.create({ data: { name: 'Member', email: 'm@example.com', passwordHash } });

    const res1 = await request(app).post('/api/auth/login').send({ email: 'o@example.com', password: 'password123' });
    validCookie1 = res1.headers['set-cookie'][0].split(';')[0];
    
    const res2 = await request(app).post('/api/auth/login').send({ email: 's@example.com', password: 'password123' });
    validCookie2 = res2.headers['set-cookie'][0].split(';')[0];
    
    const res3 = await request(app).post('/api/auth/login').send({ email: 'm@example.com', password: 'password123' });
    validCookie3 = res3.headers['set-cookie'][0].split(';')[0];

    workspace = await prisma.workspace.create({
      data: {
        name: 'Socket Workspace',
        ownerId: user1.id,
        members: {
          create: [
            { userId: user1.id, role: WorkspaceRole.OWNER },
            { userId: user3.id, role: WorkspaceRole.MEMBER }
          ]
        },
        channels: {
          create: [
            { name: 'general', type: ChannelType.PUBLIC },
            { 
              name: 'secret', 
              type: ChannelType.PRIVATE,
              members: { create: { userId: user1.id } } // Only user1 in private channel
            }
          ]
        }
      },
      include: { channels: true }
    });

    publicChannel = workspace.channels.find((c: any) => c.type === 'PUBLIC');
    privateChannel = workspace.channels.find((c: any) => c.type === 'PRIVATE');

    httpServer = new HttpServer(app);
    io = initializeSocket(httpServer);
    httpServer.listen(0, () => {
      const port = (httpServer.address() as any).port;
      serverSocketAddress = `http://localhost:${port}`;
    });

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll((done) => {
    io.close();
    httpServer.close(async () => {
      await prisma.channelMessage.deleteMany();
      await prisma.channelMember.deleteMany();
      await prisma.channel.deleteMany();
      await prisma.workspaceMember.deleteMany();
      await prisma.workspace.deleteMany();
      await prisma.message.deleteMany();
      await prisma.user.deleteMany();
      done();
    });
  });

  afterEach(() => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    if (client3) client3.disconnect();
  });

  it('allows member to join workspace', (done) => {
    client1 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie1 } });
    client1.on('connect', () => {
      client1.emit('join-workspace', { workspaceId: workspace.id });
    });
    client1.on('workspace-joined', (data: any) => {
      expect(data.workspaceId).toBe(workspace.id);
      done();
    });
  });

  it('rejects non-member joining workspace', (done) => {
    client2 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie2 } });
    client2.on('connect', () => {
      client2.emit('join-workspace', { workspaceId: workspace.id });
    });
    client2.on('socket-error', (data: any) => {
      expect(data.message).toMatch(/Forbidden/);
      done();
    });
  });

  it('allows member to join public channel', (done) => {
    client3 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie3 } });
    client3.on('connect', () => {
      client3.emit('join-channel', { channelId: publicChannel.id });
    });
    client3.on('channel-joined', (data: any) => {
      expect(data.channelId).toBe(publicChannel.id);
      done();
    });
  });

  it('rejects non-member joining public channel', (done) => {
    client2 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie2 } });
    client2.on('connect', () => {
      client2.emit('join-channel', { channelId: publicChannel.id });
    });
    client2.on('socket-error', (data: any) => {
      expect(data.message).toMatch(/Forbidden/);
      done();
    });
  });

  it('rejects unauthorized member joining private channel', (done) => {
    client3 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie3 } });
    client3.on('connect', () => {
      client3.emit('join-channel', { channelId: privateChannel.id });
    });
    client3.on('socket-error', (data: any) => {
      expect(data.message).toMatch(/Forbidden/);
      done();
    });
  });

  it('allows authorized member to send a channel message and broadcasts it', (done) => {
    client1 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie1 } });
    client3 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie3 } });

    client3.on('connect', () => {
      client3.emit('join-channel', { channelId: publicChannel.id });
    });

    client3.on('channel-joined', () => {
      client1.emit('channel-message-send', { channelId: publicChannel.id, content: 'Hello World' });
    });

    client3.on('channel-message-received', (message: any) => {
      expect(message.content).toBe('Hello World');
      expect(message.senderId).toBe(user1.id);
      expect(message.channelId).toBe(publicChannel.id);
      expect(message.id).toBeDefined();
      done();
    });
  });
});
