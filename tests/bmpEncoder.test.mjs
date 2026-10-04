import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeBmp } from '../src/utils/bmpEncoder.js';

// 3×2 RGBA image, top row first (the order canvas getImageData returns):
// row 0: red, green, blue   row 1: white, black, half-transparent grey
const RGBA = new Uint8ClampedArray([
  255, 0, 0, 255,   0, 255, 0, 255,   0, 0, 255, 255,
  255, 255, 255, 255,   0, 0, 0, 255,   128, 128, 128, 128,
]);

test('writes a valid BITMAPINFOHEADER BMP header', () => {
  const bmp = encodeBmp(RGBA, 3, 2);
  const v = new DataView(bmp.buffer);
  assert.equal(String.fromCharCode(bmp[0], bmp[1]), 'BM');
  const rowSize = 12; // 3 px × 3 bytes = 9, padded to a multiple of 4
  assert.equal(v.getUint32(2, true), 54 + rowSize * 2, 'file size');
  assert.equal(v.getUint32(10, true), 54, 'pixel data offset');
  assert.equal(v.getUint32(14, true), 40, 'DIB header size');
  assert.equal(v.getInt32(18, true), 3, 'width');
  assert.equal(v.getInt32(22, true), 2, 'height (positive = bottom-up rows)');
  assert.equal(v.getUint16(26, true), 1, 'planes');
  assert.equal(v.getUint16(28, true), 24, 'bits per pixel');
  assert.equal(v.getUint32(30, true), 0, 'no compression');
  assert.equal(v.getUint32(34, true), rowSize * 2, 'image size');
  assert.equal(bmp.length, 54 + rowSize * 2);
});

test('stores rows bottom-up as BGR with 4-byte row padding', () => {
  const bmp = encodeBmp(RGBA, 3, 2);
  const px = (row, col) => [...bmp.slice(54 + row * 12 + col * 3, 54 + row * 12 + col * 3 + 3)];
  // First stored row is the image's bottom row.
  assert.deepEqual(px(0, 0), [255, 255, 255]);
  assert.deepEqual(px(0, 1), [0, 0, 0]);
  // Second stored row is the top row: red, green, blue → BGR order.
  assert.deepEqual(px(1, 0), [0, 0, 255]);
  assert.deepEqual(px(1, 1), [0, 255, 0]);
  assert.deepEqual(px(1, 2), [255, 0, 0]);
  assert.deepEqual([...bmp.slice(54 + 9, 54 + 12)], [0, 0, 0], 'padding bytes are zero');
});

test('transparent pixels are composited onto white', () => {
  const bmp = encodeBmp(RGBA, 3, 2);
  // 128 grey at alpha 128/255 over white ≈ 191.
  const [b, g, r] = bmp.slice(54 + 6, 54 + 9);
  for (const c of [b, g, r]) assert.ok(Math.abs(c - 191) <= 1, `channel ${c}`);
});

test('rejects data that does not match the dimensions', () => {
  assert.throws(() => encodeBmp(new Uint8ClampedArray(8), 3, 2), /expected 24 bytes/);
});
