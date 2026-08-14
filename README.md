# PulseChat - Real-Time Multi-User Messenger & Friends Network

PulseChat is a modern, feature-rich, real-time messaging web application built with **React**, **Node.js**, **Express**, **Socket.IO**, and **SQLite**. Inspired by Messenger and Telegram, PulseChat features private messaging, group chats, a complete **Friends System** (Find People, Request States, Accept/Reject/Cancel, Friends List), voice note recording, photo/video/file upload, live location map sharing, emoji reactions, typing indicators, read receipts, audio notifications, and dark/light UI modes.

---

## 🌟 Key Features

### 👥 1. Friends System & User Accounts
- **Account Creation**: Register with Username, Email/Phone, Password, Profile Photo upload, and Status Message.
- **JWT Authentication**: Secure password hashing with `bcryptjs` and token validation.
- **Find People**: Search users by username, email, or user ID.
- **Friend Requests**: Send, accept, reject, or cancel requests with real-time notifications.
- **Friendship States**: Handled safely (`NONE` → `PENDING` → `ACCEPTED` / `REJECTED` → `FRIENDS` / `REMOVE`).
- **My Friends**: Dedicated panel showing friends list, online/offline status, last seen timestamps, quick chat trigger, and friend removal options.

### 💬 2. Real-Time Chat & Messaging
- **1-on-1 Private Chats**: Instant direct messaging between friends.
- **Group Chats**: Create group chats, set group avatar, invite members, assign group admins.
- **Real-Time Delivery**: WebSocket event broadcasting via Socket.IO.
- **Read Receipts & Delivery Badges**: Sent (`✓`), Delivered / Read (`✓✓` cyan checkmarks).
- **Typing Indicators**: Real-time "User is typing..." banners.
- **Message Controls**: Reply to specific messages, edit text inline, soft delete, copy to clipboard.
- **Emoji Reactions**: React to any message with 👍 ❤️ 😂 😮 😢 🔥 with real-time sync.

### 🎤 3. Media & Attachment Support
- **Voice Messages**: Record audio directly in-browser using `MediaRecorder` API with timer visualization, play/pause preview, and voice note player.
- **Photos & Videos**: Upload photos and videos from device with inline chat bubble player and full-screen view.
- **Location Sharing**: Share current GPS location or pick coordinates with an embedded interactive OpenStreetMap frame and Google Maps link.
- **File Attachments**: Upload documents, archives, or files with size badges and direct download links.

### 🔔 4. UI/UX & Notifications
- **Sound Notifications**: Web Audio API synthesized chimes for incoming messages and friend requests (with global Mute toggle).
- **Responsive Layout**: Desktop sidebar & chat pane, collapsible mobile drawer view.
- **Theme Modes**: Dark Mode & Light Mode support.

---

## 🏗️ Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React Icons, Socket.IO Client, Leaflet Maps.
- **Backend**: Node.js, Express.js, Socket.IO, SQLite (`better-sqlite3`), Multer, JWT, Bcrypt.js.
- **Database**: SQLite (Zero-configuration embedded relational DB with foreign keys and WAL mode).

---

## 🚀 Quick Setup & Running Locally

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Backend Setup
```bash
cd D:\pulse-chat\backend
npm install
npm start
```
*The backend server will run on `http://localhost:5000` and create the `pulsechat.db` SQLite database automatically on first launch.*

### 3. Frontend Setup
Open a new terminal:
```bash
cd D:\pulse-chat\frontend
npm install
npm run dev
```
*The frontend development server will run on `http://localhost:5173`.*

---

## 📂 Project Directory Structure

```text
D:\pulse-chat\
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # SQLite schema & tables initialization
│   │   ├── controllers/          # Auth, User, Friend, Chat, Message controllers
│   │   ├── middleware/           # JWT auth & Multer file upload handlers
│   │   ├── routes/               # Express REST routes
│   │   ├── socket/               # Socket.IO WebSocket handlers & presence engine
│   │   ├── utils/                # JWT sign & verify helpers
│   │   └── server.js             # Main server entry point
│   ├── uploads/                  # Media storage (avatars, photos, videos, voice, files)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/             # Login & Registration modal
│   │   │   ├── chat/             # Sidebar, ChatWindow, MessageList, MessageItem, MessageInput, VoiceRecorder, LocationPicker
│   │   │   ├── friends/          # FriendsView (Find People, Requests, My Friends)
│   │   │   ├── group/            # CreateGroupModal
│   │   │   └── profile/          # ProfileModal
│   │   ├── context/              # Auth, Socket, Theme, Sound contexts
│   │   ├── services/             # REST API wrapper
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```
