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

test('verifyPdfIsLocked accepts encrypted output and rejects a plain PDF', async () => {
  const plain = await samplePdf();
  const locked = await encryptPdfBytes(plain, OPTS);
  assert.deepEqual(await verifyPdfIsLocked(locked), { locked: true, reason: null });
  const verdict = await verifyPdfIsLocked(plain);
  assert.equal(verdict.locked, false);
  assert.match(verdict.reason, /no \/Encrypt/);
});
