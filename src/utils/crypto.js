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

/**
 * AES-256-GCM encryption with PBKDF2 key derivation.
 * NEVER derive key directly from passphrase.
 */
export async function encryptText(plaintext, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * AES-256-GCM decryption with PBKDF2 key derivation.
 */
export async function decryptText(base64Ciphertext, passphrase) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const combined = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return dec.decode(plainBuffer);
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
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values).map(v => charset[v % charset.length]).join('');
}
