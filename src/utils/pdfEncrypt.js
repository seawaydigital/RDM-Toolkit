import {
  PDFDocument, PDFDict, PDFArray, PDFName, PDFRef, PDFString, PDFHexString, PDFStream,
  PDFCatalog, PDFPageTree, PDFPageLeaf, PDFInvalidObject, EncryptedPDFError,
} from '@cantoo/pdf-lib';

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Mirrors the `shouldNotCompress` predicate in @cantoo/pdf-lib 2.11.1's
 * PDFStreamWriter: these objects are written outside object streams, so
 * nothing the writer does encrypts the strings they hold.
 */
function isWrittenOutsideObjectStreams(ref, obj) {
  return obj instanceof PDFStream
    || obj instanceof PDFInvalidObject
    || obj instanceof PDFCatalog
    || obj instanceof PDFPageTree
    || obj instanceof PDFPageLeaf
    || ref.generationNumber !== 0
    || (obj instanceof PDFDict && obj.lookup(PDFName.of('Type')) === PDFName.of('Sig'));
}

// Replace every string in a dict/array tree (direct objects only) with its
// encrypted form. A signature dictionary's /Contents is exempt (ISO 32000-2
// 7.6.2); indirect references are left for their own object's pass.
function encryptStringsIn(obj, encryptFn, isSig) {
  const encryptValue = (value, key) => {
    if (isSig && key === PDFName.of('Contents')) return null;
    if (value instanceof PDFString || value instanceof PDFHexString) {
      return PDFHexString.of(toHex(encryptFn(value.asBytes())));
    }
    encryptStringsIn(value, encryptFn, false);
    return null;
  };
  if (obj instanceof PDFDict) {
    for (const [key, value] of obj.entries()) {
      const encrypted = encryptValue(value, key);
      if (encrypted) obj.set(key, encrypted);
    }
  } else if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) {
      const encrypted = encryptValue(obj.get(i), null);
      if (encrypted) obj.set(i, encrypted);
    }
  }
}

/**
 * @cantoo/pdf-lib 2.11.1 encrypts stream contents and object streams, but
 * writes the Catalog, page tree, pages, signature dictionaries, objects with a
 * non-zero generation and every stream dictionary outside object streams with
 * their strings untouched: page labels, direct annotation comments and
 * authors, signer names, a generation-1 Info dictionary. Encrypt those strings
 * here, after encrypt() and before save(). Objects that go into an object
 * stream are skipped, since the stream's own encryption covers them and a
 * second pass would garble them. Security audit 2026-10-22, finding C9.
 */
function encryptStringsOutsideObjectStreams(pdfDoc) {
  const ctx = pdfDoc.context;
  const encryptRef = ctx.trailerInfo.Encrypt;
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (ref === encryptRef || !isWrittenOutsideObjectStreams(ref, obj)) continue;
    // pdf-lib writes an object it could not parse back as raw bytes, so any
    // text inside it cannot be encrypted.
    if (obj instanceof PDFInvalidObject) {
      throw new Error('VERIFY: the PDF contains damaged objects whose text could not be encrypted. Re-save it (for example File → Print → Save as PDF) and try again');
    }
    const isSig = obj instanceof PDFDict && obj.lookup(PDFName.of('Type')) === PDFName.of('Sig');
    const encryptFn = ctx.security.getEncryptFn(ref.objectNumber, ref.generationNumber);
    encryptStringsIn(obj instanceof PDFStream ? obj.dict : obj, encryptFn, isSig);
  }
}

/** 48 hex chars from the CSPRNG — used when the caller leaves the owner password blank. */
export function randomOwnerPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

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
 * Objects the writer keeps outside object streams get their strings encrypted
 * by encryptStringsOutsideObjectStreams() (audit C9, 2026-10-23).
 *
 * A direct trailer /Info dictionary is promoted to an indirect object first,
 * because the trailer is never encrypted.
 *
 * A blank owner password gets a random one, so the permission flags are
 * actually enforced by readers (an owner password equal to the open password
 * grants full access to anyone who can open the file).
 */
export async function encryptPdfBytes(bytes, { userPassword, ownerPassword, permissions }) {
  if (!userPassword) {
    throw new Error('A user (open) password is required to encrypt a PDF.');
  }
  const pdfDoc = await PDFDocument.load(bytes.slice());

  // A direct /Info dictionary in the trailer would be written into the new
  // cross-reference stream dictionary, which is never encrypted. Promote it to
  // an indirect object so it lands inside an encrypted object stream.
  // An already-indirect Info is a PDFRef (not a PDFDict) and is skipped.
  const info = pdfDoc.context.trailerInfo.Info;
  if (info instanceof PDFDict) {
    pdfDoc.context.trailerInfo.Info = pdfDoc.context.register(info);
  }

  pdfDoc.encrypt({
    userPassword,
    ownerPassword: ownerPassword || randomOwnerPassword(),
    permissions,
  });
  encryptStringsOutsideObjectStreams(pdfDoc);
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
 * Also restores the original /Info dictionary reference found in the stale
 * trailer: the decrypting parse mints a fresh Info dict, so Title/Author/
 * Keywords would otherwise be lost on unlock. Returns human-readable labels
 * of what was removed (for tests/UI).
 */
export function purgeStaleEncryptionArtifacts(pdfDoc) {
  const ctx = pdfDoc.context;
  const removed = [];
  let originalInfoRef = null;

  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFInvalidObject) {
      const raw = new TextDecoder('latin1').decode(obj.data);
      const text = raw.slice(0, raw.indexOf('stream') === -1 ? raw.length : raw.indexOf('stream'));
      if (!/\/Type\s*\/XRef/.test(text)) continue;
      const info = text.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
      // Last match wins: objects enumerate in ascending number order, and the
      // most recent trailer of a /Prev chain is normally the highest-numbered.
      if (info) originalInfoRef = PDFRef.of(Number(info[1]), Number(info[2]));
      ctx.delete(ref);
      removed.push('stale cross-reference stream');
      continue;
    }
    const isEncryptDict = obj instanceof PDFDict
      && String(obj.lookup(PDFName.of('Filter'))) === '/Standard'
      && obj.has(PDFName.of('O')) && obj.has(PDFName.of('U'));
    if (isEncryptDict) {
      ctx.delete(ref);
      removed.push('encryption dictionary');
    }
  }

  const originalInfo = originalInfoRef ? ctx.lookup(originalInfoRef) : undefined;
  if (originalInfo instanceof PDFDict && !originalInfo.has(PDFName.of('Type'))) {
    ctx.trailerInfo.Info = originalInfoRef;
  }
  // pdf-lib already drops trailerInfo.Encrypt on a successful password load;
  // belt-and-braces for any future parser path that does not.
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
  // Plain save(): pdf-lib picks object streams from the file's own header
  // (and refuses them for PDF/A-1). Forcing them rewrote every pre-1.5 PDF to
  // 1.7 and could throw on PDF/A-1 input.
  const out = await pdfDoc.save();
  try {
    await PDFDocument.load(out.slice());
  } catch {
    throw new Error('VERIFY: the unlocked output could not be reopened');
  }
  return out;
}
