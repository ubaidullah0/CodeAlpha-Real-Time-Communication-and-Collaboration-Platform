import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import { checkWorkspaceMembership, requireWorkspaceRole } from '../services/authorization.service';

export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Valid workspace name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: 'Workspace name must be less than 50 characters' });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: trimmedName,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: WorkspaceRole.OWNER
          }
        }
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      role: m.role
    }));

    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkspaceById = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await checkWorkspaceMembership(userId, workspaceId);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.json({ ...workspace, role: membership.role });
  } catch (error) {
    console.error('Error fetching workspace by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { name } = req.body;
    const userId = req.user!.id;

    const membership = await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Valid workspace name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: 'Workspace name must be less than 50 characters' });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: trimmedName },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: Only the workspace owner can delete it' });
    }

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Members ---

export const getWorkspaceMembers = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await checkWorkspaceMembership(userId, workspaceId);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true // Usually needed in UI for invites/disambiguation
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt
    })));
  } catch (error) {
    console.error('Error getting workspace members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addWorkspaceMember = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { email, role = WorkspaceRole.MEMBER } = req.body;
    const userId = req.user!.id;

    if (!email) {
      return res.status(400).json({ message: 'Email is required to add a member' });
    }

    const requesterMembership = await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to add members' });
    }

    if (role === WorkspaceRole.OWNER) {
      return res.status(403).json({ message: 'Forbidden: Cannot create OWNER role' });
    }

    if (role === WorkspaceRole.ADMIN && requesterMembership.role !== WorkspaceRole.OWNER) {
      return res.status(403).json({ message: 'Forbidden: Only OWNER can assign ADMIN role' });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return res.status(404).json({ message: 'User with this email not found' });
    }
    const targetUserId = targetUser.id;

    const existingMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    if (existingMembership) {
      return res.status(409).json({ message: 'User is already a member of this workspace' });
    }

    const newMembership = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUserId,
        role: role as WorkspaceRole
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json({
      id: newMembership.user.id,
      name: newMembership.user.name,
      email: newMembership.user.email,
      role: newMembership.role,
      createdAt: newMembership.createdAt
    });
  } catch (error) {
    console.error('Error adding workspace member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeWorkspaceMember = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const targetUserId = req.params.targetUserId as string;
    const userId = req.user!.id;

    // Users can remove themselves (leave) or ADMIN/OWNER can remove others
    const requesterMembership = await checkWorkspaceMembership(userId, workspaceId);
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (userId !== targetUserId) {
      if (!([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(requesterMembership.role as WorkspaceRole)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to remove members' });
      }
    }

    const targetMembership = await checkWorkspaceMembership(targetUserId, workspaceId);
    if (!targetMembership) {
      return res.status(404).json({ message: 'Target user is not a member of this workspace' });
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      return res.status(403).json({ message: 'Forbidden: Cannot remove the workspace OWNER' });
    }
    
    if (requesterMembership.role === WorkspaceRole.ADMIN && targetMembership.role === WorkspaceRole.ADMIN && userId !== targetUserId) {
      return res.status(403).json({ message: 'Forbidden: ADMIN cannot remove another ADMIN' });
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing workspace member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
