import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import DropZone from '../../components/ui/DropZone.jsx';
import InfoCard from '../../components/ui/InfoCard.jsx';
import ErrorCard from '../../components/ui/ErrorCard.jsx';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError.jsx';
import { validatePDFHeader } from '../../utils/fileValidation.js';
import { loadPdfDocument, loadPdfLibDocument, renderPageThumbnail } from '../../utils/pdfThumbnails.js';

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

      // Check encryption via pdf-lib
      const { isEncrypted } = await loadPdfLibDocument(bytes.slice(), { PDFDocument });
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
      }

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
  }

  function handleUnitsToggle(u) {
    setUnits(u);
  }

  const handleThumbnailReady = useCallback((pageNum, dataUrl) => {
    setThumbnailMap(prev => ({ ...prev, [pageNum]: dataUrl }));
  }, []);

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <h1>PDF Page Inspector</h1>
      </div>

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
        </>
      )}
    </div>
  );
}
