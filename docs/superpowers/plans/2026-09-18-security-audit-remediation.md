# Security Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four product-integrity defects and four environmental gaps found in the 2026-09-18 full-site security audit, so every protection the site advertises is one it actually delivers.

**Architecture:** Three independent PRs. PR A upgrades `@cantoo/pdf-lib` 1.21.1 → 2.11.1 (the only version with a real `encrypt()`), moves Password Protect PDF's encryption into a Node-testable helper, and adds a post-save lock check that blocks the download if the file is not actually encrypted. PR B fixes the two de-identification tools (strip the XMP stream; delete the unsalted-hash strategy; use the unbiased RNG helper). PR C adds the runtime and repo hardening (frame-buster for GitHub Pages, workflow token permissions, dev-dep override, branch-protection correction, docs).

**Tech Stack:** React 18 / Vite 8 (Rolldown) SPA, `@cantoo/pdf-lib`, Node built-in `node --test` (`npm test`), `scripts/security-audit.mjs` allowlist, `scripts/bundle-integrity.mjs` chunk gate, `gh` CLI.

---

## Fix-or-eliminate decisions (read first)

| Finding | Decision | Why |
|---|---|---|
| Password Protect PDF writes an unencrypted file (pdf-lib 1.21.1 `save()` ignores password options) | **Fix — upgrade to `@cantoo/pdf-lib` 2.11.1 and call `encrypt()`** | Verified in a scratch Node run on 2.11.1: all 13 API calls the toolkit uses pass unchanged, `encrypt()` writes AES-256 revision 6 (`/AESV3`, `/R 6`), output refuses to open without or with a wrong password, and `load({ password })` (Remove PDF Password's path) still works. The tool is cross-linked from How This Works and the Acrobat Alternative page and is a core promise of the site. Gzipped library grows 231 → 252 KB (+9.2%), inside the 10% chunk gate but close to it. **Contingency:** if Task 2's regression pass finds a PDF tool that breaks on 2.x and cannot be fixed the same day, ship Task 1b (hide the tool) alone first. |
| Strip File Metadata leaves the XMP `/Metadata` stream in PDFs | **Fix** | One helper that deletes the catalog `/Metadata`, `/PieceInfo`, embedded files and page-level `/PieceInfo`/`/Thumb`. Small, testable in Node, copy corrected. |
| De-identify "pseudonymized" = unsalted SHA-256 truncated to 8 hex | **Eliminate the strategy** (keep *coded* and *anonymized*) | An unsalted hash of a name can never be made safe; a keyed HMAC would need key-management UI and is functionally what *coded* already provides (consistent pseudonyms + a separately stored secret). Deleting ~20 lines removes the misleading "cannot reverse this" claim. Revisit keyed pseudonymization only if a researcher asks for cross-dataset linkage. |
| Password Generator uses `v % charset.length` | **Fix** | Import `secureRandomIndices()` from `src/utils/crypto.js`; closes CodeQL alert #3. |
| Live site can be framed (GitHub Pages ignores `frame-ancestors` in `<meta>`) | **Fix — JS frame-buster** | Same-origin script, CSP-safe; header-based protection still arrives with the Cloudflare/Netlify fronting in `docs/HANDOFF.md`. |
| `lighthouse.yml` / `codeql.yml` have no top-level `permissions:` | **Fix** | Two-line change each; closes Scorecard alerts #37/#38. |
| `adm-zip` override pinned to 0.6.0 (still vulnerable range) | **Fix** | Patched version is 0.6.1; dev-only. |
| Branch protection weaker than CLAUDE.md claims (0 approvals, no up-to-date requirement) | **Fix settings + correct the doc** | Turn on "require branches up to date"; document honestly that self-merge relies on 0 required approvals. |

**PR grouping:** PR A = Tasks 1–3. PR B = Tasks 4–6. PR C = Tasks 7–9. Each PR must pass `npm run security:audit`, `npm test`, `npm run build`, and the four required CI checks.

---

## File map

| File | Responsibility |
|---|---|
| `src/utils/pdfEncrypt.js` (new) | Pure `encryptPdfBytes()` + `verifyPdfIsLocked()`; no React, no pdfjs, so Node can test it. Imported only by PasswordProtectPDF (Rolldown inlines it — no new chunk). |
| `tests/pdf-encrypt.test.mjs` (new) | Proves output is AES-256 R6, locked, and openable only with the right password. |
| `tests/pdf-lib-surface.test.mjs` (new) | Pins the pdf-lib API surface the 17 PDF tools use; guards future upgrades. |
| `src/tools/pdf/PasswordProtectPDF.jsx` | Calls the helper; blocks the download when verification fails. |
| `src/utils/pdfMetadata.js` (new) | `findPdfIdentityCarriers()` + `stripPdfIdentityMetadata()` + the `removeEntry()`/`deleteDeep()` primitive that purges orphaned objects (pdf-lib serialises everything it holds). Imported by StripFileMetadata and, after Task 4b, CompressPDF. |
| `tests/pdf-metadata.test.mjs` (new) | Proves XMP/PieceInfo/attachments do not survive. |
| `src/tools/privacy/StripFileMetadata.jsx` | Uses the helper; before/after table shows hidden carriers. |
| `src/tools/research/DataAnonymizer.jsx` | Remove the `pseudonymized` strategy and `sha256()`. |
| `src/tools/privacy/PasswordGenerator.jsx` | Use `secureRandomIndices()`. |
| `src/main.jsx` | Frame-buster before render. |
| `package.json`, `package-lock.json`, `scripts/security-audit.mjs` | Dependency bump + allowlist. |
| `.github/workflows/lighthouse.yml`, `codeql.yml`, `bundle-size.yml` | Permissions; chunk-gate allowance if needed. |
| `src/data/toolExplainers.js`, `src/data/toolRegistry.js`, `CLAUDE.md` | Copy that must stop over-claiming. |

---

## PR A — Password Protect PDF actually encrypts

### Task 1: Encryption helper, test-first, then the library upgrade

**Files:**
- Create: `src/utils/pdfEncrypt.js`
- Create: `tests/pdf-encrypt.test.mjs`
- Modify: `package.json` (dependencies), `package-lock.json`
- Modify: `scripts/security-audit.mjs:54`

- [ ] **Step 1: Write the failing test**

Create `tests/pdf-encrypt.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from '@cantoo/pdf-lib';
import { encryptPdfBytes, verifyPdfIsLocked } from '../src/utils/pdfEncrypt.js';

async function samplePdf() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]).drawText('CONFIDENTIAL PATIENT DATA', { x: 50, y: 700, size: 14 });
  return doc.save();
}

const OPTS = {
  userPassword: 'correct horse',
  ownerPassword: 'owner secret',
  permissions: { printing: 'highResolution', copying: false, modifying: false },
};

test('encryptPdfBytes writes an AES-256 revision-6 /Encrypt dictionary', async () => {
  const out = await encryptPdfBytes(await samplePdf(), OPTS);
  const text = new TextDecoder('latin1').decode(out);
  assert.match(text, /\/Encrypt/);
  assert.match(text, /\/AESV3/);
  assert.match(text, /\/R 6\b/);
});

test('encrypted output cannot be opened without a password', async () => {
  const out = await encryptPdfBytes(await samplePdf(), OPTS);
  await assert.rejects(() => PDFDocument.load(out));
});

test('encrypted output opens with the user password and refuses a wrong one', async () => {
  const out = await encryptPdfBytes(await samplePdf(), OPTS);
  const doc = await PDFDocument.load(out, { password: OPTS.userPassword });
  assert.equal(doc.getPageCount(), 1);
  await assert.rejects(() => PDFDocument.load(out, { password: 'wrong' }));
});

test('ownerPassword defaults to the user password when blank', async () => {
  const out = await encryptPdfBytes(await samplePdf(), { ...OPTS, ownerPassword: '' });
  const doc = await PDFDocument.load(out, { password: OPTS.userPassword });
  assert.equal(doc.getPageCount(), 1);
});

test('permissions with printing disabled are accepted', async () => {
  const out = await encryptPdfBytes(await samplePdf(), {
    ...OPTS,
    permissions: { printing: false, copying: false, modifying: false },
  });
  assert.match(new TextDecoder('latin1').decode(out), /\/Encrypt/);
});

test('encryptPdfBytes refuses an empty user password', async () => {
  await assert.rejects(
    async () => encryptPdfBytes(await samplePdf(), { ...OPTS, userPassword: '' }),
    /user \(open\) password/,
  );
});

// @cantoo/pdf-lib 2.11.1 encrypts stream objects but not bare string objects.
// Saved with a plain xref table, Title/Author/form values sit in the file in
// cleartext (as literal strings or UTF-16BE hex). Object streams cover them.
test('no document strings leak into the encrypted bytes', async () => {
  const doc = await PDFDocument.create();
  doc.setTitle('PATIENTROSTER');
  doc.setAuthor('DRSMITH');
  const page = doc.addPage([612, 792]);
  const field = doc.getForm().createTextField('diagnosis');
  field.setText('HIVPOSITIVE');
  field.addToPage(page, { x: 50, y: 600, width: 200, height: 20 });
  const out = await encryptPdfBytes(await doc.save(), OPTS);
  const text = new TextDecoder('latin1').decode(out);
  const utf16Hex = (s) => Array.from(s).map((c) => c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()).join('');
  for (const secret of ['PATIENTROSTER', 'DRSMITH', 'HIVPOSITIVE']) {
    assert.ok(!text.includes(secret), `${secret} leaked as a literal string`);
    assert.ok(!text.includes(utf16Hex(secret)), `${secret} leaked as UTF-16BE hex`);
  }
  const opened = await PDFDocument.load(out, { password: OPTS.userPassword });
  assert.equal(opened.getForm().getTextField('diagnosis').getText(), 'HIVPOSITIVE');
});

test('verifyPdfIsLocked accepts encrypted output and rejects a plain PDF', async () => {
  const plain = await samplePdf();
  const locked = await encryptPdfBytes(plain, OPTS);
  assert.deepEqual(await verifyPdfIsLocked(locked, { userPassword: OPTS.userPassword }), { locked: true, reason: null });
  const verdict = await verifyPdfIsLocked(plain, { userPassword: OPTS.userPassword });
  assert.equal(verdict.locked, false);
  assert.match(verdict.reason, /opened with no password/);
});

test('verifyPdfIsLocked rejects an owner-only file that opens with an empty password', async () => {
  const doc = await PDFDocument.load(await samplePdf());
  doc.encrypt({ userPassword: '', ownerPassword: 'owner only' });
  const ownerOnly = await doc.save({ useObjectStreams: true });
  const verdict = await verifyPdfIsLocked(ownerOnly, { userPassword: '' });
  assert.equal(verdict.locked, false);
  assert.match(verdict.reason, /empty password/);
});

test('verifyPdfIsLocked reports a wrong expected password and never throws on garbage', async () => {
  const locked = await encryptPdfBytes(await samplePdf(), OPTS);
  const wrong = await verifyPdfIsLocked(locked, { userPassword: 'not it' });
  assert.equal(wrong.locked, false);
  assert.match(wrong.reason, /did not open with the chosen password/);
  const garbage = await verifyPdfIsLocked(new Uint8Array([1, 2, 3, 4]), { userPassword: 'x' });
  assert.equal(garbage.locked, false);
  assert.match(garbage.reason, /could not be parsed/);
  const noOptions = await verifyPdfIsLocked(locked);
  assert.equal(noOptions.locked, false);
});
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run: `npm test -- tests/pdf-encrypt.test.mjs` (or `node --test tests/pdf-encrypt.test.mjs`)
Expected: all 5 FAIL with `Cannot find module '../src/utils/pdfEncrypt.js'`.

- [ ] **Step 3: Write the helper**

Create `src/utils/pdfEncrypt.js`:

```js
import { PDFDocument, EncryptedPDFError } from '@cantoo/pdf-lib';

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
```

- [ ] **Step 4: Run the test again — it must still fail, now because the library cannot encrypt**

Run: `node --test tests/pdf-encrypt.test.mjs`
Expected: FAIL with `pdfDoc.encrypt is not a function` on 4 tests; `verifyPdfIsLocked` test fails on the plain-PDF assertion path as well. This failure is the bug the audit found, captured as a test.

- [ ] **Step 5: Upgrade the library and the allowlist together**

Run:

```bash
npm install --ignore-scripts --save-exact @cantoo/pdf-lib@2.11.1
```

Then edit `scripts/security-audit.mjs` line 54:

```js
  ['@cantoo/pdf-lib', '2.11.1'],
```

Confirm `package.json` now reads `"@cantoo/pdf-lib": "2.11.1"` (exact, no caret). `@pdf-lib/fontkit` stays at 1.1.1 — the 2.x README states it remains compatible and the scratch run confirmed `registerFontkit()` works.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test tests/pdf-encrypt.test.mjs`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 7: Run the project guardrails**

Run:

```bash
npm run security:audit && npm audit signatures && npm audit --omit=dev --audit-level=high && npm test
```

Expected: `Security audit passed for 46 registered tools.`, all signatures verified, `found 0 vulnerabilities`, all tests pass (16 existing + 10 new).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json scripts/security-audit.mjs src/utils/pdfEncrypt.js tests/pdf-encrypt.test.mjs
git commit -m "fix(pdf): real AES-256 encryption via @cantoo/pdf-lib 2.11.1 encrypt()

pdf-lib 1.21.1 save() silently ignored userPassword/ownerPassword, so
Password Protect PDF shipped unencrypted files. Add a Node-tested
encryptPdfBytes() + verifyPdfIsLocked() helper pair.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 1b (contingency only): hide the tool if the upgrade cannot ship today

Skip this task unless Task 2 finds an unfixable regression.

**Files:**
- Modify: `src/data/toolRegistry.js:27`

- [ ] **Step 1: Remove the registry entry** (delete the whole `password-protect-pdf` object on line 27) and remove `'password-protect-pdf'` from the `related:` arrays of `sign-pdf` (line 23) and `remove-pdf-password` (line 28).

- [ ] **Step 2: Remove the lazy import** `'password-protect-pdf': lazy(...)` in `src/App.jsx` and the id from the `PDF_TOOLS` set. Delete `src/tools/pdf/PasswordProtectPDF.jsx` (the audit script fails on unregistered tool files).

- [ ] **Step 3: Run `npm run security:audit`** — expected `Security audit passed for 45 registered tools.` Update the count in `CLAUDE.md` and `index.html` meta descriptions ("46 browser-based tools" → 45), then commit as `fix(pdf): withdraw Password Protect PDF until encryption is real`.

### Task 2: Pin the pdf-lib API surface and regression-check the PDF tools

**Files:**
- Create: `tests/pdf-lib-surface.test.mjs`

- [ ] **Step 1: Write the surface test** (this is the scratch smoke run from the audit, made permanent)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, rgb, degrees } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Every pdf-lib call the 17 PDF tools rely on. If a future upgrade removes or
// renames one of these, this fails before a tool does.

const TINY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

async function sourcePdf() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('hello', { x: 40, y: 700, font, size: 14, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: 10, y: 10, width: 50, height: 50, color: rgb(1, 0, 0) });
  page.setRotation(degrees(90));
  return doc.save({ useObjectStreams: false });
}

test('merge path: load / copyPages / addPage / getRotation', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  const b = await PDFDocument.create();
  const [copied] = await b.copyPages(a, a.getPageIndices());
  b.addPage(copied);
  assert.equal(b.getPageCount(), 1);
  assert.equal(b.getPage(0).getRotation().angle, 90);
});

test('page-inspector resize path: embedPage / drawPage / getSize', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  const c = await PDFDocument.create();
  const embedded = await c.embedPage(a.getPage(0));
  const page = c.addPage([595, 842]);
  page.drawPage(embedded, { x: 0, y: 0, xScale: 0.9, yScale: 0.9 });
  assert.equal(page.getSize().width, 595);
});

test('compress path: enumerateIndirectObjects / PDFRawStream.of / register / assign / obj / stream / catalog.delete', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  let count = 0;
  for (const _entry of a.context.enumerateIndirectObjects()) count += 1;
  assert.ok(count > 3);
  const dict = a.context.obj({ Type: 'Metadata', Subtype: 'XML', Length: 3 });
  const ref = a.context.register(PDFRawStream.of(dict, new TextEncoder().encode('abc')));
  a.catalog.set(PDFName.of('Metadata'), ref);
  assert.ok(a.catalog.has(PDFName.of('Metadata')));
  a.catalog.delete(PDFName.of('Metadata'));
  a.context.assign(ref, PDFRawStream.of(dict, new TextEncoder().encode('xyz')));
  assert.ok(a.context.stream('q Q', { Type: 'XObject' }));
});

test('metadata path: Info dictionary setters and getters', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  a.setTitle(''); a.setAuthor(''); a.setSubject(''); a.setCreator(''); a.setProducer('');
  a.setKeywords([]); a.setCreationDate(new Date(0)); a.setModificationDate(new Date(0));
  assert.equal(a.getTitle(), '');
  assert.equal(a.getAuthor(), '');
});

test('image path: embedPng / drawImage', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  const img = await a.embedPng(TINY_PNG);
  a.getPage(0).drawImage(img, { x: 0, y: 0, width: 10, height: 10 });
  assert.equal((await a.save()).length > 0, true);
});

test('forms path: getForm / createTextField / getFields', async () => {
  const a = await PDFDocument.load(await sourcePdf());
  const form = a.getForm();
  form.createTextField('t1').addToPage(a.getPage(0));
  assert.equal(form.getFields().length, 1);
});

test('remove-password path: load({ password }) and load({ ignoreEncryption })', async () => {
  const e = await PDFDocument.load(await sourcePdf());
  e.encrypt({ userPassword: 'pw' });
  const bytes = await e.save();
  const opened = await PDFDocument.load(bytes, { password: 'pw' });
  assert.equal(opened.getPageCount(), 1);
  const probe = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assert.equal(probe.isEncrypted, true);
});

// KNOWN QUIRK in @cantoo/pdf-lib 2.11.1 (found 2026-09-18): the parser keeps the
// original cross-reference stream of a password-decrypted document as an opaque
// PDFInvalidObject and re-emits it verbatim, stale /Encrypt reference included,
// and its own parser then trusts that stale trailer on reopen. removePdfPassword()
// in src/utils/pdfEncrypt.js purges the artifacts. When this canary fails, the
// library has fixed it and the purge can be retired.
test('canary: plain load({ password }) + save() still carries the stale /Encrypt trailer', async () => {
  const e = await PDFDocument.load(await sourcePdf());
  e.encrypt({ userPassword: 'pw' });
  const locked = await e.save({ useObjectStreams: true });
  const resaved = await (await PDFDocument.load(locked, { password: 'pw' })).save();
  assert.match(new TextDecoder('latin1').decode(resaved), /\/Encrypt \d+ \d+ R/);
  await assert.rejects(() => PDFDocument.load(resaved));
});
```

- [ ] **Step 2: Run it**

Run: `node --test tests/pdf-lib-surface.test.mjs`
Expected: `# pass 8`.

- [ ] **Step 3: Build and check the chunk gate locally**

Run:

```bash
npm run build && node scripts/bundle-integrity.mjs > "$TMP/pr-integrity.json" && node -e "const f=require('$TMP/pr-integrity.json').files.find(x=>x.logicalName.startsWith('pdf-lib'));console.log(f)"
```

(Use the scratchpad path for `$TMP`.) Expected: a build with no new warnings and the `pdf-lib` chunk about 9–10% larger than before (previous raw size is in the CI comment on any recent PR, or build `master` in a temporary worktree and run the same command for a baseline).

Measured 2026-09-18 against a master baseline: `pdf-lib` chunk 489,879 → 566,368 bytes (**+15.6%**, gzip 212 → 245 KB), 69 chunks both sides, no new chunk names. So the 10% gate WILL fail for that one chunk. Do NOT raise the global `--max-growth-pct` (that would let every other chunk grow 19% unnoticed). Instead add a named per-chunk allowance next to `TRANSITION_ALLOWED_NEW_CHUNKS` in `scripts/bundle-integrity.mjs` — `const TRANSITION_ALLOWED_GROWTH_PCT = new Map([['pdf-lib.js', 20]]);` used as `const limitPct = TRANSITION_ALLOWED_GROWTH_PCT.get(logicalName) ?? maxGrowthPct;` in `compareBundles` — with a comment saying it is inert once master's baseline is a 2.x build, and a unit test in `tests/bundle-integrity.test.mjs` proving a 15% `jszip.js` growth is still reported while 15% `pdf-lib.js` passes. The workflow keeps `--max-growth-pct 10`. The Rolldown "chunks larger than 500 kB" build warning now also covers `pdf-lib` (566 kB, lazy-loaded); it is informational.

- [ ] **Step 4: Manual regression pass in a real browser** (the sandboxed agent browser cannot render pdfjs thumbnails — CLAUDE.md known gap #7)

Run `npm run preview` (production build, real headers) and exercise, with any small multi-page PDF, each of: Merge & Rotate PDFs, Split PDF, Compress PDF (smart + aggressive), PDF Page Inspector (resize to A4), Add Cover Page, Add Page Numbers, PDF Watermark, Sign PDF, Fillable PDF Form (add one text field + one signature box, generate), PDF Redaction, Password Protect PDF, Remove PDF Password (open the file produced by Password Protect), Extract Images from PDF, Image to PDF. Record pass/fail per tool in the PR description. Expected: all pass, zero console errors other than the two documented Turndown TrustedHTML notes on `#to-markdown`.

- [ ] **Step 5: Commit**

```bash
git add tests/pdf-lib-surface.test.mjs .github/workflows/bundle-size.yml
git commit -m "test(pdf): pin the pdf-lib API surface the toolkit depends on

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2b: Remove PDF Password must purge pdf-lib's stale encryption artifacts

Found by Task 2's surface test. On 2.11.1, `PDFDocument.load(bytes, { password })` followed by `save()` produces a file that still contains `/Encrypt N 0 R` (the original cross-reference stream is retained as a `PDFInvalidObject` and re-emitted verbatim, and the Encrypt dictionary object is kept) and the 2.x parser then refuses to open it without a password. 1.21.1 emitted the same stale bytes but its parser ignored them, so the tool used to work by accident. Our own Password Protect output now uses cross-reference streams, so without this fix the two tools would not round-trip. Verified fix: delete the Encrypt dictionary and every `PDFInvalidObject` whose bytes contain `/Type /XRef`, then save. A plain, never-encrypted xref-stream PDF loads with zero such artifacts, so no other tool is affected.

**Files:**
- Modify: `src/utils/pdfEncrypt.js` (add two exports)
- Modify: `tests/pdf-encrypt.test.mjs` (three tests)
- Modify: `src/tools/pdf/RemovePDFPassword.jsx:1-12`, `:123-135`
- Modify: `vite.config.js` `manualChunks` (pin the helper into the `pdf-lib` chunk — two lazy tools now import it, and Rolldown would otherwise emit a new shared chunk, which the bundle gate rejects)

- [ ] **Step 1: Failing tests** — append to `tests/pdf-encrypt.test.mjs` (extend the import line to include `removePdfPassword, purgeStaleEncryptionArtifacts`):

```js
test('removePdfPassword yields a file that opens with no password in pdf-lib and pdfjs', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText('HELLOWORLD', { x: 40, y: 700, size: 14 });
  const field = doc.getForm().createTextField('dx');
  field.setText('VAL');
  field.addToPage(page, { x: 50, y: 600, width: 200, height: 20 });
  const locked = await encryptPdfBytes(await doc.save(), OPTS);

  const unlocked = await removePdfPassword(locked, OPTS.userPassword);
  assert.doesNotMatch(new TextDecoder('latin1').decode(unlocked), /\/Encrypt \d+ \d+ R/);
  const reopened = await PDFDocument.load(unlocked);
  assert.equal(reopened.getForm().getTextField('dx').getText(), 'VAL');

  const task = pdfjs.getDocument({ data: unlocked.slice() });
  const pdf = await task.promise;
  try {
    const p1 = await pdf.getPage(1);
    assert.equal((await p1.getTextContent()).items.map((i) => i.str).join(''), 'HELLOWORLD');
    assert.ok((await p1.getAnnotations()).some((a) => a.fieldName === 'dx' && a.fieldValue === 'VAL'));
  } finally {
    await task.destroy();
  }
});

test('removePdfPassword propagates a wrong-password error the tool can recognise', async () => {
  const locked = await encryptPdfBytes(await samplePdf(), OPTS);
  await assert.rejects(() => removePdfPassword(locked, 'wrong'), /password|encrypt|incorrect/i);
});

test('purgeStaleEncryptionArtifacts removes exactly the Encrypt dictionary and stale xref stream', async () => {
  const locked = await encryptPdfBytes(await samplePdf(), OPTS);
  const doc = await PDFDocument.load(locked.slice(), { password: OPTS.userPassword });
  const removed = purgeStaleEncryptionArtifacts(doc);
  assert.deepEqual(removed.sort(), ['encryption dictionary', 'stale cross-reference stream']);
  assert.deepEqual(purgeStaleEncryptionArtifacts(doc), []);
});
```

Run `node --test tests/pdf-encrypt.test.mjs` — expected: 3 failures (`removePdfPassword is not a function` / not exported).

- [ ] **Step 2: Implement** — add to `src/utils/pdfEncrypt.js` (extend the import to `import { PDFDocument, PDFDict, PDFName, PDFRef, PDFInvalidObject, EncryptedPDFError } from '@cantoo/pdf-lib';`). The `removePdfPassword` test also asserts `doc.setTitle('KEEPME')` survives the unlock in both pdf-lib (`getTitle()`) and pdfjs (`getMetadata().info.Title`). Surface test additionally pins `embedJpg` (1×1 JPEG fixture), `catalog.lookupMaybe(Names, PDFDict)`, and the Fillable PDF Form low-level `/Sig` widget path (`ctx.stream`/`ctx.obj`/`ctx.register`, `form.acroForm.addField`, `acroForm.dict.set(SigFlags)`, `page.node.addAnnot`, `PDFString.of`, `PDFNumber.of`) plus `createCheckBox`/`createDropdown`/`createRadioGroup`; pdfjs calls pass `verbosity: 0`; the canary's `assert.rejects` uses `(e) => e instanceof EncryptedPDFError`.

```js
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
  let originalInfoRef = null;

  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFInvalidObject) {
      const text = new TextDecoder('latin1').decode(obj.data);
      if (!/\/Type\s*\/XRef/.test(text)) continue;
      // The stale trailer is the only surviving pointer to the original /Info
      // dictionary: the decrypting parse mints a fresh one, so Title, Author
      // and Keywords would otherwise be lost on unlock.
      const info = text.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
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

  if (originalInfoRef && ctx.lookup(originalInfoRef) instanceof PDFDict) {
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
```

Run the tests — expected 14/14 in `tests/pdf-encrypt.test.mjs`.

- [ ] **Step 3: Wire the tool** — in `src/tools/pdf/RemovePDFPassword.jsx` add `import { removePdfPassword } from '../../utils/pdfEncrypt';` (keep the `PDFDocument` import; the "is it encrypted?" probe still uses it) and replace the standard-encryption branch (`let pdfDoc; try { pdfDoc = await PDFDocument.load(fileBytes.slice(), { password }); } catch (e) {...} pdfBytes = await pdfDoc.save();`) with:

```js
        // Standard PDF encryption via pdf-lib
        try {
          pdfBytes = await removePdfPassword(fileBytes, password);
        } catch (e) {
          if (e.message?.startsWith('VERIFY:')) {
            setError('The unlocked file could not be verified, so it has NOT been offered for download. Please report this.');
            setLoading(false);
            return;
          }
          if (e.message && (e.message.includes('encrypted') || e.message.includes('password') || e.message.includes('incorrect'))) {
            setError('Incorrect password. Please try again.');
            setLoading(false);
            return;
          }
          throw e;
        }
```

- [ ] **Step 4: Keep the chunk set stable** — in `vite.config.js` `manualChunks(id)`, add directly after the `@cantoo/pdf-lib` line:

```js
          // Pure pdf-lib helpers shared by more than one lazy tool. Pinned here so
          // Rolldown does not emit a new shared chunk (the bundle-integrity gate
          // rejects new chunk names).
          if (normalized.includes('/src/utils/pdfEncrypt.js')) return 'pdf-lib';
```

Run `npm run build` and `node scripts/bundle-integrity.mjs` — the chunk list must still have 69 entries and no `pdfEncrypt` chunk.

- [ ] **Step 5: Guardrails and commit**

```bash
npm run security:audit && npm test
git add src/utils/pdfEncrypt.js tests/pdf-encrypt.test.mjs src/tools/pdf/RemovePDFPassword.jsx vite.config.js
git commit -m "fix(pdf): Remove PDF Password purges pdf-lib's stale /Encrypt trailer on 2.x

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Wire the helper into the tool and stop over-claiming

**Files:**
- Modify: `src/tools/pdf/PasswordProtectPDF.jsx:1-15`, `:98-128`, `:137-140`
- Modify: `src/data/toolExplainers.js:100-119`, `:806-808`
- Modify: `CLAUDE.md:243` (dependency table) and the Security Model list

- [ ] **Step 1: Import the helper**

At the top of `src/tools/pdf/PasswordProtectPDF.jsx`, after the existing `import { buildOutputFilename } from '../../utils/filename';` line, add:

```js
import { encryptPdfBytes, verifyPdfIsLocked } from '../../utils/pdfEncrypt';
```

Keep the existing `PDFDocument` import — `handleFilesSelected` still uses it to reject already-encrypted inputs.

- [ ] **Step 2: Replace the encryption block**

Replace lines ~100–118 (from `// Load the PDF with pdf-lib` through the closing `});` of the `pdfDoc.save({...})` call) with:

```js
      const encryptedBytes = await encryptPdfBytes(fileBytes, {
        userPassword,
        ownerPassword: ownerPassword.trim(),
        permissions: {
          printing: printingAllowed ? 'highResolution' : false,
          copying: copyingAllowed,
          modifying: editingAllowed,
        },
      });

      // Independent lock check — never offer a download that is not encrypted.
      const lock = await verifyPdfIsLocked(encryptedBytes, { userPassword });
      if (!lock.locked) {
        throw new Error(`VERIFY: ${lock.reason}`);
      }
```

- [ ] **Step 3: Surface a verification failure honestly**

Replace the `catch (err)` block of `handleProcess` (currently `console.error(...)` + generic `setError`) with:

```js
    } catch (err) {
      console.error('PDF encryption failed:', err);
      if (err?.message?.startsWith('VERIFY:')) {
        setError(`Encryption could not be verified (${err.message.slice(8)}). The file has NOT been offered for download. Please report this.`);
      } else {
        setError('Something went wrong while encrypting the PDF. Please try again.');
      }
    } finally {
```

- [ ] **Step 4: Update the explainer and caveat copy**

In `src/data/toolExplainers.js`, entry `'password-protect-pdf'`:

- line 101 `library:` → `'<code>@cantoo/pdf-lib</code> v2.11.1 (maintained fork of <code>pdf-lib</code>) — AES-256, ISO 32000-2 revision 6.'`
- line 104 flow bullet → `'<code>encrypt({ userPassword, ownerPassword, permissions })</code> is called, then <code>save()</code>. The output is re-opened without a password and must be refused before the download button appears.'`
- line 117 first limitation → `'The output uses AES-256 (PDF 2.0, revision 6). Very old viewers (roughly pre-2010) and some lightweight mobile viewers cannot open revision-6 files; if a recipient reports that, ask them to use Adobe Reader, Chrome, Firefox, or macOS Preview.'`
- add a flow bullet after the `encrypt()` one: `'The file is written with object streams on purpose: the library encrypts streams but not bare strings, so a plain cross-reference save would leave the title, author and form values readable. Do not "harmonise" this save to <code>useObjectStreams: false</code>.'`
- also update the `'remove-pdf-password'` explainer, if present, to mention that the tool now strips the stale encryption dictionary and cross-reference stream the library would otherwise carry over, and verifies the result opens without a password.

In the `TOOL_CAVEATS` map, replace the `'password-protect-pdf'` entry (lines ~806–808) with:

```js
  'password-protect-pdf': [
    'The password is the only key. A short or guessable password can be brute-forced offline; use a generated password of 16+ characters and share it over a different channel than the file.',
  ],
```

- [ ] **Step 5: Update CLAUDE.md** (everything the upgrade made stale)

- Dependency table row → `| \`@cantoo/pdf-lib\` | 2.11.1 | PDF manipulation (merge, split, sign, watermark) + AES-256 R6 encryption via \`encrypt()\` (2.x only — 1.x silently ignored password options). Transitive set changed with 2.x: \`culori\`, \`fflate\`, \`tslib\`, \`node-html-better-parser\` (+ peer \`html-entities\`) in; \`@pdf-lib/standard-fonts\`, \`@pdf-lib/upng\`, \`color\` out (\`pako\` stays for fontkit/jszip). All inlined into the \`pdf-lib\` chunk. Upstream declares open ranges for these (\`>=4\`, \`>=2\`); only \`package-lock.json\` pins them. |`
- Security Model runtime list, add two bullets: `- **Password Protect PDF post-save lock check** — output must refuse a password-less and an empty-password open and must open with the chosen password (\`verifyPdfIsLocked()\`) before the download is offered. Saved with object streams on purpose: pdf-lib 2.11.1 encrypts streams but not bare string objects, so a plain-xref save leaks Title/Author/form values in cleartext (covered by a byte-level leak test).` and `- **Remove PDF Password purges pdf-lib's stale encryption artifacts** — 2.x re-emits the original xref stream (with its \`/Encrypt\` reference) and the Encrypt dictionary after a password load and then treats the re-saved file as still encrypted; \`removePdfPassword()\` deletes both and verifies a password-less reopen.`
- Known gaps #4 (pdf-lib AcroForm serializer): re-check on 2.x by running Fillable PDF Form → Merge in the browser pass (Task 2 Step 4). If 2.x fixed it, note that and leave the caveats in place until a separate PR verifies; if not, leave the text unchanged.
- Manual Chunks section: add `src/utils/pdfEncrypt.js` (and later `pdfMetadata.js`) to the \`pdf-lib\` chunk description.
- Local scripts table: add the three new test files.
- Recent Changes row dated 2026-09-18 describing the defect (every file the tool produced before this fix is unencrypted), the upgrade, the object-stream leak finding, the Remove PDF Password regression + fix, the temporary 20% bundle allowance, and the new tests.

- [ ] **Step 6: Verify in the preview build**

Run `npm run build && npm run preview`. In Password Protect PDF, protect a PDF with password `test1234`, download, then open the download in Remove PDF Password: it must prompt for a password, refuse `wrong`, and accept `test1234`. Also open the downloaded file directly in Chrome or Adobe Reader: it must prompt for a password.

- [ ] **Step 7: Run everything and commit**

```bash
npm run security:audit && npm test && npm run build
git add src/tools/pdf/PasswordProtectPDF.jsx src/data/toolExplainers.js CLAUDE.md
git commit -m "fix(pdf): Password Protect PDF verifies the output is locked before offering it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Open PR A. Title: `fix(pdf): Password Protect PDF was writing unencrypted files`. Body must state plainly that every file produced by this tool before the fix is unencrypted, so users who relied on it should re-protect and re-send.

---

## PR B — De-identification tools do what they say

### Task 4: Strip the XMP stream and other identity carriers from PDFs

**Files:**
- Create: `src/utils/pdfMetadata.js`
- Create: `tests/pdf-metadata.test.mjs`
- Modify: `src/tools/privacy/StripFileMetadata.jsx:1-11`, `:42-71`, `:196-212`
- Modify: `src/data/toolExplainers.js:224`, `:230`, `:242`, `:816-818`

- [ ] **Step 1: Write the failing test**

Create `tests/pdf-metadata.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFRawStream } from '@cantoo/pdf-lib';
import { findPdfIdentityCarriers, stripPdfIdentityMetadata } from '../src/utils/pdfMetadata.js';

const XMP = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator><rdf:Seq><rdf:li>Dr Jane XMPAUTHOR</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
const ATTACHMENT = 'ATTACH-PAYLOAD interview notes';

// A PDF the way Word/Acrobat emit it: Info dict + XMP stream (indirect) +
// PieceInfo + an embedded-file attachment whose payload is its own stream +
// a page thumbnail stream. Every carrier is an INDIRECT object on purpose:
// pdf-lib serialises every object it holds, so deleting only the reference
// leaves the bytes in the file. The helper must delete the objects too.
async function identityLadenPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  page.drawText('body text', { x: 40, y: 700 });
  doc.setAuthor('Dr Jane INFOAUTHOR');

  const ctx = doc.context;
  const xmpDict = ctx.obj({ Type: 'Metadata', Subtype: 'XML', Length: XMP.length });
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(PDFRawStream.of(xmpDict, new TextEncoder().encode(XMP))));

  doc.catalog.set(PDFName.of('PieceInfo'), ctx.register(ctx.obj({ AcmeApp: { LastModified: 'D:20260101' } })));
  page.node.set(PDFName.of('PieceInfo'), ctx.register(ctx.obj({ AcmeApp: { LastModified: 'D:20260101' } })));
  page.node.set(PDFName.of('Thumb'), ctx.register(PDFRawStream.of(ctx.obj({ Length: 10 }), new TextEncoder().encode('THUMBBYTES'))));

  const payload = ctx.register(PDFRawStream.of(ctx.obj({ Type: 'EmbeddedFile', Length: ATTACHMENT.length }), new TextEncoder().encode(ATTACHMENT)));
  const filespec = ctx.register(ctx.obj({ Type: 'Filespec', F: 'notes.txt', EF: { F: payload } }));
  doc.catalog.set(PDFName.of('Names'), ctx.obj({ EmbeddedFiles: { Names: ['notes.txt', filespec] } }));
  return doc.save();
}

test('findPdfIdentityCarriers reports XMP, PieceInfo, attachments and page carriers', async () => {
  const doc = await PDFDocument.load(await identityLadenPdf());
  const found = findPdfIdentityCarriers(doc);
  assert.ok(found.some((f) => /XMP/.test(f)), found.join(', '));
  assert.ok(found.some((f) => /PieceInfo/.test(f)), found.join(', '));
  assert.ok(found.some((f) => /attachments/.test(f)), found.join(', '));
  assert.ok(found.some((f) => /page-level/.test(f)), found.join(', '));
});

test('stripPdfIdentityMetadata removes every carrier AND its bytes; the result reloads clean', async () => {
  const doc = await PDFDocument.load(await identityLadenPdf());
  const removed = stripPdfIdentityMetadata(doc);
  assert.ok(removed.length >= 4, removed.join(', '));
  for (const useObjectStreams of [false, true]) {
    const out = await doc.save({ useObjectStreams });
    const text = new TextDecoder('latin1').decode(out);
    assert.doesNotMatch(text, /XMPAUTHOR/, `xmp survived (objectStreams=${useObjectStreams})`);
    assert.doesNotMatch(text, /INFOAUTHOR/);
    assert.doesNotMatch(text, /ATTACH-PAYLOAD/, 'attachment payload survived');
    assert.doesNotMatch(text, /THUMBBYTES/, 'thumbnail survived');
    const reloaded = await PDFDocument.load(out);
    assert.deepEqual(findPdfIdentityCarriers(reloaded), []);
    assert.equal(reloaded.getAuthor() ?? '', '');
    assert.equal(reloaded.getPageCount(), 1);
  }
});

test('stripPdfIdentityMetadata is a no-op on a clean PDF', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const removed = stripPdfIdentityMetadata(doc);
  assert.deepEqual(removed, ['Info dictionary']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/pdf-metadata.test.mjs`
Expected: FAIL with `Cannot find module '../src/utils/pdfMetadata.js'`.

- [ ] **Step 3: Write the helper**

Create `src/utils/pdfMetadata.js`:

```js
import { PDFName, PDFDict, PDFArray, PDFRef, PDFStream } from '@cantoo/pdf-lib';

// Everything in a PDF, other than the visible page content, that can carry
// the author's identity or tool history. The Info dictionary is the one most
// people know; XMP (/Metadata) is the one Word, Acrobat and LibreOffice
// actually fill in, and pdf-lib's setAuthor('') never touches it.
//
// IMPORTANT: pdf-lib serialises every indirect object in its context whether
// or not anything still references it. Deleting the catalog KEY alone leaves
// the XMP stream bytes in the output (verified 2026-09-18). So each removal
// also walks the subtree and deletes the indirect objects themselves.

const CATALOG_CARRIERS = [
  ['Metadata', 'XMP metadata stream'],
  ['PieceInfo', 'application PieceInfo'],
];
const PAGE_CARRIERS = ['PieceInfo', 'Thumb'];

function embeddedFilesDict(pdfDoc) {
  const names = pdfDoc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  return names && names.has(PDFName.of('EmbeddedFiles')) ? names : null;
}

/** Delete `value` and every indirect object reachable from it. Cycle-safe. */
function deleteDeep(ctx, value, seen = new Set()) {
  if (value instanceof PDFRef) {
    if (seen.has(value.tag)) return;
    seen.add(value.tag);
    const target = ctx.lookup(value);
    ctx.delete(value);
    if (target) deleteDeep(ctx, target, seen);
    return;
  }
  if (value instanceof PDFStream) {
    deleteDeep(ctx, value.dict, seen);
    return;
  }
  if (value instanceof PDFDict) {
    for (const [, entry] of value.entries()) deleteDeep(ctx, entry, seen);
    return;
  }
  if (value instanceof PDFArray) {
    for (const entry of value.asArray()) deleteDeep(ctx, entry, seen);
  }
}

/** Remove `key` from `dict` and purge whatever it pointed at. */
function removeEntry(ctx, dict, key) {
  const name = PDFName.of(key);
  if (!dict.has(name)) return false;
  const value = dict.get(name);
  dict.delete(name);
  deleteDeep(ctx, value);
  return true;
}

/** Human-readable list of identity carriers present in a loaded document. */
export function findPdfIdentityCarriers(pdfDoc) {
  const found = [];
  for (const [key, label] of CATALOG_CARRIERS) {
    if (pdfDoc.catalog.has(PDFName.of(key))) found.push(label);
  }
  if (embeddedFilesDict(pdfDoc)) found.push('embedded file attachments');
  let pages = 0;
  for (const page of pdfDoc.getPages()) {
    if (PAGE_CARRIERS.some((key) => page.node.has(PDFName.of(key)))) pages += 1;
  }
  if (pages) found.push(`page-level PieceInfo/thumbnails (${pages} page${pages === 1 ? '' : 's'})`);
  return found;
}

/**
 * Remove the Info dictionary values and every carrier above, in place.
 * Returns the list of what was removed so the UI can show it.
 */
export function stripPdfIdentityMetadata(pdfDoc) {
  const removed = [];

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));
  removed.push('Info dictionary');

  const ctx = pdfDoc.context;

  for (const [key, label] of CATALOG_CARRIERS) {
    if (removeEntry(ctx, pdfDoc.catalog, key)) removed.push(label);
  }

  const names = embeddedFilesDict(pdfDoc);
  if (names && removeEntry(ctx, names, 'EmbeddedFiles')) {
    removed.push('embedded file attachments');
  }

  let pages = 0;
  for (const page of pdfDoc.getPages()) {
    let hit = false;
    for (const key of PAGE_CARRIERS) {
      if (removeEntry(ctx, page.node, key)) hit = true;
    }
    if (hit) pages += 1;
  }
  if (pages) removed.push(`page-level PieceInfo/thumbnails (${pages} page${pages === 1 ? '' : 's'})`);

  return removed;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/pdf-metadata.test.mjs`
Expected: `# pass 3`. The byte-level assertions are the important ones: a version of this helper that only deletes the dictionary keys passes the structural checks and fails `xmp survived` — that exact failure was reproduced during planning.

- [ ] **Step 5: Wire it into the tool**

In `src/tools/privacy/StripFileMetadata.jsx`:

Add the import after line 11:

```js
import { findPdfIdentityCarriers, stripPdfIdentityMetadata } from '../../utils/pdfMetadata';
```

Replace `readPDFMetadata` (lines 42–58) with:

```js
async function readPDFMetadata(bytes) {
  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const carriers = findPdfIdentityCarriers(pdfDoc);
    return {
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      keywords: pdfDoc.getKeywords() || '',
      creationDate: pdfDoc.getCreationDate()?.toISOString() || '',
      modificationDate: pdfDoc.getModificationDate()?.toISOString() || '',
      'hidden carriers': carriers.length ? carriers.join(', ') : '',
    };
  } catch {
    return null;
  }
}
```

Replace `stripPDFMetadata` (lines 60–71) with:

```js
async function stripPDFMetadata(bytes) {
  const pdfDoc = await PDFDocument.load(bytes);
  stripPdfIdentityMetadata(pdfDoc);
  return await pdfDoc.save();
}
```

The existing `MetadataTable` already renders any non-empty key, so the new `hidden carriers` row appears in "Before" and disappears in "After" with no further UI change. Change the badge text on line ~209 from `PDF metadata cleared` to `Info dictionary and XMP cleared`.

- [ ] **Step 6: Correct the copy**

In `src/data/toolExplainers.js` entry `'strip-file-metadata'`:

- line 224 howItWorks[0] → `'Your file is read into browser memory. For PDFs, the Info dictionary (title, author, subject, keywords, producer) is blanked and the XMP metadata stream, application PieceInfo, embedded attachments and page thumbnails are deleted before the file is re-saved. For images, the file is re-encoded through a canvas so EXIF/XMP blocks are left behind.'`
- line 230 first flow bullet → `'PDFs: parsed with <code>PDFDocument.load()</code>; <code>stripPdfIdentityMetadata()</code> blanks the Info dictionary and deletes catalog <code>/Metadata</code> (XMP), <code>/PieceInfo</code>, <code>/Names/EmbeddedFiles</code> and per-page <code>/PieceInfo</code>/<code>/Thumb</code>; document re-saved. The before/after table lists any hidden carriers found.'`
- line 242 first limitation → `'For PDFs: text and images on the pages are untouched, so a name printed in a header, a signature, or a scanned letterhead is not metadata and will remain. Review-comment annotations and form-field values also stay. For sensitive documents, follow up with Adobe Acrobat’s "Examine Document" or the PDF Redaction tool.'`

In `TOOL_CAVEATS`, entry `'strip-file-metadata'` (lines ~816–818) → `'Only hidden metadata is removed. Names in headers, footers, signatures or scanned letterheads are page content — use PDF Redaction for those.'`

- [ ] **Step 7: Run guardrails and commit**

```bash
npm run security:audit && npm test && npm run build
git add src/utils/pdfMetadata.js tests/pdf-metadata.test.mjs src/tools/privacy/StripFileMetadata.jsx src/data/toolExplainers.js
git commit -m "fix(privacy): Strip File Metadata removes the XMP stream, PieceInfo and attachments

Only the Info dictionary was cleared; dc:creator etc. in /Metadata
survived while the UI reported the file as clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4b: Compress PDF's "XMP metadata removed" note has the same orphan problem

`stripDeadweight()` in `src/tools/pdf/CompressPDF.jsx:396-440` deletes catalog keys only, so its green "stripped: XMP metadata, embedded file attachments…" note is true structurally but the bytes remain in the file (and no space is saved). Compress PDF is not a privacy tool, so this is a correctness fix, not a security one.

**Files:**
- Modify: `src/tools/pdf/CompressPDF.jsx:396-440`

- [ ] **Step 1: Reuse the deletion primitive**

Export `removeEntry` from `src/utils/pdfMetadata.js` (add `export` before `function removeEntry`). In `CompressPDF.jsx` add `import { removeEntry } from '../../utils/pdfMetadata';` and change `tryDeleteCatalog` to:

```js
  const tryDeleteCatalog = (key, label) => {
    try {
      if (removeEntry(pdfDoc.context, catalog, key)) stats.stripped.push(label);
    } catch {
      // defensive: never let cleanup failure block the compression
    }
  };
```

Replace the two `namesEntry.delete(...)` calls with `removeEntry(pdfDoc.context, namesEntry, 'EmbeddedFiles')` / `removeEntry(pdfDoc.context, namesEntry, 'JavaScript')` (keeping the `if` + `stats.stripped.push` around each), and the three per-page `node.delete(...)` calls with `removeEntry(pdfDoc.context, node, 'Thumb')` etc. Leave `/OpenAction` and `/AA` handling as-is — actions can be shared with link annotations, and the compress tool must never dangle a reference.

- [ ] **Step 2: Keep the chunk set stable and verify** — `pdfMetadata.js` is now imported by two lazy tools, so Rolldown would emit a new shared chunk (rejected by the bundle gate). In `vite.config.js` `manualChunks(id)`, next to the `pdfEncrypt.js` line added in Task 2b, add `if (normalized.includes('/src/utils/pdfMetadata.js')) return 'pdf-lib';`. Then in the dev server, compress a Word-exported PDF in text-heavy mode; the note still lists "XMP metadata", and `grep -c xmpmeta` on the downloaded file is `0`. Run `npm run security:audit && npm run build && node scripts/bundle-integrity.mjs` — 69 chunks, none named after `pdfMetadata`.

- [ ] **Step 3: Commit**

```bash
git add src/tools/pdf/CompressPDF.jsx src/utils/pdfMetadata.js vite.config.js
git commit -m "fix(pdf): Compress PDF actually drops the bytes of stripped XMP/attachments

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Remove the unsalted-hash "pseudonymized" strategy

**Files:**
- Modify: `src/tools/research/DataAnonymizer.jsx:19-37`, `:61-68`, `:120`, `:297-304`, `:792-799`
- Modify: `src/data/toolExplainers.js:285`, `:292`, `:306-307`

- [ ] **Step 1: Delete the strategy definition**

In `STRATEGIES` (lines 19–37) delete the whole `pseudonymized` object (lines 26–31), leaving `coded` and `anonymized`.

- [ ] **Step 2: Delete the two hashing branches**

CSV mode (lines ~297–304): replace

```js
            if (strategy === 'coded') {
              gs.counter++;
              gs.map.set(composite, `${gs.prefix}-${gs.counter}`);
            } else if (strategy === 'pseudonymized') {
              const hash = await sha256(composite);
              gs.map.set(composite, hash.slice(0, 8));
            } else {
              gs.map.set(composite, '[REDACTED]');
```

with

```js
            if (strategy === 'coded') {
              gs.counter++;
              gs.map.set(composite, `${gs.prefix}-${gs.counter}`);
            } else {
              gs.map.set(composite, '[REDACTED]');
```

Text mode (lines ~792–799): apply the same edit, removing the `else if (strategy === 'pseudonymized')` branch.

- [ ] **Step 3: Delete the now-unused `sha256()` function** (lines 61–68, including the `// Simple SHA-256 using SubtleCrypto` comment).

- [ ] **Step 4: Update the InfoCard description** (line 120) to:

```
De-identify sensitive data in CSV files or free text for REB / Tri-Agency / PHIPA workflows. Choose coded (consistent pseudonyms plus a separately stored key file — TCPS 2 "coded information") or anonymized (irreversible redaction). All processing runs in your browser — your data never leaves your machine.
```

- [ ] **Step 5: Confirm nothing else references the removed strategy**

Run: `grep -rn "pseudonymized\|sha256(" src/tools/research/DataAnonymizer.jsx`
Expected: no output.

- [ ] **Step 6: Update the explainer**

In `src/data/toolExplainers.js` entry `'data-anonymizer'`:

- line 285 → `'You paste in text or upload a CSV, pick the columns or entity types that need de-identification, and choose a strategy: <strong>coded</strong> (consistent pseudonyms + a separate key file that maps codes back to originals) or <strong>anonymized</strong> (redacted to [REDACTED], irreversible).'`
- line 292: delete the `<strong>Pseudonymized:</strong> …` flow bullet.
- line 306 → replace `The coded/pseudonymized/anonymized labels` with `The coded/anonymized labels`.
- line 307 → replace the whole bullet with `'An earlier version offered a "pseudonymized" mode built on an unsalted SHA-256 hash. It was removed on 2026-09-18 because a hash of a name or ID can be reversed by hashing a list of candidates. If you need pseudonyms that stay consistent across several files, use coded mode with the same key file.'`

- [ ] **Step 7: Verify in the dev server, run guardrails, commit**

Run `npm run dev`, open `#data-anonymizer`: the strategy selector shows exactly two options in both CSV and Text tabs, the default is *Coded*, and coding a 3-row sample still produces `Person-1…` plus a key file.

```bash
npm run security:audit && npm test && npm run build
git add src/tools/research/DataAnonymizer.jsx src/data/toolExplainers.js
git commit -m "fix(research): remove the unsalted-hash pseudonymized strategy

Unsalted SHA-256 of names/IDs is dictionary-reversible and the 8-hex
truncation collides at ~65k rows; the UI claimed it could not be reversed.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Password Generator uses the unbiased sampler

**Files:**
- Modify: `src/tools/privacy/PasswordGenerator.jsx:1-3`, `:38-41`

- [ ] **Step 1: Import the shared helper**

After line 3 (`import InfoCard …`) add:

```js
import { secureRandomIndices } from '../../utils/crypto';
```

- [ ] **Step 2: Replace the sampler**

Replace lines 38–41:

```js
function generatePasswordFromCharset(length, charset) {
  return secureRandomIndices(length, charset.length).map((i) => charset[i]).join('');
}
```

- [ ] **Step 3: Verify**

Run: `grep -n "% charset" src/tools/privacy/PasswordGenerator.jsx` → expected no output. In the dev server, generate 5 passwords of length 20 with all sets enabled; each is 20 characters and they differ. `secureRandomIndices` is already covered by `tests/crypto.test.mjs`.

- [ ] **Step 4: Commit**

```bash
npm run security:audit && npm test
git add src/tools/privacy/PasswordGenerator.jsx
git commit -m "fix(privacy): Password Generator uses rejection-sampled indices (CodeQL #3)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Open PR B. After merge, confirm CodeQL alert #3 auto-closes on the next master scan.

---

## PR C — Hardening the environment can't provide

### Task 7: Frame-buster for hosts that drop `frame-ancestors`

**Files:**
- Modify: `src/main.jsx:36-40`

- [ ] **Step 1: Add the guard before the React render**

Replace the final `ReactDOM.createRoot(...).render(...)` block with:

```jsx
// GitHub Pages cannot send the CSP header, and frame-ancestors is ignored in a
// <meta> CSP, so the live site can be framed. Refuse to render inside another
// origin's frame; hosts that do send the header make this a no-op.
function isFramed() {
  try {
    return window.top !== window.self;
  } catch {
    return true; // cross-origin parent throws on access — that is a frame
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isFramed()) {
  try {
    window.top.location.replace(window.location.href);
  } catch {
    // sandboxed or cross-origin parent — fall through and render the notice
  }
  root.render(
    <p className="framed-notice">
      RDM Toolkit cannot be displayed inside another website. Open{' '}
      <a href={window.location.href} target="_top">rdmtoolkit.ca</a> directly.
    </p>,
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
```

Add to `src/styles/global.css`, next to `.visually-hidden`:

```css
.framed-notice {
  margin: var(--space-2xl) auto;
  max-width: 480px;
  padding: var(--space-lg);
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  text-align: center;
}
.framed-notice a { color: var(--accent-primary); }
```

- [ ] **Step 2: Verify with a hostile page**

Run `npm run build && npm run preview` (port 4173). In the scratchpad create `frame.html`:

```html
<!doctype html><title>attacker</title>
<iframe src="http://127.0.0.1:4173/" width="900" height="600"></iframe>
<iframe sandbox="allow-scripts" src="http://127.0.0.1:4173/#merge-pdfs" width="900" height="600"></iframe>
```

Serve it from a *different* port: `npx http-server <scratchpad> -p 4999`, open `http://127.0.0.1:4999/frame.html`. Expected: the first iframe navigates the top window to the toolkit (frame-bust); the sandboxed iframe shows only the "cannot be displayed inside another website" notice and never renders tools. Opening `http://127.0.0.1:4173/` directly still renders the app with zero console errors.

- [ ] **Step 3: Commit**

```bash
npm run security:audit && npm run build
git add src/main.jsx src/styles/global.css
git commit -m "security: refuse to render inside a foreign frame (GitHub Pages ignores frame-ancestors)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: Workflow token permissions and the adm-zip override

**Files:**
- Modify: `.github/workflows/lighthouse.yml:1-8`, `.github/workflows/codeql.yml:1-12`
- Modify: `package.json` (`overrides`), `package-lock.json`

- [ ] **Step 1: Restrict the default token in both workflows**

In `.github/workflows/lighthouse.yml`, after the `on:` block and before `jobs:`, add:

```yaml
permissions:
  contents: read
```

In `.github/workflows/codeql.yml`, add the same top-level block (the job-level block already grants `security-events: write`; the top-level `contents: read` sets the default for anything else).

- [ ] **Step 2: Move the override to the patched release**

In `package.json` change `"adm-zip": "0.6.0"` to `"adm-zip": "0.6.1"`, then:

```bash
npm install --ignore-scripts
npm audit
```

Expected: `found 0 vulnerabilities` for the full tree. (The lockfile-diff guard passes because `package.json` changed in the same commit.)

- [ ] **Step 3: Commit**

```bash
npm run security:audit && npm audit signatures
git add .github/workflows/lighthouse.yml .github/workflows/codeql.yml package.json package-lock.json
git commit -m "ci: least-privilege tokens for lighthouse/codeql; adm-zip override 0.6.1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Branch protection settings and honest docs

**Files:**
- Modify: `CLAUDE.md:377` (Known gaps #3) and the Security Model "Known gaps" list
- Repository settings via `gh` (owner runs these)

- [ ] **Step 1: Require branches to be up to date** (the doc claims this; GitHub reports `strict: false`)

```bash
gh api -X PATCH repos/seawaydigital/RDM-Toolkit/branches/master/protection/required_status_checks -f strict=true
```

Expected JSON response containing `"strict": true`. Leave `required_approving_review_count` at 0 and `enforce_admins` off: the repo has a single maintainer who cannot approve their own PRs, and admin bypass is how self-authored PRs merge today.

- [ ] **Step 2: Correct CLAUDE.md Known gaps #3** to read: PRs required, **0 approving reviews required** (single maintainer; Scorecard flags this as `BranchProtectionID`), 4 required status checks, branches must be up to date (re-enabled 2026-09-18), no force pushes/deletions, admin enforcement off. Keep the signed-commits note.

- [ ] **Step 3: Record the environmental facts in Known gaps #1**

Append to Known gaps #1: `Verified live 2026-09-18: rdmtoolkit.ca sends no CSP/HSTS/X-Frame-Options/nosniff headers; the meta CSP (with Trusted Types) is enforced. The JS frame-buster in main.jsx covers framing until the site is fronted by a host that sends public/_headers.`

- [ ] **Step 4: Add the Recent Changes row** for 2026-09-18 summarising PRs A–C, and the three new test files in the "Local scripts" table.

- [ ] **Step 5: Commit and open PR C**

```bash
git add CLAUDE.md
git commit -m "docs: correct branch-protection and header claims after the 2026-09-18 audit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Definition of done

- `npm test` reports 41 passing tests (16 existing + 14 encrypt + 8 surface + 3 metadata).
- Password Protect PDF → Remove PDF Password round-trips in the browser (and the unlocked file opens in Chrome with no prompt).
- `npm run security:audit`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` and `npm audit` (full tree) all clean.
- A PDF produced by Password Protect PDF prompts for a password in Chrome, Adobe Reader and macOS Preview, and Remove PDF Password can open it.
- A Word-exported PDF run through Strip File Metadata shows no `dc:creator` in `exiftool` output.
- The De-identify tool offers exactly two strategies.
- CodeQL alert #3 and Scorecard alerts #37/#38 are closed; #36 (branch protection) is dismissed with the single-maintainer rationale.
- Live site refuses to render inside a foreign iframe.
