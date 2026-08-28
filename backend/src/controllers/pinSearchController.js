const crypto = require('crypto');
const { db } = require('../config/database');

// ── Pin a Message ─────────────────────────────────────────────────────────────
function pinMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Check message exists
    const msg = db.prepare('SELECT id, conversation_id FROM messages WHERE id = ?').get(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Check membership
    const member = db.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(msg.conversation_id, userId);
    if (!member) return res.status(403).json({ error: 'Not authorized' });

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT OR IGNORE INTO pinned_messages (id, conversation_id, message_id, pinned_by_id)
      VALUES (?, ?, ?, ?)
    `).run(id, msg.conversation_id, messageId, userId);

    return res.json({ success: true, message: 'Message pinned' });
  } catch (err) {
    console.error('Pin Message Error:', err);
    return res.status(500).json({ error: 'Failed to pin message' });
  }
}

// ── Unpin a Message ───────────────────────────────────────────────────────────
function unpinMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const msg = db.prepare('SELECT id, conversation_id FROM messages WHERE id = ?').get(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    db.prepare('DELETE FROM pinned_messages WHERE message_id = ? AND conversation_id = ?').run(messageId, msg.conversation_id);

    return res.json({ success: true, message: 'Message unpinned' });
  } catch (err) {
    console.error('Unpin Message Error:', err);
    return res.status(500).json({ error: 'Failed to unpin message' });
  }
}

// ── Get Pinned Messages in a Conversation ─────────────────────────────────────
function getPinnedMessages(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const member = db.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    if (!member) return res.status(403).json({ error: 'Not authorized' });

    const pinned = db.prepare(`
      SELECT pm.id, pm.message_id, pm.pinned_at,
             m.content, m.type, m.media_url, m.sender_id,
             u.username AS senderName, u.avatar_url AS senderAvatar,
             pb.username AS pinnedByName
      FROM pinned_messages pm
      JOIN messages m ON pm.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      JOIN users pb ON pm.pinned_by_id = pb.id
      WHERE pm.conversation_id = ?
      ORDER BY pm.pinned_at DESC
    `).all(conversationId);

    return res.json({ pinnedMessages: pinned });
  } catch (err) {
    console.error('Get Pinned Messages Error:', err);
    return res.status(500).json({ error: 'Failed to get pinned messages' });
  }
}

// ── Search Messages ───────────────────────────────────────────────────────────
function searchMessages(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const member = db.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    if (!member) return res.status(403).json({ error: 'Not authorized' });

    const searchTerm = `%${q.trim()}%`;
    const results = db.prepare(`
      SELECT m.id, m.content, m.type, m.created_at, m.sender_id,
             u.username AS senderName, u.avatar_url AS senderAvatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
        AND m.is_deleted = 0
        AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(conversationId, searchTerm);

    return res.json({ results, query: q.trim() });
  } catch (err) {
    console.error('Search Messages Error:', err);
    return res.status(500).json({ error: 'Failed to search messages' });
  }
}

module.exports = { pinMessage, unpinMessage, getPinnedMessages, searchMessages };
