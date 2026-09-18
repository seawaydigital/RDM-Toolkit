import { PDFDocument } from '@cantoo/pdf-lib';

/**
 * Encrypt a PDF with the standard security handler (AES-256, ISO 32000-2
 * revision 6 — the @cantoo/pdf-lib 2.x default). Returns the encrypted bytes.
 *
 * `bytes` is a Uint8Array. It is copied because callers keep using their
 * buffer afterwards (thumbnail rendering, a second run with a new password).
 *
 * The output MUST be saved with object streams. @cantoo/pdf-lib 2.11.1
 * encrypts stream objects but not bare string objects: with a plain xref
 * table, document metadata (Title/Author), form-field values, annotation
 * text and outline titles sit in the file unencrypted, while conformant
 * readers garble them on open. Inside an object stream those strings are
 * covered by the stream's encryption. Verified 2026-09-18 (see the leak test).
 */
export async function encryptPdfBytes(bytes, { userPassword, ownerPassword, permissions }) {
  if (!userPassword) {
    throw new Error('A user (open) password is required to encrypt a PDF.');
  }
  const pdfDoc = await PDFDocument.load(bytes.slice());
  pdfDoc.encrypt({
    userPassword,
    ownerPassword: ownerPassword || userPassword,
    permissions,
  });
  return pdfDoc.save({ useObjectStreams: true });
}

/**
 * Independent post-save check. Never throws. The download must not be
 * offered unless the bytes carry an /Encrypt dictionary, refuse both a
 * password-less and an empty-password open, and open with the chosen
 * password. This is the guard that would have caught the pdf-lib 1.x silent
 * no-op, and the owner-password-only variant of it.
 */
export async function verifyPdfIsLocked(bytes, { userPassword }) {
  const fail = (reason) => ({ locked: false, reason });

  try {
    const probe = await PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
    if (!probe.isEncrypted) return fail('no /Encrypt dictionary in output');
  } catch {
    return fail('output could not be parsed');
  }

  const mustRefuse = [
    ['no password', {}],
    ['an empty password', { password: '' }],
  ];
  for (const [label, options] of mustRefuse) {
    try {
      await PDFDocument.load(bytes.slice(), options);
    } catch {
      continue; // refused, as required
    }
    return fail(`output opened with ${label}`);
  }

  try {
    await PDFDocument.load(bytes.slice(), { password: userPassword });
  } catch {
    return fail('output did not open with the chosen password');
  }
  return { locked: true, reason: null };
}
