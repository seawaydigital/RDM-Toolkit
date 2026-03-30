import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Render a single page thumbnail at high enough resolution for crisp display.
 * Uses a scale that produces ~600px wide images (covers zoom up to 300px grid cells).
 * Renders at 2x for HiDPI displays and uses PNG for sharpness.
 */
export async function renderPageThumbnail(pdfJsDoc, pageNumber, scale) {
  const page = await pdfJsDoc.getPage(pageNumber);

  // If no explicit scale, calculate one that produces ~600px width
  if (!scale) {
    const baseViewport = page.getViewport({ scale: 1 });
    scale = Math.min(600 / baseViewport.width, 1.5);
  }

  // Account for device pixel ratio for sharp rendering on HiDPI
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: scale * dpr });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Use PNG for text-heavy documents (sharper than JPEG)
  const dataUrl = canvas.toDataURL('image/png');
  canvas.remove();
  return dataUrl;
}

export async function renderAllThumbnails(pdfJsDoc, onEachRendered) {
  const total = pdfJsDoc.numPages;
  // Render first 6 immediately
  for (let i = 1; i <= Math.min(6, total); i++) {
    const dataUrl = await renderPageThumbnail(pdfJsDoc, i);
    onEachRendered(i, dataUrl);
  }
  // Render remaining via requestIdleCallback
  if (total > 6) {
    const renderRemaining = async () => {
      for (let i = 7; i <= total; i++) {
        const dataUrl = await renderPageThumbnail(pdfJsDoc, i);
        onEachRendered(i, dataUrl);
      }
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(renderRemaining);
    } else {
      setTimeout(renderRemaining, 0);
    }
  }
}

/**
 * Load a PDF from bytes and return the pdfjs document.
 */
export async function loadPdfDocument(bytes) {
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  return await loadingTask.promise;
}

/**
 * Load a PDF with @cantoo/pdf-lib with maximum tolerance.
 * Tries multiple strategies to handle problematic PDFs.
 * Returns { pdfDoc, isEncrypted } or throws.
 */
export async function loadPdfLibDocument(bytes, { PDFDocument }) {
  const opts = [
    { ignoreEncryption: true },
    { ignoreEncryption: true, updateMetadata: false },
    {},
  ];

  for (const opt of opts) {
    try {
      const pdfDoc = await PDFDocument.load(bytes.slice(), opt);
      return { pdfDoc, isEncrypted: false };
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('encrypted') || msg.includes('password')) {
        return { pdfDoc: null, isEncrypted: true };
      }
      // Try next strategy
      if (opt === opts[opts.length - 1]) throw e;
    }
  }
}
