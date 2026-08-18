import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as workspaceController from '../controllers/workspace.controller';

const router = Router();

router.use(requireAuth);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/:workspaceId', workspaceController.getWorkspaceById);
router.patch('/:workspaceId', workspaceController.updateWorkspace);
router.delete('/:workspaceId', workspaceController.deleteWorkspace);

router.get('/:workspaceId/members', workspaceController.getWorkspaceMembers);
router.post('/:workspaceId/members', workspaceController.addWorkspaceMember);
router.delete('/:workspaceId/members/:targetUserId', workspaceController.removeWorkspaceMember);

export default router;
