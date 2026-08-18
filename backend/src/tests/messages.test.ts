import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Messages API', () => {
  let user1: any;
  let user2: any;
  let token1: string;

  beforeAll(async () => {
    // Clean up
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);

    user1 = await prisma.user.create({
      data: {
        name: 'User One',
        email: 'user1@example.com',
        passwordHash,
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: 'User Two',
        email: 'user2@example.com',
        passwordHash,
      },
    });

    // Login as user1
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'password123' });
    
    token1 = res.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();
  });

  describe('GET /api/messages/:userId', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get(`/api/messages/${user2.id}`);
      expect(res.status).toBe(401);
    });

    it('rejects nonexistent target user', async () => {
      const res = await request(app)
        .get('/api/messages/00000000-0000-0000-0000-000000000000')
        .set('Cookie', token1);
      expect(res.status).toBe(404);
    });

    it('returns empty array when no messages exist', async () => {
      const res = await request(app)
        .get(`/api/messages/${user2.id}`)
        .set('Cookie', token1);
      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });

    it('returns conversation scoped only to participants', async () => {
      // user1 sends to user2
      await prisma.message.create({
        data: { content: 'hello user2', senderId: user1.id, receiverId: user2.id }
      });

      // user2 sends to user1
      await prisma.message.create({
        data: { content: 'hello user1', senderId: user2.id, receiverId: user1.id }
      });

      // unrelated user3
      const user3 = await prisma.user.create({
        data: { name: 'User Three', email: 'user3@example.com', passwordHash: 'hash' }
      });
      // user1 sends to user3
      await prisma.message.create({
        data: { content: 'hello user3', senderId: user1.id, receiverId: user3.id }
      });

      const res = await request(app)
        .get(`/api/messages/${user2.id}`)
        .set('Cookie', token1);
      
      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages.map((m: any) => m.content)).toEqual(
        expect.arrayContaining(['hello user2', 'hello user1'])
      );
      // should not include message to user3
      expect(res.body.messages.some((m: any) => m.content === 'hello user3')).toBe(false);
    });
  });
});
