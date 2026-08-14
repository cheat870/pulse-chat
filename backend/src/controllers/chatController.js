const crypto = require('crypto');
const { db } = require('../config/database');

function getConversations(req, res) {
  try {
    const userId = req.user.id;

    // Get all conversations where current user is a member
    const conversations = db.prepare(`
      SELECT c.id, c.type, c.name, c.avatar_url, c.created_by_id, c.created_at, c.updated_at,
             cm.role
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE cm.user_id = ?
      ORDER BY c.updated_at DESC
    `).all(userId);

    const result = conversations.map(conv => {
      // Get all members for this conversation
      const members = db.prepare(`
        SELECT u.id, u.username, u.email, u.avatar_url, u.status_text, u.is_online, u.last_seen, cm.role
        FROM conversation_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = ?
      `).all(conv.id);

      // If PRIVATE, extract the target peer details
      let peer = null;
      if (conv.type === 'PRIVATE') {
        peer = members.find(m => m.id !== userId) || members[0];
      }

      // Get last message in conversation
      const lastMessage = db.prepare(`
        SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.media_url, m.file_name,
               m.duration, m.created_at, u.username AS senderName
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ? AND m.is_deleted = 0
        ORDER BY m.created_at DESC
        LIMIT 1
      `).get(conv.id);

      // Get unread count for current user
      const unreadCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM messages m
        WHERE m.conversation_id = ? AND m.sender_id != ?
          AND m.id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)
      `).get(conv.id, userId, userId).count;

      return {
        id: conv.id,
        type: conv.type,
        name: conv.type === 'GROUP' ? conv.name : (peer ? peer.username : 'Private Chat'),
        avatarUrl: conv.type === 'GROUP' ? (conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(conv.name)}`) : (peer ? peer.avatar_url : null),
        createdById: conv.created_by_id,
        myRole: conv.role,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        peer,
        members,
        lastMessage: lastMessage || null,
        unreadCount
      };
    });

    return res.json({ conversations: result });
  } catch (err) {
    console.error('Get Conversations Error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

function getOrCreatePrivateChat(req, res) {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot create private chat with yourself' });
    }

    const targetUser = db.prepare('SELECT id, username, avatar_url, is_online, last_seen FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Check if private conversation already exists between these 2 users
    const existing = db.prepare(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
      JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
      WHERE c.type = 'PRIVATE'
    `).get(userId, targetUserId);

    if (existing) {
      return res.json({ conversationId: existing.id, isNew: false });
    }

    // Create new conversation
    const convId = crypto.randomUUID();
    const now = new Date().toISOString();

    const createConv = db.transaction(() => {
      db.prepare(`
        INSERT INTO conversations (id, type, created_by_id, created_at, updated_at)
        VALUES (?, 'PRIVATE', ?, ?, ?)
      `).run(convId, userId, now, now);

      db.prepare(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
        VALUES (?, ?, ?, 'MEMBER', ?)
      `).run(crypto.randomUUID(), convId, userId, now);

      db.prepare(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
        VALUES (?, ?, ?, 'MEMBER', ?)
      `).run(crypto.randomUUID(), convId, targetUserId, now);
    });

    createConv();

    return res.status(201).json({ conversationId: convId, isNew: true });
  } catch (err) {
    console.error('Get or Create Private Chat Error:', err);
    return res.status(500).json({ error: 'Failed to start private chat' });
  }
}

function createGroupChat(req, res) {
  try {
    const userId = req.user.id;
    const { name, memberIds } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const membersList = Array.isArray(memberIds) ? memberIds : [];
    if (!membersList.includes(userId)) {
      membersList.push(userId);
    }

    if (membersList.length < 2) {
      return res.status(400).json({ error: 'A group chat must have at least 2 members' });
    }

    const convId = crypto.randomUUID();
    const now = new Date().toISOString();
    const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`;

    const createGroup = db.transaction(() => {
      db.prepare(`
        INSERT INTO conversations (id, type, name, avatar_url, created_by_id, created_at, updated_at)
        VALUES (?, 'GROUP', ?, ?, ?, ?, ?)
      `).run(convId, name.trim(), avatarUrl, userId, now, now);

      membersList.forEach(mId => {
        const role = mId === userId ? 'ADMIN' : 'MEMBER';
        db.prepare(`
          INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), convId, mId, role, now);
      });
    });

    createGroup();

    return res.status(201).json({ conversationId: convId, message: 'Group created successfully' });
  } catch (err) {
    console.error('Create Group Error:', err);
    return res.status(500).json({ error: 'Failed to create group chat' });
  }
}

function updateGroupInfo(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { name } = req.body;

    // Verify group and admin status
    const membership = db.prepare(`
      SELECT cm.role, c.type
      FROM conversation_members cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.conversation_id = ? AND cm.user_id = ?
    `).get(conversationId, userId);

    if (!membership || membership.type !== 'GROUP') {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    if (membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only group admins can update group settings' });
    }

    let avatarUrl = undefined;
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    const now = new Date().toISOString();

    if (name && avatarUrl) {
      db.prepare('UPDATE conversations SET name = ?, avatar_url = ?, updated_at = ? WHERE id = ?')
        .run(name.trim(), avatarUrl, now, conversationId);
    } else if (name) {
      db.prepare('UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?')
        .run(name.trim(), now, conversationId);
    } else if (avatarUrl) {
      db.prepare('UPDATE conversations SET avatar_url = ?, updated_at = ? WHERE id = ?')
        .run(avatarUrl, now, conversationId);
    }

    return res.json({ message: 'Group info updated' });
  } catch (err) {
    console.error('Update Group Info Error:', err);
    return res.status(500).json({ error: 'Failed to update group info' });
  }
}

function addGroupMember(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { newUserId, userIds } = req.body;

    const membership = db.prepare(`
      SELECT cm.role, c.type
      FROM conversation_members cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.conversation_id = ? AND cm.user_id = ?
    `).get(conversationId, userId);

    if (!membership || membership.type !== 'GROUP' || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    const idsToAdd = Array.isArray(userIds) ? userIds : (newUserId ? [newUserId] : []);
    if (idsToAdd.length === 0) {
      return res.status(400).json({ error: 'No user ID provided to add' });
    }

    const now = new Date().toISOString();
    let addedCount = 0;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO conversation_members (id, conversation_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'MEMBER', ?)
    `);

    idsToAdd.forEach(targetId => {
      const result = insertStmt.run(crypto.randomUUID(), conversationId, targetId, now);
      if (result.changes > 0) addedCount++;
    });

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

    return res.json({ message: `${addedCount} member(s) added to group` });
  } catch (err) {
    console.error('Add Member Error:', err);
    return res.status(500).json({ error: 'Failed to add member to group' });
  }
}

function removeGroupMember(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId, memberId } = req.params;

    const membership = db.prepare(`
      SELECT cm.role, c.type
      FROM conversation_members cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.conversation_id = ? AND cm.user_id = ?
    `).get(conversationId, userId);

    if (!membership || membership.type !== 'GROUP') {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    if (membership.role !== 'ADMIN' && userId !== memberId) {
      return res.status(403).json({ error: 'Only group admins can remove other members' });
    }

    db.prepare('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?').run(conversationId, memberId);

    const now = new Date().toISOString();
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

    // Check remaining members
    const remainingCount = db.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId).count;
    if (remainingCount === 0) {
      db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
    }

    return res.json({ message: userId === memberId ? 'You have left the group' : 'Member removed from group' });
  } catch (err) {
    console.error('Remove Member Error:', err);
    return res.status(500).json({ error: 'Failed to remove group member' });
  }
}

module.exports = {
  getConversations,
  getOrCreatePrivateChat,
  createGroupChat,
  updateGroupInfo,
  addGroupMember,
  removeGroupMember
};
