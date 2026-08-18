/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development_only';

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

describe('Workspaces API', () => {
  let user1: { id: string; email: string; name: string };
  let user2: { id: string; email: string; name: string };
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    const hash = await bcrypt.hash('password123', 10);
    
    user1 = await prisma.user.create({
      data: { email: 'wuser1@example.com', name: 'User 1', passwordHash: hash }
    });
    token1 = generateToken(user1.id);

    user2 = await prisma.user.create({
      data: { email: 'wuser2@example.com', name: 'User 2', passwordHash: hash }
    });
    token2 = generateToken(user2.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/workspaces', () => {
    it('should create a workspace', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'Test Workspace' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Workspace');
      expect(res.body.ownerId).toBe(user1.id);

      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: res.body.id, userId: user1.id }
      });
      expect(membership?.role).toBe('OWNER');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .send({ name: 'Unauth Workspace' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/workspaces', () => {
    it('should return workspaces the user belongs to', async () => {
      // Setup: Create a second workspace for user1
      await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'User1 WS 2' });

      const res = await request(app)
        .get('/api/workspaces')
        .set('Cookie', [`token=${token1}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].role).toBeDefined();
    });

    it('should not return workspaces the user does not belong to', async () => {
      const res = await request(app)
        .get('/api/workspaces')
        .set('Cookie', [`token=${token2}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
  });

  describe('PATCH /api/workspaces/:workspaceId', () => {
    let workspaceId: string;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'Patch WS' });
      workspaceId = res.body.id;
    });

    it('should allow owner to rename', async () => {
      const res = await request(app)
        .patch(`/api/workspaces/${workspaceId}`)
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'Updated Patch WS' });
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Patch WS');
    });

    it('should reject unauthorized member', async () => {
      await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Cookie', [`token=${token1}`])
        .send({ targetUserId: user2.id, role: 'MEMBER' });

      const res = await request(app)
        .patch(`/api/workspaces/${workspaceId}`)
        .set('Cookie', [`token=${token2}`])
        .send({ name: 'Hacked WS' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/workspaces/:workspaceId', () => {
    let workspaceId: string;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'Delete WS' });
      workspaceId = res.body.id;
      
      await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Cookie', [`token=${token1}`])
        .send({ targetUserId: user2.id, role: 'MEMBER' });
    });

    it('should reject unauthorized member', async () => {
      const res = await request(app)
        .delete(`/api/workspaces/${workspaceId}`)
        .set('Cookie', [`token=${token2}`]);
      expect(res.status).toBe(403);
    });

    it('should allow owner to delete workspace', async () => {
      const res = await request(app)
        .delete(`/api/workspaces/${workspaceId}`)
        .set('Cookie', [`token=${token1}`]);
      expect(res.status).toBe(200);

      const check = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      expect(check).toBeNull();
    });
  });

  describe('Members Management', () => {
    let workspaceId: string;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'Member WS' });
      workspaceId = res.body.id;
    });

    it('should allow owner to add member', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Cookie', [`token=${token1}`])
        .send({ targetUserId: user2.id, role: 'MEMBER' });
      
      expect(res.status).toBe(201);
      expect(res.body.email).toBe(user2.email);
    });

    it('should reject duplicate membership', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Cookie', [`token=${token1}`])
        .send({ targetUserId: user2.id, role: 'MEMBER' });
      
      expect(res.status).toBe(409);
    });

    it('should reject unauthorized users from managing membership', async () => {
      // user2 is just a MEMBER
      // let's create a 3rd user
      const hash = await bcrypt.hash('password123', 10);
      const user3 = await prisma.user.create({
        data: { email: 'wuser3@example.com', name: 'User 3', passwordHash: hash }
      });

      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Cookie', [`token=${token2}`])
        .send({ targetUserId: user3.id, role: 'MEMBER' });
      
      expect(res.status).toBe(403);
    });
  });
});
