// Remove identifying metadata from JPEG bytes without re-encoding the image.
//
// A PDF stores a JPEG as a DCTDecode stream byte for byte, so whatever a
// camera or phone wrote into the file (EXIF with GPS position, camera serial
// and capture time; XMP; Photoshop/IPTC captions and bylines; comments; the
// MPF preview image phones append after the end-of-image marker) travels into
// the PDF too. This walks the segment structure and drops those parts, keeping
// only what a decoder needs: JFIF (APP0), the ICC colour profile (APP2
// "ICC_PROFILE"), the Adobe colour transform (APP14), tables, frame and scans.
//
// Returns { bytes, removed } — `removed` lists what was dropped, empty when
// the photo was already clean (then `bytes` equals the input). Returns null
// when the input is not a JPEG this can parse safely; callers must then
// re-encode the image instead of embedding the original bytes.

const ICC_ID = 'ICC_PROFILE\0';

function startsWith(bytes, offset, id) {
  if (offset + id.length > bytes.length) return false;
  for (let i = 0; i < id.length; i++) {
    if (bytes[offset + i] !== id.charCodeAt(i)) return false;
  }
  return true;
}

/** Why a segment is dropped, or null to keep it. */
function dropReason(marker, bytes, payloadStart) {
  if (marker === 0xfe) return 'comments';
  if (marker === 0xe1) {
    if (startsWith(bytes, payloadStart, 'Exif\0')) return 'EXIF (camera, date, GPS)';
    if (startsWith(bytes, payloadStart, 'http://ns.adobe.com/')) return 'XMP';
    return 'other APP segments';
  }
  if (marker === 0xe2) return startsWith(bytes, payloadStart, ICC_ID) ? null : 'other APP segments';
  if (marker === 0xed) return 'IPTC/Photoshop';
  if (marker === 0xe0 || marker === 0xee) return null;
  if (marker >= 0xe3 && marker <= 0xef) return 'other APP segments';
  return null;
}

/** Index just past the entropy-coded data that starts at `pos`. */
function endOfScan(bytes, pos) {
  while (pos < bytes.length - 1) {
    if (bytes[pos] !== 0xff) { pos += 1; continue; }
    const next = bytes[pos + 1];
    // 0xFF00 is a stuffed byte, 0xFFD0–D7 a restart marker, 0xFFFF fill:
    // all part of the scan. Anything else starts the next segment.
    if (next === 0x00 || (next >= 0xd0 && next <= 0xd7) || next === 0xff) { pos += next === 0xff ? 1 : 2; continue; }
    return pos;
  }
  return -1;
}

export function stripJpegMetadata(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const kept = [bytes.subarray(0, 2)];
  const removed = new Set();
  let pos = 2;
  let sawScan = false;

  for (;;) {
    if (pos + 1 >= bytes.length || bytes[pos] !== 0xff) return null;
    while (bytes[pos + 1] === 0xff) pos += 1; // fill bytes before a marker
    if (pos + 1 >= bytes.length) return null;
    const marker = bytes[pos + 1];

    if (marker === 0xd9) {
      if (!sawScan) return null;
      kept.push(bytes.subarray(pos, pos + 2));
      if (pos + 2 < bytes.length) removed.add('data after end of image');
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) return null; // no standalone markers here

    if (pos + 4 > bytes.length) return null;
    const length = (bytes[pos + 2] << 8) | bytes[pos + 3];
    const segmentEnd = pos + 2 + length;
    if (length < 2 || segmentEnd > bytes.length) return null;

    if (marker === 0xda) {
      const scanEnd = endOfScan(bytes, segmentEnd);
      if (scanEnd < 0) return null;
      kept.push(bytes.subarray(pos, scanEnd));
      sawScan = true;
      pos = scanEnd;
      continue;
    }

    const reason = dropReason(marker, bytes, pos + 4);
    if (reason) removed.add(reason);
    else kept.push(bytes.subarray(pos, segmentEnd));
    pos = segmentEnd;
  }

  if (removed.size === 0) return { bytes, removed: [] };
  const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of kept) { out.set(part, offset); offset += part.length; }
  return { bytes: out, removed: [...removed] };
}
