const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// GET /api/stories - get active stories from friends and self
exports.getStories = (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    const stories = db.prepare(`
      SELECT s.*, u.username, u.avatar_url,
        CASE WHEN sv.id IS NOT NULL THEN 1 ELSE 0 END as has_viewed
      FROM stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = ?
      WHERE s.expires_at > ?
        AND (
          s.user_id = ?
          OR s.user_id IN (
            SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
            FROM friendships WHERE (sender_id = ? OR receiver_id = ?) AND status = 'ACCEPTED'
          )
        )
      ORDER BY s.created_at ASC
    `).all(userId, now, userId, userId, userId, userId);

    const grouped = {};
    for (const s of stories) {
      if (!grouped[s.user_id]) {
        grouped[s.user_id] = {
          user: { id: s.user_id, username: s.username, avatar_url: s.avatar_url },
          stories: []
        };
      }
      grouped[s.user_id].stories.push({
        id: s.id,
        media_url: s.media_url,
        media_type: s.media_type,
        caption: s.caption,
        view_count: s.view_count,
        created_at: s.created_at,
        expires_at: s.expires_at,
        has_viewed: s.has_viewed === 1
      });
    }

    res.json({ storyGroups: Object.values(grouped) });
  } catch (err) {
    console.error('getStories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// POST /api/stories - create story
exports.createStory = (req, res) => {
  try {
    const userId = req.user.id;
    const { caption, media_type } = req.body;
    const mediaFile = req.file;

    if (!mediaFile) {
      return res.status(400).json({ error: 'Media file is required' });
    }

    const mediaUrl = `/uploads/${mediaFile.filename}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO stories (id, user_id, media_url, media_type, caption, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, mediaUrl, media_type || (mediaFile.mimetype.startsWith('video') ? 'VIDEO' : 'PHOTO'), caption || '', expiresAt);

    const story = db.prepare(`
      SELECT s.*, u.username, u.avatar_url
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id);

    const io = req.app.get('io');
    if (io) io.emit('new_story', story);

    res.status(201).json({ story });
  } catch (err) {
    console.error('createStory error:', err);
    res.status(500).json({ error: 'Failed to create story' });
  }
};

// POST /api/stories/:id/view - mark story as viewed
exports.viewStory = (req, res) => {
  try {
    const viewerId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM story_views WHERE story_id = ? AND viewer_id = ?').get(id, viewerId);
    if (!existing) {
      db.prepare('INSERT INTO story_views (id, story_id, viewer_id) VALUES (?, ?, ?)').run(uuidv4(), id, viewerId);
      db.prepare('UPDATE stories SET view_count = view_count + 1 WHERE id = ?').run(id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('viewStory error:', err);
    res.status(500).json({ error: 'Failed to record view' });
  }
};

// DELETE /api/stories/:id - delete own story
exports.deleteStory = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    if (story.media_url) {
      try {
        fs.unlinkSync(path.join(__dirname, '../../', story.media_url));
      } catch (e) {}
    }

    db.prepare('DELETE FROM stories WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteStory error:', err);
    res.status(500).json({ error: 'Failed to delete story' });
  }
};

// GET /api/stories/:id/views - list of viewers
exports.getStoryViewers = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
    if (!story || story.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const viewers = db.prepare(`
      SELECT u.id, u.username, u.avatar_url, sv.viewed_at
      FROM story_views sv
      JOIN users u ON sv.viewer_id = u.id
      WHERE sv.story_id = ?
      ORDER BY sv.viewed_at DESC
    `).all(id);

    res.json({ viewers });
  } catch (err) {
    console.error('getStoryViewers error:', err);
    res.status(500).json({ error: 'Failed to get viewers' });
  }
};
