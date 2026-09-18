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
