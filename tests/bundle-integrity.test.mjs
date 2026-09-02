import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareBundles } from '../scripts/bundle-integrity.mjs';

const chunk = (name, logicalName, bytes) => ({ name, logicalName, bytes });

// Two distinct chunks share the logical name `index.js` in a real build: the app
// entry (index.html -> index-<hash>.js) and React's own index.js. The comparison
// must not depend on which of them happens to come first.
const baseFiles = [
  chunk('index-aaaa.js', 'index.js', 470_000),
  chunk('index-bbbb.js', 'index.js', 8_247),
  chunk('pdfjs-cccc.js', 'pdfjs.js', 454_000),
];

test('colliding logical names are compared as a group, not one arbitrary member', () => {
  const current = {
    files: [
      chunk('index-dddd.js', 'index.js', 488_790),
      chunk('index-eeee.js', 'index.js', 8_247),
      chunk('pdfjs-ffff.js', 'pdfjs.js', 454_000),
    ],
  };
  // 478,247 -> 497,037 is +3.9%, comfortably inside the limit.
  assert.deepEqual(compareBundles({ files: baseFiles }, current, 10), []);
});

test('file order within a colliding logical name does not change the verdict', () => {
  const forward = { files: [chunk('a.js', 'index.js', 8_247), chunk('b.js', 'index.js', 488_790)] };
  const reversed = { files: [...forward.files].reverse() };
  const base = { files: [chunk('x.js', 'index.js', 470_000), chunk('y.js', 'index.js', 8_247)] };
  assert.deepEqual(compareBundles(base, forward, 10), compareBundles(base, reversed, 10));
});

test('a genuine regression in a colliding group is still reported', () => {
  const current = {
    files: [
      chunk('index-dddd.js', 'index.js', 8_247),
      chunk('index-eeee.js', 'index.js', 900_000),
      chunk('pdfjs-ffff.js', 'pdfjs.js', 454_000),
    ],
  };
  const issues = compareBundles({ files: baseFiles }, current, 10);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /^index\.js grew by 89\.9% across 2 chunks/);
});

test('growth under the 10 KB floor is ignored even when the percentage is large', () => {
  const base = { files: [chunk('tiny-a.js', 'tiny.js', 1_000)] };
  const current = { files: [chunk('tiny-b.js', 'tiny.js', 9_000)] };
  assert.deepEqual(compareBundles(base, current, 10), []);
});

test('an unrecognised new chunk is reported, the rolldown runtime allowance is not', () => {
  const base = { files: [chunk('index-aaaa.js', 'index.js', 8_247)] };
  const current = {
    files: [
      chunk('index-bbbb.js', 'index.js', 8_247),
      chunk('rolldown-runtime-cccc.js', 'rolldown-runtime.js', 2_000),
      chunk('surprise-dddd.js', 'surprise.js', 50_000),
    ],
  };
  const issues = compareBundles(base, current, 10);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /^new JS chunk surprise\.js/);
});
