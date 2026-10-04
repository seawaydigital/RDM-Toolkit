import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectEncoding, decodeBytes, encodeUtf8 } from '../src/utils/csvEncoding.js';

const TEXT = 'name,city\nAndré,Québec\nZoë,Montréal\n';

function utf16(text, littleEndian, withBom = true) {
  const out = new Uint8Array((withBom ? 2 : 0) + text.length * 2);
  const view = new DataView(out.buffer);
  let at = 0;
  if (withBom) { view.setUint16(0, 0xfeff, littleEndian); at = 2; }
  for (const ch of text) { view.setUint16(at, ch.charCodeAt(0), littleEndian); at += 2; }
  return out;
}

const utf8 = text => new TextEncoder().encode(text);
const cp1252 = text => Uint8Array.from(text, ch => {
  const map = { 'é': 0xe9, 'ë': 0xeb, '’': 0x92 };
  return map[ch] ?? ch.charCodeAt(0);
});

test('plain ASCII and UTF-8 need no fix', () => {
  assert.equal(detectEncoding(utf8('a,b\n1,2\n')).decoder, 'utf-8');
  const d = detectEncoding(utf8(TEXT));
  assert.equal(d.decoder, 'utf-8');
  assert.equal(d.needsFix, false);
  assert.equal(decodeBytes(utf8(TEXT), d), TEXT);
});

test('UTF-8 with a byte-order mark is decoded without the mark', () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8(TEXT)]);
  const d = detectEncoding(bytes);
  assert.equal(d.hasBOM, true);
  assert.equal(decodeBytes(bytes, d), TEXT);
});

test('UTF-16 LE with BOM (Excel "Unicode Text") is decoded correctly', () => {
  const bytes = utf16(TEXT, true);
  const d = detectEncoding(bytes);
  assert.equal(d.decoder, 'utf-16le');
  assert.equal(d.needsFix, true);
  assert.equal(decodeBytes(bytes, d), TEXT);
});

test('UTF-16 BE with BOM is decoded correctly', () => {
  const bytes = utf16(TEXT, false);
  const d = detectEncoding(bytes);
  assert.equal(d.decoder, 'utf-16be');
  assert.equal(decodeBytes(bytes, d), TEXT);
});

test('UTF-16 LE without a BOM is recognised from its zero bytes', () => {
  const bytes = utf16(TEXT, true, false);
  const d = detectEncoding(bytes);
  assert.equal(d.decoder, 'utf-16le');
  assert.equal(decodeBytes(bytes, d), TEXT);
});

test('Windows-1252 is decoded, including curly quotes', () => {
  const source = 'name,note\nAndré,it’s fine\nZoë,ok\n';
  const bytes = cp1252(source);
  const d = detectEncoding(bytes);
  assert.equal(d.decoder, 'windows-1252');
  assert.equal(d.needsFix, true);
  assert.equal(decodeBytes(bytes, d), source);
});

test('encodeUtf8 adds a byte-order mark only when asked', () => {
  assert.deepEqual([...encodeUtf8('é')], [0xc3, 0xa9]);
  assert.deepEqual([...encodeUtf8('é', { bom: true })], [0xef, 0xbb, 0xbf, 0xc3, 0xa9]);
});
