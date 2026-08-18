import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

let authToken: string;

beforeAll(async () => {
  // Setup user for auth
  const res = await request(app).post('/api/auth/register').send({
    email: 'uploadtest@example.com',
    password: 'password123',
    name: 'Upload Test'
  });
  
  if (res.status === 201) {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'uploadtest@example.com',
      password: 'password123'
    });
    authToken = loginRes.headers['set-cookie']?.[0].split(';')[0];
  } else {
    // maybe already exists
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'uploadtest@example.com',
      password: 'password123'
    });
    authToken = loginRes.headers['set-cookie']?.[0].split(';')[0];
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'uploadtest@example.com' } });
});

describe('Upload API', () => {
  it('should upload a file and return file details', async () => {
    // Create a dummy file
    const filePath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(filePath, 'Hello World');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', authToken)
      .attach('file', filePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fileUrl');
    expect(res.body.fileName).toBe('dummy.txt');
    expect(res.body.fileUrl).toMatch(new RegExp('^/uploads/'));

    // cleanup
    fs.unlinkSync(filePath);
    const uploadedFilePath = path.join(__dirname, '../../', res.body.fileUrl);
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
  });

  it('should return 400 if no file provided', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', authToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No file provided');
  });

  it('should deny upload if not authenticated', async () => {
    const filePath = path.join(__dirname, 'dummy2.txt');
    fs.writeFileSync(filePath, 'Hello');

    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath);

    expect(res.status).toBe(401);
    fs.unlinkSync(filePath);
  });
});
