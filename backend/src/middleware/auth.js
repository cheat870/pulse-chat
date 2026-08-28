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

  const user = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or account reset. Please log in or register again.' });
  }

  req.user = user;
  next();
}

module.exports = { authenticateToken };
