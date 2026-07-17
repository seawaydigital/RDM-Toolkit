import { loadPdfDocument } from './pdfThumbnails';

/**
 * Returns true if any page of the PDF carries a Widget annotation
 * (an interactive form field or signature box). Bails on first hit.
 *
 * pdfjs is used instead of pdf-lib's catalog API because it handles
 * XFA forms, digital signatures, and malformed AcroForms more reliably
 * (same approach as PdfPageInspector).
 *
 * Never throws — detection is advisory and must not break the host tool;
 * any parse failure returns false. A defensive copy of the bytes is made
 * internally because pdfjs transfers the underlying buffer to its worker,
 * so callers may pass a Uint8Array they still need. Call this BEFORE any
 * other code transfers the same buffer.
 */
export async function pdfHasFormFields(bytes) {
  let doc = null;
  try {
    doc = await loadPdfDocument(bytes.slice());
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const annotations = await page.getAnnotations();
      if (annotations.some(a => a.subtype === 'Widget')) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (doc) {
      try { doc.destroy(); } catch { /* already destroyed */ }
    }
  }
}
