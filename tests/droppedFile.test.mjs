import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setDroppedFiles,
  getDroppedFiles,
  hasPendingDroppedFiles,
  DROPPED_FILES_EVENT,
} from '../src/utils/droppedFile.js';

test('nothing is pending before a drop', () => {
  getDroppedFiles();
  assert.equal(hasPendingDroppedFiles(), false);
});

test('files are pending until a drop zone collects them', () => {
  setDroppedFiles([{ name: 'a.pdf' }]);
  assert.equal(hasPendingDroppedFiles(), true);
  // App reads this after dispatching DROPPED_FILES_EVENT to decide whether any
  // drop zone was mounted to take the files; it must not consume them itself.
  assert.equal(hasPendingDroppedFiles(), true);

  const collected = getDroppedFiles();
  assert.deepEqual(collected, [{ name: 'a.pdf' }]);
  assert.equal(hasPendingDroppedFiles(), false);
});

test('an empty drop does not count as pending', () => {
  setDroppedFiles([]);
  assert.equal(hasPendingDroppedFiles(), false);
  getDroppedFiles();
});

test('collecting twice yields nothing the second time', () => {
  setDroppedFiles([{ name: 'b.png' }]);
  assert.notEqual(getDroppedFiles(), null);
  assert.equal(getDroppedFiles(), null);
  assert.equal(hasPendingDroppedFiles(), false);
});

test('the event name is stable — App and DropZone agree on it', () => {
  assert.equal(DROPPED_FILES_EVENT, 'rdm:files-dropped');
});
