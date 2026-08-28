const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/bookmarks
exports.getSaved = (req, res) => {
  try {
    const userId = req.user.id;
    const saved = db.prepare(`
      SELECT sm.id as bookmark_id, sm.created_at as saved_at,
        m.id as message_id, m.content, m.type as message_type, m.media_url,
        m.created_at as message_created_at, m.conversation_id,
        u.username as sender_name, u.avatar_url as sender_avatar,
        c.name as conversation_name, c.type as conversation_type
      FROM saved_messages sm
      JOIN messages m ON sm.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE sm.user_id = ?
      ORDER BY sm.created_at DESC
    `).all(userId);

    res.json({ saved });
  } catch (err) {
    console.error('getSaved error:', err);
    res.status(500).json({ error: 'Failed to fetch saved messages' });
  }
};

// POST /api/bookmarks
exports.saveMessage = (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId is required' });

    const existing = db.prepare('SELECT id FROM saved_messages WHERE user_id = ? AND message_id = ?').get(userId, messageId);
    if (existing) return res.status(409).json({ error: 'Already saved' });

    db.prepare('INSERT INTO saved_messages (id, user_id, message_id) VALUES (?, ?, ?)').run(uuidv4(), userId, messageId);
    res.json({ ok: true });
  } catch (err) {
    console.error('saveMessage error:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
};

// DELETE /api/bookmarks/:messageId
exports.unsaveMessage = (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM saved_messages WHERE user_id = ? AND message_id = ?').run(userId, req.params.messageId);
    res.json({ ok: true });
  } catch (err) {
    console.error('unsaveMessage error:', err);
    res.status(500).json({ error: 'Failed to remove saved message' });
  }
};
