import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

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
      // Thumbnails are rendered lazily via IntersectionObserver — see LazyThumbnail component
    } catch (e) {
      console.error('[PDFRedaction] file load error:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleSelectPage = useCallback(async (pageNum) => {
    setSelectedPage(pageNum);
    // Render a larger preview for drawing
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

    // Only add if rectangle is meaningful (at least 1% in each dimension)
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

  const handleProcess = useCallback(async () => {
    if (!fileBytes || totalRedactions === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(fileBytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      const pages = pdfDoc.getPages();

      for (const [pageNumStr, rects] of Object.entries(redactions)) {
        const pageIdx = parseInt(pageNumStr, 10) - 1;
        const page = pages[pageIdx];
        if (!page) continue;
        const { width, height } = page.getSize();

        for (const rect of rects) {
          // Convert from normalized (0-1, top-left origin) to PDF coords (bottom-left origin)
          const pdfX = rect.x * width;
          const pdfY = height - (rect.y + rect.h) * height;
          const pdfW = rect.w * width;
          const pdfH = rect.h * height;

          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(0, 0, 0),
            opacity: 1,
          });
        }
      }

      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'redacted', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: resultBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('[PDFRedaction]', e);
      setError('Something went wrong while redacting the PDF. Please try again.');
    } finally {
      setLoading(false);
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
            'Draws black rectangles over content visually only',
            'Underlying text data may still be extractable by specialist tools',
            "For sensitive documents, consult your institution's IT security team",
          ]}
        />
        {/* Prominent permanence warning on result screen */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
          padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
          background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.5)',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, color: '#EF4444', marginTop: 1 }} />
          <div>
            <strong style={{ color: '#EF4444' }}>This is NOT legally compliant redaction.</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              Black rectangles hide content visually but the underlying text remains in the PDF file and can be extracted with freely available tools. Do not use this for legally sensitive, confidential, or regulated documents. Use a dedicated redaction tool (e.g., Adobe Acrobat's redaction feature) for legally binding redaction.
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

  // Get the current drawing rectangle for overlay
  const drawRect = isDrawing && drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  return (
    <div>
      <InfoCard
        description="Visually redact areas of your PDF by drawing black rectangles over sensitive content. Select a page, then click and drag to mark areas for redaction. Your file never leaves your browser."
        limitations={[
          'Draws black rectangles over content visually only',
          'Underlying text data may still be extractable by specialist tools',
          "For sensitive documents, consult your institution's IT security team",
        ]}
      />

      {/* Warning banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
        padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
        background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)',
      }}>
        <AlertTriangle size={18} style={{ flexShrink: 0, color: '#F59E0B', marginTop: 1 }} />
        <span>
          <strong>Visual redaction only.</strong> This tool covers content with black rectangles but does not remove the underlying text data from the PDF. For legally sensitive documents, use a professional redaction tool that strips the text layer.
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

          {/* Thumbnail grid - click to select page */}
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
            Click a page to select it for redaction. Pages with redactions are highlighted.
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

          {/* Drawing area for selected page */}
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

                {/* Existing redaction rectangles */}
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

                {/* Active drawing rectangle */}
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

              {/* Redaction list for this page */}
              {redactions[selectedPage] && redactions[selectedPage].length > 0 && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Click on a black rectangle above to remove it.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {totalRedactions > 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
              {totalRedactions} redaction{totalRedactions !== 1 ? 's' : ''} across{' '}
              {Object.keys(redactions).length} page{Object.keys(redactions).length !== 1 ? 's' : ''}
            </p>
          )}

          <ActionButton
            label={`Redact ${totalRedactions} Area${totalRedactions !== 1 ? 's' : ''}`}
            onClick={handleProcess}
            disabled={!fileBytes || totalRedactions === 0}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
