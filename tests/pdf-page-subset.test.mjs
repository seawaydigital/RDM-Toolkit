import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFString } from '@cantoo/pdf-lib';
import { pruneToPageTree, findPagesOutsidePageTree } from '../src/utils/pdfPageIsolation.js';

const REMOVED_TEXT = 'PAGE2SECRETTEXT';
const REMOVED_WIDGET = 'PAGE2WIDGETAPPEARANCE';
const KEPT_TEXT = 'PAGE1KEPTTEXT';
const KEPT_NOTE = 'PAGE1STICKYNOTE';

const hex = (s) => Buffer.from(s, 'latin1').toString('hex').toUpperCase();
async function recoverableText(bytes) {
  let text = Buffer.from(bytes).toString('latin1');
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    try { text += '\n' + inflateSync(Buffer.from(obj.contents)).toString('latin1'); } catch { /* not Flate */ }
  }
  return text;
}
const contains = (text, marker) => text.includes(marker) || text.toUpperCase().includes(hex(marker));

// Three pages; page 2 is the one removed. Page 1 carries every kind of
// reference to page 2 the audit found or the copier follows: a link /Dest, a
// GoTo action, an annotation /P, an article bead whose /N chain reaches a bead
// on page 2, and a text field whose widgets sit on pages 1 and 2 (the field's
// /Kids reach page 2's widget, whose appearance stream shows page-2 text).
// Page 1 also keeps a sticky note and a web link that must survive.
async function linkedThreePagePdf() {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const [p1, p2, p3] = [doc.addPage([612, 792]), doc.addPage([612, 792]), doc.addPage([612, 792])];
  p1.drawText(KEPT_TEXT, { x: 72, y: 700 });
  p2.drawText(REMOVED_TEXT, { x: 72, y: 700 });
  p3.drawText('PAGE3', { x: 72, y: 700 });

  const reg = (o) => ctx.register(ctx.obj(o));
  const bead2 = reg({ Type: 'Bead', P: p2.ref, R: [0, 0, 100, 100] });
  const bead1 = reg({ Type: 'Bead', P: p1.ref, R: [0, 0, 100, 100], N: bead2 });
  p1.node.set(PDFName.of('B'), ctx.obj([bead1]));
  p2.node.set(PDFName.of('B'), ctx.obj([bead2]));

  const field = reg({ FT: 'Tx', T: 'participant', V: 'shared value' });
  const ap = ctx.register(ctx.flateStream(`BT /Helv 10 Tf 2 2 Td (${REMOVED_WIDGET}) Tj ET`, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 100, 20] }));
  const w1 = reg({ Type: 'Annot', Subtype: 'Widget', Rect: [72, 500, 172, 520], P: p1.ref, Parent: field });
  const w2 = reg({ Type: 'Annot', Subtype: 'Widget', Rect: [72, 500, 172, 520], P: p2.ref, Parent: field, AP: { N: ap } });
  ctx.lookup(field).set(PDFName.of('Kids'), ctx.obj([w1, w2]));
  p2.node.set(PDFName.of('Annots'), ctx.obj([w2]));

  p1.node.set(PDFName.of('Annots'), ctx.obj([
    reg({ Type: 'Annot', Subtype: 'Link', Rect: [72, 680, 200, 695], Dest: [p2.ref, 'XYZ', null, null, null] }),
    reg({ Type: 'Annot', Subtype: 'Link', Rect: [72, 660, 200, 675], A: { S: 'GoTo', D: [p2.ref, 'Fit'] } }),
    reg({ Type: 'Annot', Subtype: 'Square', Rect: [72, 640, 90, 655], P: p2.ref }),
    reg({ Type: 'Annot', Subtype: 'Text', Rect: [72, 600, 90, 618], P: p1.ref, Contents: PDFString.of(KEPT_NOTE) }),
    reg({ Type: 'Annot', Subtype: 'Link', Rect: [72, 560, 200, 575], A: { S: 'URI', URI: PDFString.of('https://example.org/') } }),
    w1,
  ]));
  return doc.save();
}

// The Delete Pages pipeline (Split PDF is the same calls per part).
async function deletePage2(sourceBytes) {
  const src = await PDFDocument.load(sourceBytes);
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(src, [0, 2])) out.addPage(page);
  pruneToPageTree(out);
  return out.save();
}

test('a deleted page reached through links, actions, /P, beads or a form field is absent from the output bytes', async () => {
  const text = await recoverableText(await deletePage2(await linkedThreePagePdf()));
  assert.equal(contains(text, REMOVED_TEXT), false, 'deleted page content survived');
  assert.equal(contains(text, REMOVED_WIDGET), false, 'deleted page widget appearance survived');
});

test('after pruning the output holds no page objects outside its page tree', async () => {
  assert.deepEqual(await findPagesOutsidePageTree(await deletePage2(await linkedThreePagePdf())), []);
});

test('kept pages keep their text, their own notes, web links and their form widget', async () => {
  const bytes = await deletePage2(await linkedThreePagePdf());
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  const text = await recoverableText(bytes);
  assert.equal(contains(text, KEPT_TEXT), true, 'kept page text lost');
  assert.equal(contains(text, KEPT_NOTE), true, 'kept sticky note lost');
  const annots = doc.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray).asArray().map((r) => doc.context.lookup(r, PDFDict));
  const subtypes = annots.map((a) => a.get(PDFName.of('Subtype')).asString());
  const uris = annots.map((a) => a.lookupMaybe(PDFName.of('A'), PDFDict)?.lookupMaybe(PDFName.of('URI'), PDFString)?.decodeText());
  assert.ok(uris.includes('https://example.org/'), `web link lost: ${JSON.stringify(uris)}`);
  assert.ok(subtypes.includes('/Widget'), `kept widget lost: ${subtypes.join(' ')}`);
  assert.ok(subtypes.includes('/Text'), `kept note lost: ${subtypes.join(' ')}`);
  // Shown on page 1 but with /P naming the deleted page: kept, and re-pointed.
  const square = annots.find((a) => a.get(PDFName.of('Subtype')).asString() === '/Square');
  assert.ok(square, `annotation shown on a kept page lost: ${subtypes.join(' ')}`);
  assert.equal(square.get(PDFName.of('P')).toString(), doc.getPage(0).ref.toString());
});

test('pruneToPageTree leaves a document without stray pages untouched', async () => {
  const doc = await PDFDocument.create();
  doc.addPage().drawText('only page', { x: 72, y: 700 });
  const before = doc.context.enumerateIndirectObjects().length;
  pruneToPageTree(doc);
  assert.equal(doc.context.enumerateIndirectObjects().length, before);
});
