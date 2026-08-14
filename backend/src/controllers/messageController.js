const crypto = require('crypto');
const { db } = require('../config/database');

function getMessages(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Check membership
    const member = db.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    if (!member) {
      return res.status(403).json({ error: 'Not authorized to view messages in this conversation' });
    }

    const messages = db.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.media_url, m.file_name,
             m.file_size, m.duration, m.latitude, m.longitude, m.reply_to_id, m.is_edited, m.is_deleted, m.created_at,
             u.username AS senderName, u.avatar_url AS senderAvatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `).all(conversationId);

    // Format reactions, reply data, and read status for each message
    const formattedMessages = messages.map(msg => {
      // Reactions
      const reactions = db.prepare(`
        SELECT mr.emoji, mr.user_id, u.username
        FROM message_reactions mr
        JOIN users u ON mr.user_id = u.id
        WHERE mr.message_id = ?
      `).all(msg.id);

      // Reply snippet
      let replyTo = null;
      if (msg.reply_to_id) {
        const replyMsg = db.prepare(`
          SELECT m.id, m.type, m.content, m.sender_id, u.username AS senderName
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `).get(msg.reply_to_id);
        if (replyMsg) {
          replyTo = replyMsg;
        }
      }

      // Read status: list of user IDs who read it
      const reads = db.prepare('SELECT user_id, read_at FROM message_reads WHERE message_id = ?').all(msg.id);

      return {
        ...msg,
        reactions,
        replyTo,
        reads
      };
    });

    // Mark unread messages as read for current user
    const unreadMsgs = db.prepare(`
      SELECT id FROM messages
      WHERE conversation_id = ? AND sender_id != ?
        AND id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)
    `).all(conversationId, userId, userId);

    const markReadStmt = db.prepare('INSERT OR IGNORE INTO message_reads (id, message_id, user_id, read_at) VALUES (?, ?, ?, ?)');
    const now = new Date().toISOString();
    unreadMsgs.forEach(uMsg => {
      markReadStmt.run(crypto.randomUUID(), uMsg.id, userId, now);
    });

    return res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Get Messages Error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId, type = 'TEXT', content, replyToId, latitude, longitude, duration } = req.body;

    const member = db.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    if (!member) {
      return res.status(403).json({ error: 'Not authorized to send messages to this conversation' });
    }

    let mediaUrl = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      let folder = 'files';
      if (req.file.mimetype.startsWith('image/')) folder = 'photos';
      else if (req.file.mimetype.startsWith('video/')) folder = 'videos';
      else if (req.file.mimetype.startsWith('audio/') || type === 'VOICE') folder = 'voice';

      mediaUrl = `/uploads/${folder}/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (
        id, conversation_id, sender_id, type, content, media_url, file_name, file_size,
        duration, latitude, longitude, reply_to_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId, conversationId, userId, type, content || null, mediaUrl, fileName, fileSize,
      duration ? parseFloat(duration) : null, latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, replyToId || null, now
    );

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

    // Self read mark
    db.prepare('INSERT INTO message_reads (id, message_id, user_id, read_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), messageId, userId, now);

    const fullMsg = db.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.media_url, m.file_name,
             m.file_size, m.duration, m.latitude, m.longitude, m.reply_to_id, m.is_edited, m.is_deleted, m.created_at,
             u.username AS senderName, u.avatar_url AS senderAvatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId);

    let replyTo = null;
    if (replyToId) {
      replyTo = db.prepare(`
        SELECT m.id, m.type, m.content, m.sender_id, u.username AS senderName
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `).get(replyToId);
    }

    return res.status(201).json({
      message: {
        ...fullMsg,
        reactions: [],
        replyTo,
        reads: [{ user_id: userId, read_at: now }]
      }
    });
  } catch (err) {
    console.error('Send Message Error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

function editMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { content } = req.body;

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    if (message.type !== 'TEXT') {
      return res.status(400).json({ error: 'Only text messages can be edited' });
    }

    db.prepare('UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?').run(content.trim(), messageId);

    return res.json({ messageId, content: content.trim(), is_edited: 1 });
  } catch (err) {
    console.error('Edit Message Error:', err);
    return res.status(500).json({ error: 'Failed to edit message' });
  }
}

function deleteMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    db.prepare('UPDATE messages SET is_deleted = 1, content = "This message was deleted", media_url = NULL WHERE id = ?').run(messageId);

    return res.json({ messageId, is_deleted: 1 });
  } catch (err) {
    console.error('Delete Message Error:', err);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

function toggleReaction(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const existing = db.prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').get(messageId, userId, emoji);

    if (existing) {
      // Remove reaction if toggled
      db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
      return res.json({ messageId, emoji, action: 'removed', userId });
    } else {
      // Add reaction
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)').run(id, messageId, userId, emoji, now);
      return res.json({ messageId, emoji, action: 'added', userId });
    }
  } catch (err) {
    console.error('Toggle Reaction Error:', err);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
}

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction
};
