import { Server as HttpServer } from 'http';
import { io as Client } from 'socket.io-client';
import app from '../app';
import { initializeSocket } from '../lib/socket';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import request from 'supertest';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
describe('Socket.io Messaging', () => {
  let io: any;
  let serverSocketAddress: string;
  let httpServer: HttpServer;
  
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;
  let validCookie1: string;
  let validCookie2: string;
  let client1: any;
  let client2: any;

  beforeAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);
    user1 = await prisma.user.create({
      data: { name: 'S1', email: 's1@example.com', passwordHash },
    });
    user2 = await prisma.user.create({
      data: { name: 'S2', email: 's2@example.com', passwordHash },
    });

    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 's1@example.com', password: 'password123' });
    validCookie1 = res1.headers['set-cookie'][0].split(';')[0];

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 's2@example.com', password: 'password123' });
    validCookie2 = res2.headers['set-cookie'][0].split(';')[0];

    httpServer = new HttpServer(app);
    io = initializeSocket(httpServer);
    httpServer.listen(0, () => {
      const port = (httpServer.address() as any).port;
      serverSocketAddress = `http://localhost:${port}`;
    });

    // Wait slightly to ensure server listens
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll((done) => {
    io.close();
    httpServer.close(() => {
      prisma.message.deleteMany().then(() => {
        prisma.user.deleteMany().then(() => {
          done();
        });
      });
    });
  });

  afterEach(() => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
  });

  it('delivers messages to receiver and persists them', (done) => {
    client1 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie1 } });
    client2 = Client(serverSocketAddress, { extraHeaders: { cookie: validCookie2 } });

    client2.on('connect', () => {
      client1.emit('send-message', {
        receiverId: user2.id,
        content: 'Hello via socket',
      });
    });

    client2.on('message-received', async (message: any) => {
      expect(message.content).toBe('Hello via socket');
      expect(message.senderId).toBe(user1.id);
      expect(message.receiverId).toBe(user2.id);
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('createdAt');

      // Verify DB persistence
      const dbMsg = await prisma.message.findUnique({ where: { id: message.id } });
      expect(dbMsg).toBeDefined();
      expect(dbMsg?.content).toBe('Hello via socket');
      done();
    });
  });
});
