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

const REMOVED_FRIENDS_KEY = 'pulsechat_removed_friends';

export function getRemovedFriends() {
  try {
    const raw = localStorage.getItem(REMOVED_FRIENDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function removeLocalFriend(friendId, friendUsername) {
  if (!friendId && !friendUsername) return;
  try {
    const removed = getRemovedFriends();
    if (friendId) {
      removed.add(String(friendId));
    }
    if (friendUsername) {
      removed.add(String(friendUsername).toLowerCase());
    }
    localStorage.setItem(REMOVED_FRIENDS_KEY, JSON.stringify(Array.from(removed)));

    const raw = localStorage.getItem(FRIENDS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) {
      const filtered = list.filter(f => {
        if (!f) return false;
        const fid = String(f.id || f.friendshipId || '');
        const fuser = String(f.username || '').toLowerCase();
        if (friendId && (fid === String(friendId) || f.friendshipId === String(friendId))) return false;
        if (friendUsername && fuser === String(friendUsername).toLowerCase()) return false;
        if (removed.has(fid) || (fuser && removed.has(fuser))) return false;
        return true;
      });
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('removeLocalFriend error:', e);
  }
}

export function unmarkRemovedFriend(friendId, friendUsername) {
  if (!friendId && !friendUsername) return;
  try {
    const removed = getRemovedFriends();
    if (friendId && removed.has(String(friendId))) removed.delete(String(friendId));
    if (friendUsername && removed.has(String(friendUsername).toLowerCase())) removed.delete(String(friendUsername).toLowerCase());
    localStorage.setItem(REMOVED_FRIENDS_KEY, JSON.stringify(Array.from(removed)));
  } catch {}
}

export function getLocalFriends() {
  try {
    const removed = getRemovedFriends();
    const raw = localStorage.getItem(FRIENDS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const map = new Map();
    if (Array.isArray(list)) {
      list.forEach(f => {
        if (!f || !f.id) return;
        const fid = String(f.id);
        const fuser = String(f.username || '').toLowerCase();
        if (!removed.has(fid) && !removed.has(fuser)) {
          map.set(f.id, f);
        }
      });
    }

    // Auto-discover friends from persisted private conversations
    try {
      const convRaw = localStorage.getItem(CONVS_KEY);
      const convs = convRaw ? JSON.parse(convRaw) : [];
      if (Array.isArray(convs)) {
        convs.forEach(c => {
          if (c && c.type === 'PRIVATE' && c.peer && c.peer.id) {
            const peerId = String(c.peer.id);
            const peerUsername = String(c.peer.username || '').toLowerCase();
            if (!removed.has(peerId) && !removed.has(peerUsername) && !map.has(c.peer.id)) {
              map.set(c.peer.id, {
                id: c.peer.id,
                username: c.peer.username || 'Friend',
                avatar_url: c.peer.avatar_url || null,
                status_text: c.peer.status_text || 'Available',
                is_online: c.peer.is_online || 0,
                last_seen: c.peer.last_seen || new Date().toISOString()
              });
            }
          }
        });
      }
    } catch {}

    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function saveLocalFriends(friends, overwrite = false) {
  if (!Array.isArray(friends)) return;
  try {
    const removed = getRemovedFriends();
    const map = new Map();
    if (!overwrite) {
      const current = getLocalFriends();
      current.forEach(f => { if (f && f.id && !removed.has(f.id)) map.set(f.id, f); });
    }
    friends.forEach(f => { if (f && f.id && !removed.has(f.id)) map.set(f.id, f); });
    const merged = Array.from(map.values());
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('saveLocalFriends error:', e);
  }
}

export function deduplicateConversations(convList) {
  if (!Array.isArray(convList)) return [];

  const privateByPeer = new Map();
  const groupsById = new Map();

  // Sort newest first by last message created_at or updatedAt or createdAt
  const sorted = [...convList].sort((a, b) => {
    const timeA = new Date(a?.lastMessage?.created_at || a?.updatedAt || a?.createdAt || 0).getTime();
    const timeB = new Date(b?.lastMessage?.created_at || b?.updatedAt || b?.createdAt || 0).getTime();
    return timeB - timeA;
  });

  for (const c of sorted) {
    if (!c || !c.id) continue;
    if (c.type === 'PRIVATE') {
      const peerId = c.peer?.id || c.peerId || c.name;
      if (!peerId) {
        if (!groupsById.has(c.id)) groupsById.set(c.id, c);
        continue;
      }

      if (!privateByPeer.has(peerId)) {
        privateByPeer.set(peerId, c);
      } else {
        // Merge messages from duplicate into canonical
        const canonical = privateByPeer.get(peerId);
        try {
          const dupMsgs = getLocalMessages(c.id);
          if (dupMsgs && dupMsgs.length > 0) {
            saveLocalMessages(canonical.id, dupMsgs);
            try { localStorage.removeItem(`${MSG_PREFIX}${c.id}`); } catch {}
          }
        } catch {}
      }
    } else {
      if (!groupsById.has(c.id)) {
        groupsById.set(c.id, c);
      }
    }
  }

  const result = [...Array.from(privateByPeer.values()), ...Array.from(groupsById.values())];
  return result.sort((a, b) => {
    const timeA = new Date(a?.lastMessage?.created_at || a?.updatedAt || a?.createdAt || 0).getTime();
    const timeB = new Date(b?.lastMessage?.created_at || b?.updatedAt || b?.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

export function getLocalConversations() {
  try {
    const raw = localStorage.getItem(CONVS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const deduped = deduplicateConversations(list);
    if (Array.isArray(list) && deduped.length !== list.length) {
      localStorage.setItem(CONVS_KEY, JSON.stringify(deduped));
    }
    return deduped;
  } catch {
    return [];
  }
}

export function saveLocalConversations(convs) {
  if (!Array.isArray(convs) || convs.length === 0) return;
  try {
    const current = getLocalConversations();
    const merged = deduplicateConversations([...current, ...convs]);
    localStorage.setItem(CONVS_KEY, JSON.stringify(merged));

    // Also auto-save private chat peers to friends (only if not removed)
    const removed = getRemovedFriends();
    const extractedFriends = [];
    merged.forEach(c => {
      if (c && c.type === 'PRIVATE' && c.peer && c.peer.id && !removed.has(c.peer.id)) {
        extractedFriends.push({
          id: c.peer.id,
          username: c.peer.username || 'Friend',
          avatar_url: c.peer.avatar_url || null,
          status_text: c.peer.status_text || 'Available',
          is_online: c.peer.is_online || 0,
          last_seen: c.peer.last_seen || new Date().toISOString()
        });
      }
    });
    if (extractedFriends.length > 0) {
      saveLocalFriends(extractedFriends);
    }
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
export async function syncDataToServer(force = false) {
  // Throttle sync to at most once every 15 seconds (bypass with force=true)
  if (!force && Date.now() - lastSyncTime < 15000) return;
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
