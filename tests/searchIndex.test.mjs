import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchAll, MAX_RESULTS } from '../src/data/searchIndex.js';

const KIND_ORDER = { tool: 0, task: 1, page: 2, term: 3 };

test('finds tools by name and tag, tasks by title, pages by title', () => {
  assert.ok(searchAll('merge').some(r => r.kind === 'tool' && r.id === 'merge-pdfs'));
  assert.ok(searchAll('participant').some(r => r.kind === 'task' && r.id === 'share-participant-data'));
  assert.ok(searchAll('dataverse').some(r => r.kind === 'page' && r.id === 'lakehead-dataverse'));
});

test('task and page results carry a navigable hash', () => {
  const task = searchAll('participant').find(r => r.kind === 'task');
  assert.equal(task.hash, 'data-anonymizer?task=share-participant-data&step=1');
  const page = searchAll('dataverse').find(r => r.kind === 'page');
  assert.equal(page.hash, 'lakehead-dataverse');
  const tool = searchAll('merge').find(r => r.kind === 'tool');
  assert.equal(tool.hash, 'merge-pdfs');
});

test('results are grouped tools, tasks, pages and capped', () => {
  const results = searchAll('data');
  assert.ok(results.length > 0 && results.length <= MAX_RESULTS);
  for (let i = 1; i < results.length; i++) {
    assert.ok(KIND_ORDER[results[i - 1].kind] <= KIND_ORDER[results[i].kind]);
  }
});

test('each kind keeps at least one slot when it has a match', () => {
  // "pdf" matches far more tools than the cap; tasks and pages must still show.
  const kinds = new Set(searchAll('pdf').map(r => r.kind));
  assert.ok(kinds.has('tool'));
  assert.ok(kinds.has('task'));
});

test('blank query returns nothing', () => {
  assert.deepEqual(searchAll('   '), []);
  assert.deepEqual(searchAll(''), []);
});
