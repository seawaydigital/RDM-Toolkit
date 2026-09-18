import { PDFDocument, PDFDict, PDFStream, PDFName, PDFInvalidObject, EncryptedPDFError } from '@cantoo/pdf-lib';

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
export async function verifyPdfIsLocked(bytes, { userPassword } = {}) {
  const fail = (reason) => ({ locked: false, reason });

  // Each load is a full parse of a file that may be 200 MB, so this does the
  // minimum: an unencrypted output is caught by the "no password" arm below,
  // which makes a separate /Encrypt probe redundant.
  const mustRefuse = [
    ['no password', {}],
    ['an empty password', { password: '' }],
  ];
  for (const [label, options] of mustRefuse) {
    try {
      await PDFDocument.load(bytes.slice(), options);
    } catch (err) {
      if (err instanceof EncryptedPDFError || /encrypt|password/i.test(err?.message || '')) {
        continue; // refused for the right reason
      }
      return fail('output could not be parsed');
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

/**
 * @cantoo/pdf-lib 2.11.1 keeps the original cross-reference stream of a
 * password-decrypted document as an opaque PDFInvalidObject and re-emits it
 * verbatim — stale /Encrypt reference and all — together with the Encrypt
 * dictionary itself. Its own parser then trusts that stale trailer on reopen
 * and reports the file as still encrypted. Delete both before saving. Only the
 * encrypted parse path retains these; a plain xref-stream PDF loads clean.
 * Returns human-readable labels of what was removed (for tests/UI).
 */
export function purgeStaleEncryptionArtifacts(pdfDoc) {
  const ctx = pdfDoc.context;
  const removed = [];
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    const isStaleXref = obj instanceof PDFInvalidObject
      && /\/Type\s*\/XRef/.test(new TextDecoder('latin1').decode(obj.data));
    const isEncryptDict = obj instanceof PDFDict && !(obj instanceof PDFStream)
      && String(obj.get(PDFName.of('Filter'))) === '/Standard'
      && obj.has(PDFName.of('O')) && obj.has(PDFName.of('U'));
    if (isStaleXref || isEncryptDict) {
      ctx.delete(ref);
      removed.push(isStaleXref ? 'stale cross-reference stream' : 'encryption dictionary');
    }
  }
  delete ctx.trailerInfo.Encrypt;
  return removed;
}

/**
 * Open an encrypted PDF with its password and return bytes that open with no
 * password at all. Load errors (wrong password, not a PDF) propagate unchanged
 * so the tool can keep its own messaging. Throws a `VERIFY:` error if the
 * output still refuses a password-less open — never hand such a file out.
 */
export async function removePdfPassword(bytes, password) {
  const pdfDoc = await PDFDocument.load(bytes.slice(), { password });
  purgeStaleEncryptionArtifacts(pdfDoc);
  const out = await pdfDoc.save({ useObjectStreams: true });
  try {
    await PDFDocument.load(out.slice());
  } catch {
    throw new Error('VERIFY: the unlocked output could not be reopened');
  }
  return out;
}
