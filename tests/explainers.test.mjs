import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_DISAMBIGUATION, getDisambiguation } from '../src/data/toolExplainers.js';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';

const toolIds = new Set(ALL_TOOLS.map(t => t.id));

test('every disambiguation names two real, different tools', () => {
  for (const [id, entry] of Object.entries(TOOL_DISAMBIGUATION)) {
    assert.ok(toolIds.has(id), `${id} is not a tool`);
    assert.ok(toolIds.has(entry.other), `${id}: ${entry.other} is not a tool`);
    assert.notEqual(id, entry.other);
    assert.ok(entry.text.length > 20 && entry.text.length <= 220, `${id}: text length ${entry.text.length}`);
    assert.doesNotMatch(entry.text, /<[a-z]/i, `${id}: plain text only`);
  }
});

test('pairs are defined in both directions', () => {
  for (const [id, entry] of Object.entries(TOOL_DISAMBIGUATION)) {
    assert.equal(TOOL_DISAMBIGUATION[entry.other]?.other, id, `${entry.other} should point back to ${id}`);
  }
});

test('the six confusable pairs are covered', () => {
  for (const [a, b] of [
    ['strip-file-metadata', 'strip-image-metadata'],
    ['split-pdf', 'pdf-page-delete'],
    ['extract-images-from-pdf', 'pdf-to-images'],
    ['sha256-hasher', 'checksum-verifier'],
    ['encrypt-decrypt-text', 'password-protect-pdf'],
    ['pdf-redaction', 'data-anonymizer'],
  ]) {
    assert.equal(getDisambiguation(a)?.other, b);
  }
  assert.equal(getDisambiguation('word-counter'), null);
});
