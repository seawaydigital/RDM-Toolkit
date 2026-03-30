import { useState, useCallback, useRef } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut, Download, RotateCcw } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
];
const SCALES = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
];

export default function PDFToImages({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbSize, setThumbSize] = useState(140);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { files: [...], zipUrl, zipFilename, zipSize }

  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(2);

  const pdfJsDocRef = useRef(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setThumbnails({});
    setPageCount(0);

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
      console.error('[PDFToImages] file load error:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!fileBytes || !pdfJsDocRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const pdfJsDoc = pdfJsDocRef.current;
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '-');
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpg' ? 'jpg' : 'png';

      const outputFiles = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfJsDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // Fill white background for JPG (transparent -> white)
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(resolve => {
          if (format === 'jpg') {
            canvas.toBlob(resolve, mimeType, quality / 100);
          } else {
            canvas.toBlob(resolve, mimeType);
          }
        });

        canvas.remove();

        const filename = pageCount === 1
          ? `${baseName}.${ext}`
          : `${baseName}-page-${i}.${ext}`;
        const url = URL.createObjectURL(blob);

        outputFiles.push({ filename, size: blob.size, url, blob, pageNum: i });
      }

      if (pageCount === 1) {
        // Single page - direct download
        setResult({ files: outputFiles, zipUrl: null, zipFilename: null, zipSize: null });
      } else {
        // Multiple pages - create ZIP
        const zip = new JSZip();
        for (const f of outputFiles) {
          zip.file(f.filename, f.blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipFilename = buildOutputFilename(file.name, 'as-images', 'zip');

        setResult({
          files: outputFiles,
          zipUrl,
          zipFilename,
          zipSize: zipBlob.size,
        });
      }
    } catch (e) {
      console.error('[PDFToImages]', e);
      setError('Something went wrong while converting pages to images. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, pageCount, format, quality, scale]);

  const handleRemoveFile = useCallback(() => {
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result) {
      result.files.forEach(f => URL.revokeObjectURL(f.url));
      if (result.zipUrl) URL.revokeObjectURL(result.zipUrl);
    }
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setResult(null);
    setError(null);
  }, [result]);

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ---- results view ---- */
  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            Converted {result.files.length} page{result.files.length !== 1 ? 's' : ''} to {format.toUpperCase()}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {result.files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                padding: 'var(--space-md)', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {f.filename}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Page {f.pageNum} &middot; {formatFileSize(f.size)}
                  </p>
                </div>
                <button
                  onClick={() => triggerDownload(f.url, f.filename)}
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

        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          {result.zipUrl && (
            <button
              onClick={() => triggerDownload(result.zipUrl, result.zipFilename)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                background: 'var(--accent-cyan)', color: '#0F172A', fontWeight: 600,
                fontSize: 14, borderRadius: 'var(--radius-md)',
              }}
            >
              <Download size={16} />
              Download All as ZIP ({formatFileSize(result.zipSize)})
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
        description="Convert each page of your PDF into a high-quality image. Choose PNG for lossless quality or JPG for smaller file sizes. Multiple pages are packaged into a ZIP. Your file never leaves your browser."
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

          {/* Options panel */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Export Options
            </p>

            {/* Format */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Format</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      background: format === f.value ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: format === f.value ? '#0F172A' : 'var(--text-primary)',
                      border: format === f.value ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality (JPG only) */}
            {format === 'jpg' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={e => setQuality(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            )}

            {/* Scale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scale</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {SCALES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setScale(s.value)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      background: scale === s.value ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: scale === s.value ? '#0F172A' : 'var(--text-primary)',
                      border: scale === s.value ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Higher scale = larger, sharper images. 2x is recommended for most uses.
              </p>
            </div>
          </div>

          {/* Thumbnail grid */}
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
              return (
                <div key={pageNum} className="thumbnail-card">
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
            label={`Convert ${pageCount} Page${pageCount !== 1 ? 's' : ''} to ${format.toUpperCase()}`}
            onClick={handleProcess}
            disabled={!fileBytes}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
