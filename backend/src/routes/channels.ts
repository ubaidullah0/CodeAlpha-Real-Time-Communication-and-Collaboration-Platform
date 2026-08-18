import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as channelController from '../controllers/channel.controller';

const router = Router();

router.use(requireAuth);

router.get('/:channelId', channelController.getChannelById);
router.patch('/:channelId', channelController.updateChannel);
router.delete('/:channelId', channelController.deleteChannel);

router.get('/:channelId/members', channelController.getChannelMembers);
router.post('/:channelId/members', channelController.addChannelMember);
router.delete('/:channelId/members/:targetUserId', channelController.removeChannelMember);

router.get('/:channelId/messages', channelController.getChannelMessages);

export default router;
