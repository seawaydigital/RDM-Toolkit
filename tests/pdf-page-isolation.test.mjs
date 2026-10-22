import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from '@cantoo/pdf-lib';
import { isolatePageResources } from '../src/utils/pdfPageIsolation.js';

const KEPT_FORM = 'KEPTFORMTEXT';
const SECRET_FORM = 'PAGE2_SECRET_FORM_TEXT';
const SECRET_IMAGE = 'PAGE2_SECRET_IMAGE_BYTES';
const NESTED_IMAGE = 'KEPT_NESTED_IMAGE_BYTES';

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

// Two pages whose content is drawn through XObjects in ONE resource dictionary,
// either shared by reference (layout 'shared') or set on the /Pages node and
// inherited (layout 'inherited'). Page 1 draws Fm1, which itself draws Im3
// from the same dictionary; page 2 draws Fm2 (secret text) and Im2 (secret
// image bytes). Options: formSharesPageResources gives Fm1 a /Resources entry
// pointing at the shared dictionary itself, as some producers write it.
async function sharedResourcesPdf({ layout, formSharesPageResources = false }) {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const p1 = doc.addPage([612, 792]);
  const p2 = doc.addPage([612, 792]);
  const enc = (s) => new TextEncoder().encode(s);
  const image = (marker) => ctx.register(PDFRawStream.of(
    ctx.obj({ Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, ColorSpace: 'DeviceGray', BitsPerComponent: 8, Length: marker.length }),
    enc(marker)));
  const form = (content, extra = {}) => ctx.register(ctx.flateStream(content, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], ...extra }));

  const font = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica' }));
  const xobjects = ctx.obj({});
  const sharedRef = ctx.register(ctx.obj({ Font: { F1: font }, XObject: xobjects }));
  xobjects.set(PDFName.of('Im3'), image(NESTED_IMAGE));
  xobjects.set(PDFName.of('Fm1'), form(`BT /F1 12 Tf 72 700 Td (${KEPT_FORM}) Tj ET q 10 0 0 10 72 600 cm /Im3 Do Q`,
    formSharesPageResources ? { Resources: sharedRef } : {}));
  xobjects.set(PDFName.of('Fm2'), form(`BT /F1 12 Tf 72 700 Td (${SECRET_FORM}) Tj ET`));
  xobjects.set(PDFName.of('Im2'), image(SECRET_IMAGE));

  p1.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream('q /Fm1 Do Q BT /F1 10 Tf 72 50 Td (footer) Tj ET')));
  p2.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream('q /Fm2 Do Q q 200 0 0 200 0 0 cm /Im2 Do Q')));
  if (layout === 'shared') {
    p1.node.set(PDFName.of('Resources'), sharedRef);
    p2.node.set(PDFName.of('Resources'), sharedRef);
  } else {
    p1.node.delete(PDFName.of('Resources'));
    p2.node.delete(PDFName.of('Resources'));
    doc.catalog.Pages().set(PDFName.of('Resources'), sharedRef);
  }
  return doc.save();
}

// The Delete Pages / Split PDF pipeline: keep page 1 only.
async function keepFirstPageOnly(sourceBytes) {
  const src = await PDFDocument.load(sourceBytes);
  isolatePageResources(src, 0);
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(src, [0]);
  out.addPage(page);
  return out.save();
}

for (const layout of ['shared', 'inherited']) {
  test(`removed page's XObjects do not travel with a kept page (${layout} /Resources)`, async () => {
    const text = await recoverableText(await keepFirstPageOnly(await sharedResourcesPdf({ layout })));
    assert.equal(contains(text, SECRET_FORM), false, 'removed page form text survived');
    assert.equal(contains(text, SECRET_IMAGE), false, 'removed page image bytes survived');
  });

  test(`the kept page keeps what it draws: its form, the form's nested image and its font (${layout})`, async () => {
    const bytes = await keepFirstPageOnly(await sharedResourcesPdf({ layout }));
    const text = await recoverableText(bytes);
    assert.equal(contains(text, KEPT_FORM), true, 'kept form text lost');
    assert.equal(contains(text, NESTED_IMAGE), true, 'nested image used by the kept form lost');
    const page = (await PDFDocument.load(bytes)).getPage(0);
    const res = page.node.Resources();
    assert.ok(res.lookup(PDFName.of('Font'), PDFDict).has(PDFName.of('F1')), 'font F1 lost');
    assert.deepEqual(res.lookup(PDFName.of('XObject'), PDFDict).keys().map((k) => k.asString()).sort(), ['/Fm1', '/Im3']);
  });
}

test('a kept form whose own /Resources is the shared dictionary does not pull the whole dictionary back in', async () => {
  const bytes = await keepFirstPageOnly(await sharedResourcesPdf({ layout: 'shared', formSharesPageResources: true }));
  const text = await recoverableText(bytes);
  assert.equal(contains(text, SECRET_FORM), false, 'removed page form text survived via the form\'s /Resources');
  assert.equal(contains(text, SECRET_IMAGE), false, 'removed page image survived via the form\'s /Resources');
  assert.equal(contains(text, KEPT_FORM), true);
  assert.equal(contains(text, NESTED_IMAGE), true);
});

test('isolating every page of the source leaves each page able to draw its own content', async () => {
  const src = await PDFDocument.load(await sharedResourcesPdf({ layout: 'shared' }));
  isolatePageResources(src, 0);
  isolatePageResources(src, 1);
  const names = (i) => src.getPage(i).node.Resources().lookup(PDFName.of('XObject'), PDFDict).keys().map((k) => k.asString()).sort();
  assert.deepEqual(names(0), ['/Fm1', '/Im3']);
  assert.deepEqual(names(1), ['/Fm2', '/Im2']);
});
