import { PDFDocument, PDFName, PDFDict } from '@cantoo/pdf-lib';
import { isolatePageResources } from './pdfPageIsolation.js';

// Strip every catalog-level deadweight dict that could carry PII or
// side-channel data after a redaction. Source-doc metadata is already absent
// because we build a fresh PDFDocument. Page-level carriers (/Annots, /Thumb,
// /PieceInfo, /AA) are removed from kept pages before they are copied — see
// scrubPageForCopy — and raster pages hold only what we drew.
export function stripRedactionDeadweight(pdfDoc) {
  const stats = { stripped: [] };
  const catalog = pdfDoc.catalog;

  const tryDeleteCatalog = (key, label) => {
    try {
      if (catalog.has(PDFName.of(key))) {
        catalog.delete(PDFName.of(key));
        stats.stripped.push(label);
      }
    } catch { /* defensive */ }
  };

  tryDeleteCatalog('Metadata',   'XMP metadata');
  tryDeleteCatalog('OpenAction', 'open-document action');
  tryDeleteCatalog('AA',         'document action triggers');
  tryDeleteCatalog('PieceInfo',  'application piece info');
  tryDeleteCatalog('Outlines',   'bookmarks / outline');
  tryDeleteCatalog('AcroForm',   'form-field definitions');

  try {
    const namesEntry = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
    if (namesEntry) {
      if (namesEntry.has(PDFName.of('EmbeddedFiles'))) {
        namesEntry.delete(PDFName.of('EmbeddedFiles'));
        stats.stripped.push('embedded file attachments');
      }
      if (namesEntry.has(PDFName.of('JavaScript'))) {
        namesEntry.delete(PDFName.of('JavaScript'));
        stats.stripped.push('JavaScript');
      }
    }
  } catch { /* ignore */ }

  // Clear document info dict (title/author/subject/keywords/producer/creator)
  try {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    stats.stripped.push('document info dictionary');
  } catch { /* ignore */ }

  return stats;
}

// The only page keys a kept page needs to render. Everything else (/Annots,
// /Thumb, /PieceInfo, /AA, /B, /Metadata, ...) is removed from the SOURCE page
// before copyPages(): pdf-lib's copier deep-copies every object a page
// references, so a table-of-contents link whose /Dest points at a redacted page
// would otherwise pull that page's original content stream into the output.
// Deleting the keys after the copy is too late — pdf-lib serialises every
// object it holds, referenced or not.
const PAGE_KEYS_TO_KEEP = new Set(['Type', 'Parent', 'Resources', 'Contents', 'MediaBox', 'CropBox',
  'BleedBox', 'TrimBox', 'ArtBox', 'Rotate', 'UserUnit', 'Group']);

function scrubPageForCopy(page, counts) {
  const node = page.node;
  for (const key of node.keys()) {
    const name = key.asString().slice(1);
    if (PAGE_KEYS_TO_KEEP.has(name)) continue;
    node.delete(key);
    counts[name] = (counts[name] || 0) + 1;
  }
}

function describeScrubbedPageKeys(counts) {
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const out = [];
  if (counts.Thumb)     out.push(plural(counts.Thumb, 'page thumbnail'));
  if (counts.PieceInfo) out.push(plural(counts.PieceInfo, 'page piece-info blob'));
  if (counts.AA)        out.push(plural(counts.AA, 'page action trigger'));
  if (counts.Annots)    out.push(`annotations on ${plural(counts.Annots, 'page')} (form widgets, links, file attachments)`);
  return out;
}

// Post-save check: every /Type /Page object in the saved bytes must belong to
// the page tree. An orphaned page is a copy of source content that no viewer
// shows but anyone can extract, so the caller refuses the download if this
// returns anything. Returns the orphaned object refs as strings.
export async function findPagesOutsidePageTree(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const inTree = new Set(doc.getPages().map((p) => p.ref.toString()));
  return doc.context.enumerateIndirectObjects()
    .filter(([ref, obj]) => obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Page') && !inTree.has(ref.toString()))
    .map(([ref]) => ref.toString());
}

// Build the redacted document: pages in `redactedPageNums` (1-based) are
// added by `addRasterPage(newDoc, pageNum)` — the caller rasterizes them, so
// their original content never enters newDoc — and every other page is copied
// intact so its text stays selectable. `onProgress(pageNum, totalPages)` is
// optional. `sourceDoc` is modified (kept pages are scrubbed), so pass a
// freshly loaded document. Returns the saved bytes plus what was stripped.
export async function assembleRedactedPdf(sourceDoc, { redactedPageNums, addRasterPage, onProgress }) {
  const newDoc = await PDFDocument.create();
  const totalPages = sourceDoc.getPageCount();
  const scrubbed = {};

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    if (redactedPageNums.has(pageNum)) {
      await addRasterPage(newDoc, pageNum);
    } else {
      // No redactions on this page — copy it so text stays selectable, but
      // only after removing everything it does not need to render.
      scrubPageForCopy(sourceDoc.getPage(pageNum - 1), scrubbed);
      isolatePageResources(sourceDoc, pageNum - 1);
      const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageNum - 1]);
      newDoc.addPage(copiedPage);
    }
  }

  const stripStats = stripRedactionDeadweight(newDoc);
  stripStats.stripped.push(...describeScrubbedPageKeys(scrubbed));
  const bytes = await newDoc.save({ useObjectStreams: false });
  return { bytes, stripStats };
}
