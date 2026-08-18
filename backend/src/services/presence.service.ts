import { SafeUser } from './auth.service';

class PresenceService {
  // Map of userId -> Set of socketIds
  private connectedUsers: Map<string, Set<string>> = new Map();
  // We also keep track of user details to easily emit safe info
  private userDetails: Map<string, SafeUser> = new Map();

  addSocket(user: SafeUser, socketId: string): boolean {
    let isFirstConnection = false;
    let userSockets = this.connectedUsers.get(user.id);

    if (!userSockets) {
      userSockets = new Set<string>();
      this.connectedUsers.set(user.id, userSockets);
      this.userDetails.set(user.id, user);
      isFirstConnection = true;
    }

    userSockets.add(socketId);
    return isFirstConnection;
  }

  removeSocket(userId: string, socketId: string): boolean {
    let isLastConnection = false;
    const userSockets = this.connectedUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        this.userDetails.delete(userId);
        isLastConnection = true;
      }
    }

    return isLastConnection;
  }

  getOnlineUsers(): SafeUser[] {
    return Array.from(this.userDetails.values());
  }
}

export const presenceService = new PresenceService();
