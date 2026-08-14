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
      SELECT id, username, email, avatar_url, status_text, is_online, last_seen
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

function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { username, statusText, phone } = req.body;

    let avatarUrl = req.user.avatar_url;
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    // If username changes, ensure uniqueness
    if (username && username.trim() !== req.user.username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), userId);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updatedUsername = username ? username.trim() : req.user.username;
    const updatedStatusText = statusText !== undefined ? statusText.trim() : req.user.status_text;
    const updatedPhone = phone !== undefined ? phone.trim() : req.user.phone;

    db.prepare(`
      UPDATE users
      SET username = ?, avatar_url = ?, status_text = ?, phone = ?
      WHERE id = ?
    `).run(updatedUsername, avatarUrl, updatedStatusText, updatedPhone, userId);

    const user = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(userId);

    return res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

module.exports = { searchUsers, updateProfile };
