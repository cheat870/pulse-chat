// ── End-to-End Encryption Service (Web Crypto API — ECDH + AES-GCM) ──────────
// Keys never leave the browser. The server only sees ciphertext.

const KEY_STORE = 'pulsechat_e2ee_keys';

// ── Key Generation ────────────────────────────────────────────────────────────
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  // Export public key as base64 (to share with peer)
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  // Export private key as JWK for storage
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey, publicKeyB64, privateKeyJwk };
}

// ── Store Key Pair in localStorage ───────────────────────────────────────────
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
  } catch { return null; }
}

// ── Derive Shared Secret from ECDH ───────────────────────────────────────────
export async function deriveSharedKey(myPrivateKeyJwk, theirPublicKeyB64) {
  const myPrivateKey = await crypto.subtle.importKey(
    'jwk', myPrivateKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
  const theirPublicKeyBytes = Uint8Array.from(atob(theirPublicKeyB64), c => c.charCodeAt(0));
  const theirPublicKey = await crypto.subtle.importKey(
    'raw', theirPublicKeyBytes,
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

// ── Encrypt Message ───────────────────────────────────────────────────────────
export async function encryptMessage(plaintext, sharedKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  // Combine iv + ciphertext → base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// ── Decrypt Message ───────────────────────────────────────────────────────────
export async function decryptMessage(ciphertextB64, sharedKey) {
  try {
    const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('Decryption failed:', err.message);
    return '[🔐 Encrypted message — cannot decrypt]';
  }
}
