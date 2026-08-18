import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as channelController from '../controllers/channel.controller';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// These will be mounted under /api/workspaces/:workspaceId/channels
router.post('/', channelController.createChannel);
router.get('/', channelController.getChannels);

export default router;
