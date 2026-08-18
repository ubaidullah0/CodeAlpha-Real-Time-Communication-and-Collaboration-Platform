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

describe('Channels API', () => {
  let user1: any; // workspace owner
  let user2: any; // workspace member
  let user3: any; // outsider
  let token1: string;
  let token2: string;
  let token3: string;
  let workspaceId: string;

  beforeAll(async () => {
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    const hash = await bcrypt.hash('password123', 10);
    
    user1 = await prisma.user.create({ data: { email: 'ch1@example.com', name: 'U1', passwordHash: hash } });
    token1 = generateToken(user1.id);
    user2 = await prisma.user.create({ data: { email: 'ch2@example.com', name: 'U2', passwordHash: hash } });
    token2 = generateToken(user2.id);
    user3 = await prisma.user.create({ data: { email: 'ch3@example.com', name: 'U3', passwordHash: hash } });
    token3 = generateToken(user3.id);

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', [`token=${token1}`])
      .send({ name: 'Channel WS' });
    workspaceId = wsRes.body.id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Cookie', [`token=${token1}`])
      .send({ targetUserId: user2.id, role: 'MEMBER' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/workspaces/:workspaceId/channels', () => {
    it('should allow admin/owner to create a public channel', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'general', type: 'PUBLIC' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('general');
      expect(res.body.type).toBe('PUBLIC');
    });

    it('should prevent unauthorized member from creating a channel', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token2}`])
        .send({ name: 'hacked-channel', type: 'PUBLIC' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/workspaces/:workspaceId/channels', () => {
    let privateChannelId: string;
    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'secret-ops', type: 'PRIVATE' });
      privateChannelId = res.body.id;
    });

    it('workspace members should see public channels', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token2}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.find((c: any) => c.name === 'general')).toBeDefined();
    });

    it('private channels are not visible to unauthorized users', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token2}`]);
      
      expect(res.body.find((c: any) => c.name === 'secret-ops')).toBeUndefined();
    });

    it('private channels are visible to authorized users', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token1}`]); // owner created it, so they are a member
      
      expect(res.body.find((c: any) => c.name === 'secret-ops')).toBeDefined();
    });
  });

  describe('Private Channel Membership', () => {
    let pChannelId: string;
    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/channels`)
        .set('Cookie', [`token=${token1}`])
        .send({ name: 'super-secret', type: 'PRIVATE' });
      pChannelId = res.body.id;
    });

    it('authorized user can add private-channel member', async () => {
      const res = await request(app)
        .post(`/api/channels/${pChannelId}/members`)
        .set('Cookie', [`token=${token1}`])
        .send({ targetUserId: user2.id });
      expect(res.status).toBe(201);
    });

    it('unauthorized user cannot access private-channel history', async () => {
      // user3 is not even in the workspace
      const res = await request(app)
        .get(`/api/channels/${pChannelId}/messages`)
        .set('Cookie', [`token=${token3}`]);
      expect(res.status).toBe(404); // Hidden
    });

    it('authorized user can retrieve channel history', async () => {
      // user2 was added
      const res = await request(app)
        .get(`/api/channels/${pChannelId}/messages`)
        .set('Cookie', [`token=${token2}`]);
      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });
  });

  describe('Cross-Workspace Security', () => {
    let ws2Id: string;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Cookie', [`token=${token3}`])
        .send({ name: 'WS 3' });
      ws2Id = res.body.id;
    });

    it('user from Workspace A cannot read Workspace B channels', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${ws2Id}/channels`)
        .set('Cookie', [`token=${token1}`]);
      expect(res.status).toBe(403);
    });
  });
});
