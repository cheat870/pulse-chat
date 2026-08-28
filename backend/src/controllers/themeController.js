const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/themes/:conversationId
exports.getTheme = (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const theme = db.prepare('SELECT * FROM chat_themes WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId);
    res.json({ theme: theme || { theme_color: 'indigo', wallpaper: 'none' } });
  } catch (err) {
    console.error('getTheme error:', err);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
};

// PUT /api/themes/:conversationId
exports.setTheme = (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { theme_color, wallpaper } = req.body;

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
    res.status(500).json({ error: 'Failed to set theme' });
  }
};
