import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Embeds page numbers directly into the PDF at a position and style you choose. Essential for finalising reports, theses, or formal submissions.';

const POSITIONS = [
  { value: 'bottom-centre', label: 'Bottom Centre' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-right', label: 'Top Right' },
];

const FONT_SIZES = [10, 12, 14, 16, 18];

export default function AddPageNumbers({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState('bottom-centre');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [thumbSize, setThumbSize] = useState(160);

  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setResult(null);
    try {
      const valid = await validatePDFHeader(f);
      if (!valid) {
        setError('The selected file does not appear to be a valid PDF.');
        return;
      }
      const bytes = await f.arrayBuffer();
      const uint8 = new Uint8Array(bytes).slice();

      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(uint8, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      setFile(f);
      setFileBytes(uint8);
      setPageCount(pdfDoc.getPageCount());

      const pdfJsDoc = await loadPdfDocument(uint8.slice());
      const thumb = await renderPageThumbnail(pdfJsDoc, 1);
      setThumbnail(thumb);
      pdfJsDoc.destroy();
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to load PDF. The file may be corrupted or in an unsupported format.');
    }
  }, []);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const { pdfDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setEncryptedError(true);
        return;
      }
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const num = startNumber + idx;
        const text = String(num);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const { width: pageWidth, height: pageHeight } = page.getSize();

        let x, y;
        switch (position) {
          case 'bottom-right':
            x = pageWidth - 50;
            y = 30;
            break;
          case 'top-right':
            x = pageWidth - 50;
            y = pageHeight - 30;
            break;
          case 'bottom-centre':
          default:
            x = pageWidth / 2 - textWidth / 2;
            y = 30;
            break;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });

      const outputBytes = await pdfDoc.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({
        filename: buildOutputFilename(file.name, 'numbered', 'pdf'),
        originalSize: file.size,
        resultSize: outputBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while adding page numbers. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setPageCount(0);
    setError(null);
    setEncryptedError(false);
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setPageCount(0);
    setPosition('bottom-centre');
    setStartNumber(1);
    setFontSize(12);
    setResult(null);
    setError(null);
    setEncryptedError(false);
  }

  if (result) {
    return (
      <div className="tool-container">
        <InfoCard description={DESCRIPTION} />
        <ResultPanel {...result} onStartOver={handleStartOver} />
      </div>
    );
  }

  return (
    <div className="tool-container">
      <InfoCard description={DESCRIPTION} />

      {encryptedError && <EncryptedPDFError onNavigate={navigateTo} />}
      {error && <ErrorCard title="Error" message={error} />}

      {!file && !encryptedError && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFilesSelected}
          label="Drop a PDF here or click to browse"
          sublabel="Single PDF file"
        />
      )}

      {file && (
        <>
          {/* Thumbnail preview */}
          {thumbnail && (
            <div className="pagenumber-preview">
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(80, s - 40))} disabled={thumbSize <= 80} aria-label="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-label">{thumbSize}px</span>
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>
              <img src={thumbnail} alt="First page preview" className="pagenumber-preview-img" style={{ maxHeight: thumbSize * 2 }} />
              <p className="pagenumber-preview-info">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
              <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                <X size={14} />
                Remove
              </button>
            </div>
          )}

          {/* Options */}
          <div className="pagenumber-options">
            <div className="pagenumber-option-group">
              <label className="pagenumber-label">Position</label>
              <div className="pagenumber-radios">
                {POSITIONS.map((pos) => (
                  <label key={pos.value} className="pagenumber-radio">
                    <input
                      type="radio"
                      name="position"
                      value={pos.value}
                      checked={position === pos.value}
                      onChange={() => setPosition(pos.value)}
                    />
                    {pos.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="pagenumber-option-group">
              <label className="pagenumber-label" htmlFor="start-number">Starting Number</label>
              <input
                id="start-number"
                type="number"
                className="pagenumber-number-input"
                value={startNumber}
                min={1}
                onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <div className="pagenumber-option-group">
              <label className="pagenumber-label" htmlFor="font-size">Font Size</label>
              <select
                id="font-size"
                className="pagenumber-select"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>{s} pt</option>
                ))}
              </select>
            </div>
          </div>

          <ActionButton
            label="Add Page Numbers"
            onClick={handleProcess}
            disabled={processing}
            loading={processing}
          />
        </>
      )}
    </div>
  );
}
