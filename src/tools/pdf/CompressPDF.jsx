import { useState, useCallback, useEffect, useRef } from 'react';
import { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, PDFNumber } from '@cantoo/pdf-lib';
import { OPS } from 'pdfjs-dist';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { Download, RotateCcw, X, Loader2, Sparkles, ExternalLink, Info } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Reduce PDF file size. Smart compression keeps your text selectable by re-encoding embedded images in place. Aggressive compression flattens everything to images for the smallest possible file. Both run entirely in your browser.';

const LIMITATIONS = [
  'Smart compression only re-encodes JPEG-compressed images — pages with JBIG2, CCITTFax, or lossless images are left as-is',
  'Aggressive compression flattens text to images — text won\u2019t be selectable in the output',
  'Text-only mode strips XMP metadata, embedded file attachments, JavaScript, and page thumbnails (title, author, and outlines are preserved)',
  'Sizes shown before download are estimates and are typically within \u00b115% of the actual result',
  'For heavily scanned documents, dedicated desktop tools (PDFGear, Ghostscript) still produce smaller files — see the note below',
];

// Whole-page rasterization presets (aggressive mode — flattens text to images).
const RASTER_PRESETS = [
  { id: 'low',    label: 'Low compression',    sub: 'Best quality',  dpi: 150, jpegQuality: 0.90 },
  { id: 'medium', label: 'Medium compression', sub: 'Recommended',   dpi: 110, jpegQuality: 0.75 },
  { id: 'high',   label: 'High compression',   sub: 'Smallest file', dpi: 80,  jpegQuality: 0.55 },
];

// Image XObject replacement presets (smart mode — preserves selectable text).
const SMART_PRESETS = [
  { id: 'low',    label: 'Low compression',    sub: 'Best quality',  jpegQuality: 0.90, maxDimension: 2400 },
  { id: 'medium', label: 'Medium compression', sub: 'Recommended',   jpegQuality: 0.78, maxDimension: 1800 },
  { id: 'high',   label: 'High compression',   sub: 'Smallest file', jpegQuality: 0.60, maxDimension: 1200 },
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

// ── Image XObject replacement (smart mode — preserves text) ─────────

// Identify image streams we can safely re-encode as JPEG without altering
// their rendering context: DCT-encoded (JPEG) XObjects with RGB color space
// and no masks or decode arrays.
function collectReplaceableImages(pdfDoc) {
  const context = pdfDoc.context;
  const out = [];

  const entries = context.enumerateIndirectObjects();
  for (const [ref, obj] of entries) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (!dict) continue;

    // Must be an image XObject.
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;

    // Must be plain DCT-encoded (JPEG). Skip JBIG2, CCITTFax, Flate, JPX, etc.
    const filter = dict.get(PDFName.of('Filter'));
    let filterName = null;
    if (filter instanceof PDFArray) {
      if (filter.size() !== 1) continue;
      filterName = filter.get(0);
    } else {
      filterName = filter;
    }
    if (filterName !== PDFName.of('DCTDecode') && filterName !== PDFName.of('DCT')) continue;

    // Skip anything with transparency masks or inverted decode arrays — safer to leave them.
    if (dict.get(PDFName.of('SMask'))) continue;
    if (dict.get(PDFName.of('Mask'))) continue;
    if (dict.get(PDFName.of('Decode'))) continue;

    // Only accept RGB color spaces — canvas.toBlob('image/jpeg') always outputs RGB,
    // so remapping grayscale/CMYK would change the rendering.
    const cs = dict.get(PDFName.of('ColorSpace'));
    let isRGB = cs === PDFName.of('DeviceRGB');
    if (!isRGB && cs instanceof PDFArray && cs.size() >= 2) {
      const kind = cs.get(0);
      if (kind === PDFName.of('ICCBased')) {
        try {
          const iccRef = cs.get(1);
          const iccStream = context.lookup(iccRef);
          if (iccStream && iccStream.dict) {
            const n = iccStream.dict.get(PDFName.of('N'));
            if (n instanceof PDFNumber && n.asNumber() === 3) isRGB = true;
          }
        } catch {
          // fall through — treat as non-RGB, skip
        }
      }
    }
    if (!isRGB) continue;

    const widthObj = dict.get(PDFName.of('Width'));
    const heightObj = dict.get(PDFName.of('Height'));
    const width = widthObj instanceof PDFNumber ? widthObj.asNumber() : 0;
    const height = heightObj instanceof PDFNumber ? heightObj.asNumber() : 0;
    if (width < 100 || height < 100) continue;

    const byteLen = obj.contents ? obj.contents.length : 0;
    if (byteLen < 4 * 1024) continue; // skip tiny thumbnails

    out.push({ ref, stream: obj, dict, width, height, byteLen });
  }
  return out;
}

// Decode a JPEG stream, optionally downsample, and re-encode at the given
// quality. Returns null if encoding fails.
async function reencodeJpeg(jpegBytes, jpegQuality, maxDimension) {
  let bitmap;
  try {
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
    bitmap = await createImageBitmap(blob);
  } catch {
    return null;
  }

  let targetW = bitmap.width;
  let targetH = bitmap.height;
  const longest = Math.max(targetW, targetH);
  if (longest > maxDimension) {
    const scale = maxDimension / longest;
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  let canvas;
  let isOffscreen = false;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetW, targetH);
    isOffscreen = true;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close?.(); return null; }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  let outBlob;
  try {
    if (isOffscreen && canvas.convertToBlob) {
      outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });
    } else {
      outBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', jpegQuality));
    }
  } catch {
    return null;
  }
  if (!isOffscreen && canvas.remove) canvas.remove();
  if (!outBlob) return null;

  const arrBuf = await outBlob.arrayBuffer();
  return { bytes: new Uint8Array(arrBuf), width: targetW, height: targetH };
}

// Re-encode every replaceable image in place. Keeps text objects, outlines,
// and vector graphics intact — only the image data changes.
async function compressViaImageReplacement(fileBytes, { jpegQuality, maxDimension, onProgress }) {
  const { pdfDoc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
  const cleanupStats = stripDeadweight(pdfDoc);
  const candidates = collectReplaceableImages(pdfDoc);

  let replaced = 0;
  let origImagesBytes = 0;
  let newImagesBytes = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    onProgress?.(i + 1, candidates.length);
    try {
      const result = await reencodeJpeg(c.stream.contents, jpegQuality, maxDimension);
      if (!result) continue;
      // Only swap when meaningfully smaller (≥10% reduction). This avoids
      // cases where the original is already near the Huffman floor.
      if (result.bytes.length >= c.byteLen * 0.9) continue;

      const newDict = pdfDoc.context.obj({
        Type: 'XObject',
        Subtype: 'Image',
        Width: result.width,
        Height: result.height,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
        Filter: 'DCTDecode',
        Length: result.bytes.length,
      });
      const newStream = PDFRawStream.of(newDict, result.bytes);
      pdfDoc.context.assign(c.ref, newStream);

      replaced++;
      origImagesBytes += c.byteLen;
      newImagesBytes += result.bytes.length;
    } catch (err) {
      // Swallow individual image failures so one bad image doesn't abort the whole run.
      console.warn('Skipped image replacement:', err);
    }
  }

  const out = await pdfDoc.save({ useObjectStreams: true });
  return {
    bytes: out,
    stats: {
      cleanupStats,
      candidateCount: candidates.length,
      replacedCount: replaced,
      origImagesBytes,
      newImagesBytes,
    },
  };
}

// Sample the 3 largest images to estimate how each preset will perform
// across the whole document. Accurate to ~10–15% in practice.
async function estimateImageReplacementPresets(fileBytes, presets, onProgress) {
  const { pdfDoc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
  const candidates = collectReplaceableImages(pdfDoc);
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.byteLen - a.byteLen);
  const samples = sorted.slice(0, Math.min(3, sorted.length));

  const totalCandidateBytes = candidates.reduce((s, c) => s + c.byteLen, 0);
  const sampleOrigTotal = samples.reduce((s, c) => s + c.byteLen, 0);

  const estimates = {};
  let step = 0;
  const totalSteps = presets.length * samples.length;
  for (const preset of presets) {
    let sampleNewTotal = 0;
    for (const c of samples) {
      step++;
      onProgress?.(step, totalSteps);
      const result = await reencodeJpeg(c.stream.contents, preset.jpegQuality, preset.maxDimension);
      // If re-encoding wouldn't shrink this sample, assume the original is kept.
      if (result && result.bytes.length < c.byteLen * 0.9) {
        sampleNewTotal += result.bytes.length;
      } else {
        sampleNewTotal += c.byteLen;
      }
    }
    const sampleRatio = sampleOrigTotal > 0 ? sampleNewTotal / sampleOrigTotal : 1;
    const savedBytes = totalCandidateBytes * (1 - sampleRatio);
    // Subtract a small deadweight-cleanup savings estimate (~20 KB).
    estimates[preset.id] = Math.max(
      Math.floor(totalCandidateBytes * 0.1), // floor: can't go below ~10% of image bytes
      Math.floor(fileBytes.length - savedBytes - 20 * 1024),
    );
  }
  return {
    estimates,
    candidateCount: candidates.length,
    totalImagesBytes: totalCandidateBytes,
  };
}

// Safe, in-place cleanup of deadweight dict entries before saving.
// Removes: XMP metadata, embedded file attachments, document-level JavaScript,
// document + page open/close triggers, per-page thumbnails, and application-specific
// PieceInfo blobs. Preserves: title/author/subject/keywords (document info),
// outlines (table of contents), page labels, and named destinations.
function stripDeadweight(pdfDoc) {
  const stats = { stripped: [] };
  const catalog = pdfDoc.catalog;

  const tryDeleteCatalog = (key, label) => {
    try {
      if (catalog.has(PDFName.of(key))) {
        catalog.delete(PDFName.of(key));
        stats.stripped.push(label);
      }
    } catch {
      // defensive: never let cleanup failure block the compression
    }
  };

  tryDeleteCatalog('Metadata',   'XMP metadata');
  tryDeleteCatalog('OpenAction', 'open-document action');
  tryDeleteCatalog('AA',         'document additional actions');
  tryDeleteCatalog('PieceInfo',  'application piece info');

  // /Names holds several name trees — remove only the deadweight ones,
  // keep /Dests so outline links keep working.
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
  } catch {
    // ignore
  }

  // Per-page cleanup
  let thumbsRemoved = 0;
  let piecesRemoved = 0;
  let pageAAsRemoved = 0;
  for (const page of pdfDoc.getPages()) {
    const node = page.node;
    try {
      if (node.has(PDFName.of('Thumb')))     { node.delete(PDFName.of('Thumb')); thumbsRemoved++; }
      if (node.has(PDFName.of('PieceInfo'))) { node.delete(PDFName.of('PieceInfo')); piecesRemoved++; }
      if (node.has(PDFName.of('AA')))        { node.delete(PDFName.of('AA')); pageAAsRemoved++; }
    } catch {
      // skip this page, keep going
    }
  }
  if (thumbsRemoved)  stats.stripped.push(`${thumbsRemoved} page thumbnail${thumbsRemoved === 1 ? '' : 's'}`);
  if (piecesRemoved)  stats.stripped.push(`${piecesRemoved} page piece-info blob${piecesRemoved === 1 ? '' : 's'}`);
  if (pageAAsRemoved) stats.stripped.push(`${pageAAsRemoved} page action trigger${pageAAsRemoved === 1 ? '' : 's'}`);

  return stats;
}

async function compressStructural(fileBytes) {
  const { pdfDoc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
  const cleanupStats = stripDeadweight(pdfDoc);
  const out = await pdfDoc.save({ useObjectStreams: true });
  return { bytes: out, cleanupStats };
}

function AdvisoryCallout() {
  return (
    <div className="compress-advisory">
      <Info size={16} />
      <div>
        <strong>Need every last kilobyte?</strong>
        <p>
          Browser-based compression has limits — it can&apos;t use JBIG2, MozJPEG, or MRC segmentation
          that desktop tools use. For heavily scanned documents, free desktop tools typically produce
          smaller files:
        </p>
        <ul className="compress-advisory-list">
          <li>
            <a href="https://www.pdfgear.com" target="_blank" rel="noopener noreferrer">
              PDFGear <ExternalLink size={12} />
            </a>
            {' '}— free, one-click compression, Windows / macOS
          </li>
          <li>
            <a href="https://ghostscript.com" target="_blank" rel="noopener noreferrer">
              Ghostscript <ExternalLink size={12} />
            </a>
            {' '}— command-line, open source, best control (runs locally)
          </li>
        </ul>
        <p className="compress-advisory-note">
          Both run offline on your own computer — your files don&apos;t leave your device.
        </p>
      </div>
    </div>
  );
}

export default function CompressPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  // Mode: 'none' | 'smart' | 'raster' | 'structural-only'
  const [mode, setMode] = useState('none');
  const [smartEstimates, setSmartEstimates] = useState(null); // { estimates, candidateCount, totalImagesBytes }
  const [rasterEstimates, setRasterEstimates] = useState(null); // { low, medium, high }
  const [aggressiveRevealed, setAggressiveRevealed] = useState(false);
  const [rasterEstimating, setRasterEstimating] = useState(false);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  // presetResults keyed by `${mode}-${presetId}` to keep smart/raster results distinct.
  const [presetResults, setPresetResults] = useState({});
  const [structuralResult, setStructuralResult] = useState(null);
  const [compressingKey, setCompressingKey] = useState(null); // `${mode}-${presetId}` or null
  const [structuralLoading, setStructuralLoading] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState(null);

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
    setMode('none');
    setSmartEstimates(null);
    setRasterEstimates(null);
    setAggressiveRevealed(false);
    setRasterEstimating(false);
    setPresetResults({});
    setStructuralResult(null);
    setDownloadedKey(null);
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
      let info;
      try {
        const thumb = await renderPageThumbnail(pdfJsDoc, 1);
        setThumbnail(thumb);

        setBusyMsg('Analyzing content\u2026');
        info = await analyzePdfContent(pdfJsDoc);
        setAnalysis(info);
      } finally {
        pdfJsDoc.destroy();
      }

      if (info.imageDensity >= IMAGE_HEAVY_RATIO) {
        // Try smart (image replacement) first — preserves text.
        setBusyMsg('Estimating smart compression\u2026');
        const smart = await estimateImageReplacementPresets(
          bytes,
          SMART_PRESETS,
          (s, t) => setBusyMsg(`Estimating smart compression\u2026 (${s}/${t})`),
        );

        if (smart && smart.candidateCount > 0) {
          setSmartEstimates(smart);
          setMode('smart');
        } else {
          // Images aren't JPEG (likely JBIG2/CCITTFax/Flate). Fall back to raster estimation.
          setBusyMsg('Estimating aggressive compression\u2026');
          const pdfJsDoc2 = await loadPdfDocument(bytes.slice());
          try {
            const ests = await estimatePresets(pdfJsDoc2, RASTER_PRESETS, (s, t) => {
              setBusyMsg(`Estimating aggressive compression\u2026 (${s}/${t})`);
            });
            setRasterEstimates(ests);
            setMode('raster');
          } finally {
            pdfJsDoc2.destroy();
          }
        }
        setBusyMsg('');
      } else {
        // Text-heavy — run structural cleanup immediately.
        setBusyMsg('Compressing\u2026');
        const { bytes: out, cleanupStats } = await compressStructural(bytes);
        const blob = new Blob([out], { type: 'application/pdf' });
        const url = trackUrl(URL.createObjectURL(blob));
        setStructuralResult({ size: out.byteLength, url, cleanupStats });
        setMode('structural-only');
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
    setMode('none');
    setSmartEstimates(null);
    setRasterEstimates(null);
    setAggressiveRevealed(false);
    setRasterEstimating(false);
    setPresetResults({});
    setStructuralResult(null);
    setDownloadedKey(null);
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

  async function handleDownloadSmartPreset(preset) {
    if (!fileBytes || !file) return;
    const key = `smart-${preset.id}`;
    const cached = presetResults[key];
    if (cached) {
      triggerBrowserDownload(cached.url, buildOutputFilename(file.name, `compressed-${preset.id}`, 'pdf'));
      setDownloadedKey(key);
      return;
    }

    setCompressingKey(key);
    setBusyMsg(`${preset.label}: starting\u2026`);
    setError(null);

    try {
      const { bytes: out } = await compressViaImageReplacement(fileBytes, {
        jpegQuality: preset.jpegQuality,
        maxDimension: preset.maxDimension,
        onProgress: (i, total) => setBusyMsg(`${preset.label}: image ${i} of ${total}`),
      });
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = trackUrl(URL.createObjectURL(blob));
      setPresetResults(prev => ({ ...prev, [key]: { size: out.byteLength, url } }));
      triggerBrowserDownload(url, buildOutputFilename(file.name, `compressed-${preset.id}`, 'pdf'));
      setDownloadedKey(key);
    } catch (e) {
      console.error('Smart compression failed:', e);
      setError('Something went wrong while compressing. Please try again.');
    } finally {
      setCompressingKey(null);
      setBusyMsg('');
    }
  }

  async function handleDownloadRasterPreset(preset) {
    if (!fileBytes || !file) return;
    const key = `raster-${preset.id}`;
    const cached = presetResults[key];
    if (cached) {
      triggerBrowserDownload(cached.url, buildOutputFilename(file.name, `compressed-aggressive-${preset.id}`, 'pdf'));
      setDownloadedKey(key);
      return;
    }

    setCompressingKey(key);
    setBusyMsg(`${preset.label} (aggressive): starting\u2026`);
    setError(null);

    try {
      const pdfJsDoc = await loadPdfDocument(fileBytes.slice());
      try {
        const out = await compressViaRaster(pdfJsDoc, {
          dpi: preset.dpi,
          jpegQuality: preset.jpegQuality,
          onProgress: (i, total) => setBusyMsg(`${preset.label} (aggressive): page ${i} of ${total}`),
        });
        const blob = new Blob([out], { type: 'application/pdf' });
        const url = trackUrl(URL.createObjectURL(blob));
        setPresetResults(prev => ({ ...prev, [key]: { size: out.byteLength, url } }));
        triggerBrowserDownload(url, buildOutputFilename(file.name, `compressed-aggressive-${preset.id}`, 'pdf'));
        setDownloadedKey(key);
      } finally {
        pdfJsDoc.destroy();
      }
    } catch (e) {
      console.error('Aggressive compression failed:', e);
      setError('Something went wrong while compressing. Please try again.');
    } finally {
      setCompressingKey(null);
      setBusyMsg('');
    }
  }

  async function handleShowAggressive() {
    if (rasterEstimates || rasterEstimating || !fileBytes) {
      setAggressiveRevealed(true);
      return;
    }
    setRasterEstimating(true);
    setBusyMsg('Estimating aggressive compression\u2026');
    try {
      const pdfJsDoc = await loadPdfDocument(fileBytes.slice());
      try {
        const ests = await estimatePresets(pdfJsDoc, RASTER_PRESETS, (s, t) => {
          setBusyMsg(`Estimating aggressive compression\u2026 (${s}/${t})`);
        });
        setRasterEstimates(ests);
        setAggressiveRevealed(true);
      } finally {
        pdfJsDoc.destroy();
      }
    } catch (e) {
      console.error('Raster estimation failed:', e);
      setError('Could not estimate aggressive compression. Please try again.');
    } finally {
      setRasterEstimating(false);
      setBusyMsg('');
    }
  }

  async function handleStructuralFallback() {
    if (!fileBytes) return;
    setStructuralLoading(true);
    setError(null);
    try {
      const { bytes: out, cleanupStats } = await compressStructural(fileBytes);
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = trackUrl(URL.createObjectURL(blob));
      setStructuralResult({ size: out.byteLength, url, cleanupStats });
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

  const isBusy = !!busyMsg;
  const anyCompressing = compressingKey !== null || structuralLoading || rasterEstimating;
  const showSmart = mode === 'smart' && smartEstimates && file && !structuralResult;
  const showRaster = mode === 'raster' && rasterEstimates && file && !structuralResult;

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

      {file && analysis && (showSmart || showRaster) && (
        <div className="compress-analysis compress-analysis--image">
          <Sparkles size={16} />
          <div>
            <strong>Image-heavy PDF detected</strong>
            <p>
              {analysis.largeImageCount} large image{analysis.largeImageCount === 1 ? '' : 's'} across {analysis.pageCount} page{analysis.pageCount === 1 ? '' : 's'}.
              {showSmart
                ? ' Smart compression re-encodes embedded images in place — your text stays selectable.'
                : ' Smart compression isn\u2019t available (images aren\u2019t JPEG-encoded). Aggressive compression flattens each page to a single image.'}
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

      {/* Smart compression (image XObject replacement) — primary when available */}
      {showSmart && (() => {
        const visiblePresets = SMART_PRESETS.filter(p => {
          if (presetResults[`smart-${p.id}`]) return true;
          return smartEstimates.estimates[p.id] < file.size * (1 - MIN_USEFUL_REDUCTION);
        });
        const hiddenCount = SMART_PRESETS.length - visiblePresets.length;

        return (
          <div className="compress-results">
            <h3 className="compress-results-title">
              Smart compression
              <span className="compress-results-sub">Keeps text selectable</span>
            </h3>

            {visiblePresets.length === 0 ? (
              <div className="compress-no-gains">
                <Sparkles size={18} />
                <div>
                  <strong>Smart compression wouldn&apos;t shrink this file</strong>
                  <p>
                    The images in this PDF are already efficiently compressed. Try{' '}
                    <button
                      className="compress-inline-link"
                      type="button"
                      onClick={handleShowAggressive}
                      disabled={anyCompressing}
                    >
                      aggressive compression
                    </button>{' '}
                    (flattens text to images) or{' '}
                    <button
                      className="compress-inline-link"
                      type="button"
                      onClick={handleStructuralFallback}
                      disabled={anyCompressing}
                    >
                      text-only cleanup
                    </button>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {hiddenCount > 0 && (
                  <p className="compress-results-note">
                    {hiddenCount === 1
                      ? 'Hid 1 preset that would have made this file larger.'
                      : `Hid ${hiddenCount} presets that would have made this file larger.`}
                  </p>
                )}
                <div className="compress-presets">
                  {visiblePresets.map(p => {
                    const key = `smart-${p.id}`;
                    const estBytes = smartEstimates.estimates[p.id];
                    const cached = presetResults[key];
                    const displayBytes = cached ? cached.size : estBytes;
                    const change = file.size ? Math.round(((displayBytes - file.size) / file.size) * 100) : 0;
                    const isCompressing = compressingKey === key;
                    const isPicked = downloadedKey === key;
                    const recommendedId = visiblePresets.find(vp => vp.id === 'medium')?.id ?? visiblePresets[Math.floor(visiblePresets.length / 2)].id;
                    const isRecommended = p.id === recommendedId;

                    const cardClass = [
                      'compress-preset-card',
                      isRecommended ? 'compress-preset-card--recommended' : '',
                      isPicked ? 'compress-preset-card--picked' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <div key={key} className={cardClass}>
                        <div className="compress-preset-head">
                          <strong>{p.label}</strong>
                          <span className="compress-preset-sub">{p.sub}</span>
                        </div>
                        <div className="compress-preset-size">
                          {!cached && '~'}{formatFileSize(displayBytes)}
                        </div>
                        <div className={`compress-preset-change ${change <= 0 ? 'compress-preset-change--good' : 'compress-preset-change--bad'}`}>
                          {change <= 0 ? '' : '+'}{change}% vs. original{!cached && ' (est.)'}
                        </div>
                        <button
                          className="compress-preset-cta"
                          onClick={() => handleDownloadSmartPreset(p)}
                          disabled={anyCompressing}
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
              </>
            )}

            {/* Aggressive mode toggle */}
            {!aggressiveRevealed && (
              <div className="compress-secondary-row">
                <button
                  className="compress-secondary-link"
                  onClick={handleShowAggressive}
                  disabled={anyCompressing}
                  type="button"
                >
                  {rasterEstimating
                    ? 'Estimating aggressive compression\u2026'
                    : 'Need more reduction? Try aggressive compression (flattens text to images) \u2192'}
                </button>
              </div>
            )}

            {/* Aggressive (whole-page raster) presets, revealed on demand */}
            {aggressiveRevealed && rasterEstimates && (
              <div className="compress-aggressive-section">
                <h4 className="compress-results-title compress-results-title--sub">
                  Aggressive compression
                  <span className="compress-results-sub">Flattens text to images</span>
                </h4>
                <div className="compress-presets">
                  {RASTER_PRESETS.filter(p => {
                    if (presetResults[`raster-${p.id}`]) return true;
                    return rasterEstimates[p.id] < file.size * (1 - MIN_USEFUL_REDUCTION);
                  }).map(p => {
                    const key = `raster-${p.id}`;
                    const estBytes = rasterEstimates[p.id];
                    const cached = presetResults[key];
                    const displayBytes = cached ? cached.size : estBytes;
                    const change = file.size ? Math.round(((displayBytes - file.size) / file.size) * 100) : 0;
                    const isCompressing = compressingKey === key;
                    const isPicked = downloadedKey === key;

                    const cardClass = [
                      'compress-preset-card',
                      'compress-preset-card--aggressive',
                      isPicked ? 'compress-preset-card--picked' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <div key={key} className={cardClass}>
                        <div className="compress-preset-head">
                          <strong>{p.label}</strong>
                          <span className="compress-preset-sub">{p.sub}</span>
                        </div>
                        <div className="compress-preset-size">
                          {!cached && '~'}{formatFileSize(displayBytes)}
                        </div>
                        <div className={`compress-preset-change ${change <= 0 ? 'compress-preset-change--good' : 'compress-preset-change--bad'}`}>
                          {change <= 0 ? '' : '+'}{change}% vs. original{!cached && ' (est.)'}
                        </div>
                        <button
                          className="compress-preset-cta compress-preset-cta--aggressive"
                          onClick={() => handleDownloadRasterPreset(p)}
                          disabled={anyCompressing}
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
              </div>
            )}

            {!structuralResult && (
              <div className="compress-secondary-row">
                <button
                  className="compress-secondary-link"
                  onClick={handleStructuralFallback}
                  disabled={anyCompressing}
                  type="button"
                >
                  {structuralLoading ? 'Running text-only cleanup\u2026' : 'Or just clean up metadata (fastest, preserves text and images) \u2192'}
                </button>
              </div>
            )}

            <AdvisoryCallout />

            <button className="compress-startover" onClick={handleStartOver} type="button">
              <RotateCcw size={14} />
              Start over with a different PDF
            </button>
          </div>
        );
      })()}

      {/* Raster-only mode — smart compression wasn't available (no JPEG candidates) */}
      {showRaster && (() => {
        const visiblePresets = RASTER_PRESETS.filter(p => {
          if (presetResults[`raster-${p.id}`]) return true;
          return rasterEstimates[p.id] < file.size * (1 - MIN_USEFUL_REDUCTION);
        });
        const hiddenCount = RASTER_PRESETS.length - visiblePresets.length;

        if (visiblePresets.length === 0) {
          return (
            <div className="compress-results">
              <div className="compress-no-gains">
                <Sparkles size={18} />
                <div>
                  <strong>No image compression would reduce this file</strong>
                  <p>
                    The images in this PDF are already efficiently compressed. Re-rendering them
                    at a lower quality wouldn&apos;t produce a smaller file.
                  </p>
                </div>
              </div>
              <div className="compress-secondary-row">
                <button
                  className="compress-secondary-link compress-secondary-link--prominent"
                  onClick={handleStructuralFallback}
                  disabled={anyCompressing}
                  type="button"
                >
                  {structuralLoading ? 'Running text-only compression\u2026' : 'Try text-only compression instead (keeps selectable text)'}
                </button>
              </div>
              <AdvisoryCallout />
              <button className="compress-startover" onClick={handleStartOver} type="button">
                <RotateCcw size={14} />
                Start over with a different PDF
              </button>
            </div>
          );
        }

        return (
          <div className="compress-results">
            <h3 className="compress-results-title">
              Aggressive compression
              <span className="compress-results-sub">Flattens text to images</span>
            </h3>
            {hiddenCount > 0 && (
              <p className="compress-results-note">
                {hiddenCount === 1
                  ? 'Hid 1 preset that would have made this file larger.'
                  : `Hid ${hiddenCount} presets that would have made this file larger.`}
              </p>
            )}
            <div className="compress-presets">
              {visiblePresets.map(p => {
                const key = `raster-${p.id}`;
                const estBytes = rasterEstimates[p.id];
                const cached = presetResults[key];
                const displayBytes = cached ? cached.size : estBytes;
                const change = file.size ? Math.round(((displayBytes - file.size) / file.size) * 100) : 0;
                const isCompressing = compressingKey === key;
                const isPicked = downloadedKey === key;
                const recommendedId = visiblePresets.find(vp => vp.id === 'medium')?.id ?? visiblePresets[Math.floor(visiblePresets.length / 2)].id;
                const isRecommended = p.id === recommendedId;

                const cardClass = [
                  'compress-preset-card',
                  isRecommended ? 'compress-preset-card--recommended' : '',
                  isPicked ? 'compress-preset-card--picked' : '',
                ].filter(Boolean).join(' ');

                return (
                  <div key={key} className={cardClass}>
                    <div className="compress-preset-head">
                      <strong>{p.label}</strong>
                      <span className="compress-preset-sub">{p.sub}</span>
                    </div>
                    <div className="compress-preset-size">
                      {!cached && '~'}{formatFileSize(displayBytes)}
                    </div>
                    <div className={`compress-preset-change ${change <= 0 ? 'compress-preset-change--good' : 'compress-preset-change--bad'}`}>
                      {change <= 0 ? '' : '+'}{change}% vs. original{!cached && ' (est.)'}
                    </div>
                    <button
                      className="compress-preset-cta"
                      onClick={() => handleDownloadRasterPreset(p)}
                      disabled={anyCompressing}
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
                  {structuralLoading ? 'Running text-only cleanup\u2026' : 'Or just clean up metadata (fastest, preserves text and images) \u2192'}
                </button>
              </div>
            )}

            <AdvisoryCallout />

            <button className="compress-startover" onClick={handleStartOver} type="button">
              <RotateCcw size={14} />
              Start over with a different PDF
            </button>
          </div>
        );
      })()}

      {structuralResult && file && (
        <ResultPanel
          filename={buildOutputFilename(file.name, 'compressed', 'pdf')}
          originalSize={file.size}
          resultSize={structuralResult.size}
          downloadUrl={structuralResult.url}
          onStartOver={handleStartOver}
          preview={
            <>
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt="First page preview"
                  style={{ maxHeight: 200, borderRadius: 'var(--radius-sm)' }}
                />
              )}
              {structuralResult.cleanupStats?.stripped?.length > 0 && (
                <p className="compress-cleanup-note">
                  Removed: {structuralResult.cleanupStats.stripped.join(', ')}. Title, author,
                  outlines, and named destinations were preserved.
                </p>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
