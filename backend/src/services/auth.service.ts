import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  userId: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
}

export const verifyUserToken = async (token: string): Promise<SafeUser | null> => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    return user;
  } catch {
    return null;
  }
};
