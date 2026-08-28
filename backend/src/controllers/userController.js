const { db } = require('../config/database');

function searchUsers(req, res) {
  try {
    const query = req.query.q || req.query.query || '';
    const currentUserId = req.user.id;

    if (!query || query.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${query.trim()}%`;
    const users = db.prepare(`
      SELECT id, username, email, avatar_url, bio, status_text, is_online, last_seen
      FROM users
      WHERE (LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR id = ?)
        AND id != ?
      LIMIT 20
    `).all(searchTerm, searchTerm, query.trim(), currentUserId);

    // Attach friendship status for each user
    const usersWithStatus = users.map(user => {
      const friendship = db.prepare(`
        SELECT id, sender_id, receiver_id, status
        FROM friendships
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      `).get(currentUserId, user.id, user.id, currentUserId);

      let friendshipStatus = 'NONE';
      let friendshipId = null;

      if (friendship) {
        friendshipId = friendship.id;
        if (friendship.status === 'ACCEPTED') {
          friendshipStatus = 'FRIENDS';
        } else if (friendship.status === 'PENDING') {
          if (friendship.sender_id === currentUserId) {
            friendshipStatus = 'PENDING_SENT';
          } else {
            friendshipStatus = 'PENDING_RECEIVED';
          }
        } else if (friendship.status === 'REJECTED') {
          friendshipStatus = 'REJECTED';
        }
      }

      return {
        ...user,
        friendshipStatus,
        friendshipId
      };
    });

    return res.json({ users: usersWithStatus });
  } catch (err) {
    console.error('Search Users Error:', err);
    return res.status(500).json({ error: 'Failed to search users' });
  }
}

function getProfile(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = db.prepare(`
      SELECT u.id, u.username, u.avatar_url, u.bio, u.status_text, u.is_online, u.last_seen, u.hide_online_status, u.created_at,
        (SELECT COUNT(*) FROM friendships WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'ACCEPTED') as friends_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
      FROM users u
      WHERE u.id = ?
    `).get(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check friendship status
    const friendship = db.prepare(`
      SELECT id, sender_id, receiver_id, status
      FROM friendships
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(currentUserId, userId, userId, currentUserId);

    let friendshipStatus = 'NONE';
    if (friendship) {
      if (friendship.status === 'ACCEPTED') friendshipStatus = 'FRIENDS';
      else if (friendship.status === 'PENDING') {
        friendshipStatus = friendship.sender_id === currentUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
      }
    }

    const posts = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 12').all(userId);

    return res.json({ user: { ...user, friendshipStatus }, posts });
  } catch (err) {
    console.error('Get Profile Error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { username, statusText, status_text, bio, phone } = req.body;

    let avatarUrl = req.user.avatar_url;
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    if (username && username.trim() !== req.user.username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), userId);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updatedUsername = username ? username.trim() : req.user.username;
    const updatedStatusText = statusText !== undefined ? statusText.trim() : (status_text !== undefined ? status_text.trim() : req.user.status_text);
    const updatedBio = bio !== undefined ? bio.trim() : (req.user.bio || '');
    const updatedPhone = phone !== undefined ? phone.trim() : req.user.phone;

    db.prepare(`
      UPDATE users
      SET username = ?, avatar_url = ?, status_text = ?, bio = ?, phone = ?
      WHERE id = ?
    `).run(updatedUsername, avatarUrl, updatedStatusText, updatedBio, updatedPhone, userId);

    const user = db.prepare('SELECT id, username, email, phone, avatar_url, bio, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(userId);

    return res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

function toggleOnlineVisibility(req, res) {
  try {
    const userId = req.user.id;
    const { hide } = req.body;
    db.prepare('UPDATE users SET hide_online_status = ? WHERE id = ?').run(hide ? 1 : 0, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Toggle Online Status Error:', err);
    res.status(500).json({ error: 'Failed to update online visibility' });
  }
}

function getAnalytics(req, res) {
  try {
    const userId = req.user.id;
    const msgPerDay = db.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM messages
      WHERE sender_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `).all(userId);

    const topConvs = db.prepare(`
      SELECT c.id, c.name, c.type, c.avatar_url, COUNT(*) as message_count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.sender_id = ?
      GROUP BY m.conversation_id
      ORDER BY message_count DESC
      LIMIT 5
    `).all(userId);

    const totalMessages = db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ?').get(userId);
    const totalPosts = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?').get(userId);
    const friendsCount = db.prepare('SELECT COUNT(*) as cnt FROM friendships WHERE (sender_id = ? OR receiver_id = ?) AND status = ?').get(userId, userId, 'ACCEPTED');

    res.json({
      msgPerDay,
      topConvs,
      totalMessages: totalMessages?.cnt || 0,
      totalPosts: totalPosts?.cnt || 0,
      friendsCount: friendsCount?.cnt || 0
    });
  } catch (err) {
    console.error('Get Analytics Error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
}

module.exports = {
  searchUsers,
  getProfile,
  updateProfile,
  toggleOnlineVisibility,
  getAnalytics
};

