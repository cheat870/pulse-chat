const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { db } = require('../config/database');

// ── Setup 2FA (Generate TOTP Secret + QR Code) ───────────────────────────────
async function setup2FA(req, res) {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(userId);

    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `PulseChat:${user.username}`,
      issuer: 'PulseChat',
      length: 20
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Save secret (not yet enabled until user verifies)
    const existingTOTP = db.prepare('SELECT id FROM totp_secrets WHERE user_id = ?').get(userId);
    if (existingTOTP) {
      db.prepare(`UPDATE totp_secrets SET secret = ?, is_enabled = 0, backup_codes = ? WHERE user_id = ?`)
        .run(secret.base32, JSON.stringify(backupCodes), userId);
    } else {
      db.prepare(`INSERT INTO totp_secrets (id, user_id, secret, is_enabled, backup_codes) VALUES (?, ?, ?, 0, ?)`)
        .run(crypto.randomUUID(), userId, secret.base32, JSON.stringify(backupCodes));
    }

    // Generate QR code image (data URL)
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
      backupCodes,
      otpauthUrl: secret.otpauth_url
    });
  } catch (err) {
    console.error('2FA Setup Error:', err);
    return res.status(500).json({ error: 'Failed to setup 2FA' });
  }
}

// ── Verify & Enable 2FA ───────────────────────────────────────────────────────
function verify2FA(req, res) {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Token required' });

    const totpRecord = db.prepare('SELECT secret FROM totp_secrets WHERE user_id = ?').get(userId);
    if (!totpRecord) return res.status(404).json({ error: '2FA not set up yet' });

    const verified = speakeasy.totp.verify({
      secret: totpRecord.secret,
      encoding: 'base32',
      token: token.toString(),
      window: 2
    });

    if (!verified) return res.status(400).json({ error: 'Invalid token. Please try again.' });

    // Enable 2FA
    db.prepare('UPDATE totp_secrets SET is_enabled = 1 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE users SET is_2fa_enabled = 1 WHERE id = ?').run(userId);

    return res.json({ success: true, message: '2FA enabled successfully' });
  } catch (err) {
    console.error('2FA Verify Error:', err);
    return res.status(500).json({ error: 'Failed to verify 2FA token' });
  }
}

// ── Disable 2FA ───────────────────────────────────────────────────────────────
function disable2FA(req, res) {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const totpRecord = db.prepare('SELECT secret, is_enabled FROM totp_secrets WHERE user_id = ?').get(userId);
    if (!totpRecord || !totpRecord.is_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret: totpRecord.secret,
      encoding: 'base32',
      token: token.toString(),
      window: 2
    });

    if (!verified) return res.status(400).json({ error: 'Invalid token' });

    db.prepare('UPDATE totp_secrets SET is_enabled = 0 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE users SET is_2fa_enabled = 0 WHERE id = ?').run(userId);

    return res.json({ success: true, message: '2FA disabled' });
  } catch (err) {
    console.error('2FA Disable Error:', err);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
}

// ── Get 2FA Status ────────────────────────────────────────────────────────────
function get2FAStatus(req, res) {
  try {
    const userId = req.user.id;
    const totpRecord = db.prepare('SELECT is_enabled FROM totp_secrets WHERE user_id = ?').get(userId);
    return res.json({ isEnabled: totpRecord?.is_enabled === 1 });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get 2FA status' });
  }
}

module.exports = { setup2FA, verify2FA, disable2FA, get2FAStatus };
