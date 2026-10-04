import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash } from '../src/utils/route.js';

const known = { pages: new Set(['tasks', 'glossary']), toolIds: new Set(['merge-pdfs']) };

test('empty hash is home', () => {
  assert.deepEqual(parseHash('', known), { page: null, toolId: null, params: {} });
  assert.deepEqual(parseHash('#', known), { page: null, toolId: null, params: {} });
});

test('tool and page paths', () => {
  assert.equal(parseHash('#merge-pdfs', known).toolId, 'merge-pdfs');
  assert.equal(parseHash('#tasks', known).page, 'tasks');
  assert.equal(parseHash('#tasks', known).toolId, null);
});

test('query params are split off the path', () => {
  const r = parseHash('#merge-pdfs?task=reb-package&step=2', known);
  assert.equal(r.toolId, 'merge-pdfs');
  assert.deepEqual(r.params, { task: 'reb-package', step: '2' });
});

test('unknown path is home and its params are dropped', () => {
  assert.deepEqual(parseHash('#nope?task=x', known), { page: null, toolId: null, params: {} });
});

test('buildHash round-trips and omits empty params', () => {
  assert.equal(buildHash('merge-pdfs', { task: 'reb-package', step: 2 }), 'merge-pdfs?task=reb-package&step=2');
  assert.equal(buildHash('tasks', {}), 'tasks');
  assert.equal(buildHash('tasks'), 'tasks');
  assert.equal(buildHash('glossary', { term: '', other: null }), 'glossary');
  const r = parseHash(`#${buildHash('merge-pdfs', { task: 'a b&c', step: 1 })}`, known);
  assert.deepEqual(r.params, { task: 'a b&c', step: '1' });
});
