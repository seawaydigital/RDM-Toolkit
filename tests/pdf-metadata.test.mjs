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
