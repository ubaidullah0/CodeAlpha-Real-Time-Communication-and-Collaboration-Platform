import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMessages } from '../controllers/messages.controller';

import { Request, Response, NextFunction } from 'express';

const router = Router();

router.get('/:userId', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  getMessages(req, res).catch(next);
});

export default router;
