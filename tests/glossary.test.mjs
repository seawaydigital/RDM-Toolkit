import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, getTerm } from '../src/data/glossary.js';
import { PAGE_IDS } from '../src/data/pages.js';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';

const toolIds = new Set(ALL_TOOLS.map(t => t.id));

test('ids are unique kebab-case and terms are sorted A to Z', () => {
  const ids = GLOSSARY.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  const terms = GLOSSARY.map(t => t.term.toLowerCase());
  assert.deepEqual(terms, [...terms].sort((a, b) => a.localeCompare(b)));
});

test('related terms and links resolve', () => {
  for (const t of GLOSSARY) {
    for (const r of t.related || []) assert.ok(getTerm(r), `${t.id}: related ${r} missing`);
    if (t.link) {
      const path = t.link.hash.split('?')[0];
      assert.ok(PAGE_IDS.has(path) || toolIds.has(path), `${t.id}: link ${t.link.hash} is not a route`);
    }
  }
});

test('definitions are plain text and short', () => {
  for (const t of GLOSSARY) {
    assert.ok(t.definition.length > 20 && t.definition.length <= 400, `${t.id}: ${t.definition.length} chars`);
    assert.doesNotMatch(t.definition, /<[a-z]/i, `${t.id}: no HTML`);
  }
});
