# SyncSpace

![SyncSpace Hero](https://via.placeholder.com/1200x400/4F46E5/FFFFFF?text=SyncSpace+-+Real-Time+Collaboration+Platform)

## Screenshots

![Video Call](docs/screenshot_video.png)

![Dashboard](docs/screenshot_dashboard.png)


A professional, modern SaaS real-time communication and collaboration platform. SyncSpace enables teams to work together seamlessly with workspaces, channels, direct messaging, real-time video calling, screen sharing, file sharing, and interactive collaborative whiteboards.

---

## 🚀 Features

- **Authentication & Security:** Secure JWT-based auth, password hashing (bcrypt), and email-based OTP password recovery.
- **Workspaces & Channels:** Organize teams into Workspaces (Teams) and create topic-based Public and Private Channels.
- **Real-Time Direct Messaging:** 1-on-1 instant messaging with read receipts ("Seen" status) powered by Socket.io.
- **Video & Audio Calling:** WebRTC-based peer-to-peer 1-on-1 and multi-user calls.
- **Screen Sharing:** Present your screen during video calls directly from the browser.
- **File Sharing:** Upload, share, and preview images, audio, and documents within chats and channels.
- **Collaborative Whiteboard:** Real-time synchronized drawing canvas for visual team brainstorming.
- **Presence Tracking:** See who is currently online in real time.
- **Modern UI/UX:** Responsive, mobile-friendly interface built with Tailwind CSS, featuring subtle animations, glassmorphism, and accessible controls.

---

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- TypeScript
- Tailwind CSS
- Socket.io-client
- Axios

**Backend:**
- Node.js & Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.io (WebSockets)
- JWT (JSON Web Tokens)
- Nodemailer (SMTP OTPs)
- WebRTC (Signaling)

---

## 📂 Project Structure

```
syncspace/
├── backend/                  # Node.js Express server
│   ├── prisma/               # Database schema & migrations
│   ├── src/
│   │   ├── controllers/      # Route controllers (auth, messages, etc.)
│   │   ├── middleware/       # JWT auth & error handling
│   │   ├── routes/           # Express API endpoints
│   │   ├── lib/              # Socket.io, Prisma client, Mailer
│   │   └── index.ts          # Server entry point
│   ├── uploads/              # Local file storage (dev only)
│   └── .env.example          # Backend environment variables template
│
└── frontend/                 # React SPA
    ├── src/
    │   ├── components/       # Reusable UI elements (Modals, Sidebars)
    │   ├── context/          # Global state (Auth, Socket, Workspace, Call)
    │   ├── pages/            # Main views (Dashboard, Login, Register)
    │   └── index.css         # Tailwind & global styles
    └── .env.example          # Frontend environment variables template
```

---

## 💻 Local Development Setup

### 1. Database Setup
You will need a PostgreSQL database. You can install it locally, use Docker, or use a free cloud provider like [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Fill in the `.env` file with your Database URL, JWT Secret, and SMTP credentials.
5. Push the Prisma schema to the database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The app will be running at `http://localhost:5173`.

---

## 🔒 Security Configuration (.env)

**DO NOT COMMIT `.env` FILES TO VERSION CONTROL.**

Example Backend `.env`:
```env
PORT=3001
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:port/dbname"
JWT_SECRET="generate_a_long_random_string_here"
SMTP_HOST="smtp.example.com"
SMTP_PORT=465
SMTP_USER="youremail@example.com"
SMTP_PASSWORD="your_app_password"
SMTP_FROM="SyncSpace <youremail@example.com>"
CORS_ORIGIN="https://your-frontend-domain.com"
```

Example Frontend `.env`:
```env
VITE_API_URL="https://your-backend-domain.com"
VITE_SOCKET_URL="https://your-backend-domain.com"
```

---

## 🚀 Production Deployment

### Deployment Architecture
- **Frontend (Vercel / Netlify / Cloudflare Pages):** Build as a static SPA. Set `VITE_API_URL` to point to the backend.
- **Backend (Render / Railway / Fly.io):** Deploy as a Node web service. Requires WebSocket support. Add all backend environment variables.
- **Database (Neon / Supabase):** Hosted PostgreSQL database.
- **Storage (AWS S3 / Cloudinary):** Currently, uploads are stored locally in the `/uploads` directory. For production, modify `upload.routes.ts` to upload to a cloud bucket like AWS S3.

### Steps to Deploy
1. **Database:** Create a production PostgreSQL DB and save the connection string.
2. **Backend:**
   - Connect your GitHub repo to Render.com (or similar).
   - Set Build Command: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - Set Start Command: `npm start`
   - Add all environment variables (DATABASE_URL, JWT_SECRET, etc.).
3. **Frontend:**
   - Connect your GitHub repo to Vercel (or similar).
   - Set the Root Directory to `frontend`.
   - Add environment variables (`VITE_API_URL`).
   - Click Deploy.

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
