# 🚀 SyncSpace — Real-Time Communication & Collaboration Platform

[![CodeAlpha Internship](https://img.shields.io/badge/CodeAlpha-Internship%20Project-blue?style=for-the-badge&logo=codealpha)](https://www.linkedin.com/company/codealpha/)
[![Live Frontend](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://code-alpha-real-time-communication-five.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://codealpha-real-time-communication-and.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)

---

## 🌟 Overview

**SyncSpace** is an enterprise-grade, full-stack real-time collaboration and communication SaaS platform developed during the **CodeAlpha Full-Stack Internship**. Built to rival modern team collaboration suites like Slack, Discord, and Microsoft Teams, SyncSpace unites instant messaging, HD video conferencing, interactive whiteboards, topic channels, and multi-tenant workspaces in a single, lightning-fast application.

🔗 **Live Application:** [https://code-alpha-real-time-communication-five.vercel.app](https://code-alpha-real-time-communication-five.vercel.app)  
🐙 **GitHub Repository:** [https://github.com/ubaidullah0/CodeAlpha-Real-Time-Communication-and-Collaboration-Platform](https://github.com/ubaidullah0/CodeAlpha-Real-Time-Communication-and-Collaboration-Platform)

---

## ✨ Key Features & Capabilities

### 💬 1. Real-Time Messaging & Direct Chat
* **Ultra-Low Latency Communication:** Powered by WebSockets (`Socket.io`) for sub-50ms message delivery.
* **Direct 1-on-1 Messages:** Seamless conversations with read receipts ("Seen" status indicators) and unread counts.
* **Typing & Presence Indicators:** Real-time online/offline presence tracking with multi-tab awareness.

### 🏢 2. Multi-Tenant Workspaces & Channels
* **Team Organization:** Create and join distinct Workspaces with role-based member management.
* **Public & Private Channels:** Segment discussions into topic-specific channels with fine-grained access control.
* **Channel Permissions:** Secure invitation workflows for private team groups.

### 📹 3. HD Video Conferencing & Screen Sharing
* **Peer-to-Peer WebRTC Architecture:** Direct browser-to-browser encrypted video and crystal-clear audio calling.
* **1-on-1 & Multi-User Meeting Rooms:** Dynamic room mesh supporting multiple participants simultaneously.
* **In-Meeting Screen Sharing:** High-framerate browser screen presentation with native audio capture.

### 🎨 4. Real-Time Collaborative Whiteboard
* **Multiplayer Drawing Canvas:** Synchronized vector whiteboard allowing team members to sketch diagrams and brainstorm ideas in real time.
* **Custom Tooling:** Adjustable brush sizes, color palettes, eraser tools, and instant canvas clearing.

### 📁 5. Rich Media & File Sharing
* **Multi-Format Attachment Support:** Upload and share images, documents, and media within conversations.
* **Interactive Lightbox:** High-resolution preview modal with instant download capabilities.
* **Voice Messaging:** Browser-recorded audio notes with interactive waveform playback.

### 🛡️ 6. Enterprise-Grade Authentication & Security
* **JWT Token Security:** HTTP-only, secure cookie-based session management.
* **Cryptographic Password Recovery:** 6-digit one-time password (OTP) delivery via Gmail SMTP.
* **Bcrypt Hash Verification:** Zero plaintext OTP storage with 2-minute auto-expiry and brute-force attempt limits.
* **Smart Rate Limiting:** Backend-enforced 30-second cooldown protection against spam and email enumeration.

---

## 🏗️ Architecture & Technology Stack

```
                     ┌─────────────────────────────────────────────────┐
                     │          React 18 + Vite (TypeScript)           │
                     │          Tailwind CSS + Lucide UI Icons         │
                     │          Hosted on Vercel Edge Network          │
                     └───────────────────────┬─────────────────────────┘
                                             │ HTTPS & WSS
                                             ▼
                     ┌─────────────────────────────────────────────────┐
                     │          Node.js + Express (TypeScript)         │
                     │          Hosted on Render Web Service           │
                     │   Socket.io Gateway  │  JWT & REST Controllers  │
                     └──────────┬──────────────────────────┬───────────┘
                                │                          │
                      Prisma ORM│                          │ SMTP Proxy
                                ▼                          ▼
                     ┌──────────────────────┐    ┌─────────────────────┐
                     │  Neon PostgreSQL DB  │    │  Gmail SMTP Relay   │
                     │  Relational Storage  │    │  Secure Edge Mail   │
                     └──────────────────────┘    └─────────────────────┘
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v7, Context API |
| **Real-Time / Media** | Socket.io Client, WebRTC Native API, HTML5 Canvas API, Web Audio API |
| **Backend** | Node.js, Express.js, TypeScript, Socket.io Server, Multer |
| **Database & ORM** | PostgreSQL (Neon Serverless), Prisma ORM |
| **Security & Auth** | JSON Web Tokens (JWT), Bcrypt.js, HTTP-only Cookies, Crypto |
| **Email Delivery** | Nodemailer, Gmail SMTP over TLS/SSL, Vercel Serverless Functions |
| **Deployment** | Vercel (Frontend & Edge Proxy), Render (Backend), Neon (Database) |

---

## 📁 Repository Structure

```
syncspace/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (Users, Messages, Workspaces, OTPs)
│   ├── src/
│   │   ├── controllers/          # Business logic (Auth, Password Reset, Workspaces, Chat)
│   │   ├── middleware/           # JWT verification, upload validation
│   │   ├── routes/               # REST API endpoints
│   │   ├── services/             # Email delivery & notification services
│   │   ├── lib/                  # Prisma client & Socket.io initialization
│   │   └── index.ts              # Express server entry point
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── api/
    │   └── sendEmail.js          # Vercel Serverless Email proxy function
    ├── src/
    │   ├── components/           # Reusable UI (Modals, Call Window, Whiteboard, Chat)
    │   ├── context/              # State management (Auth, Call, Socket, Workspace)
    │   ├── pages/                # Views (Dashboard, Login, Register, VerifyOtp, ResetPassword)
    │   ├── App.tsx               # Route declarations & protection guards
    │   └── main.tsx              # Application bootstrap
    ├── vercel.json               # Edge routing & backend proxy configuration
    ├── package.json
    └── tailwind.config.js
```

---

## ⚙️ Local Development Guide

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **PostgreSQL Database**: Local or Cloud instance (e.g. Neon, Supabase)

### 1. Clone the Repository
```bash
git clone https://github.com/ubaidullah0/CodeAlpha-Real-Time-Communication-and-Collaboration-Platform.git
cd CodeAlpha-Real-Time-Communication-and-Collaboration-Platform/syncspace
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```
Fill in your `.env` variables:
```env
PORT=3001
DATABASE_URL="postgresql://user:password@host:5432/syncspace"
JWT_SECRET="your_secure_jwt_secret_key"
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-digit-app-password"
SMTP_FROM="SyncSpace <your-email@gmail.com>"
```

Sync database schema:
```bash
npx prisma generate
npx prisma db push
```

Start backend:
```bash
npm run dev
```

### 3. Configure Frontend
Open a new terminal:
```bash
cd ../frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 🔒 Security Best Practices Implemented

* **Strict Input Validation & Sanitization** on all authentication and messaging routes.
* **Enumeration-Resistant Password Reset:** API responses do not reveal account existence to attackers.
* **Ephemeral Reset Sessions:** Single-use UUID session tokens with 10-minute expiry for password overrides.
* **CORS & Credential Whitelisting:** Explicit origin policies preventing cross-site scripting vulnerabilities.

---

## 👨‍💻 Author & Connect
Developed by **Ubaidullah Khan**

* 💼 **LinkedIn:** [linkedin.com/in/ubaid-ullah-0a6bb1270](https://www.linkedin.com/in/ubaid-ullah-0a6bb1270)
* 🐙 **GitHub:** [@ubaidullah0](https://github.com/ubaidullah0)
* 📧 **Email:** [obaidkhan13542@gmail.com](mailto:obaidkhan13542@gmail.com)

---

## 📄 Acknowledgements & Internship
Special thanks to the **@CodeAlpha** team for the mentorship and challenging project track during the **CodeAlpha Web Development Internship program**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
