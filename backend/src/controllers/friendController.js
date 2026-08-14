const crypto = require('crypto');
const { db } = require('../config/database');

function sendRequest(req, res) {
  try {
    const senderId = req.user.id;
    const { targetUserId, targetQuery } = req.body;

    let targetUser = null;
    if (targetUserId) {
      targetUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(targetUserId);
    } else if (targetQuery) {
      targetUser = db.prepare(`
        SELECT id, username, email FROM users
        WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR id = ?
      `).get(targetQuery.trim(), targetQuery.trim(), targetQuery.trim());
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === senderId) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check existing friendship / request state
    const existing = db.prepare(`
      SELECT id, sender_id, receiver_id, status
      FROM friendships
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(senderId, targetUser.id, targetUser.id, senderId);

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'You are already friends with this user' });
      }
      if (existing.status === 'PENDING') {
        if (existing.sender_id === senderId) {
          return res.status(400).json({ error: 'Friend request already sent' });
        } else {
          // If they sent us a request and we send them one, auto accept!
          const now = new Date().toISOString();
          db.prepare("UPDATE friendships SET status = 'ACCEPTED', updated_at = ? WHERE id = ?").run(now, existing.id);
          return res.json({ message: 'Friend request accepted automatically!', friendshipId: existing.id, status: 'ACCEPTED' });
        }
      }
      if (existing.status === 'REJECTED') {
        // Reset to pending
        const now = new Date().toISOString();
        db.prepare("UPDATE friendships SET sender_id = ?, receiver_id = ?, status = 'PENDING', updated_at = ? WHERE id = ?")
          .run(senderId, targetUser.id, now, existing.id);
        return res.json({ message: 'Friend request re-sent successfully', friendshipId: existing.id, status: 'PENDING' });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO friendships (id, sender_id, receiver_id, status, created_at, updated_at)
      VALUES (?, ?, ?, 'PENDING', ?, ?)
    `).run(id, senderId, targetUser.id, now, now);

    return res.status(201).json({
      message: `Friend request sent to ${targetUser.username}`,
      friendshipId: id,
      targetUser,
      status: 'PENDING'
    });
  } catch (err) {
    console.error('Send Friend Request Error:', err);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
}

function getRequests(req, res) {
  try {
    const userId = req.user.id;

    // Incoming pending requests
    const incoming = db.prepare(`
      SELECT f.id AS requestId, f.created_at AS requestDate,
             u.id AS senderId, u.username, u.email, u.avatar_url, u.status_text, u.is_online, u.last_seen
      FROM friendships f
      JOIN users u ON f.sender_id = u.id
      WHERE f.receiver_id = ? AND f.status = 'PENDING'
      ORDER BY f.created_at DESC
    `).all(userId);

    // Outgoing pending requests
    const outgoing = db.prepare(`
      SELECT f.id AS requestId, f.created_at AS requestDate,
             u.id AS receiverId, u.username, u.email, u.avatar_url, u.status_text, u.is_online, u.last_seen
      FROM friendships f
      JOIN users u ON f.receiver_id = u.id
      WHERE f.sender_id = ? AND f.status = 'PENDING'
      ORDER BY f.created_at DESC
    `).all(userId);

    // Calculate mutual friends for each incoming request
    const incomingWithMutuals = incoming.map(reqItem => {
      // Find mutual friends
      const mutualsCount = db.prepare(`
        SELECT COUNT(*) AS count FROM (
          SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS friend_id
          FROM friendships WHERE status = 'ACCEPTED' AND (sender_id = ? OR receiver_id = ?)
          INTERSECT
          SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS friend_id
          FROM friendships WHERE status = 'ACCEPTED' AND (sender_id = ? OR receiver_id = ?)
        )
      `).get(userId, userId, userId, reqItem.senderId, reqItem.senderId, reqItem.senderId).count;

      return {
        ...reqItem,
        mutualFriends: mutualsCount
      };
    });

    return res.json({
      incoming: incomingWithMutuals,
      outgoing
    });
  } catch (err) {
    console.error('Get Requests Error:', err);
    return res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
}

function acceptRequest(req, res) {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = db.prepare("SELECT * FROM friendships WHERE id = ? AND receiver_id = ? AND status = 'PENDING'").get(requestId, userId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE friendships SET status = 'ACCEPTED', updated_at = ? WHERE id = ?").run(now, requestId);

    const sender = db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(request.sender_id);

    return res.json({ message: 'Friend request accepted', requestId, sender });
  } catch (err) {
    console.error('Accept Request Error:', err);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
}

function rejectRequest(req, res) {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = db.prepare("SELECT * FROM friendships WHERE id = ? AND receiver_id = ? AND status = 'PENDING'").get(requestId, userId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE friendships SET status = 'REJECTED', updated_at = ? WHERE id = ?").run(now, requestId);

    return res.json({ message: 'Friend request rejected', requestId });
  } catch (err) {
    console.error('Reject Request Error:', err);
    return res.status(500).json({ error: 'Failed to reject friend request' });
  }
}

function cancelRequest(req, res) {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = db.prepare("SELECT * FROM friendships WHERE id = ? AND sender_id = ? AND status = 'PENDING'").get(requestId, userId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    db.prepare('DELETE FROM friendships WHERE id = ?').run(requestId);

    return res.json({ message: 'Friend request canceled', requestId });
  } catch (err) {
    console.error('Cancel Request Error:', err);
    return res.status(500).json({ error: 'Failed to cancel request' });
  }
}

function getFriends(req, res) {
  try {
    const userId = req.user.id;

    const friends = db.prepare(`
      SELECT f.id AS friendshipId, f.created_at AS friendsSince,
             u.id, u.username, u.email, u.phone, u.avatar_url, u.status_text, u.is_online, u.last_seen
      FROM friendships f
      JOIN users u ON (CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END) = u.id
      WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = 'ACCEPTED'
      ORDER BY u.is_online DESC, u.username ASC
    `).all(userId, userId, userId);

    return res.json({ friends });
  } catch (err) {
    console.error('Get Friends Error:', err);
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
}

function removeFriend(req, res) {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const friendship = db.prepare(`
      SELECT id FROM friendships
      WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        AND status = 'ACCEPTED'
    `).get(userId, friendId, friendId, userId);

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship record not found' });
    }

    db.prepare('DELETE FROM friendships WHERE id = ?').run(friendship.id);

    return res.json({ message: 'Friend removed successfully', friendId });
  } catch (err) {
    console.error('Remove Friend Error:', err);
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
}

module.exports = {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getFriends,
  removeFriend
};
