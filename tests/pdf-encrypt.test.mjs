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
  assert.match(verdict.reason, /no \/Encrypt/);
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
});
