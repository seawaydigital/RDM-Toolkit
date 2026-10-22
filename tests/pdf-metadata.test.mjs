import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFRawStream } from '@cantoo/pdf-lib';
import exifr from 'exifr';
import { findPdfIdentityCarriers, stripPdfIdentityMetadata } from '../src/utils/pdfMetadata.js';
import { PHOTO, EXPECTED, MARKERS } from './jpeg-fixture.mjs';

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

// A PDF made from phone photos (Word, a scanner app, or Image to PDF before
// 2026-10-22): each photo is a DCTDecode image XObject holding the original
// JPEG bytes, EXIF GPS included, and the image dictionary has its own XMP.
const IMAGE_XMP = 'IMAGEXMPAUTHOR';
async function photoPdf(jpeg = PHOTO, { imageXmp = true } = {}) {
  const made = await PDFDocument.create();
  const image = await made.embedJpg(jpeg);
  made.addPage().drawImage(image, { x: 0, y: 0, width: 100, height: 100 });
  const doc = await PDFDocument.load(await made.save());
  if (imageXmp) {
    const ctx = doc.context;
    const xmp = ctx.register(PDFRawStream.of(ctx.obj({ Type: 'Metadata', Subtype: 'XML' }), new TextEncoder().encode(IMAGE_XMP)));
    for (const image of imageStreams(doc)) image.dict.set(PDFName.of('Metadata'), xmp);
  }
  return doc.save();
}

function imageStreams(doc) {
  return doc.context.enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter((obj) => obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'));
}

test('findPdfIdentityCarriers reports photo metadata and image-level XMP', async () => {
  const found = findPdfIdentityCarriers(await PDFDocument.load(await photoPdf()));
  assert.ok(found.some((f) => /photo metadata/i.test(f) && /1 image\b/.test(f)), found.join(', '));
  assert.ok(found.some((f) => /image XMP/i.test(f)), found.join(', '));
});

test('stripPdfIdentityMetadata removes EXIF, XMP and GPS from embedded photos and keeps the images', async () => {
  const doc = await PDFDocument.load(await photoPdf());
  const removed = stripPdfIdentityMetadata(doc);
  assert.ok(removed.some((r) => /photo metadata/i.test(r)), removed.join(', '));
  assert.ok(removed.some((r) => /image XMP/i.test(r)), removed.join(', '));
  for (const useObjectStreams of [false, true]) {
    const out = await doc.save({ useObjectStreams });
    const text = Buffer.from(out).toString('latin1');
    for (const marker of [...MARKERS, IMAGE_XMP]) {
      assert.equal(text.includes(marker), false, `${marker} survived (objectStreams=${useObjectStreams})`);
    }
    const reloaded = await PDFDocument.load(out);
    assert.deepEqual(findPdfIdentityCarriers(reloaded), []);
    const images = imageStreams(reloaded);
    assert.equal(images.length, 1, 'image XObject lost');
    const jpeg = images[0].getContents();
    assert.deepEqual([...jpeg], [...EXPECTED], 'image data changed beyond the metadata');
    assert.equal(await exifr.gps(Buffer.from(jpeg)), undefined, 'GPS still readable');
  }
});

test('a clean embedded photo is left as it was', async () => {
  const doc = await PDFDocument.load(await photoPdf(EXPECTED, { imageXmp: false }));
  const [before] = imageStreams(doc);
  assert.deepEqual(findPdfIdentityCarriers(doc), []);
  assert.deepEqual(stripPdfIdentityMetadata(doc), ['Info dictionary']);
  assert.equal(imageStreams(doc)[0], before, 'clean image stream was replaced');
});
