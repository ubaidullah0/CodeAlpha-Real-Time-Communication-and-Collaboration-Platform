import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Attempt a simple raw query to test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'success',
      backend: 'Connected',
      database: 'Connected',
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      status: 'error',
      backend: 'Connected',
      database: 'Disconnected',
    });
  }
});

export default router;
