import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import messagesRouter from './routes/messages';
import workspacesRouter from './routes/workspaces';
import workspaceChannelsRouter from './routes/workspaceChannels';
import channelsRouter from './routes/channels';
import uploadRouter from './routes/upload.routes';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/workspaces/:workspaceId/channels', workspaceChannelsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/upload', uploadRouter);

export default app;
