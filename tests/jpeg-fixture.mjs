// Shared JPEG fixture for the metadata tests (not a test file itself).
import { buildExifSegment, SAMPLE_PHOTO_EXIF } from '../src/utils/sampleFiles.js';

const ascii = (s) => [...Buffer.from(s, 'latin1')];
const seg = (marker, payload) => {
  const len = payload.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...payload];
};

// What a phone or camera JPEG carries. The pieces a decoder needs (JFIF,
// ICC profile, Adobe colour transform, tables, frame, scans) must survive;
// everything that describes the photographer, device, place or time must not.
export const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
export const APP0 = seg(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
export const EXIF = [...buildExifSegment(SAMPLE_PHOTO_EXIF)];
const XMP = seg(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>XMPPHOTOGRAPHER</x:xmpmeta>'));
const ICC = seg(0xe2, [...ascii('ICC_PROFILE\0'), 1, 1, ...ascii('FAKEICCPROFILE')]);
const MPF = seg(0xe2, ascii('MPF\0MPFINDEX'));
const IPTC = seg(0xed, ascii('Photoshop 3.0\x008BIM IPTCBYLINE'));
const ADOBE = seg(0xee, [...ascii('Adobe'), 0, 100, 0, 0, 0, 0, 1]);
const COM = seg(0xfe, ascii('COMMENTSECRET'));
const DQT = seg(0xdb, [0, ...new Array(64).fill(1)]);
const SOF0 = seg(0xc0, [8, 0, 1, 0, 1, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0]);
const DHT = seg(0xc4, [0, ...new Array(16).fill(0)]);
const SOS = seg(0xda, [3, 1, 0, 2, 0, 3, 0, 0, 63, 0]);
// Entropy-coded data with a stuffed 0xFF and a restart marker, which are
// part of the scan and must not be read as segment boundaries.
const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56];
const MID_COM = seg(0xfe, ascii('MIDSCANCOMMENT'));
// Phones append a second full JPEG (the MPF preview) after EOI, with its own EXIF.
const TRAILER = [...SOI, ...EXIF, ...EOI];

export const PHOTO = new Uint8Array([
  ...SOI, ...APP0, ...EXIF, ...XMP, ...ICC, ...MPF, ...IPTC, ...ADOBE, ...COM,
  ...DQT, ...SOF0, ...DHT, ...SOS, ...SCAN, ...MID_COM, ...SOS, ...SCAN, ...EOI, ...TRAILER,
]);
export const EXPECTED = new Uint8Array([
  ...SOI, ...APP0, ...ICC, ...ADOBE, ...DQT, ...SOF0, ...DHT, ...SOS, ...SCAN, ...SOS, ...SCAN, ...EOI,
]);
export const MARKERS = ['Exif\0\0', 'XMPPHOTOGRAPHER', 'MPFINDEX', 'IPTCBYLINE', 'COMMENTSECRET', 'MIDSCANCOMMENT'];
