// ── End-to-End Encryption Service (Web Crypto API — ECDH + AES-GCM 256) ──────────
// Private keys NEVER leave the device.
// The server only sees AES-GCM ciphertext starting with "__E2EE__:".
import { apiRequest } from './api';

const KEY_STORE = 'pulsechat_e2ee_keys';
const SHARED_KEY_CACHE = new Map();

// ── Key Generation (ECDH P-256) ───────────────────────────────────────────────
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey, publicKeyB64, privateKeyJwk };
}

// ── Store & Load Local Key Pair ───────────────────────────────────────────────
export async function saveLocalKeyPair(userId) {
  const existing = loadLocalKeys(userId);
  if (existing) return existing;
  const { publicKeyB64, privateKeyJwk } = await generateKeyPair();
  const keys = { publicKeyB64, privateKeyJwk };
  const all = JSON.parse(localStorage.getItem(KEY_STORE) || '{}');
  all[userId] = keys;
  localStorage.setItem(KEY_STORE, JSON.stringify(all));
  return keys;
}

export function loadLocalKeys(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY_STORE) || '{}');
    return all[userId] || null;
  } catch {
    return null;
  }
}

// ── Publish Public Key to Server ──────────────────────────────────────────────
export async function syncPublicKeyToServer(userId) {
  try {
    const keys = await saveLocalKeyPair(userId);
    if (keys?.publicKeyB64) {
      await apiRequest('/users/e2ee-key', 'PUT', { publicKey: keys.publicKeyB64 });
      return keys.publicKeyB64;
    }
  } catch (err) {
    console.warn('Sync E2EE public key error:', err.message);
  }
  return null;
}

// ── Derive Shared Secret from ECDH ───────────────────────────────────────────
export async function deriveSharedKey(myPrivateKeyJwk, theirPublicKeyB64) {
  const myPrivateKey = await crypto.subtle.importKey(
    'jwk',
    myPrivateKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
  const theirPublicKeyBytes = Uint8Array.from(atob(theirPublicKeyB64), c => c.charCodeAt(0));
  const theirPublicKey = await crypto.subtle.importKey(
    'raw',
    theirPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return sharedKey;
}

// ── Get or Derive Shared Key for a 1-on-1 Peer ────────────────────────────────
export async function getOrDeriveSharedKey(myUserId, peerId) {
  if (!myUserId || !peerId) return null;
  const cacheKey = `${myUserId}_${peerId}`;
  if (SHARED_KEY_CACHE.has(cacheKey)) {
    return SHARED_KEY_CACHE.get(cacheKey);
  }

  try {
    // 1. Ensure my keys are initialized and published
    const myKeys = await saveLocalKeyPair(myUserId);
    if (!myKeys?.privateKeyJwk) return null;

    // 2. Fetch peer's public key from server
    const data = await apiRequest(`/users/${peerId}/e2ee-key`);
    if (!data?.publicKey) {
      console.log(`Peer ${peerId} has not published an E2EE public key yet.`);
      return null;
    }

    // 3. Derive 256-bit AES-GCM shared key
    const sharedKey = await deriveSharedKey(myKeys.privateKeyJwk, data.publicKey);
    SHARED_KEY_CACHE.set(cacheKey, sharedKey);
    return sharedKey;
  } catch (err) {
    console.warn('Derive shared key error:', err.message);
    return null;
  }
}

// ── Check if Message is Encrypted ─────────────────────────────────────────────
export const E2EE_PREFIX = '__E2EE__:';

export function isE2EEMessage(content) {
  return typeof content === 'string' && content.startsWith(E2EE_PREFIX);
}

// ── Encrypt Message Content ───────────────────────────────────────────────────
export async function encryptE2EEMessage(plaintext, sharedKey) {
  if (!sharedKey) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  const ciphertextB64 = btoa(String.fromCharCode(...combined));
  return `${E2EE_PREFIX}${ciphertextB64}`;
}

// ── Decrypt Message Content ───────────────────────────────────────────────────
export async function decryptE2EEMessage(rawContent, sharedKey) {
  if (!isE2EEMessage(rawContent)) {
    return { isE2EE: false, text: rawContent };
  }
  if (!sharedKey) {
    return { isE2EE: true, text: '🔒 Encrypted message (Key unavailable on this device)' };
  }

  try {
    const ciphertextB64 = rawContent.slice(E2EE_PREFIX.length);
    const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext
    );
    const text = new TextDecoder().decode(decrypted);
    return { isE2EE: true, text };
  } catch (err) {
    console.warn('Decryption failed:', err.message);
    return { isE2EE: true, text: '🔒 Encrypted message (Cannot decrypt)' };
  }
}
