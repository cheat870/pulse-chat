const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/themes/:conversationId
exports.getTheme = (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    if (!userId || !conversationId) {
      return res.json({ theme: { theme_color: 'indigo', wallpaper: 'none' } });
    }
    const theme = db.prepare('SELECT * FROM chat_themes WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    res.json({ theme: theme || { theme_color: 'indigo', wallpaper: 'none' } });
  } catch (err) {
    console.error('getTheme error:', err);
    res.json({ theme: { theme_color: 'indigo', wallpaper: 'none' } });
  }
};

// PUT /api/themes/:conversationId
exports.setTheme = (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { theme_color, wallpaper } = req.body;

    if (!userId || !conversationId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Ensure conversation exists in DB to avoid FK constraint errors
    const conv = db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
    if (!conv) {
      // Create stub conversation record so foreign key is satisfied
      db.prepare(`
        INSERT OR IGNORE INTO conversations (id, type, created_at)
        VALUES (?, 'PRIVATE', CURRENT_TIMESTAMP)
      `).run(conversationId);
    }

    const existing = db.prepare('SELECT id FROM chat_themes WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    if (existing) {
      db.prepare('UPDATE chat_themes SET theme_color = ?, wallpaper = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        theme_color || 'indigo',
        wallpaper || 'none',
        existing.id
      );
    } else {
      db.prepare('INSERT INTO chat_themes (id, conversation_id, user_id, theme_color, wallpaper) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(),
        conversationId,
        userId,
        theme_color || 'indigo',
        wallpaper || 'none'
      );
    }

    res.json({ ok: true, theme_color, wallpaper });
  } catch (err) {
    console.error('setTheme error:', err);
    res.status(500).json({ error: err.message || 'Failed to set theme' });
  }
};

