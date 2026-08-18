import { Server as HttpServer } from 'http';
import { io as Client } from 'socket.io-client';
import app from '../app';
import { initializeSocket } from '../lib/socket';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
describe('Socket.io Integration', () => {
  let httpServer: HttpServer;
  let port: number;
  let serverSocketAddress: string;

  const testUser = {
    id: 'socket-test-user-id',
    name: 'Socket User',
    email: 'socket@example.com',
    passwordHash: bcrypt.hashSync('password123', 10),
  };

  let validToken: string;
  let validCookie: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    const user = await prisma.user.create({
      data: testUser,
    });
    
    validToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
    validCookie = `token=${validToken}; Path=/; HttpOnly`;

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
    httpServer.close();
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  it('rejects unauthenticated socket connection', (done) => {
    const clientSocket = Client(serverSocketAddress, {
      extraHeaders: {},
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication required/);
      clientSocket.close();
      done();
    });
  });

  it('accepts authenticated socket connection', (done) => {
    const clientSocket = Client(serverSocketAddress, {
      extraHeaders: {
        cookie: validCookie,
      },
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.id).toBeDefined();
      clientSocket.close();
      done();
    });
  });

  it('tracks presence and emits user-online and user-offline', (done) => {
    const client1 = Client(serverSocketAddress, {
      extraHeaders: { cookie: validCookie },
      autoConnect: false,
    });

    const client2 = Client(serverSocketAddress, {
      extraHeaders: { cookie: validCookie },
      autoConnect: false,
    });

    let onlineEmitted = false;
    let getOnlineUsersReceived = false;

    client1.on('user-online', (data) => {
      expect(data.userId).toBe(testUser.id);
      expect(data.name).toBe(testUser.name);
      expect(data).not.toHaveProperty('passwordHash');
      onlineEmitted = true;
    });

    client1.on('get-online-users', (users) => {
      expect(Array.isArray(users)).toBe(true);
      getOnlineUsersReceived = true;
    });

    client2.on('connect', () => {
      client2.disconnect();
    });

    client1.connect();

    setTimeout(() => {
      client2.connect();
    }, 100);

    setTimeout(() => {
      client1.disconnect();
      setTimeout(() => {
        expect(onlineEmitted).toBe(true);
        expect(getOnlineUsersReceived).toBe(true);
        const { presenceService } = require('../services/presence.service');
        expect(presenceService.getOnlineUsers().length).toBe(0);
        done();
      }, 500);
    }, 600);
  });
});
