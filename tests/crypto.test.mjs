import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptText,
  decryptText,
  generatePassword,
  secureRandomIndices,
} from '../src/utils/crypto.js';

// Independent PBKDF2 + AES-GCM helpers so tests don't trust the code under test
// for both sides of a round-trip.
async function deriveKey(passphrase, salt, iterations, usage) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, [usage]
  );
}

// Replicates the legacy (pre-v2) on-the-wire format: base64(salt16 + iv12 + ct), 100k iterations.
async function encryptLegacyV1(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, 100000, 'encrypt');
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  ));
  const combined = new Uint8Array(28 + ct.length);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(ct, 28);
  return btoa(String.fromCharCode(...combined));
}

test('encryptText output carries the v2: version prefix', async () => {
  const out = await encryptText('hello', 'correct horse battery staple');
  assert.ok(out.startsWith('v2:'), `expected v2: prefix, got: ${out.slice(0, 12)}...`);
});

test('encryptText derives with 600,000 PBKDF2 iterations', async () => {
  const out = await encryptText('hello', 'pw');
  const combined = Uint8Array.from(atob(out.slice(3)), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ct = combined.slice(28);
  const key = await deriveKey('pw', salt, 600000, 'decrypt');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  assert.equal(new TextDecoder().decode(plain), 'hello');
});

test('v2 round-trip: decryptText recovers what encryptText produced', async () => {
  const msg = 'Confidential research note — éàü ✓';
  const out = await encryptText(msg, 'pass phrase');
  assert.equal(await decryptText(out, 'pass phrase'), msg);
});

test('decryptText still decrypts legacy unprefixed v1 blobs (100k iterations)', async () => {
  const msg = 'encrypted before the v2 rollout';
  const legacyBlob = await encryptLegacyV1(msg, 'old password');
  assert.equal(await decryptText(legacyBlob, 'old password'), msg);
});

test('decryptText rejects wrong passphrase rather than returning garbage', async () => {
  const out = await encryptText('secret', 'right');
  await assert.rejects(() => decryptText(out, 'wrong'));
});

test('secureRandomIndices returns exactly count values, all within range', () => {
  const indices = secureRandomIndices(500, 94);
  assert.equal(indices.length, 500);
  for (const i of indices) {
    assert.ok(Number.isInteger(i) && i >= 0 && i < 94, `index out of range: ${i}`);
  }
});

test('generatePassword returns requested length using only charset characters', () => {
  const pw = generatePassword(32, true, true, true, true);
  assert.equal(pw.length, 32);
  const charset = /^[A-Za-z0-9!@#$%^&*()\-_=+[\]{}|;:,.<>?]+$/;
  assert.ok(charset.test(pw), `unexpected character in: ${pw}`);
});
