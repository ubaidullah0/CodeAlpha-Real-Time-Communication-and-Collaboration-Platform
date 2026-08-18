import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'obaidkhan13542@gmail.com';
  let user = await prisma.user.findUnique({ where: { email } });
  const hash = await bcryptjs.hash('password123', 10);
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Obaid Khan',
        passwordHash: hash
      }
    });
    console.log('User created:', user.email);
  } else {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash }
    });
    console.log('Password reset to password123 for:', user.email);
  }
}
main().finally(() => prisma.$disconnect());
