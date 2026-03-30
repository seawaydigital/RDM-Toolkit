import { useState, useCallback } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
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

export default function CompressPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [thumbSize, setThumbSize] = useState(160);

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

      // Verify we can load it (catches encrypted PDFs)
      const { isEncrypted } = await loadPdfLibDocument(bytesCopy, { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      setFile(selectedFile);
      setFileBytes(bytesCopy);

      // Render first-page thumbnail
      try {
        const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
        const thumbUrl = await renderPageThumbnail(pdfJsDoc, 1);
        setThumbnail(thumbUrl);
        pdfJsDoc.destroy();
      } catch (e) {
        console.error('Thumbnail rendering failed:', e);
        // Non-critical
      }
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setError('__encrypted__');
        return;
      }
      const compressedBytes = await pdfDoc.save();

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'compressed', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: compressedBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while compressing the PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file]);

  const handleRemoveFile = useCallback(() => {
    if (thumbnail) {
      URL.revokeObjectURL(thumbnail);
    }
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setError(null);
  }, [thumbnail]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setResult(null);
    setError(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard
          description={tool.description}
          limitations={[
            'Cannot re-encode or downsample embedded images',
            'Scanned PDFs with large images may not shrink',
            'Results vary greatly depending on PDF content',
          ]}
        />
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
        description="Optimises PDF structure by stripping unused objects and normalising internal data. Your file never leaves your browser. Note: some PDFs may not shrink or may even grow slightly because browser-based processing cannot re-encode embedded images. Best results come from PDFs with lots of metadata or unused objects."
        limitations={[
          'Cannot re-encode or downsample embedded images',
          'Scanned PDFs with large images may not shrink',
          'Results vary greatly depending on PDF content',
        ]}
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
        </div>
      )}

      {file && (
        <ActionButton
          label="Compress PDF"
          onClick={handleCompress}
          disabled={!fileBytes}
          loading={loading}
        />
      )}
    </div>
  );
}
