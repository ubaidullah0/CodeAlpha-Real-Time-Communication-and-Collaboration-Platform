import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

import { User } from '@prisma/client';

describe('Password Reset API', () => {
  let user: User;
  let passwordHash: string;

  beforeAll(async () => {
    await prisma.passwordReset.deleteMany();
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();

    passwordHash = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name: 'Reset User',
        email: 'reset@example.com',
        passwordHash,
      },
    });
  });

  afterAll(async () => {
    await prisma.passwordReset.deleteMany();
    await prisma.channelMessage.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.message.deleteMany();
    await prisma.channelMessage.deleteMany(); await prisma.channelMember.deleteMany(); await prisma.channel.deleteMany(); await prisma.workspaceMember.deleteMany(); await prisma.workspace.deleteMany(); await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.passwordReset.deleteMany();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns generic success even if email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset code has been sent/i);
    });

    it('generates an OTP and saves it if email exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset code has been sent/i);

      const record = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
      expect(record).toBeDefined();
      expect(record?.otpHash).toBeDefined();
      expect(record?.verified).toBe(false);
      // expiration is ~2 minutes in future
      const diff = new Date(record!.expiresAt).getTime() - Date.now();
      expect(diff).toBeGreaterThan(100000); // at least 100s
      expect(diff).toBeLessThanOrEqual(120000); // max 2 min
    });
  });

  describe('POST /api/auth/verify-reset-otp', () => {
    it('rejects an invalid OTP', async () => {
      await request(app).post('/api/auth/forgot-password').send({ email: user.email });

      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({ email: user.email, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid OTP/i);
    });

    // We can't directly test a correct OTP easily without hacking it or spying on crypto/email,
    // so let's inject a known hash to test success.
    it('accepts correct OTP and generates reset token', async () => {
      const knownOtp = '123456';
      const hash = await bcrypt.hash(knownOtp, 10);
      
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          otpHash: hash,
          expiresAt: new Date(Date.now() + 120000),
          verified: false
        }
      });

      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({ email: user.email, otp: knownOtp });

      expect(res.status).toBe(200);
      expect(res.body.resetToken).toBeDefined();

      const record = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
      expect(record?.verified).toBe(true);
      expect(record?.resetToken).toBe(res.body.resetToken);
      expect(record?.otpHash).toBeNull(); // consumed
    });

    it('rejects expired OTP', async () => {
      const knownOtp = '123456';
      const hash = await bcrypt.hash(knownOtp, 10);
      
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          otpHash: hash,
          expiresAt: new Date(Date.now() - 1000), // expired
          verified: false
        }
      });

      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({ email: user.email, otp: knownOtp });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('rejects if new passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken: 'fake-token', newPassword: 'abc', confirmPassword: 'def' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/do not match/i);
    });

    it('rejects if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken: 'fake-token', newPassword: '123', confirmPassword: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    it('updates password and deletes reset record if valid', async () => {
      const resetToken = 'valid-reset-token';
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          resetToken,
          verified: true,
          expiresAt: new Date(Date.now() + 600000)
        }
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken, newPassword: 'newpassword123', confirmPassword: 'newpassword123' });

      expect(res.status).toBe(200);

      // Verify DB record is gone
      const record = await prisma.passwordReset.findUnique({ where: { resetToken } });
      expect(record).toBeNull();

      // Verify user password hash was updated
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      const matchesNew = await bcrypt.compare('newpassword123', updatedUser!.passwordHash);
      expect(matchesNew).toBe(true);
    });
  });
});
