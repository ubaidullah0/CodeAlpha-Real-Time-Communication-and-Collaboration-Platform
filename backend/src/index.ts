import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

import app from './app';
import http from 'http';
import { initializeSocket } from './lib/socket';

const port = process.env.PORT || 3001;

const server = http.createServer(app);
initializeSocket(server);

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
