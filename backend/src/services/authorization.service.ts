import { prisma } from '../lib/prisma';
import { WorkspaceRole, ChannelType } from '@prisma/client';

export const checkWorkspaceMembership = async (userId: string, workspaceId: string) => {
  return await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    }
  });
};

export const requireWorkspaceRole = async (userId: string, workspaceId: string, allowedRoles: WorkspaceRole[]) => {
  const membership = await checkWorkspaceMembership(userId, workspaceId);
  if (!membership) return null;
  
  if (!allowedRoles.includes(membership.role)) {
    return null;
  }
  return membership;
};

export const requireChannelAccess = async (userId: string, channelId: string) => {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      workspace: true
    }
  });

  if (!channel) return null;

  const membership = await checkWorkspaceMembership(userId, channel.workspaceId);
  
  if (!membership) return null;

  if (channel.type === ChannelType.PRIVATE) {
    const channelMembership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId
        }
      }
    });

    if (!channelMembership) return null;
  }

  return { channel, membership };
};
