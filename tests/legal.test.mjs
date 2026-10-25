import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STORED_ITEMS, LEGAL_UPDATED, POLICY_PAGES } from '../src/data/legal.js';
import { PAGE_IDS } from '../src/data/pages.js';

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

// Every key the app writes to browser storage, found as a string literal.
// legal.js is skipped: it is the list being checked.
function storageKeysInSource() {
  const keys = new Set();
  for (const file of sourceFiles('src')) {
    if (file.replace(/\\/g, '/').endsWith('src/data/legal.js')) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(/['"`](rdm_[a-z0-9_]+)['"`]/g)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

test('the privacy statement describes every key the app stores', () => {
  const described = new Set(STORED_ITEMS.flatMap(item => item.keys));
  for (const key of storageKeysInSource()) {
    assert.ok(described.has(key), `${key} is stored but not listed in STORED_ITEMS (src/data/legal.js)`);
  }
});

test('the privacy statement lists no key the app no longer stores', () => {
  const used = storageKeysInSource();
  for (const item of STORED_ITEMS) {
    for (const key of item.keys) assert.ok(used.has(key), `${key} is listed but not used in src/`);
  }
});

test('each stored item says what it holds and why', () => {
  for (const item of STORED_ITEMS) {
    assert.ok(item.name && item.holds && item.why, `${item.keys.join(', ')} is missing a field`);
  }
});

test('the last-updated date is a real ISO calendar date', () => {
  assert.match(LEGAL_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${LEGAL_UPDATED}T00:00:00Z`).toISOString().slice(0, 10), LEGAL_UPDATED);
});

test('every footer policy link is a real page', () => {
  for (const { hash } of POLICY_PAGES) assert.ok(PAGE_IDS.has(hash), `#${hash} is not a route`);
});
