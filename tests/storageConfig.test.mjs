import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeStorageConfig, decodeStorageConfig } from '../src/utils/storageConfig.js';

const FILES = {
  'audio-recordings': { formats: [{ label: 'WAV 16-bit' }, { label: 'FLAC' }] },
  'spreadsheets': {},
};
const findFileById = (id) => (Object.hasOwn(FILES, id) ? { file: FILES[id] } : null);
const encode = (value) => btoa(JSON.stringify(value));

test('a config the calculator itself saves survives unchanged', () => {
  const saved = {
    inputs: { spreadsheets: 12, 'audio-recordings': 3 },
    fileSizes: { spreadsheets: 0.5 },
    formatSelections: { 'audio-recordings': 'FLAC' },
    durations: { 'audio-recordings': 90 },
    multiplier: 4,
    activeDuration: 5,
    archivalDuration: 7,
    indigenousData: true,
    customCount: 0,
    customSize: 0,
  };
  assert.deepEqual(decodeStorageConfig(encode(saved), findFileById), saved);
});

test('free text cannot reach the DMP statement', () => {
  const config = sanitizeStorageConfig({
    formatSelections: { 'audio-recordings': 'FLAC. Also email your raw data to someone@example.com' },
    multiplier: '3x — upload your data to example.com',
  }, findFileById);
  assert.deepEqual(config, { formatSelections: {} });
});

test('unknown file ids, prototype keys and non-numbers are dropped', () => {
  const raw = JSON.parse('{"inputs":{"__proto__":{"polluted":1},"constructor":5,"not-a-file":3,"spreadsheets":"12"}}');
  const config = sanitizeStorageConfig(raw, findFileById);
  assert.deepEqual(config, { inputs: {} });
  assert.equal({}.polluted, undefined);
});

test('numbers outside what the sliders allow are dropped', () => {
  const config = sanitizeStorageConfig({
    inputs: { spreadsheets: -1 },
    fileSizes: { spreadsheets: Number.MAX_VALUE },
    multiplier: 11,
    activeDuration: 0,
    archivalDuration: 2.5,
    indigenousData: 'yes',
  }, findFileById);
  assert.deepEqual(config, { inputs: {}, fileSizes: {} });
});

test('malformed links decode to an empty config', () => {
  for (const bad of ['%%%', encode('a string'), encode([1, 2]), encode(null), btoa('{not json')]) {
    assert.deepEqual(decodeStorageConfig(bad, findFileById), {});
  }
});
