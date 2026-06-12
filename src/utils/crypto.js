/**
 * SHA-256 file hashing — native Web Crypto, no library
 */
export async function hashFile(file, algorithm = 'SHA-256') {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// PBKDF2-SHA-256 work factors. v1 blobs (no prefix) predate versioning and must
// decrypt forever; v2 follows current OWASP guidance. Legacy output is pure
// base64, which can never contain ':', so the prefix is unambiguous.
const V2_PREFIX = 'v2:';
const PBKDF2_ITERATIONS = { v1: 100000, v2: 600000 };

async function deriveAesKey(passphrase, salt, iterations, usage) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, [usage]
  );
}

/**
 * AES-256-GCM encryption with PBKDF2 key derivation.
 * NEVER derive key directly from passphrase.
 */
export async function encryptText(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt, PBKDF2_ITERATIONS.v2, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return V2_PREFIX + btoa(String.fromCharCode(...combined));
}

/**
 * AES-256-GCM decryption with PBKDF2 key derivation.
 * Accepts both v2-prefixed blobs and legacy unprefixed v1 blobs.
 */
export async function decryptText(base64Ciphertext, passphrase) {
  const isV2 = base64Ciphertext.startsWith(V2_PREFIX);
  const iterations = isV2 ? PBKDF2_ITERATIONS.v2 : PBKDF2_ITERATIONS.v1;
  const encoded = isV2 ? base64Ciphertext.slice(V2_PREFIX.length) : base64Ciphertext;
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveAesKey(passphrase, salt, iterations, 'decrypt');
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}

/**
 * Uniform random indices in [0, range) via rejection sampling — a plain
 * modulo of a 32-bit value would slightly favour the low indices.
 */
export function secureRandomIndices(count, range) {
  const limit = Math.floor(0x100000000 / range) * range;
  const indices = [];
  while (indices.length < count) {
    const batch = crypto.getRandomValues(new Uint32Array(count - indices.length + 8));
    for (const v of batch) {
      if (v < limit && indices.length < count) indices.push(v % range);
    }
  }
  return indices;
}

/**
 * Cryptographically secure password generation.
 * Uses crypto.getRandomValues() — NEVER Math.random().
 */
export function generatePassword(length = 16, useUpper = true, useLower = true, useNumbers = true, useSymbols = true) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  let charset = '';
  if (useUpper) charset += upper;
  if (useLower) charset += lower;
  if (useNumbers) charset += numbers;
  if (useSymbols) charset += symbols;
  if (!charset) charset = lower + numbers;
  return secureRandomIndices(length, charset.length).map(i => charset[i]).join('');
}
