import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from '@cantoo/pdf-lib';
import { assembleRedactedPdf, findPagesOutsidePageTree } from '../src/utils/pdfRedaction.js';

const SECRET = 'REDACTEDSECRETPAGE2';
const KEPT_TEXT = 'KEPTPAGETEXT';
const KEPT_PAGE_PAYLOADS = ['STICKYNOTEMARKER', 'ATTACHMENTPAYLOADMARKER', 'FORMVALUEMARKER', 'THUMBNAILMARKER'];

const hex = (s) => Buffer.from(s, 'latin1').toString('hex').toUpperCase();

// Everything a recipient could recover with qpdf/mutool: the raw bytes plus
// every inflated stream body. pdf-lib writes standard-font text as hex strings,
// so callers search for both the literal and the hex form.
async function recoverableText(bytes) {
  let text = Buffer.from(bytes).toString('latin1');
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    try { text += '\n' + inflateSync(Buffer.from(obj.contents)).toString('latin1'); } catch { /* not Flate */ }
  }
  return text;
}
const contains = (text, marker) => text.includes(marker) || text.toUpperCase().includes(hex(marker));

// Two pages. Page 2 holds the text the user redacts. Page 1 is kept, and links
// to page 2 the way a hyperlinked table of contents does; it also carries a
// sticky note, a filled form field, a file attachment and a thumbnail — all of
// which the tool reports as stripped.
async function linkedSourcePdf() {
  const doc = await PDFDocument.create();
  const kept = doc.addPage([612, 792]);
  const redacted = doc.addPage([612, 792]);
  kept.drawText(KEPT_TEXT, { x: 72, y: 700 });
  redacted.drawText(SECRET, { x: 72, y: 700 });

  const ctx = doc.context;
  const enc = (s) => new TextEncoder().encode(s);
  const attachment = ctx.register(PDFRawStream.of(ctx.obj({ Type: 'EmbeddedFile', Length: 23 }), enc('ATTACHMENTPAYLOADMARKER')));
  const annots = [
    ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [72, 680, 200, 695], Dest: [redacted.ref, 'Fit'] })),
    ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [72, 600, 90, 618], Contents: 'STICKYNOTEMARKER' })),
    ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'FileAttachment', Rect: [72, 560, 90, 578], FS: { Type: 'Filespec', F: 'notes.txt', EF: { F: attachment } } })),
    ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Tx', T: 'name', V: 'FORMVALUEMARKER', Rect: [72, 520, 200, 535], P: kept.ref })),
  ];
  kept.node.set(PDFName.of('Annots'), ctx.obj(annots));
  kept.node.set(PDFName.of('Thumb'), ctx.register(PDFRawStream.of(ctx.obj({ Length: 15 }), enc('THUMBNAILMARKER'))));
  return doc.save();
}

// Stand-in for the browser canvas raster: a 1x1 image drawn over a page of the
// same size, the way the tool draws its JPEG (drawImage also gives the page an
// empty /Annots array). The real raster carries no source objects either.
const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const blankRaster = async (newDoc) => {
  const img = await newDoc.embedPng(ONE_PIXEL_PNG);
  newDoc.addPage([612, 792]).drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
};

async function redact(sourceBytes, pages) {
  const sourceDoc = await PDFDocument.load(sourceBytes);
  return assembleRedactedPdf(sourceDoc, { redactedPageNums: new Set(pages), addRasterPage: blankRaster });
}

test('a redacted page is not carried into the output through a link on a kept page', async () => {
  const { bytes } = await redact(await linkedSourcePdf(), [2]);
  assert.equal(contains(await recoverableText(bytes), SECRET), false, 'redacted page text survived as an orphan object');
});

test('kept-page annotation payloads the tool reports as stripped are absent from the output bytes', async () => {
  const { bytes } = await redact(await linkedSourcePdf(), [2]);
  const text = await recoverableText(bytes);
  for (const marker of KEPT_PAGE_PAYLOADS) {
    assert.equal(contains(text, marker), false, `${marker} survived in the output`);
  }
});

test('the output holds no page objects outside its page tree', async () => {
  const { bytes } = await redact(await linkedSourcePdf(), [2]);
  const doc = await PDFDocument.load(bytes);
  const inTree = new Set(doc.getPages().map((p) => p.ref.toString()));
  const orphans = doc.context.enumerateIndirectObjects()
    .filter(([ref, obj]) => obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Page') && !inTree.has(ref.toString()));
  assert.deepEqual(orphans.map(([ref]) => ref.toString()), []);
});

test('the strip summary still reports the kept-page annotations and thumbnail it removed', async () => {
  const { stripStats } = await redact(await linkedSourcePdf(), [2]);
  const annotationLines = stripStats.stripped.filter((s) => /^annotations on/.test(s));
  assert.deepEqual(annotationLines, ['annotations on 1 page (form widgets, links, file attachments)'], stripStats.stripped.join(', '));
  assert.ok(stripStats.stripped.some((s) => /1 page thumbnail/.test(s)), stripStats.stripped.join(', '));
});

// The post-save check the tool runs before offering a download. It must catch
// an orphaned page however it got there, so the download fails closed.
test('findPagesOutsidePageTree flags an orphaned page object and passes a clean file', async () => {
  const leaky = await PDFDocument.create();
  leaky.addPage([612, 792]);
  const ctx = leaky.context;
  ctx.register(ctx.obj({ Type: 'Page', MediaBox: [0, 0, 612, 792] }));
  assert.equal((await findPagesOutsidePageTree(await leaky.save())).length, 1);

  const { bytes } = await redact(await linkedSourcePdf(), [2]);
  assert.deepEqual(await findPagesOutsidePageTree(bytes), []);
});

test('kept pages keep their text and the document keeps every page', async () => {
  const { bytes } = await redact(await linkedSourcePdf(), [2]);
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  assert.equal(contains(await recoverableText(bytes), KEPT_TEXT), true, 'kept page text was lost');
});
