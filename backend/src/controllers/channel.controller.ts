import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ChannelType, WorkspaceRole } from '@prisma/client';
import { checkWorkspaceMembership, requireWorkspaceRole, requireChannelAccess } from '../services/authorization.service';

export const createChannel = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { name, type = ChannelType.PUBLIC } = req.body;
    const userId = req.user!.id;

    const membership = await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to create channels' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Valid channel name is required' });
    }

    const trimmedName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: 'Channel name must be less than 50 characters' });
    }

    if (!Object.values(ChannelType).includes(type)) {
      return res.status(400).json({ message: 'Invalid channel type' });
    }

    const existingChannel = await prisma.channel.findUnique({
      where: { workspaceId_name: { workspaceId, name: trimmedName } }
    });

    if (existingChannel) {
      return res.status(409).json({ message: 'A channel with this name already exists in the workspace' });
    }

    const channelData: {
      workspaceId: string;
      name: string;
      type: ChannelType;
      members?: { create: { userId: string } };
    } = {
      workspaceId,
      name: trimmedName,
      type
    };

    if (type === ChannelType.PRIVATE) {
      channelData.members = {
        create: { userId }
      };
    }

    const newChannel = await prisma.channel.create({
      data: channelData,
      select: {
        id: true,
        workspaceId: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(newChannel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getChannels = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await checkWorkspaceMembership(userId, workspaceId);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Get public channels AND private channels where user is a member
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        OR: [
          { type: ChannelType.PUBLIC },
          {
            type: ChannelType.PRIVATE,
            members: { some: { userId } }
          }
        ]
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getChannelById = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) {
      // Return 404 to avoid leaking private channel existence
      return res.status(404).json({ message: 'Channel not found' });
    }

    const { channel } = access;

    res.json({
      id: channel.id,
      workspaceId: channel.workspaceId,
      name: channel.name,
      type: channel.type,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    });
  } catch (error) {
    console.error('Error fetching channel by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateChannel = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const { name } = req.body;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const { channel, membership } = access;
    
    if (!([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(membership.role as WorkspaceRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to update channel' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Valid channel name is required' });
    }

    const trimmedName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: 'Channel name must be less than 50 characters' });
    }

    const existingChannel = await prisma.channel.findFirst({
      where: { workspaceId: channel.workspaceId, name: trimmedName, id: { not: channelId } }
    });

    if (existingChannel) {
      return res.status(409).json({ message: 'A channel with this name already exists in the workspace' });
    }

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { name: trimmedName },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedChannel);
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteChannel = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const { membership } = access;
    if (!([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(membership.role as WorkspaceRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete channel' });
    }

    await prisma.channel.delete({ where: { id: channelId } });

    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Channel Members (Private Channels) ---

export const getChannelMembers = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (access.channel.type !== ChannelType.PRIVATE) {
      return res.status(400).json({ message: 'Channel membership is only managed for private channels' });
    }

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      createdAt: m.createdAt
    })));
  } catch (error) {
    console.error('Error fetching channel members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addChannelMember = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const { targetUserId } = req.body;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) return res.status(404).json({ message: 'Channel not found' });

    if (access.channel.type !== ChannelType.PRIVATE) {
      return res.status(400).json({ message: 'Channel membership is only managed for private channels' });
    }

    // Only OWNER, ADMIN, or existing channel members can invite. Wait, maybe only OWNER/ADMIN? Let's say existing channel members can invite, or check rules. "Only authorized users may manage private-channel membership". Let's restrict to Workspace OWNER/ADMIN who are in the channel, or any existing channel member. Let's let any channel member invite. Actually, safer: restrict to OWNER/ADMIN.
    // "Never allow a user to add themselves to a private channel" - this is covered if targetUserId != userId or they don't have access yet.
    if (!([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(access.membership.role as WorkspaceRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to add channel members' });
    }

    const targetMembership = await checkWorkspaceMembership(targetUserId, access.channel.workspaceId);
    if (!targetMembership) {
      return res.status(404).json({ message: 'Target user is not a member of the workspace' });
    }

    const existingChannelMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: targetUserId } }
    });

    if (existingChannelMember) {
      return res.status(409).json({ message: 'User is already in this channel' });
    }

    const newMember = await prisma.channelMember.create({
      data: { channelId, userId: targetUserId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(201).json({
      id: newMember.user.id,
      name: newMember.user.name,
      email: newMember.user.email,
      createdAt: newMember.createdAt
    });
  } catch (error) {
    console.error('Error adding channel member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeChannelMember = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const targetUserId = req.params.targetUserId as string;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) return res.status(404).json({ message: 'Channel not found' });

    if (access.channel.type !== ChannelType.PRIVATE) {
      return res.status(400).json({ message: 'Channel membership is only managed for private channels' });
    }

    if (userId !== targetUserId) {
      if (!([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(access.membership.role as WorkspaceRole)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to remove channel members' });
      }
    }

    const existingChannelMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: targetUserId } }
    });

    if (!existingChannelMember) {
      return res.status(404).json({ message: 'User is not in this channel' });
    }

    await prisma.channelMember.delete({
      where: { channelId_userId: { channelId, userId: targetUserId } }
    });

    res.json({ message: 'Channel member removed successfully' });
  } catch (error) {
    console.error('Error removing channel member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Channel Message History ---

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const channelId = req.params.channelId as string;
    const { cursor } = req.query;
    const userId = req.user!.id;

    const access = await requireChannelAccess(userId, channelId);
    if (!access) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const take = 50;
    
    const messages = await prisma.channelMessage.findMany({
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor as string } : undefined,
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        channelId: true,
        content: true,
        senderId: true,
        createdAt: true
      }
    });

    const nextCursor = messages.length === take ? messages[take - 1].id : null;

    res.json({
      messages: messages.reverse(),
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
