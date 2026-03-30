import { useState, useCallback, useMemo, useRef } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { X, ZoomIn, ZoomOut, Download, Plus, Trash2, RotateCcw } from 'lucide-react';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

function parsePageRanges(rangeStr, totalPages) {
  if (!rangeStr.trim()) return { pages: [], error: null };
  const pages = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages)
        return { pages: [], error: `Page numbers must be between 1 and ${totalPages}.` };
      if (start > end)
        return { pages: [], error: `Invalid range: ${start}-${end}.` };
      for (let i = start; i <= end; i++) pages.add(i);
    } else if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num < 1 || num > totalPages)
        return { pages: [], error: `Page ${num} is out of range (1-${totalPages}).` };
      pages.add(num);
    } else {
      return { pages: [], error: `"${trimmed}" is not a valid page number or range.` };
    }
  }
  return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}

export default function SplitPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbSize, setThumbSize] = useState(140);
  const pdfJsDocRef = useRef(null);

  // Split definitions: array of { id, label, rangeStr }
  const [splits, setSplits] = useState([{ id: 1, label: 'Part 1', rangeStr: '' }]);
  const nextId = useRef(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // array of { filename, size, url }
  const [zipResult, setZipResult] = useState(null); // { filename, size, url }

  // Parse all splits and check for errors/overlaps
  const parsedSplits = useMemo(() => {
    return splits.map(s => ({
      ...s,
      parsed: parsePageRanges(s.rangeStr, pageCount),
    }));
  }, [splits, pageCount]);

  const validationError = useMemo(() => {
    for (const s of parsedSplits) {
      if (s.parsed.error) return `${s.label}: ${s.parsed.error}`;
    }
    const allEmpty = parsedSplits.every(s => s.parsed.pages.length === 0);
    if (allEmpty) return null; // not an error, just not ready
    return null;
  }, [parsedSplits]);

  const canSplit = !validationError && parsedSplits.some(s => s.parsed.pages.length > 0);

  // Highlighted pages across all splits
  const highlightedPages = useMemo(() => {
    const map = new Map(); // pageNum -> splitIndex
    parsedSplits.forEach((s, idx) => {
      s.parsed.pages.forEach(p => {
        if (!map.has(p)) map.set(p, idx);
      });
    });
    return map;
  }, [parsedSplits]);

  const SPLIT_COLORS = ['#FFC20E', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#F59E0B', '#EC4899', '#14B8A6'];

  /* ---- file upload ---- */
  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResults(null);
    setZipResult(null);
    setThumbnails({});
    setPageCount(0);
    setSplits([{ id: 1, label: 'Part 1', rangeStr: '' }]);
    nextId.current = 2;

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
      renderAllThumbnails(pdfJsDoc, (pageNum, dataUrl) => {
        setThumbnails(prev => ({ ...prev, [pageNum]: dataUrl }));
      });
    } catch (e) {
      console.error('[SplitPDF] file load error:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  /* ---- split management ---- */
  function addSplit() {
    const id = nextId.current++;
    setSplits(prev => [...prev, { id, label: `Part ${prev.length + 1}`, rangeStr: '' }]);
  }

  function removeSplit(id) {
    setSplits(prev => {
      const next = prev.filter(s => s.id !== id);
      return next.map((s, i) => ({ ...s, label: `Part ${i + 1}` }));
    });
  }

  function updateSplitRange(id, rangeStr) {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, rangeStr } : s));
  }

  /* ---- process ---- */
  const handleSplit = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc: srcDoc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '-');
      const zip = new JSZip();
      const outputFiles = [];

      for (let i = 0; i < parsedSplits.length; i++) {
        const split = parsedSplits[i];
        if (split.parsed.pages.length === 0) continue;

        const newDoc = await PDFDocument.create();
        const indices = split.parsed.pages.map(p => p - 1);
        const copiedPages = await newDoc.copyPages(srcDoc, indices);
        for (const page of copiedPages) {
          newDoc.addPage(page);
        }
        const pdfBytes = await newDoc.save();
        const rangeLabel = split.rangeStr.replace(/\s/g, '') || `part${i + 1}`;
        const filename = `${baseName}-${rangeLabel}.pdf`;

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        zip.file(filename, pdfBytes);

        outputFiles.push({
          filename,
          size: pdfBytes.byteLength,
          url,
          pageCount: split.parsed.pages.length,
          label: split.label,
        });
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);

      setResults(outputFiles);
      setZipResult({
        filename: `${baseName}-split.zip`,
        size: zipBlob.size,
        url: zipUrl,
      });
    } catch (e) {
      console.error('[SplitPDF]', e);
      if (e.message && (e.message.includes('encrypted') || e.message.includes('password'))) {
        setError('__encrypted__');
      } else {
        setError('Something went wrong while splitting the PDF. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, parsedSplits]);

  /* ---- cleanup ---- */
  function handleRemoveFile() {
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setSplits([{ id: 1, label: 'Part 1', rangeStr: '' }]);
    nextId.current = 2;
    setError(null);
    setResults(null);
    setZipResult(null);
  }

  function handleStartOver() {
    if (results) results.forEach(r => URL.revokeObjectURL(r.url));
    if (zipResult) URL.revokeObjectURL(zipResult.url);
    handleRemoveFile();
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ---- results view ---- */
  if (results && results.length > 0) {
    return (
      <div>
        <InfoCard description={tool.description} />

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            Split into {results.length} file{results.length !== 1 ? 's' : ''}
          </h3>

          {/* Individual files */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {results.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                padding: 'var(--space-md)', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: SPLIT_COLORS[i % SPLIT_COLORS.length],
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {r.filename}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.pageCount} page{r.pageCount !== 1 ? 's' : ''} &middot; {formatFileSize(r.size)}
                  </p>
                </div>
                <button
                  onClick={() => triggerDownload(r.url, r.filename)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                    background: 'var(--accent-green)', color: '#0F172A', fontWeight: 600,
                    fontSize: 12, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  }}
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ZIP download + Start Over */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          {zipResult && (
            <button
              onClick={() => triggerDownload(zipResult.url, zipResult.filename)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                background: 'var(--accent-cyan)', color: '#0F172A', fontWeight: 600,
                fontSize: 14, borderRadius: 'var(--radius-md)',
              }}
            >
              <Download size={16} />
              Download All as ZIP ({formatFileSize(zipResult.size)})
            </button>
          )}
          <button
            onClick={handleStartOver}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              color: 'var(--text-muted)', fontSize: 14, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <RotateCcw size={14} />
            Start Over
          </button>
        </div>
      </div>
    );
  }

  /* ---- main view ---- */
  return (
    <div>
      <InfoCard
        description="Split a PDF into multiple separate files. Specify how many new PDFs you want and which pages go into each one. Download them individually or all at once as a ZIP."
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

          {/* Split definitions */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Output Files ({splits.length})
              </p>
              <button
                onClick={addSplit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                  fontSize: 12, fontWeight: 500, color: 'var(--accent-cyan)',
                  border: '1px solid var(--accent-cyan)', borderRadius: 'var(--radius-sm)',
                  background: 'none',
                }}
              >
                <Plus size={14} />
                Add Another
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {splits.map((split, idx) => {
                const parsed = parsedSplits[idx]?.parsed;
                return (
                  <div key={split.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                    borderLeft: `3px solid ${SPLIT_COLORS[idx % SPLIT_COLORS.length]}`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 50 }}>
                      {split.label}
                    </span>
                    <input
                      type="text"
                      value={split.rangeStr}
                      onChange={e => updateSplitRange(split.id, e.target.value)}
                      placeholder="e.g. 1-3, 5"
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: 13,
                        fontFamily: 'var(--font-mono)', background: 'var(--bg-primary)',
                        border: parsed?.error ? '1px solid var(--accent-red)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                      }}
                    />
                    {parsed?.pages.length > 0 && !parsed?.error && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {parsed.pages.length} pg{parsed.pages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {splits.length > 1 && (
                      <button
                        onClick={() => removeSplit(split.id)}
                        style={{ color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}
                        aria-label={`Remove ${split.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {validationError && (
              <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 'var(--space-sm)' }}>
                {validationError}
              </p>
            )}

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
              Enter page numbers or ranges for each output file. Example: "1-3" or "1, 4-6, 10". Pages can appear in multiple output files.
            </p>
          </div>

          {/* Thumbnail grid with color coding */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(100, s - 40))} disabled={thumbSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="thumbnail-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
            {Array.from({ length: pageCount }, (_, i) => {
              const pageNum = i + 1;
              const splitIdx = highlightedPages.get(pageNum);
              const isSelected = splitIdx !== undefined;
              const borderColor = isSelected ? SPLIT_COLORS[splitIdx % SPLIT_COLORS.length] : undefined;
              return (
                <div
                  key={pageNum}
                  className={`thumbnail-card ${isSelected ? 'thumbnail-card--selected' : ''}`}
                  style={isSelected ? { borderColor, boxShadow: `0 0 0 1px ${borderColor}` } : undefined}
                >
                  {thumbnails[pageNum] ? (
                    <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} className="thumbnail-image" />
                  ) : (
                    <div className="thumbnail-placeholder" />
                  )}
                  <span className="thumbnail-label">{pageNum}</span>
                </div>
              );
            })}
          </div>

          <ActionButton
            label={`Split into ${parsedSplits.filter(s => s.parsed.pages.length > 0).length} File${parsedSplits.filter(s => s.parsed.pages.length > 0).length !== 1 ? 's' : ''}`}
            onClick={handleSplit}
            disabled={!canSplit}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
