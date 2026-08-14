const { verifyToken } = require('../utils/jwt');
const { db } = require('../config/database');

// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

function setupSocketIO(io) {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Token invalid'));
    }

    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${socket.username} (${userId}) [Socket ID: ${socket.id}]`);

    // Add socket ID to onlineUsers set
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update user status in DB
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?').run(now, userId);

    // Broadcast online status to friends & contacts
    socket.broadcast.emit('user_status_changed', { userId, isOnline: true, lastSeen: now });

    // Join user's personal room for direct notifications (friend requests, etc.)
    socket.join(`user_${userId}`);

    // Automatically join all conversations the user is a member of
    const userConvs = db.prepare('SELECT conversation_id FROM conversation_members WHERE user_id = ?').all(userId);
    userConvs.forEach(conv => {
      socket.join(`conv_${conv.conversation_id}`);
    });

    // Handle joining explicit conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    // Handle leaving explicit conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    // Handle typing events
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        username: socket.username
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId
      });
    });

    // Handle sending message via Socket (or HTTP broadcast trigger)
    socket.on('send_message', (data) => {
      const { conversationId, message } = data;
      // Broadcast to room members
      io.to(`conv_${conversationId}`).emit('new_message', { conversationId, message });

      // Broadcast to personal user rooms of all members to ensure instant sidebar refresh
      try {
        const members = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?').all(conversationId);
        members.forEach(m => {
          io.to(`user_${m.user_id}`).emit('new_message', { conversationId, message });
        });
      } catch (err) {
        console.error('Broadcast to user rooms error:', err);
      }
    });

    // Handle message read status
    socket.on('mark_read', ({ conversationId, messageId }) => {
      const readAt = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO message_reads (id, message_id, user_id, read_at) VALUES (?, ?, ?, ?)')
        .run(require('crypto').randomUUID(), messageId, userId, readAt);

      io.to(`conv_${conversationId}`).emit('message_read_update', {
        conversationId,
        messageId,
        userId,
        readAt
      });
    });

    // Handle Friend Request socket events
    socket.on('friend_request', ({ targetUserId, requestId }) => {
      io.to(`user_${targetUserId}`).emit('incoming_friend_request', {
        senderId: userId,
        senderUsername: socket.username,
        requestId
      });
    });

    socket.on('friend_accept', ({ targetUserId, requestId }) => {
      io.to(`user_${targetUserId}`).emit('friend_request_accepted', {
        acceptedByUserId: userId,
        acceptedByUsername: socket.username,
        requestId
      });
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.username} (${userId})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const disconnectTime = new Date().toISOString();
          db.prepare('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?').run(disconnectTime, userId);
          socket.broadcast.emit('user_status_changed', { userId, isOnline: false, lastSeen: disconnectTime });
        }
      }
    });
  });
}

function getOnlineUsers() {
  return onlineUsers;
}

module.exports = { setupSocketIO, getOnlineUsers };
