import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

describe('Authentication API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=.*; HttpOnly/);
    });

    it('should correctly hash the password in the database', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user).toBeDefined();
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(testUser.password);
      
      const isMatch = await bcrypt.compare(testUser.password, user!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/Email already in use/i);
    });
  });

  let authCookie: string;

  describe('POST /api/auth/login', () => {
    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Invalid credentials/i);
    });

    it('should reject non-existent user login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Invalid credentials/i);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      authCookie = cookies[0].split(';')[0]; // Save for next tests
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject access without authentication cookie', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Authentication required/i);
    });

    it('should reject access with invalid authentication cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalidtoken123']);
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Invalid or expired token/i);
    });

    it('should allow access and return safe user fields with valid cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [authCookie]);
        
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the authentication cookie', async () => {
      const response = await request(app).post('/api/auth/logout');
      
      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=;/); // empty token
      expect(cookies[0]).toMatch(/Max-Age=0|Expires=/i);
    });
  });
});
