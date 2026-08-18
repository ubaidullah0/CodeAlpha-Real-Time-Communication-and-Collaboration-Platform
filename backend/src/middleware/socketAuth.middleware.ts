import { Socket } from 'socket.io';
import { verifyUserToken, SafeUser } from '../services/auth.service';

declare module 'socket.io' {
  interface SocketData {
    user?: SafeUser;
  }
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const cookieHeader = socket.request.headers.cookie;

    if (!cookieHeader) {
      return next(new Error('Authentication required'));
    }

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    const token = cookies.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const user = await verifyUserToken(token);

    if (!user) {
      return next(new Error('Invalid or expired token'));
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error('Internal server error during authentication'));
  }
};
