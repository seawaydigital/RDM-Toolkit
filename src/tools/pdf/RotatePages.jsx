import { useState, useCallback } from 'react';
import { RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';
import { pdfHasFormFields } from '../../utils/pdfFormDetect';
import FormFieldsNotice from '../../components/ui/FormFieldsNotice';

export default function RotatePages({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [hasFormFields, setHasFormFields] = useState(false);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [thumbSize, setThumbSize] = useState(160);

  const hasChanges = pages.some(p => p.rotation !== 0);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setPages([]);
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

      // Advisory form-field scan (copies bytes synchronously — safe to run
      // before the thumbnail render below slices this buffer).
      pdfHasFormFields(bytesCopy).then(setHasFormFields);

      const initial = Array.from({ length: count }, (_, i) => ({
        id: `page-${i + 1}`,
        pageNumber: i + 1,
        rotation: 0,
        thumbnail: null,
      }));
      setPages(initial);

      const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
      renderAllThumbnails(pdfJsDoc, (pageNum, dataUrl) => {
        setPages(prev =>
          prev.map(p =>
            p.pageNumber === pageNum ? { ...p, thumbnail: dataUrl } : p
          )
        );
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleRotate = useCallback((id) => {
    setPages(prev =>
      prev.map(p =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  }, []);

  const handleRotateAll = useCallback((angle) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + angle) % 360 })));
  }, []);

  const handleResetRotations = useCallback(() => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
  }, []);

  const handleSave = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setError('__encrypted__');
        return;
      }
      const pdfPages = pdfDoc.getPages();

      pages.forEach((pageState, i) => {
        if (pageState.rotation !== 0) {
          const currentRotation = pdfPages[i].getRotation().angle;
          pdfPages[i].setRotation(degrees(currentRotation + pageState.rotation));
        }
      });

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'rotated', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: savedBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while rotating the PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, pages]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setFileBytes(null);
    setPages([]);
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
        description="Rotate individual pages or all pages at once. Click the rotate button on any page to turn it 90° clockwise. Useful for fixing scanned documents that came out sideways or upside down."
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

      {file && pages.length > 0 && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {/* Toolbar */}
          <div className="rotate-toolbar">
            <button className="rotate-toolbar-btn" onClick={() => handleRotateAll(90)}>
              Rotate All 90°
            </button>
            <button className="rotate-toolbar-btn" onClick={handleResetRotations}>
              Reset All
            </button>
          </div>

          {/* Zoom + Page grid */}
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
            {pages.map(page => (
              <div key={page.id} className="rotate-page-card">
                <div className="rotate-page-thumb-wrapper">
                  {page.thumbnail ? (
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.pageNumber}`}
                      className="rotate-page-thumbnail"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                  ) : (
                    <div
                      className="thumbnail-placeholder"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                  )}
                </div>
                <div className="rotate-page-footer">
                  <span className="rotate-page-label">{page.pageNumber}</span>
                  <button
                    className="rotate-page-btn"
                    onClick={() => handleRotate(page.id)}
                    aria-label={`Rotate page ${page.pageNumber}`}
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasFormFields && <FormFieldsNotice action="rotating" />}

          <ActionButton
            label="Save Rotated PDF"
            onClick={handleSave}
            disabled={!hasChanges}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
