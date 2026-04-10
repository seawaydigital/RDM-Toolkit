import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import DropZone from '../../components/ui/DropZone.jsx';
import InfoCard from '../../components/ui/InfoCard.jsx';
import ErrorCard from '../../components/ui/ErrorCard.jsx';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError.jsx';
import ResultPanel from '../../components/ui/ResultPanel.jsx';
import { validatePDFHeader } from '../../utils/fileValidation.js';
import { loadPdfDocument, loadPdfLibDocument, renderPageThumbnail } from '../../utils/pdfThumbnails.js';
import { buildOutputFilename } from '../../utils/filename.js';

// Standard page sizes in PDF points (1 pt = 1/72 inch)
const STANDARD_SIZES = [
  { id: 'letter',    label: 'Letter',    w: 612, h: 792  },
  { id: 'a4',        label: 'A4',        w: 595, h: 842  },
  { id: 'legal',     label: 'Legal',     w: 612, h: 1008 },
  { id: 'a3',        label: 'A3',        w: 842, h: 1191 },
  { id: 'a5',        label: 'A5',        w: 420, h: 595  },
  { id: 'tabloid',   label: 'Tabloid',   w: 792, h: 1224 },
  { id: 'executive', label: 'Executive', w: 522, h: 756  },
  { id: 'b5',        label: 'B5',        w: 499, h: 709  },
];

const PDF_VALIDATION = { maxSizeMB: 500, mimeTypes: ['application/pdf'] };

// Match page dimensions to a standard size.
// Returns { label, variant } — variant is 'exact' | 'close' | 'custom'
function matchSize(wPt, hPt) {
  for (const size of STANDARD_SIZES) {
    for (const [sw, sh] of [[size.w, size.h], [size.h, size.w]]) {
      const dw = Math.abs(wPt - sw);
      const dh = Math.abs(hPt - sh);
      if (dw <= 5 && dh <= 5) return { label: size.label, variant: 'exact' };
      if (dw <= 20 && dh <= 20) return { label: `~${size.label}`, variant: 'close' };
    }
  }
  return { label: 'Custom', variant: 'custom' };
}

function parsePageRange(input, pageCount) {
  const pages = new Set();
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > pageCount) return { pages: null, error: `Page ${n} out of range (1–${pageCount})` };
      pages.add(n);
    } else if (/^\d+-\d+$/.test(part)) {
      const [a, b] = part.split('-').map(Number);
      if (a > b) return { pages: null, error: `Invalid range "${part}" — start must be ≤ end` };
      if (a < 1 || b > pageCount) return { pages: null, error: `Range "${part}" out of bounds (1–${pageCount})` };
      for (let i = a; i <= b; i++) pages.add(i);
    } else {
      return { pages: null, error: `Invalid input "${part}" — use numbers and ranges like "1–3, 5"` };
    }
  }
  if (pages.size === 0) return { pages: null, error: 'Enter at least one page number' };
  return { pages, error: null };
}

// Resolve the effective method when Crop/Pad cannot apply to the dimension change direction.
// Silently falls back: Pad→Crop when target is smaller, Crop→Pad when target is larger.
function resolveMethod(method, currentW, currentH, targetW, targetH) {
  const larger = targetW > currentW || targetH > currentH;
  const smaller = targetW < currentW || targetH < currentH;
  if (method === 'pad' && smaller) return 'crop';
  if (method === 'crop' && larger) return 'pad';
  return method;
}


function PageCard({ page, units, thumbnail, pdfJsDocRef, onThumbnailReady }) {
  const ref = useRef(null);

  useEffect(() => {
    if (thumbnail) return; // already loaded
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (!pdfJsDocRef.current) return;
        try {
          const dataUrl = await renderPageThumbnail(pdfJsDocRef.current, page.pageNum);
          onThumbnailReady(page.pageNum, dataUrl);
        } catch {
          // silently skip — placeholder stays
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbnail, page.pageNum, onThumbnailReady]);

  const dimStr = units === 'in'
    ? `${page.widthIn.toFixed(2)}" × ${page.heightIn.toFixed(2)}"`
    : `${page.widthMm.toFixed(1)} × ${page.heightMm.toFixed(1)} mm`;

  return (
    <div ref={ref} className="pi-page-card">
      {thumbnail
        ? <img className="pi-page-thumbnail" src={thumbnail} alt={`Page ${page.pageNum}`} />
        : <div className="pi-page-thumbnail pi-page-thumbnail--placeholder" />}
      <div className="pi-page-number">Page {page.pageNum}</div>
      <div className="pi-page-dims">{dimStr}</div>
      <span className={`pi-page-badge pi-page-badge--${page.variant}`}>{page.label}</span>
      {page.rotationDeg !== 0 && (
        <div className="pi-page-rotation">Rotated {page.rotationDeg}°</div>
      )}
    </div>
  );
}

export default function PdfPageInspector({ navigateTo }) {
  const [file, setFile] = useState(null);
  // Retained for the resize pipeline — pdf-lib reloads raw bytes in Task 5
  const [fileBytes, setFileBytes] = useState(null);
  const [pageInfo, setPageInfo] = useState([]);
  const [summary, setSummary] = useState(null);
  const [units, setUnits] = useState('in');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [thumbnailMap, setThumbnailMap] = useState({});
  const pdfJsDocRef = useRef(null);

  // Resize result state
  const [resizing, setResizing] = useState(false);
  const [resizeError, setResizeError] = useState(null);
  const [result, setResult] = useState(null);

  // Resize panel state
  const [resizeOpen, setResizeOpen] = useState(false);
  const [targetFormat, setTargetFormat] = useState('a4');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [resizeMethod, setResizeMethod] = useState('scale');
  const [pageRange, setPageRange] = useState('all');
  const [pageRangeInput, setPageRangeInput] = useState('');
  const [pageRangeError, setPageRangeError] = useState(null);

  // AcroForm detection
  const [hasFormFields, setHasFormFields] = useState(false);

  const canResize = (() => {
    if (!file || !summary) return false;
    if (targetFormat === 'custom') {
      const w = parseFloat(customW);
      const h = parseFloat(customH);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return false;
    }
    if (pageRange === 'custom') {
      const { error } = parsePageRange(pageRangeInput, summary.pageCount);
      if (error) return false;
    }
    return true;
  })();

  const handleFileSelected = useCallback(async ([selected]) => {
    setError(null);
    setPageInfo([]);
    setSummary(null);

    const valid = await validatePDFHeader(selected);
    if (!valid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    setLoading(true);
    try {
      const rawBytes = await selected.arrayBuffer();
      const bytes = new Uint8Array(rawBytes);

      // Check encryption via pdf-lib; also detect AcroForm fields
      const { pdfDoc: libDoc, isEncrypted } = await loadPdfLibDocument(bytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        setLoading(false);
        return;
      }

      setFile(selected);
      setFileBytes(bytes);

      // Load with pdfjs-dist for dimension inspection
      const pdfJsDoc = await loadPdfDocument(bytes.slice());
      pdfJsDocRef.current = pdfJsDoc;
      const numPages = pdfJsDoc.numPages;
      const pages = [];
      let hasWidgets = false;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfJsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const wPt = viewport.width;
        const hPt = viewport.height;
        const rotationDeg = page.rotate;
        const { label, variant } = matchSize(wPt, hPt);
        pages.push({
          pageNum: i,
          widthPt: wPt,
          heightPt: hPt,
          widthIn: wPt / 72,
          heightIn: hPt / 72,
          widthMm: (wPt / 72) * 25.4,
          heightMm: (hPt / 72) * 25.4,
          label,
          variant,
          isPortrait: hPt >= wPt,
          rotationDeg,
        });

        // Detect form fields / signature boxes via Widget annotations.
        // pdfjs-dist handles this more reliably than pdf-lib's catalog API
        // for XFA forms, digital signatures, and other edge cases.
        if (!hasWidgets) {
          try {
            const annotations = await page.getAnnotations();
            if (annotations.some(a => a.subtype === 'Widget')) hasWidgets = true;
          } catch {
            // silently skip — annotation parsing failure doesn't block inspection
          }
        }
      }

      setHasFormFields(hasWidgets);

      setPageInfo(pages);

      // Build summary
      const distinctSizes = [...new Set(pages.map(p => `${p.widthPt}x${p.heightPt}`))];
      const allSame = distinctSizes.length === 1;
      const dominantLabel = allSame ? pages[0].label : null;
      setSummary({ pageCount: numPages, distinctSizes: distinctSizes.length, allSame, dominantLabel });
    } catch (e) {
      console.error(e);
      setError('Failed to load PDF. The file may be corrupted or in an unsupported format.');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleRemove() {
    setFile(null);
    setFileBytes(null);
    setPageInfo([]);
    setSummary(null);
    setError(null);
    setThumbnailMap({});
    pdfJsDocRef.current = null;
    setResult(null);
    setResizeError(null);
    setResizing(false);
    setResizeOpen(false);
    setHasFormFields(false);
  }

  function handleUnitsToggle(u) {
    if (u === units) return;
    if (customW !== '') {
      const wNum = parseFloat(customW);
      if (!isNaN(wNum)) {
        setCustomW(u === 'mm' ? (wNum * 25.4).toFixed(1) : (wNum / 25.4).toFixed(2));
      }
    }
    if (customH !== '') {
      const hNum = parseFloat(customH);
      if (!isNaN(hNum)) {
        setCustomH(u === 'mm' ? (hNum * 25.4).toFixed(1) : (hNum / 25.4).toFixed(2));
      }
    }
    setUnits(u);
  }

  function handlePageRangeInput(val) {
    setPageRangeInput(val);
    if (!val.trim()) {
      setPageRangeError('Enter at least one page number');
      return;
    }
    const { error } = parsePageRange(val, summary?.pageCount ?? 0);
    setPageRangeError(error);
  }

  const handleThumbnailReady = useCallback((pageNum, dataUrl) => {
    setThumbnailMap(prev => ({ ...prev, [pageNum]: dataUrl }));
  }, []);

  useEffect(() => {
    return () => {
      if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    };
  }, [result]);

  async function handleResize() {
    setResizing(true);
    setResizeError(null);
    setResult(null);

    try {
      const { pdfDoc: srcDoc, isEncrypted } = await loadPdfLibDocument(fileBytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setResizeError('This PDF is encrypted. Remove the password first.');
        return;
      }

      // Resolve target dimensions in points
      let targetW, targetH;
      if (targetFormat === 'custom') {
        const w = parseFloat(customW);
        const h = parseFloat(customH);
        targetW = units === 'in' ? w * 72 : (w / 25.4) * 72;
        targetH = units === 'in' ? h * 72 : (h / 25.4) * 72;
      } else {
        const size = STANDARD_SIZES.find(s => s.id === targetFormat);
        targetW = size.w;
        targetH = size.h;
      }

      // Resolve which pages to resize
      let pagesToProcess;
      if (pageRange === 'all') {
        pagesToProcess = new Set(pageInfo.map(p => p.pageNum));
      } else {
        const { pages, error } = parsePageRange(pageRangeInput, summary.pageCount);
        if (error) { setResizeError(error); return; }
        pagesToProcess = pages;
      }

      // Build output by embedding each source page as an XObject and drawing
      // it onto a fresh page. This creates clean content streams that are
      // compatible with all PDF viewers including Adobe Acrobat.
      const outDoc = await PDFDocument.create();
      const srcPages = srcDoc.getPages();
      const embeddedPages = [];
      for (const sp of srcPages) {
        embeddedPages.push(await outDoc.embedPage(sp));
      }

      for (let i = 0; i < srcPages.length; i++) {
        const pageNum = i + 1;
        const { width: currentW, height: currentH } = srcPages[i].getSize();

        if (!pagesToProcess.has(pageNum)) {
          const p = outDoc.addPage([currentW, currentH]);
          p.drawPage(embeddedPages[i]);
          continue;
        }

        // Orient target to match source page orientation
        const srcIsPortrait = currentH >= currentW;
        const tgtPortraitW = Math.min(targetW, targetH);
        const tgtPortraitH = Math.max(targetW, targetH);
        const tw = srcIsPortrait ? tgtPortraitW : tgtPortraitH;
        const th = srcIsPortrait ? tgtPortraitH : tgtPortraitW;

        const method = resolveMethod(resizeMethod, currentW, currentH, tw, th);
        const newPage = outDoc.addPage([tw, th]);

        if (method === 'scale') {
          newPage.drawPage(embeddedPages[i], { x: 0, y: 0, width: tw, height: th });
        } else if (method === 'crop') {
          newPage.drawPage(embeddedPages[i], { x: 0, y: 0, width: currentW, height: currentH });
        } else {
          const dx = (tw - currentW) / 2;
          const dy = (th - currentH) / 2;
          newPage.drawPage(embeddedPages[i], { x: dx, y: dy, width: currentW, height: currentH });
        }
      }

      const outputBytes = await outDoc.save({ useObjectStreams: false });
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        filename: buildOutputFilename(file.name, 'resized', 'pdf'),
        originalSize: file.size,
        resultSize: outputBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error(e);
      setResizeError('Something went wrong during resize. Please try again.');
    } finally {
      setResizing(false);
    }
  }

  return (
    <div className="tool-page">
      <InfoCard description="Inspect the exact dimensions of every page in your PDF and identify pages that don't match standard formats. Optionally resize pages to Letter, A4, Legal, and more." />

      {error === '__encrypted__' ? (
        <EncryptedPDFError onNavigate={navigateTo} />
      ) : error ? (
        <ErrorCard title="Error" message={error} />
      ) : null}

      {!file && !error && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF file here or click to browse"
          sublabel="Single PDF file · up to 500 MB"
        />
      )}

      {loading && <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Inspecting pages…</p>}

      {file && !loading && summary && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <button className="tool-file-remove" onClick={handleRemove}>
              × Remove
            </button>
          </div>

          <div className="pi-summary">
            <span className="pi-summary-text">
              {summary.allSame
                ? `${summary.pageCount} page${summary.pageCount !== 1 ? 's' : ''} · All ${summary.dominantLabel}`
                : `${summary.pageCount} pages · ${summary.distinctSizes} different sizes`}
            </span>
            <div className="pi-units-toggle">
              <button
                className={`pi-units-btn${units === 'in' ? ' pi-units-btn--active' : ''}`}
                onClick={() => handleUnitsToggle('in')}
              >in</button>
              <button
                className={`pi-units-btn${units === 'mm' ? ' pi-units-btn--active' : ''}`}
                onClick={() => handleUnitsToggle('mm')}
              >mm</button>
            </div>
          </div>

          <div className="pi-page-grid">
            {pageInfo.map(p => (
              <PageCard
                key={p.pageNum}
                page={p}
                units={units}
                thumbnail={thumbnailMap[p.pageNum]}
                pdfJsDocRef={pdfJsDocRef}
                onThumbnailReady={handleThumbnailReady}
              />
            ))}
          </div>

          {hasFormFields && (
            <div className="pi-form-warning">
              <div className="pi-form-warning-header">
                ⚠ This PDF contains interactive form fields or signature areas
              </div>
              <p className="pi-form-warning-body">
                Resizing may cause form fields and signature boxes to appear misaligned in the output. For best results, flatten the form first by using <strong>File &rarr; Print &rarr; Microsoft Print to PDF</strong> (or Save as PDF on Mac), then load the flattened PDF here to resize.
              </p>
            </div>
          )}

          <div className="pi-resize-panel">
            <button
              className="pi-resize-toggle"
              onClick={() => setResizeOpen(o => !o)}
              aria-expanded={resizeOpen}
            >
              {resizeOpen ? '▲' : '▼'} Resize Pages
            </button>

            {resizeOpen && (
              <div className="pi-resize-body">
                <div className="pi-resize-row">
                  <label className="pi-resize-label">Target format</label>
                  <div className="pi-resize-controls">
                    <select
                      className="tool-option-select"
                      value={targetFormat}
                      onChange={e => setTargetFormat(e.target.value)}
                    >
                      <option value="letter">Letter (8.5 × 11")</option>
                      <option value="a4">A4 (210 × 297 mm)</option>
                      <option value="legal">Legal (8.5 × 14")</option>
                      <option value="a3">A3 (297 × 420 mm)</option>
                      <option value="a5">A5 (148 × 210 mm)</option>
                      <option value="tabloid">Tabloid (11 × 17")</option>
                      <option value="executive">Executive (7.25 × 10.5")</option>
                      <option value="b5">B5 (176 × 250 mm)</option>
                      <option value="custom">Custom…</option>
                    </select>
                    {targetFormat === 'custom' && (
                      <div className="pi-custom-dims">
                        <input
                          type="number"
                          className="pi-dim-input"
                          placeholder={`W (${units})`}
                          value={customW}
                          min="1"
                          step={units === 'mm' ? '1' : '0.01'}
                          onChange={e => setCustomW(e.target.value)}
                        />
                        <span className="pi-dim-sep">×</span>
                        <input
                          type="number"
                          className="pi-dim-input"
                          placeholder={`H (${units})`}
                          value={customH}
                          min="1"
                          step={units === 'mm' ? '1' : '0.01'}
                          onChange={e => setCustomH(e.target.value)}
                        />
                        <span className="pi-dim-unit">{units}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pi-resize-row">
                  <label className="pi-resize-label">Method</label>
                  <div className="pi-resize-method">
                    {[
                      { value: 'scale', label: 'Scale', desc: 'Stretch content to fill new size' },
                      { value: 'crop', label: 'Crop', desc: 'Trim edges to fit new size' },
                      { value: 'pad', label: 'Pad', desc: 'Add whitespace to reach new size' },
                    ].map(m => (
                      <label key={m.value} className="pi-method-option">
                        <input
                          type="radio"
                          name="resizeMethod"
                          value={m.value}
                          checked={resizeMethod === m.value}
                          onChange={() => setResizeMethod(m.value)}
                        />
                        <span className="pi-method-label">{m.label}</span>
                        <span className="pi-method-desc">{m.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pi-resize-row">
                  <label className="pi-resize-label">Pages</label>
                  <div className="pi-resize-range">
                    <label className="pi-range-option">
                      <input
                        type="radio"
                        name="pageRange"
                        value="all"
                        checked={pageRange === 'all'}
                        onChange={() => setPageRange('all')}
                      />
                      All pages
                    </label>
                    <label className="pi-range-option">
                      <input
                        type="radio"
                        name="pageRange"
                        value="custom"
                        checked={pageRange === 'custom'}
                        onChange={() => {
                          setPageRange('custom');
                          setPageRangeError('Enter at least one page number');
                        }}
                      />
                      Custom range
                    </label>
                    {pageRange === 'custom' && (
                      <div className="pi-range-input-group">
                        <input
                          type="text"
                          className="pi-range-input"
                          placeholder={`e.g. 1-3, 5 (of ${summary?.pageCount})`}
                          value={pageRangeInput}
                          onChange={e => handlePageRangeInput(e.target.value)}
                        />
                        {pageRangeError && (
                          <div className="pi-range-error">{pageRangeError}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pi-resize-actions">
                  <button
                    className={`action-button${resizing ? ' action-button--loading' : ''}`}
                    disabled={!canResize || resizing}
                    onClick={handleResize}
                  >
                    {resizing ? 'Resizing…' : 'Resize PDF'}
                  </button>
                  {resizeError && (
                    <ErrorCard title="Resize failed" message={resizeError} />
                  )}
                </div>
              </div>
            )}
          </div>

          {result && (
            <ResultPanel
              filename={result.filename}
              originalSize={result.originalSize}
              resultSize={result.resultSize}
              downloadUrl={result.downloadUrl}
              onStartOver={() => {
                setResult(null);
                setResizeError(null);
                handleRemove();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
