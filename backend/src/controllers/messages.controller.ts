import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getMessages = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const targetUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true } // optimization
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.before as string;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
      take: limit,
      skip: cursor ? 1 : 0, // Skip the cursor message itself
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        senderId: true,
        receiverId: true,
        read: true,
        createdAt: true,
      },
    });

    // Return the messages
    return res.json({ messages });
  } catch (error) {
    console.error('Error in getMessages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
