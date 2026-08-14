const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/database');
const { generateToken } = require('../utils/jwt');

function register(req, res) {
  try {
    const { username, email, phone, password, statusText } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check existing
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already registered' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username.trim())}`;

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, phone, password_hash, avatar_url, status_text, is_online, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const now = new Date().toISOString();
    stmt.run(id, username.trim(), email.trim().toLowerCase(), phone || null, passwordHash, avatarUrl, statusText || 'Hey there! I am using PulseChat', now);

    const user = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(id);
    const token = generateToken({ id: user.id, username: user.username });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

function login(req, res) {
  try {
    const { loginId, password } = req.body; // loginId can be username or email

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(loginId.trim(), loginId.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set online
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?').run(now, user.id);

    const updatedUser = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(user.id);
    const token = generateToken({ id: user.id, username: user.username });

    return res.json({
      message: 'Login successful',
      token,
      user: updatedUser
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

function decodeGoogleToken(credential) {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payloadJson);
  } catch (e) {
    return null;
  }
}

function googleLogin(req, res) {
  try {
    const { credential, profile } = req.body;
    let email = null;
    let name = null;
    let picture = null;

    if (credential) {
      const decoded = decodeGoogleToken(credential);
      if (decoded) {
        email = decoded.email;
        name = decoded.name || decoded.given_name;
        picture = decoded.picture;
      }
    } else if (profile) {
      email = profile.email;
      name = profile.name;
      picture = profile.picture;
    }

    if (!email) {
      return res.status(400).json({ error: 'Failed to retrieve Google user information' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

    const now = new Date().toISOString();

    if (!user) {
      // Create new user for Google OAuth
      let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      let uniqueUsername = baseUsername;
      let counter = 1;

      while (db.prepare('SELECT id FROM users WHERE username = ?').get(uniqueUsername)) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      const id = crypto.randomUUID();
      const randomPasswordHash = bcrypt.hashSync(crypto.randomUUID(), 10);
      const avatarUrl = picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uniqueUsername)}`;

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, avatar_url, status_text, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(id, uniqueUsername, cleanEmail, randomPasswordHash, avatarUrl, 'Available via Google Sign-In', now);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      // Update online status and avatar
      const avatarUrl = user.avatar_url || picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;
      db.prepare('UPDATE users SET is_online = 1, avatar_url = ?, last_seen = ? WHERE id = ?').run(avatarUrl, now, user.id);
    }

    const updatedUser = db.prepare('SELECT id, username, email, phone, avatar_url, status_text, is_online, last_seen, created_at FROM users WHERE id = ?').get(user.id);
    const token = generateToken({ id: updatedUser.id, username: updatedUser.username });

    return res.json({
      message: 'Google login successful',
      token,
      user: updatedUser
    });
  } catch (err) {
    console.error('Google Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during Google login' });
  }
}

function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, googleLogin, getMe };
