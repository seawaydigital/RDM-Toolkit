import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import { PDFDocument } from '@cantoo/pdf-lib';
import { stripJpegMetadata } from '../src/utils/jpegMetadata.js';
import { SAMPLE_PHOTO_EXIF } from '../src/utils/sampleFiles.js';
import { PHOTO, EXPECTED, MARKERS, SOI, APP0, EXIF } from './jpeg-fixture.mjs';

const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

test('fixture sanity: exifr reads GPS from the unstripped photo', async () => {
  const data = await exifr.parse(Buffer.from(PHOTO), { gps: true });
  assert.ok(Math.abs(data.latitude - SAMPLE_PHOTO_EXIF.latitude) < 1e-4);
});

test('drops EXIF, XMP, MPF, IPTC, comments (also between scans) and data after EOI; keeps what decoding needs', () => {
  const { bytes } = stripJpegMetadata(PHOTO);
  for (const marker of MARKERS) assert.equal(latin1(bytes).includes(marker), false, `${marker} survived`);
  assert.deepEqual([...bytes], [...EXPECTED]);
});

// JFIF and ICC are kept on purpose (decoders need them), so only the
// identifying segments are asked for.
const IDENTIFYING = { tiff: true, exif: true, gps: true, xmp: true, iptc: true, jfif: false, icc: false };

test('exifr finds no camera, GPS, XMP or IPTC data in the stripped photo', async () => {
  assert.ok(await exifr.parse(Buffer.from(PHOTO), IDENTIFYING), 'fixture has identifying data');
  const data = await exifr.parse(Buffer.from(stripJpegMetadata(PHOTO).bytes), IDENTIFYING);
  assert.equal(data, undefined, JSON.stringify(data));
});

test('reports what it removed, and nothing for an already clean photo', () => {
  const { removed } = stripJpegMetadata(PHOTO);
  for (const label of ['EXIF', 'XMP', 'IPTC', 'comments', 'data after end of image']) {
    assert.ok(removed.some((r) => r.includes(label)), `${label} not reported: ${removed.join(', ')}`);
  }
  const again = stripJpegMetadata(EXPECTED);
  assert.deepEqual(again.removed, []);
  assert.deepEqual([...again.bytes], [...EXPECTED]);
});

test('returns null for something that is not a well-formed JPEG', () => {
  assert.equal(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null, 'PNG accepted');
  const truncated = new Uint8Array([...SOI, 0xff, 0xe1, 0x40, 0x00, 1, 2, 3]);
  assert.equal(stripJpegMetadata(truncated), null, 'segment running past the end accepted');
  const noScan = new Uint8Array([...SOI, ...APP0, ...EXIF]);
  assert.equal(stripJpegMetadata(noScan), null, 'file ending before any scan accepted');
});

// Image to PDF embeds JPEGs as-is (DCTDecode keeps every byte), so it must
// embed the stripped bytes: pdf-lib has to accept them and nothing may leak.
test('a stripped JPEG embeds in a PDF with no EXIF, XMP or GPS in the output bytes', async () => {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(stripJpegMetadata(PHOTO).bytes);
  assert.equal(image.width, 1);
  doc.addPage().drawImage(image, { x: 0, y: 0, width: 10, height: 10 });
  const out = latin1(await doc.save());
  for (const marker of MARKERS) assert.equal(out.includes(marker), false, `${marker} reached the PDF`);
});
