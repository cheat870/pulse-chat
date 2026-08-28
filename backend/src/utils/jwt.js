const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pulsechat_super_secret_key_2026_jwt_token';
const EXPIRES_IN = '365d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
