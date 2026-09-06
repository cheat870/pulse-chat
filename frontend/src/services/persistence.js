import { apiRequest } from './api';

// Keys for permanent local backup
const FRIENDS_KEY = 'pulsechat_persisted_friends';
const CONVS_KEY = 'pulsechat_persisted_conversations';
const MSG_PREFIX = 'pulsechat_persisted_msgs_';
const PROFILE_KEY = 'pulsechat_persisted_profile';

export function getLocalUserProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
    const userRaw = localStorage.getItem('pulsechat_user');
    return userRaw ? JSON.parse(userRaw) : null;
  } catch {
    return null;
  }
}

export function saveLocalUserProfile(profile) {
  if (!profile) return;
  try {
    const current = getLocalUserProfile() || {};
    const merged = { ...current, ...profile };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('saveLocalUserProfile error:', e);
  }
}

export function getLocalFriends() {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFriends(friends) {
  if (!Array.isArray(friends) || friends.length === 0) return;
  try {
    const current = getLocalFriends();
    // Merge by id
    const map = new Map();
    current.forEach(f => { if (f && f.id) map.set(f.id, f); });
    friends.forEach(f => { if (f && f.id) map.set(f.id, f); });
    const merged = Array.from(map.values());
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('saveLocalFriends error:', e);
  }
}

export function getLocalConversations() {
  try {
    const raw = localStorage.getItem(CONVS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalConversations(convs) {
  if (!Array.isArray(convs) || convs.length === 0) return;
  try {
    const current = getLocalConversations();
    const map = new Map();
    current.forEach(c => { if (c && c.id) map.set(c.id, c); });
    convs.forEach(c => { if (c && c.id) map.set(c.id, c); });
    const merged = Array.from(map.values());
    localStorage.setItem(CONVS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('saveLocalConversations error:', e);
  }
}

export function getLocalMessages(convId) {
  try {
    const raw = localStorage.getItem(`${MSG_PREFIX}${convId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalMessages(convId, messages) {
  if (!convId || !Array.isArray(messages) || messages.length === 0) return;
  try {
    const current = getLocalMessages(convId);
    const map = new Map();
    current.forEach(m => { if (m && m.id) map.set(m.id, m); });
    messages.forEach(m => { if (m && m.id) map.set(m.id, m); });
    const merged = Array.from(map.values());
    localStorage.setItem(`${MSG_PREFIX}${convId}`, JSON.stringify(merged));
  } catch (e) {
    console.warn('saveLocalMessages error:', e);
  }
}

// Background Self-Healing Sync Engine
let lastSyncTime = 0;
export async function syncDataToServer() {
  // Throttle sync to at most once every 15 seconds
  if (Date.now() - lastSyncTime < 15000) return;
  lastSyncTime = Date.now();

  try {
    const profile = getLocalUserProfile();
    const friends = getLocalFriends();
    const conversations = getLocalConversations();

    // Gather recent messages across all conversations (up to 100)
    const messages = [];
    for (const c of conversations) {
      if (c && c.id) {
        const msgs = getLocalMessages(c.id);
        messages.push(...msgs.slice(-20));
      }
    }

    if (!profile && friends.length === 0 && conversations.length === 0 && messages.length === 0) {
      return;
    }

    await apiRequest('/chats/sync-restore', 'POST', {
      profile,
      friends,
      conversations,
      messages
    });
    console.log('✅ Persistent Profile, Chat & Friends synced to server successfully');
  } catch (e) {
    console.warn('syncDataToServer warning:', e);
  }
}
