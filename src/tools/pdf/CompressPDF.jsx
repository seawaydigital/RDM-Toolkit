import { useState, useCallback, useEffect, useRef } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { OPS } from 'pdfjs-dist';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { Download, RotateCcw, X, Loader2, Sparkles } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Reduce PDF file size. As soon as you upload, we estimate three quality presets — then only compress the version you actually download. Everything runs in your browser.';

const LIMITATIONS = [
  'Image-heavy mode flattens text to images (text won\u2019t be selectable in the output)',
  'Sizes shown before download are estimates and are typically within \u00b115% of the actual result',
  'Very large PDFs (>100 MB) may take 30+ seconds',
];

const PRESETS = [
  { id: 'low',    label: 'Low compression',    sub: 'Best quality',  dpi: 150, jpegQuality: 0.90 },
  { id: 'medium', label: 'Medium compression', sub: 'Recommended',   dpi: 110, jpegQuality: 0.75 },
  { id: 'high',   label: 'High compression',   sub: 'Smallest file', dpi: 80,  jpegQuality: 0.55 },
];

const IMAGE_MIN_DIM = 200;
const IMAGE_HEAVY_RATIO = 0.3;
const LARGE_FILE_BYTES = 100 * 1024 * 1024;
// A preset is "useful" if estimated savings exceed this fraction of the original.
const MIN_USEFUL_REDUCTION = 0.05;

async function analyzePdfContent(pdfJsDoc) {
  let pagesWithLargeImages = 0;
  let totalImages = 0;
  const total = pdfJsDoc.numPages;
  for (let i = 1; i <= total; i++) {
    const page = await pdfJsDoc.getPage(i);
    const ops = await page.getOperatorList();
    let pageHasLarge = false;
    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      if (fn === OPS.paintImageXObject || fn === OPS.paintJpegImageXObject) {
        try {
          const imageName = ops.argsArray[j][0];
          const imgData = page.objs.get(imageName);
          if (imgData && imgData.width >= IMAGE_MIN_DIM && imgData.height >= IMAGE_MIN_DIM) {
            totalImages++;
            pageHasLarge = true;
          }
        } catch {
          // image not yet resolved; skip
        }
      }
    }
    if (pageHasLarge) pagesWithLargeImages++;
    page.cleanup();
  }
  return {
    pageCount: total,
    largeImageCount: totalImages,
    imageDensity: total > 0 ? pagesWithLargeImages / total : 0,
  };
}

// Render one page at a given DPI/quality and return its JPEG byte size.
async function measurePageJpegBytes(pdfJsDoc, pageIdx, dpi, jpegQuality) {
  const page = await pdfJsDoc.getPage(pageIdx);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', jpegQuality)
  );
  canvas.remove();
  page.cleanup();
  return blob ? blob.size : 0;
}

// Sample 1–3 pages, average JPEG bytes per page, multiply by total page count.
async function estimatePresets(pdfJsDoc, presets, onProgress) {
  const total = pdfJsDoc.numPages;
  const sampleCount = Math.min(3, Math.max(1, Math.ceil(total / 25)));
  const sampleIndices = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.max(1, Math.min(total, Math.floor(((i + 0.5) * total) / sampleCount) + 1));
    if (!sampleIndices.includes(idx)) sampleIndices.push(idx);
  }

  const estimates = {};
  let step = 0;
  const totalSteps = presets.length * sampleIndices.length;
  for (const preset of presets) {
    let totalBytes = 0;
    for (const pageIdx of sampleIndices) {
      step++;
      onProgress?.(step, totalSteps);
      const bytes = await measurePageJpegBytes(pdfJsDoc, pageIdx, preset.dpi, preset.jpegQuality);
      totalBytes += bytes;
    }
    const avgPerPage = totalBytes / sampleIndices.length;
    // ~50KB PDF structural overhead
    estimates[preset.id] = Math.floor(avgPerPage * total + 50 * 1024);
  }
  return estimates;
}

async function compressViaRaster(pdfJsDoc, { dpi, jpegQuality, onProgress }) {
  const newDoc = await PDFDocument.create();
  const total = pdfJsDoc.numPages;
  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total);
    const page = await pdfJsDoc.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const pdfWidthPt = baseViewport.width;
    const pdfHeightPt = baseViewport.height;

    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', jpegQuality)
    );
    canvas.remove();
    page.cleanup();
    if (!blob) continue;

    const arrBuf = await blob.arrayBuffer();
    const jpg = await newDoc.embedJpg(arrBuf);
    const newPage = newDoc.addPage([pdfWidthPt, pdfHeightPt]);
    newPage.drawImage(jpg, { x: 0, y: 0, width: pdfWidthPt, height: pdfHeightPt });
  }
  return await newDoc.save({ useObjectStreams: false });
}

async function compressStructural(fileBytes) {
  const { pdfDoc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
  return await pdfDoc.save();
}

export default function CompressPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  const [presetResults, setPresetResults] = useState({});
  const [structuralResult, setStructuralResult] = useState(null);
  const [compressingPresetId, setCompressingPresetId] = useState(null);
  const [structuralLoading, setStructuralLoading] = useState(false);
  const [downloadedPreset, setDownloadedPreset] = useState(null);

  const objectUrlsRef = useRef([]);

  function trackUrl(url) {
    objectUrlsRef.current.push(url);
    return url;
  }

  function revokeAllUrls() {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  }

  useEffect(() => {
    return () => revokeAllUrls();
  }, []);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setEncryptedError(false);
    setAnalysis(null);
    setEstimates(null);
    setPresetResults({});
    setStructuralResult(null);
    setDownloadedPreset(null);
    setThumbnail(null);
    revokeAllUrls();

    const isValid = await validatePDFHeader(selectedFile);
    if (!isValid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    try {
      const buf = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buf).slice();

      const { isEncrypted } = await loadPdfLibDocument(bytes, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      setFile(selectedFile);
      setFileBytes(bytes);

      setBusyMsg('Reading PDF\u2026');
      const pdfJsDoc = await loadPdfDocument(bytes.slice());
      try {
        const thumb = await renderPageThumbnail(pdfJsDoc, 1);
        setThumbnail(thumb);

        setBusyMsg('Analyzing content\u2026');
        const info = await analyzePdfContent(pdfJsDoc);
        setAnalysis(info);

        if (info.imageDensity >= IMAGE_HEAVY_RATIO) {
          setBusyMsg('Estimating sizes\u2026');
          const ests = await estimatePresets(pdfJsDoc, PRESETS, (s, t) => {
            setBusyMsg(`Estimating sizes\u2026 (${s}/${t})`);
          });
          setEstimates(ests);
        } else {
          setBusyMsg('Compressing\u2026');
          const out = await compressStructural(bytes);
          const blob = new Blob([out], { type: 'application/pdf' });
          const url = trackUrl(URL.createObjectURL(blob));
          setStructuralResult({ size: out.byteLength, url });
        }
      } finally {
        pdfJsDoc.destroy();
        setBusyMsg('');
      }
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to read the PDF. The file may be corrupted.');
      setBusyMsg('');
    }
  }, []);

  function handleRemoveFile() {
    revokeAllUrls();
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setAnalysis(null);
    setEstimates(null);
    setPresetResults({});
    setStructuralResult(null);
    setDownloadedPreset(null);
    setError(null);
    setEncryptedError(false);
    setBusyMsg('');
  }

  function handleStartOver() {
    handleRemoveFile();
  }

  function triggerBrowserDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleDownloadPreset(preset) {
    if (!fileBytes || !file) return;

    // Already compressed earlier — just download
    const cached = presetResults[preset.id];
    if (cached) {
      triggerBrowserDownload(cached.url, buildOutputFilename(file.name, `compressed-${preset.id}`, 'pdf'));
      setDownloadedPreset(preset.id);
      return;
    }

    setCompressingPresetId(preset.id);
    setBusyMsg(`${preset.label}: starting\u2026`);
    setError(null);

    try {
      const pdfJsDoc = await loadPdfDocument(fileBytes.slice());
      try {
        const out = await compressViaRaster(pdfJsDoc, {
          dpi: preset.dpi,
          jpegQuality: preset.jpegQuality,
          onProgress: (i, total) => setBusyMsg(`${preset.label}: page ${i} of ${total}`),
        });
        const blob = new Blob([out], { type: 'application/pdf' });
        const url = trackUrl(URL.createObjectURL(blob));
        const r = { size: out.byteLength, url };
        setPresetResults(prev => ({ ...prev, [preset.id]: r }));
        triggerBrowserDownload(url, buildOutputFilename(file.name, `compressed-${preset.id}`, 'pdf'));
        setDownloadedPreset(preset.id);
      } finally {
        pdfJsDoc.destroy();
      }
    } catch (e) {
      console.error('Compression failed:', e);
      setError('Something went wrong while compressing. Please try again.');
    } finally {
      setCompressingPresetId(null);
      setBusyMsg('');
    }
  }

  async function handleStructuralFallback() {
    if (!fileBytes) return;
    setStructuralLoading(true);
    setError(null);
    try {
      const out = await compressStructural(fileBytes);
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = trackUrl(URL.createObjectURL(blob));
      setStructuralResult({ size: out.byteLength, url });
    } catch (e) {
      console.error('Structural compression failed:', e);
      setError('Something went wrong while compressing. Please try again.');
    } finally {
      setStructuralLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────
  if (encryptedError) {
    return (
      <div className="tool-container">
        <InfoCard description={DESCRIPTION} limitations={LIMITATIONS} />
        <EncryptedPDFError onNavigate={navigateTo} />
      </div>
    );
  }

  const showEstimateCards = !!(estimates && file && !structuralResult);
  const isBusy = !!busyMsg;
  const anyCompressing = compressingPresetId !== null || structuralLoading;

  return (
    <div className="tool-container">
      <InfoCard description={DESCRIPTION} limitations={LIMITATIONS} />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF file here or click to browse"
        />
      )}

      {file && (
        <div className="compress-preview">
          <div className="compress-preview-top">
            <div className="compress-file-info">
              <p className="compress-file-name">{file.name}</p>
              <p className="compress-file-size">{formatFileSize(file.size)}</p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>
          {thumbnail && (
            <img
              src={thumbnail}
              alt="First page preview"
              className="compress-thumbnail"
              style={{ maxHeight: 240 }}
            />
          )}
        </div>
      )}

      {isBusy && (
        <div className="compress-progress">
          <Loader2 size={16} className="action-button-spinner" />
          {busyMsg}
        </div>
      )}

      {file && analysis && estimates && (
        <div className="compress-analysis compress-analysis--image">
          <Sparkles size={16} />
          <div>
            <strong>Image-heavy PDF detected</strong>
            <p>
              {analysis.largeImageCount} large image{analysis.largeImageCount === 1 ? '' : 's'} across {analysis.pageCount} page{analysis.pageCount === 1 ? '' : 's'}.
              Sizes below are estimates — we only compress the version you click to download.
            </p>
          </div>
        </div>
      )}

      {file && file.size > LARGE_FILE_BYTES && !structuralResult && (
        <ErrorCard
          title="Large file"
          message={`This PDF is ${formatFileSize(file.size)}. Compression may take 30 seconds or more once you pick a version.`}
        />
      )}

      {showEstimateCards && (
        <div className="compress-results">
          <h3 className="compress-results-title">Pick the version you want</h3>
          <div className="compress-presets">
            {PRESETS.map(p => {
              const estBytes = estimates[p.id];
              const cached = presetResults[p.id];
              const displayBytes = cached ? cached.size : estBytes;
              const change = file.size ? Math.round(((displayBytes - file.size) / file.size) * 100) : 0;
              const wouldReduce = estBytes < file.size * (1 - MIN_USEFUL_REDUCTION);
              const isCompressing = compressingPresetId === p.id;
              const isPicked = downloadedPreset === p.id;
              const isRecommended = p.id === 'medium' && wouldReduce;

              const cardClass = [
                'compress-preset-card',
                isRecommended ? 'compress-preset-card--recommended' : '',
                !wouldReduce ? 'compress-preset-card--unhelpful' : '',
                isPicked ? 'compress-preset-card--picked' : '',
              ].filter(Boolean).join(' ');

              return (
                <div key={p.id} className={cardClass}>
                  <div className="compress-preset-head">
                    <strong>{p.label}</strong>
                    <span className="compress-preset-sub">{wouldReduce ? p.sub : 'Not worth it'}</span>
                  </div>
                  <div className="compress-preset-size">
                    {!cached && '~'}{formatFileSize(displayBytes)}
                  </div>
                  {wouldReduce ? (
                    <div className={`compress-preset-change ${change <= 0 ? 'compress-preset-change--good' : 'compress-preset-change--bad'}`}>
                      {change <= 0 ? '' : '+'}{change}% vs. original{!cached && ' (est.)'}
                    </div>
                  ) : (
                    <div className="compress-preset-change compress-preset-change--bad">
                      Wouldn&apos;t reduce file size
                    </div>
                  )}
                  <button
                    className="compress-preset-cta"
                    onClick={() => handleDownloadPreset(p)}
                    disabled={!wouldReduce || anyCompressing}
                    type="button"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 size={18} className="action-button-spinner" />
                        Compressing…
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Download
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {!structuralResult && (
            <div className="compress-secondary-row">
              <button
                className="compress-secondary-link"
                onClick={handleStructuralFallback}
                disabled={anyCompressing}
                type="button"
              >
                {structuralLoading ? 'Running text-only compression\u2026' : 'Or use text-only compression to keep selectable text \u2192'}
              </button>
            </div>
          )}

          <button className="compress-startover" onClick={handleStartOver} type="button">
            <RotateCcw size={14} />
            Start over with a different PDF
          </button>
        </div>
      )}

      {structuralResult && file && (
        <ResultPanel
          filename={buildOutputFilename(file.name, 'compressed', 'pdf')}
          originalSize={file.size}
          resultSize={structuralResult.size}
          downloadUrl={structuralResult.url}
          onStartOver={handleStartOver}
          preview={
            thumbnail ? (
              <img
                src={thumbnail}
                alt="First page preview"
                style={{ maxHeight: 200, borderRadius: 'var(--radius-sm)' }}
              />
            ) : null
          }
        />
      )}
    </div>
  );
}
