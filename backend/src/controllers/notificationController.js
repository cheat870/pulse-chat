const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.createNotification = (io, { userId, type, content, fromUserId, referenceId }) => {
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, content, from_user_id, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, content, fromUserId || null, referenceId || null);

    const notif = db.prepare(`
      SELECT n.*, u.username as from_username, u.avatar_url as from_avatar
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.id = ?
    `).get(id);

    if (io) {
      io.to(`user:${userId}`).emit('new_notification', notif);
    }
    return notif;
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
};

// GET /api/notifications
exports.getNotifications = (req, res) => {
  try {
    const userId = req.user.id;
    const notifs = db.prepare(`
      SELECT n.*, u.username as from_username, u.avatar_url as from_avatar
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(userId);

    const unread = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);

    res.json({ notifications: notifs, unreadCount: unread?.cnt || 0 });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// PUT /api/notifications/read
exports.markAllRead = (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('markAllRead error:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
