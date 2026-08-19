import { Socket } from 'socket.io';
import { verifyUserToken, SafeUser } from '../services/auth.service';

declare module 'socket.io' {
  interface SocketData {
    user?: SafeUser;
  }
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    let token: string | undefined;

    // 1. Check handshake auth object (ideal for cross-domain)
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }

    // 2. Check handshake query parameters
    if (!token && socket.handshake.query && typeof socket.handshake.query.token === 'string') {
      token = socket.handshake.query.token;
    }

    // 3. Check cookies from headers
    if (!token) {
      const cookieHeader = socket.request.headers.cookie;
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map(c => {
            const parts = c.trim().split('=');
            return [parts[0], parts.slice(1).join('=')];
          })
        );
        token = cookies.token;
      }
    }

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
