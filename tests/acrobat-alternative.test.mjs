import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';

// The page is JSX, which node --test cannot import, so these checks read the
// source text — the same approach scripts/security-audit.mjs takes.
const SOURCE = readFileSync(
  new URL('../src/components/pages/AcrobatAlternative.jsx', import.meta.url),
  'utf8',
);
const KNOWN_IDS = new Set(ALL_TOOLS.map((t) => t.id));

test('every tool the page links to exists in the registry', () => {
  const tableIds = [...SOURCE.matchAll(/toolId: '([^']+)'/g)].map((m) => m[1]);
  const chipBlock = SOURCE.match(/const BEYOND_TOOL_IDS = \[([^\]]*)\]/);
  assert.ok(chipBlock, 'chips should be listed by id in BEYOND_TOOL_IDS');
  assert.match(SOURCE, /BEYOND_TOOL_IDS\.map\(/, 'chips should render from BEYOND_TOOL_IDS');
  const chipIds = [...chipBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  assert.ok(tableIds.length >= 19, 'coverage table should link its RDM rows');
  assert.equal(chipIds.length, 10);
  assert.deepEqual([...tableIds, ...chipIds].filter((id) => !KNOWN_IDS.has(id)), []);
});

test('the page does not hard-code the tool count', () => {
  assert.doesNotMatch(SOURCE, /all \d+ tools/i);
});
