const crypto = require('crypto');
const webpush = require('web-push');
const { db } = require('../config/database');

// Generate VAPID keys once (store in env):
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log(vapidKeys);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-HoHOEtsFIumlOfKjnEsTo9-FGQNIwGSZiz8';

webpush.setVapidDetails(
  'mailto:pulsechat@example.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

// ── Get VAPID Public Key ───────────────────────────────────────────────────────
function getVapidPublicKey(req, res) {
  return res.json({ publicKey: VAPID_PUBLIC });
}

// ── Subscribe to Push ─────────────────────────────────────────────────────────
function subscribe(req, res) {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription data' });
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, endpoint, keys.p256dh, keys.auth);

    return res.json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    console.error('Push Subscribe Error:', err);
    return res.status(500).json({ error: 'Failed to save push subscription' });
  }
}

// ── Unsubscribe from Push ─────────────────────────────────────────────────────
function unsubscribe(req, res) {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
}

// ── Send Push Notification to a User (internal helper) ────────────────────────
async function sendPushToUser(userId, payload) {
  try {
    const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
    const promises = subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — remove it
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    });
    await Promise.allSettled(promises);
  } catch (err) {
    console.error('Send Push Error:', err);
  }
}

module.exports = { getVapidPublicKey, subscribe, unsubscribe, sendPushToUser };
