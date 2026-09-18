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
export function removeEntry(ctx, dict, key) {
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
