import { useState, useCallback, useRef } from 'react';
import { PDFDocument, rgb, degrees } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const FONT_SIZES = [24, 36, 48, 72];
const COLORS = {
  red: { label: 'Red', value: [1, 0, 0] },
  grey: { label: 'Grey', value: [0.5, 0.5, 0.5] },
  blue: { label: 'Blue', value: [0, 0, 0.8] },
};
const ROTATIONS = {
  diagonal: { label: 'Diagonal', degrees: 45 },
  horizontal: { label: 'Horizontal', degrees: 0 },
};

export default function PDFWatermark({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbSize, setThumbSize] = useState(160);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [watermarkText, setWatermarkText] = useState('DRAFT');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('red');
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState('diagonal');

  const pdfJsDocRef = useRef(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setThumbnail(null);

    const isValid = await validatePDFHeader(selectedFile);
    if (!isValid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    try {
      const rawBytes = await selectedFile.arrayBuffer();
      const bytesCopy = new Uint8Array(rawBytes).slice();

      const { isEncrypted } = await loadPdfLibDocument(bytesCopy, { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      setFile(selectedFile);
      setFileBytes(bytesCopy);

      try {
        const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
        if (pdfJsDocRef.current) pdfJsDocRef.current.destroy();
        pdfJsDocRef.current = pdfJsDoc;
        const thumbUrl = await renderPageThumbnail(pdfJsDoc, 1);
        setThumbnail(thumbUrl);
      } catch (e) {
        console.error('Thumbnail rendering failed:', e);
      }
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!fileBytes || !watermarkText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(fileBytes.slice(), { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      const font = await pdfDoc.embedFont('Helvetica');
      const pages = pdfDoc.getPages();
      const [r, g, b] = COLORS[color].value;
      const rotDeg = ROTATIONS[rotation].degrees;

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = fontSize;

        page.drawText(watermarkText, {
          x: (width - textWidth) / 2,
          y: (height - textHeight) / 2,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(rotDeg),
        });
      }

      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'watermarked', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: resultBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('[PDFWatermark]', e);
      setError('Something went wrong while adding the watermark. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, watermarkText, fontSize, color, opacity, rotation]);

  const handleRemoveFile = useCallback(() => {
    if (thumbnail) URL.revokeObjectURL(thumbnail);
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setError(null);
  }, [thumbnail]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (thumbnail) URL.revokeObjectURL(thumbnail);
    if (pdfJsDocRef.current) { pdfJsDocRef.current.destroy(); pdfJsDocRef.current = null; }
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setResult(null);
    setError(null);
  }, [result, thumbnail]);

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
      </div>
    );
  }

  return (
    <div>
      <InfoCard
        description="Add a text watermark to every page of your PDF. Choose the text, size, color, opacity and rotation. Your file never leaves your browser."
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

      {file && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <span className="tool-file-size">{formatFileSize(file.size)}</span>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {thumbnail && (
            <>
              <div className="zoom-controls" style={{ marginTop: 'var(--space-md)' }}>
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(80, s - 40))} disabled={thumbSize <= 80} aria-label="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-label">{thumbSize}px</span>
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>
              <img
                src={thumbnail}
                alt="First page preview"
                className="compress-thumbnail"
                style={{ maxHeight: thumbSize * 2.5 }}
              />
            </>
          )}

          {/* Watermark options */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)',
            marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Watermark Options
            </p>

            {/* Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                placeholder="e.g. DRAFT"
                style={{
                  padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Font size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Font Size</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {FONT_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      background: fontSize === s ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: fontSize === s ? '#0F172A' : 'var(--text-primary)',
                      border: fontSize === s ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Color</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {Object.entries(COLORS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setColor(key)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      background: color === key ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: color === key ? '#0F172A' : 'var(--text-primary)',
                      border: color === key ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Opacity: {opacity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* Rotation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rotation</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {Object.entries(ROTATIONS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setRotation(key)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      background: rotation === key ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: rotation === key ? '#0F172A' : 'var(--text-primary)',
                      border: rotation === key ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActionButton
            label="Add Watermark"
            onClick={handleProcess}
            disabled={!fileBytes || !watermarkText.trim()}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
