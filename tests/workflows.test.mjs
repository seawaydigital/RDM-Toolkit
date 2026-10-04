import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, WORKFLOWS, getWorkflow, getTaskFromParams, stepHash } from '../src/data/workflows.js';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';
import { PAGE_IDS } from '../src/data/pages.js';

const toolIds = new Set(ALL_TOOLS.map(t => t.id));
const pageIds = PAGE_IDS;
const stageIds = new Set(STAGES.map(s => s.id));

test('ids are unique, kebab-case, and stages are valid', () => {
  const ids = WORKFLOWS.map(w => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const w of WORKFLOWS) {
    assert.match(w.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(stageIds.has(w.stage), `${w.id}: unknown stage ${w.stage}`);
    assert.ok(w.title && w.summary, `${w.id}: title and summary`);
  }
});

test('every step points at exactly one real tool or page and explains itself', () => {
  for (const w of WORKFLOWS) {
    assert.ok(w.steps.length >= 2, `${w.id}: at least two steps`);
    for (const s of w.steps) {
      assert.ok(Boolean(s.tool) !== Boolean(s.page), `${w.id}: step needs a tool or a page, not both`);
      if (s.tool) assert.ok(toolIds.has(s.tool), `${w.id}: unknown tool ${s.tool}`);
      if (s.page) assert.ok(pageIds.has(s.page), `${w.id}: unknown page ${s.page}`);
      assert.ok(typeof s.why === 'string' && s.why.length > 10, `${w.id}: step needs a why`);
    }
  }
});

test('exactly four tasks are featured on the homepage', () => {
  assert.equal(WORKFLOWS.filter(w => w.featured).length, 4);
});

test('getTaskFromParams validates the task id and the step range', () => {
  const w = WORKFLOWS[0];
  assert.deepEqual(getTaskFromParams({ task: w.id, step: '1' }), { id: w.id, step: 1 });
  assert.deepEqual(getTaskFromParams({ task: w.id, step: String(w.steps.length) }), { id: w.id, step: w.steps.length });
  assert.equal(getTaskFromParams({ task: w.id, step: '0' }), null);
  assert.equal(getTaskFromParams({ task: w.id, step: String(w.steps.length + 1) }), null);
  assert.equal(getTaskFromParams({ task: w.id, step: '1.5' }), null);
  assert.equal(getTaskFromParams({ task: w.id }), null);
  assert.equal(getTaskFromParams({ task: 'nope', step: '1' }), null);
  assert.equal(getTaskFromParams({}), null);
  assert.equal(getTaskFromParams(), null);
});

test('stepHash builds the hash for a step', () => {
  const w = getWorkflow('verify-transfer');
  assert.equal(stepHash(w, 1), 'checksum-verifier?task=verify-transfer&step=1');
  assert.equal(getWorkflow('nope'), null);
});
