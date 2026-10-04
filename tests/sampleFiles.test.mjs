import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import { buildSampleParticipantsCsv, buildExifSegment, insertExif, SAMPLE_PHOTO_EXIF } from '../src/utils/sampleFiles.js';

// Smallest byte sequence exifr accepts as a JPEG: SOI then EOI.
const MINIMAL_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test('sample CSV has a header and 8 fictional participants, 7 columns each', () => {
  const lines = buildSampleParticipantsCsv().trim().split('\n');
  assert.equal(lines.length, 9);
  assert.equal(lines[0], 'participant_id,full_name,email,phone,site,interview_date,notes');
  for (const line of lines.slice(1)) {
    // Notes are quoted because they contain commas; count columns outside quotes.
    const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).filter(c => c !== '');
    assert.equal(cols.length, 7, line);
    assert.match(line, /@example\.org/, 'emails use the reserved example.org domain');
    assert.match(line, /807-555-01\d\d/, 'phone numbers use the reserved 555-01xx range');
  }
});

test('EXIF segment is a well-formed APP1 block', () => {
  const seg = buildExifSegment(SAMPLE_PHOTO_EXIF);
  assert.equal(seg[0], 0xff);
  assert.equal(seg[1], 0xe1);
  assert.equal((seg[2] << 8) | seg[3], seg.length - 2, 'length field counts itself, not the marker');
  assert.equal(new TextDecoder().decode(seg.slice(4, 10)), 'Exif\0\0');
});

test('insertExif places the segment right after SOI and keeps the rest', () => {
  const seg = buildExifSegment(SAMPLE_PHOTO_EXIF);
  const out = insertExif(MINIMAL_JPEG, seg);
  assert.equal(out.length, MINIMAL_JPEG.length + seg.length);
  assert.deepEqual([...out.slice(0, 2)], [0xff, 0xd8]);
  assert.deepEqual([...out.slice(2, 4)], [0xff, 0xe1]);
  assert.deepEqual([...out.slice(-2)], [0xff, 0xd9]);
  assert.throws(() => insertExif(new Uint8Array([1, 2, 3]), seg), /not a JPEG/);
});

test('exifr reads back the fake GPS position, camera and date', async () => {
  const out = insertExif(MINIMAL_JPEG, buildExifSegment(SAMPLE_PHOTO_EXIF));
  const data = await exifr.parse(Buffer.from(out), { gps: true, tiff: true, exif: true, ifd0: true });
  assert.ok(Math.abs(data.latitude - SAMPLE_PHOTO_EXIF.latitude) < 1e-4, `latitude ${data.latitude}`);
  assert.ok(Math.abs(data.longitude - SAMPLE_PHOTO_EXIF.longitude) < 1e-4, `longitude ${data.longitude}`);
  assert.equal(data.Make, SAMPLE_PHOTO_EXIF.make);
  assert.equal(data.Model, SAMPLE_PHOTO_EXIF.model);
  assert.equal(data.Software, SAMPLE_PHOTO_EXIF.software);
  assert.ok(data.DateTimeOriginal instanceof Date, 'DateTimeOriginal parsed as a date');
});
