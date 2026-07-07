import { test } from 'node:test';
import assert from 'node:assert';
import { contrastRatio, hexToRgb, parseColorValue } from './check-contrast.js';

test('hexToRgb parses 6-digit hex', () => {
  assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('#FFC20E'), { r: 255, g: 194, b: 14 });
});

test('hexToRgb parses 3-digit hex', () => {
  assert.deepEqual(hexToRgb('#FFF'), { r: 255, g: 255, b: 255 });
});

test('contrastRatio black on white = 21:1', () => {
  const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.01, `expected ~21, got ${ratio}`);
});

test('contrastRatio white on white = 1:1', () => {
  const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 1) < 0.01, `expected 1, got ${ratio}`);
});

test('parseColorValue handles hex', () => {
  assert.deepEqual(parseColorValue('#0A1628'), { r: 10, g: 22, b: 40 });
});

test('parseColorValue handles rgba composited over solid bg', () => {
  // rgba(255, 255, 255, 0.04) over #0A1628 should brighten the navy slightly
  const result = parseColorValue('rgba(255, 255, 255, 0.04)', { r: 10, g: 22, b: 40 });
  assert.ok(result.r > 10, 'red channel should brighten');
});
