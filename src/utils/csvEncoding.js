/**
 * Encoding detection and decoding for CSV Encoding Fixer. Pure functions so
 * node can test them (tests/csvEncoding.test.mjs).
 *
 * detectEncoding(bytes) → { encoding, decoder, hasBOM, bomLength, needsFix }
 *   encoding — label shown to the user
 *   decoder  — a TextDecoder label: 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252'
 *   needsFix — true when the file is not already UTF-8
 */

const SAMPLE_BYTES = 4096;

function hasBom(bytes, ...marker) {
  return bytes.length >= marker.length && marker.every((b, i) => bytes[i] === b);
}

// UTF-16 text that is mostly Latin script has a zero in every other byte.
function guessUtf16WithoutBom(bytes) {
  const n = Math.min(bytes.length - (bytes.length % 2), 200);
  if (n < 4) return null;
  let zeroEven = 0;
  let zeroOdd = 0;
  for (let i = 0; i < n; i += 2) {
    if (bytes[i] === 0) zeroEven++;
    if (bytes[i + 1] === 0) zeroOdd++;
  }
  const pairs = n / 2;
  if (zeroOdd / pairs > 0.4 && zeroEven / pairs < 0.1) return 'utf-16le';
  if (zeroEven / pairs > 0.4 && zeroOdd / pairs < 0.1) return 'utf-16be';
  return null;
}

function isValidUtf8(bytes, length) {
  for (let i = 0; i < length; i++) {
    const b = bytes[i];
    if (b < 0x80) continue;
    let continuation;
    if ((b & 0xe0) === 0xc0) continuation = 1;
    else if ((b & 0xf0) === 0xe0) continuation = 2;
    else if ((b & 0xf8) === 0xf0) continuation = 3;
    else return false;
    for (let j = 0; j < continuation; j++) {
      i++;
      // A sequence cut off by the end of the sample is not evidence of bad UTF-8.
      if (i >= length) return true;
      if ((bytes[i] & 0xc0) !== 0x80) return false;
    }
  }
  return true;
}

export function detectEncoding(bytes) {
  if (hasBom(bytes, 0xef, 0xbb, 0xbf)) {
    return { encoding: 'UTF-8 (with BOM)', decoder: 'utf-8', hasBOM: true, bomLength: 3, needsFix: false };
  }
  if (hasBom(bytes, 0xff, 0xfe)) {
    return { encoding: 'UTF-16 LE', decoder: 'utf-16le', hasBOM: true, bomLength: 2, needsFix: true };
  }
  if (hasBom(bytes, 0xfe, 0xff)) {
    return { encoding: 'UTF-16 BE', decoder: 'utf-16be', hasBOM: true, bomLength: 2, needsFix: true };
  }

  const utf16 = guessUtf16WithoutBom(bytes);
  if (utf16) {
    return {
      encoding: utf16 === 'utf-16le' ? 'UTF-16 LE (no BOM, likely)' : 'UTF-16 BE (no BOM, likely)',
      decoder: utf16, hasBOM: false, bomLength: 0, needsFix: true,
    };
  }

  const length = Math.min(bytes.length, SAMPLE_BYTES);
  let highBytes = 0;
  let cp1252Only = 0; // 0x80–0x9F: printable in Windows-1252, control codes in Latin-1
  for (let i = 0; i < length; i++) {
    if (bytes[i] >= 0x80) highBytes++;
    if (bytes[i] >= 0x80 && bytes[i] <= 0x9f) cp1252Only++;
  }

  if (highBytes === 0) {
    return { encoding: 'ASCII / UTF-8', decoder: 'utf-8', hasBOM: false, bomLength: 0, needsFix: false };
  }
  if (isValidUtf8(bytes, length)) {
    return { encoding: 'UTF-8 (no BOM)', decoder: 'utf-8', hasBOM: false, bomLength: 0, needsFix: false };
  }
  // Latin-1 and Windows-1252 differ only in 0x80–0x9F, so both use the same
  // decoder; only the label differs.
  return {
    encoding: cp1252Only > 0 ? 'Windows-1252 (likely)' : 'ISO-8859-1 / Latin-1 (likely)',
    decoder: 'windows-1252', hasBOM: false, bomLength: 0, needsFix: true,
  };
}

// Windows-1252's 0x80–0x9F block (curly quotes, dashes, €). Mapped by hand
// because Node's TextDecoder treats 'windows-1252' as Latin-1 and returns
// control characters there, while browsers follow WHATWG — this keeps the tool
// and its tests in agreement. Unassigned bytes (0x81, 0x8D, 0x8F, 0x90, 0x9D)
// pass through unchanged.
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

function decodeWindows1252(bytes) {
  let out = '';
  for (const b of bytes) out += String.fromCharCode(CP1252_HIGH[b] ?? b);
  return out;
}

export function decodeBytes(bytes, detected) {
  const body = bytes.subarray(detected.bomLength);
  if (detected.decoder === 'windows-1252') return decodeWindows1252(body);
  return new TextDecoder(detected.decoder).decode(body);
}

/** UTF-8 bytes, optionally with a byte-order mark (Excel uses it to recognise UTF-8). */
export function encodeUtf8(text, { bom = false } = {}) {
  const body = new TextEncoder().encode(text);
  if (!bom) return body;
  const out = new Uint8Array(body.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(body, 3);
  return out;
}
