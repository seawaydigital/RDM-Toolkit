import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument, PDFName, PDFDict } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const REDACTION_DPI = 200;
const REDACTION_JPEG_QUALITY = 0.88;

// Strip every catalog-level and page-level deadweight dict that could carry
// PII or side-channel data after a redaction. Source-doc metadata is already
// absent because we build a fresh PDFDocument — but copyPages() brings over
// per-page /Thumb, /PieceInfo, /AA, and /Annots, so wipe those. Wiping
// /Annots also removes form widgets (which carry the raw field values) and
// file-attachment annotations.
function stripRedactionDeadweight(pdfDoc) {
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

  let thumbsRemoved = 0;
  let piecesRemoved = 0;
  let pageAAsRemoved = 0;
  let annotsRemoved = 0;
  for (const page of pdfDoc.getPages()) {
    const node = page.node;
    try {
      if (node.has(PDFName.of('Thumb')))     { node.delete(PDFName.of('Thumb')); thumbsRemoved++; }
      if (node.has(PDFName.of('PieceInfo'))) { node.delete(PDFName.of('PieceInfo')); piecesRemoved++; }
      if (node.has(PDFName.of('AA')))        { node.delete(PDFName.of('AA')); pageAAsRemoved++; }
      if (node.has(PDFName.of('Annots')))    { node.delete(PDFName.of('Annots')); annotsRemoved++; }
    } catch { /* skip this page */ }
  }
  if (thumbsRemoved)  stats.stripped.push(`${thumbsRemoved} page thumbnail${thumbsRemoved === 1 ? '' : 's'}`);
  if (piecesRemoved)  stats.stripped.push(`${piecesRemoved} page piece-info blob${piecesRemoved === 1 ? '' : 's'}`);
  if (pageAAsRemoved) stats.stripped.push(`${pageAAsRemoved} page action trigger${pageAAsRemoved === 1 ? '' : 's'}`);
  if (annotsRemoved)  stats.stripped.push(`annotations on ${annotsRemoved} page${annotsRemoved === 1 ? '' : 's'} (form widgets, links, file attachments)`);

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

// After saving, re-open the output with pdfjs and confirm that every page we
// rasterized has zero extractable text. This is a belt-and-braces check — if
// it ever fails, we refuse to download the file.
async function verifyRedactedPagesAreImages(pdfBytes, redactedPageNums) {
  const pdfJsDoc = await loadPdfDocument(pdfBytes.slice());
  const leakedPages = [];
  for (const pageNum of redactedPageNums) {
    const page = await pdfJsDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const nonEmpty = textContent.items.filter(it => it.str && it.str.trim().length > 0);
    if (nonEmpty.length > 0) {
      leakedPages.push({
        pageNum,
        sample: nonEmpty.slice(0, 3).map(it => it.str.trim()).join(' | '),
      });
    }
    page.cleanup();
  }
  pdfJsDoc.destroy();
  return { leakedPages, verifiedPageCount: redactedPageNums.length };
}

// Renders a single thumbnail only when it scrolls into view
function LazyThumbnail({ pageNum, pdfJsDocRef, onRender, cached }) {
  const ref = useRef(null);
  const [src, setSrc] = useState(cached || null);

  useEffect(() => {
    if (src || !pdfJsDocRef.current) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        try {
          const dataUrl = await renderPageThumbnail(pdfJsDocRef.current, pageNum, 0.5);
          setSrc(dataUrl);
          onRender(pageNum, dataUrl);
        } catch { /* ignore render errors */ }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, pdfJsDocRef, src, onRender]);

  return src
    ? <img src={src} alt={`Page ${pageNum}`} className="thumbnail-image" />
    : <div ref={ref} className="thumbnail-placeholder" />;
}

export default function PDFRedaction({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbSize, setThumbSize] = useState(140);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Page selection and redaction rectangles
  const [selectedPage, setSelectedPage] = useState(null);
  const [redactions, setRedactions] = useState({}); // { pageNum: [{ x, y, w, h }] } in normalized 0-1 coords
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);

  const pdfJsDocRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasContainerRef = useRef(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setThumbnails({});
    setPageCount(0);
    setSelectedPage(null);
    setRedactions({});
    setPreviewUrl(null);

    const isValid = await validatePDFHeader(selectedFile);
    if (!isValid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    try {
      const rawBytes = await selectedFile.arrayBuffer();
      const bytesCopy = new Uint8Array(rawBytes).slice();

      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(bytesCopy, { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      const count = pdfDoc.getPageCount();
      setFile(selectedFile);
      setFileBytes(bytesCopy);
      setPageCount(count);

      if (pdfJsDocRef.current) pdfJsDocRef.current.destroy();
      const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
      pdfJsDocRef.current = pdfJsDoc;
    } catch (e) {
      console.error('[PDFRedaction] file load error:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleSelectPage = useCallback(async (pageNum) => {
    setSelectedPage(pageNum);
    if (pdfJsDocRef.current) {
      try {
        const dataUrl = await renderPageThumbnail(pdfJsDocRef.current, pageNum, 2.0);
        setPreviewUrl(dataUrl);
      } catch (e) {
        console.error('Preview render failed:', e);
      }
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setDrawCurrent({ x, y });
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent || selectedPage === null) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    if (w > 0.01 && h > 0.01) {
      setRedactions(prev => ({
        ...prev,
        [selectedPage]: [...(prev[selectedPage] || []), { x, y, w, h }],
      }));
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [isDrawing, drawStart, drawCurrent, selectedPage]);

  const removeRedaction = useCallback((pageNum, idx) => {
    setRedactions(prev => {
      const updated = { ...prev };
      updated[pageNum] = updated[pageNum].filter((_, i) => i !== idx);
      if (updated[pageNum].length === 0) delete updated[pageNum];
      return updated;
    });
  }, []);

  const totalRedactions = Object.values(redactions).reduce((sum, arr) => sum + arr.length, 0);
  const redactedPageCount = Object.keys(redactions).length;

  const handleProcess = useCallback(async () => {
    if (!fileBytes || totalRedactions === 0) return;
    setLoading(true);
    setLoadingStep('Preparing…');
    setError(null);

    try {
      const { pdfDoc: sourceDoc, isEncrypted } = await loadPdfLibDocument(fileBytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      // Use the existing pdfjs doc for rendering; reload if it was destroyed.
      let pdfJsDoc = pdfJsDocRef.current;
      if (!pdfJsDoc) {
        pdfJsDoc = await loadPdfDocument(fileBytes.slice());
        pdfJsDocRef.current = pdfJsDoc;
      }

      const newDoc = await PDFDocument.create();
      const totalPages = sourceDoc.getPageCount();
      const redactedPageNums = new Set(
        Object.entries(redactions)
          .filter(([, rects]) => rects.length > 0)
          .map(([k]) => parseInt(k, 10))
      );
      const scale = REDACTION_DPI / 72;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setLoadingStep(`Processing page ${pageNum} of ${totalPages}…`);

        if (redactedPageNums.has(pageNum)) {
          // Rasterize: render page → paint black rects on canvas → embed as JPEG.
          // Underlying text/vectors are discarded; only pixels remain.
          const page = await pdfJsDoc.getPage(pageNum);
          const baseVp = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(vp.width));
          canvas.height = Math.max(1, Math.floor(vp.height));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          ctx.fillStyle = '#000000';
          for (const rect of redactions[pageNum]) {
            ctx.fillRect(
              rect.x * canvas.width,
              rect.y * canvas.height,
              rect.w * canvas.width,
              rect.h * canvas.height
            );
          }

          const blob = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', REDACTION_JPEG_QUALITY)
          );
          canvas.remove();
          page.cleanup();

          if (!blob) throw new Error(`Failed to encode page ${pageNum} as image.`);
          const arrBuf = await blob.arrayBuffer();
          const jpg = await newDoc.embedJpg(arrBuf);
          const newPage = newDoc.addPage([baseVp.width, baseVp.height]);
          newPage.drawImage(jpg, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
        } else {
          // No redactions on this page — copy it intact so text stays selectable.
          const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageNum - 1]);
          newDoc.addPage(copiedPage);
        }
      }

      setLoadingStep('Stripping metadata & attachments…');
      const stripStats = stripRedactionDeadweight(newDoc);

      setLoadingStep('Saving…');
      const resultBytes = await newDoc.save({ useObjectStreams: false });

      setLoadingStep('Verifying text is gone…');
      const verifyStats = await verifyRedactedPagesAreImages(
        resultBytes,
        Array.from(redactedPageNums).sort((a, b) => a - b)
      );
      if (verifyStats.leakedPages.length > 0) {
        const pages = verifyStats.leakedPages.map(p => p.pageNum).join(', ');
        throw new Error(
          `Verification failed — text was still extractable on page${verifyStats.leakedPages.length === 1 ? '' : 's'} ${pages}. The file has NOT been downloaded. Please report this.`
        );
      }

      const blob = new Blob([resultBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'redacted', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: resultBytes.byteLength,
        downloadUrl: url,
        stripStats,
        verifyStats,
        redactedPageCount: redactedPageNums.size,
        totalRedactions,
      });
    } catch (e) {
      console.error('[PDFRedaction]', e);
      setError(e.message || 'Something went wrong while redacting the PDF. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [fileBytes, file, redactions, totalRedactions]);

  const handleRemoveFile = useCallback(() => {
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setSelectedPage(null);
    setRedactions({});
    setPreviewUrl(null);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setSelectedPage(null);
    setRedactions({});
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard
          description={tool.description}
          limitations={[
            'Redacted pages are flattened to images — text on those pages is no longer selectable, searchable, or screen-reader accessible',
            'Pages without redactions stay vector; redact elsewhere if those pages also hold sensitive content',
            'Scanned image content behind a redaction is also destroyed; embedded OCR text is overwritten along with the visible text',
          ]}
        />

        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
          padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
          background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)',
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--accent-green)', marginTop: 1 }} />
          <div>
            <strong style={{ color: 'var(--accent-green)' }}>
              Verified: no extractable text remains in redacted regions.
            </strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              {result.totalRedactions} redaction{result.totalRedactions === 1 ? '' : 's'} across{' '}
              {result.redactedPageCount} page{result.redactedPageCount === 1 ? '' : 's'}.
              Redacted pages were rasterized to images at {REDACTION_DPI} DPI and the output was
              re-opened with pdfjs to confirm zero selectable text on those pages.
              {result.stripStats?.stripped?.length > 0 && (
                <> Also stripped: {result.stripStats.stripped.join(', ')}.</>
              )}
            </p>
          </div>
        </div>

        <ResultPanel
          filename={result.filename}
          originalSize={result.originalSize}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  const drawRect = isDrawing && drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  return (
    <div>
      <InfoCard
        description="Permanently remove sensitive content from a PDF. Redacted pages are rasterized to images so the underlying text is physically destroyed, not just visually covered — safe for PHIPA, PIPEDA, and TCPS 2 disclosure workflows. Your file never leaves your browser."
        limitations={[
          'Pages with redactions become images — text on those pages will no longer be selectable, searchable, or screen-reader accessible',
          'Pages without redactions stay as vector text; redact on every page where sensitive content appears',
          'Form-field values, bookmarks, embedded attachments, document metadata, and annotations are also stripped from the output',
        ]}
      />

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
        padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)',
        borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)',
      }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--accent-green)', marginTop: 1 }} />
        <span>
          <strong>True redaction.</strong> When you redact a page, that page is rasterized to a {REDACTION_DPI} DPI image and re-embedded — the original text stream is not carried into the output, so copy/paste, search, and text-extraction tools cannot recover what was behind the black rectangles. The result is verified with pdfjs before download.
        </span>
      </div>

      {error === '__encrypted__' ? (
        <EncryptedPDFError onNavigate={navigateTo} />
      ) : error ? (
        <ErrorCard title="Error" message={error} />
      ) : null}

      {!file && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF file here or click to browse"
        />
      )}

      {file && pageCount > 0 && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <span className="tool-file-size">{pageCount} pages</span>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(100, s - 40))} disabled={thumbSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
            Click a page to select it for redaction. Pages with redactions are highlighted and will be rasterized to images in the output.
          </p>

          <div className="thumbnail-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
            {Array.from({ length: pageCount }, (_, i) => {
              const pageNum = i + 1;
              const hasRedactions = redactions[pageNum] && redactions[pageNum].length > 0;
              const isActive = selectedPage === pageNum;
              return (
                <div
                  key={pageNum}
                  className={`thumbnail-card ${isActive ? 'thumbnail-card--selected' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--accent-cyan)' : hasRedactions ? 'var(--accent-red)' : undefined,
                    boxShadow: isActive ? '0 0 0 1px var(--accent-cyan)' : hasRedactions ? '0 0 0 1px var(--accent-red)' : undefined,
                  }}
                  onClick={() => handleSelectPage(pageNum)}
                >
                  <LazyThumbnail
                    pageNum={pageNum}
                    pdfJsDocRef={pdfJsDocRef}
                    cached={thumbnails[pageNum]}
                    onRender={(n, url) => setThumbnails(prev => ({ ...prev, [n]: url }))}
                  />
                  <span className="thumbnail-label">
                    {pageNum}
                    {hasRedactions && ` (${redactions[pageNum].length})`}
                  </span>
                </div>
              );
            })}
          </div>

          {selectedPage && previewUrl && (
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)',
              marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Page {selectedPage} — Draw rectangles to redact
                </p>
                {redactions[selectedPage] && redactions[selectedPage].length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {redactions[selectedPage].length} redaction{redactions[selectedPage].length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div
                ref={canvasContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  position: 'relative', cursor: 'crosshair', display: 'inline-block',
                  maxWidth: '100%', userSelect: 'none',
                }}
              >
                <img
                  src={previewUrl}
                  alt={`Page ${selectedPage} preview`}
                  draggable={false}
                  style={{ maxWidth: '100%', display: 'block', borderRadius: 'var(--radius-sm)' }}
                />

                {(redactions[selectedPage] || []).map((rect, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
                      width: `${rect.w * 100}%`, height: `${rect.h * 100}%`,
                      background: 'rgba(0, 0, 0, 0.85)',
                      border: '1px solid rgba(255, 0, 0, 0.5)',
                      borderRadius: 2,
                    }}
                    title={`Redaction ${idx + 1} — click to remove`}
                    onClick={(e) => { e.stopPropagation(); removeRedaction(selectedPage, idx); }}
                  />
                ))}

                {drawRect && (
                  <div style={{
                    position: 'absolute',
                    left: `${drawRect.x * 100}%`, top: `${drawRect.y * 100}%`,
                    width: `${drawRect.w * 100}%`, height: `${drawRect.h * 100}%`,
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '2px dashed rgba(255, 0, 0, 0.8)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>

              {redactions[selectedPage] && redactions[selectedPage].length > 0 && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Click on a black rectangle above to remove it.
                  </p>
                </div>
              )}
            </div>
          )}

          {totalRedactions > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
              padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)',
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, color: 'var(--accent-amber)', marginTop: 1 }} />
              <span>
                <strong>Heads up:</strong> {totalRedactions} redaction{totalRedactions === 1 ? '' : 's'} on{' '}
                {redactedPageCount} page{redactedPageCount === 1 ? '' : 's'} — those page{redactedPageCount === 1 ? '' : 's'}{' '}
                will be flattened to images in the output. Text on them won't be selectable or searchable afterwards.
                File size of those pages will also grow.
              </span>
            </div>
          )}

          <ActionButton
            label={loading && loadingStep ? loadingStep : `Redact ${totalRedactions} Area${totalRedactions !== 1 ? 's' : ''}`}
            onClick={handleProcess}
            disabled={!fileBytes || totalRedactions === 0}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
