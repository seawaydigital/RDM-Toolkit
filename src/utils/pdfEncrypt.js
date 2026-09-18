import { PDFDocument } from '@cantoo/pdf-lib';

/**
 * Encrypt a PDF with the standard security handler (AES-256, ISO 32000-2
 * revision 6 — the @cantoo/pdf-lib 2.x default). Returns the encrypted bytes.
 *
 * `bytes` is sliced because pdf-lib may hand the buffer to a worker-style
 * consumer elsewhere; callers keep their original copy.
 */
export async function encryptPdfBytes(bytes, { userPassword, ownerPassword, permissions }) {
  const pdfDoc = await PDFDocument.load(bytes.slice());
  pdfDoc.encrypt({
    userPassword,
    ownerPassword: ownerPassword || userPassword,
    permissions,
  });
  // Object streams are fine with encryption, but plain xref tables open in the
  // widest range of viewers — same choice the rest of the toolkit makes.
  return pdfDoc.save({ useObjectStreams: false });
}

/**
 * Independent post-save check. The download must never be offered unless the
 * bytes (a) carry an /Encrypt dictionary and (b) refuse a password-less open.
 * This is the guard that would have caught the pdf-lib 1.x silent no-op.
 */
export async function verifyPdfIsLocked(bytes) {
  const probe = await PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
  if (!probe.isEncrypted) {
    return { locked: false, reason: 'no /Encrypt dictionary in output' };
  }
  try {
    await PDFDocument.load(bytes.slice());
  } catch {
    return { locked: true, reason: null };
  }
  return { locked: false, reason: 'output opened without a password' };
}
