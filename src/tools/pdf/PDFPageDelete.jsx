import { useState, useCallback, useRef } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument, pdfHasFormFields } from '../../utils/pdfThumbnails';
import { FormFieldsNotice } from '../../components/ui/ToolCaveats';

export default function PDFPageDelete({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [hasFormFields, setHasFormFields] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbSize, setThumbSize] = useState(140);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Pages marked for deletion (Set of page numbers, 1-based)
  const [deletedPages, setDeletedPages] = useState(new Set());

  const pdfJsDocRef = useRef(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setThumbnails({});
    setPageCount(0);
    setDeletedPages(new Set());
    setHasFormFields(false);

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

      // Advisory form-field scan (copies bytes synchronously — safe to run
      // before the thumbnail render below slices this buffer).
      pdfHasFormFields(bytesCopy).then(setHasFormFields);

      if (pdfJsDocRef.current) pdfJsDocRef.current.destroy();
      const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
      pdfJsDocRef.current = pdfJsDoc;
      renderAllThumbnails(pdfJsDoc, (pageNum, dataUrl) => {
        setThumbnails(prev => ({ ...prev, [pageNum]: dataUrl }));
      });
    } catch (e) {
      console.error('[PDFPageDelete] file load error:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const togglePage = useCallback((pageNum) => {
    setDeletedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        // Prevent deleting all pages
        if (next.size >= pageCount - 1) return prev;
        next.add(pageNum);
      }
      return next;
    });
  }, [pageCount]);

  const keepCount = pageCount - deletedPages.size;
  const deleteCount = deletedPages.size;

  const handleProcess = useCallback(async () => {
    if (!fileBytes || deleteCount === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc: srcDoc, isEncrypted } = await loadPdfLibDocument(fileBytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      const newDoc = await PDFDocument.create();
      // Copy only non-deleted pages
      const indicesToKeep = [];
      for (let i = 1; i <= pageCount; i++) {
        if (!deletedPages.has(i)) {
          indicesToKeep.push(i - 1);
        }
      }

      const copiedPages = await newDoc.copyPages(srcDoc, indicesToKeep);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }

      const resultBytes = await newDoc.save();
      const blob = new Blob([resultBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'pages-deleted', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: resultBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('[PDFPageDelete]', e);
      if (e.message && (e.message.includes('encrypted') || e.message.includes('password'))) {
        setError('__encrypted__');
      } else {
        setError('Something went wrong while deleting pages. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, pageCount, deletedPages, deleteCount]);

  const handleRemoveFile = useCallback(() => {
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setDeletedPages(new Set());
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setDeletedPages(new Set());
    setResult(null);
    setError(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />
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

  return (
    <div>
      <InfoCard
        description="Remove unwanted pages from your PDF. Click on page thumbnails to mark them for deletion, then process to create a new PDF without those pages. Your file never leaves your browser."
      />

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

          {/* Summary bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', fontSize: 13,
          }}>
            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
              Keeping: {keepCount} page{keepCount !== 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>&middot;</span>
            <span style={{ color: deleteCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 600 }}>
              Deleting: {deleteCount} page{deleteCount !== 1 ? 's' : ''}
            </span>
            {deletedPages.size >= pageCount - 1 && deletedPages.size > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>&middot;</span>
                <span style={{ fontSize: 11, color: 'var(--accent-red)' }}>
                  Must keep at least 1 page
                </span>
              </>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
            Click a page to mark it for deletion. Click again to un-mark it.
          </p>

          {/* Zoom controls */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(100, s - 40))} disabled={thumbSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Thumbnail grid */}
          <div className="thumbnail-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
            {Array.from({ length: pageCount }, (_, i) => {
              const pageNum = i + 1;
              const isDeleted = deletedPages.has(pageNum);
              return (
                <div
                  key={pageNum}
                  className={`thumbnail-card ${isDeleted ? 'thumbnail-card--selected' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: isDeleted ? 'var(--accent-red)' : undefined,
                    boxShadow: isDeleted ? '0 0 0 1px var(--accent-red)' : undefined,
                    position: 'relative',
                  }}
                  onClick={() => togglePage(pageNum)}
                >
                  {thumbnails[pageNum] ? (
                    <img
                      src={thumbnails[pageNum]}
                      alt={`Page ${pageNum}`}
                      className="thumbnail-image"
                      style={{ opacity: isDeleted ? 0.3 : 1 }}
                    />
                  ) : (
                    <div className="thumbnail-placeholder" />
                  )}

                  {/* Red overlay with X for deleted pages */}
                  {isDeleted && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <X size={Math.max(24, thumbSize * 0.3)} style={{ color: 'var(--accent-red)', strokeWidth: 3 }} />
                    </div>
                  )}

                  <span className="thumbnail-label" style={{ color: isDeleted ? 'var(--accent-red)' : undefined }}>
                    {pageNum}
                  </span>
                </div>
              );
            })}
          </div>

          {hasFormFields && <FormFieldsNotice action="deleting pages" />}

          <ActionButton
            label={`Delete ${deleteCount} Page${deleteCount !== 1 ? 's' : ''}`}
            onClick={handleProcess}
            disabled={!fileBytes || deleteCount === 0}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
