const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/reactions/:messageId - toggle emoji reaction
exports.toggleReaction = (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const existing = db.prepare('SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ?').get(messageId, userId);
    if (existing) {
      if (existing.emoji === emoji) {
        db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
      } else {
        db.prepare('UPDATE message_reactions SET emoji = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(emoji, existing.id);
      }
    } else {
      db.prepare('INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(uuidv4(), messageId, userId, emoji);
    }

    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM message_reactions
      WHERE message_id = ?
      GROUP BY emoji
    `).all(messageId);

    const myReaction = db.prepare('SELECT emoji FROM message_reactions WHERE message_id = ? AND user_id = ?').get(messageId, userId);

    const io = req.app.get('io');
    const payload = { messageId, reactions, myReaction: myReaction?.emoji || null, conversationId: message.conversation_id };
    if (io) {
      io.to(`conversation:${message.conversation_id}`).emit('message_reacted', payload);
    }

    res.json(payload);
  } catch (err) {
    console.error('toggleReaction error:', err);
    res.status(500).json({ error: 'Failed to react to message' });
  }
};

// GET /api/reactions/:messageId
exports.getReactions = (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM message_reactions
      WHERE message_id = ?
      GROUP BY emoji
    `).all(messageId);

    const myReaction = db.prepare('SELECT emoji FROM message_reactions WHERE message_id = ? AND user_id = ?').get(messageId, userId);

    res.json({ reactions, myReaction: myReaction?.emoji || null });
  } catch (err) {
    console.error('getReactions error:', err);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
};
