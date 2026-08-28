const bcrypt = require('bcryptjs');
const { verifyToken } = require('../utils/jwt');
const { db } = require('../config/database');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token is expired or invalid' });
  }

  let user = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(decoded.id);
  if (!user && decoded.id) {
    // Auto-restore user from token so sessions are never lost after server restarts
    try {
      const username = decoded.username || `user_${decoded.id.slice(0, 6)}`;
      const email = `${username.toLowerCase()}@gmail.com`;
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      const now = new Date().toISOString();
      const dummyHash = bcrypt.hashSync('pulsechat_auto_pass', 10);

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, avatar_url, status_text, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, 'Available', 1, ?)
      `).run(decoded.id, username, email, dummyHash, avatarUrl, now);

      user = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(decoded.id);
    } catch (restoreErr) {
      console.warn('Auto restore fallback:', restoreErr.message);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Session expired. Please log in or register again.' });
  }

  req.user = user;
  next();
}

module.exports = { authenticateToken };
