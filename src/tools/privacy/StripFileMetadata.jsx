import { useState, useCallback } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X } from 'lucide-react';
import { formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { stripImageMetadata } from '../../utils/imageUtils';

const ACCEPTED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

const VALIDATION_CONFIG = {
  allowedMimes: ACCEPTED_MIMES,
  allowedExtensions: ACCEPTED_EXTENSIONS,
  warnSize: 50 * 1024 * 1024,
  blockSize: 200 * 1024 * 1024,
  label: 'PDF or image',
};

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function isPDF(file) {
  return file.type === 'application/pdf' || getExtension(file.name) === 'pdf';
}

function isImage(file) {
  return file.type.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(getExtension(file.name));
}

async function readPDFMetadata(bytes) {
  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return {
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      keywords: pdfDoc.getKeywords() || '',
      creationDate: pdfDoc.getCreationDate()?.toISOString() || '',
      modificationDate: pdfDoc.getModificationDate()?.toISOString() || '',
    };
  } catch {
    return null;
  }
}

async function stripPDFMetadata(bytes) {
  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));
  return await pdfDoc.save();
}

function MetadataTable({ label, metadata }) {
  const entries = Object.entries(metadata).filter(([, v]) => v && v.length > 0);
  if (entries.length === 0) {
    return (
      <div className="metadata-table-section">
        <h4 className="metadata-table-label">{label}</h4>
        <p className="metadata-table-empty">No metadata found.</p>
      </div>
    );
  }
  return (
    <div className="metadata-table-section">
      <h4 className="metadata-table-label">{label}</h4>
      <table className="metadata-table">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td className="metadata-table-key">{key}</td>
              <td className="metadata-table-value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StripFileMetadata({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [beforeMetadata, setBeforeMetadata] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setBeforeMetadata(null);

    try {
      if (isPDF(selectedFile)) {
        const bytes = await selectedFile.arrayBuffer();
        const meta = await readPDFMetadata(new Uint8Array(bytes));
        if (meta) {
          setBeforeMetadata(meta);
        }
      } else if (isImage(selectedFile)) {
        // For images, we note EXIF may be present
        setBeforeMetadata({ note: 'Image may contain EXIF/metadata (GPS, camera info, timestamps). Stripping will remove all hidden metadata by re-encoding through Canvas.' });
      }
      setFile(selectedFile);
    } catch {
      setError('Failed to read the file. Please try a different file.');
    }
  }, []);

  const handleStrip = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      let blob;
      let ext;

      if (isPDF(file)) {
        const bytes = await file.arrayBuffer();
        const strippedBytes = await stripPDFMetadata(new Uint8Array(bytes));
        blob = new Blob([strippedBytes], { type: 'application/pdf' });
        ext = 'pdf';
      } else if (isImage(file)) {
        blob = await stripImageMetadata(file);
        ext = file.type === 'image/png' ? 'png' : 'jpg';
      } else {
        throw new Error('Unsupported file type.');
      }

      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'metadata-stripped', ext);

      // Read after metadata for PDFs
      let afterMetadata = null;
      if (isPDF(file)) {
        const afterBytes = await blob.arrayBuffer();
        afterMetadata = await readPDFMetadata(new Uint8Array(afterBytes));
      }

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
        afterMetadata,
      });
    } catch (e) {
      setError(e.message || 'Something went wrong while stripping metadata. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setError(null);
    setBeforeMetadata(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setResult(null);
    setError(null);
    setBeforeMetadata(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />

        <div className="metadata-comparison">
          {beforeMetadata && !beforeMetadata.note && (
            <MetadataTable label="Before (original)" metadata={beforeMetadata} />
          )}
          {result.afterMetadata && (
            <MetadataTable label="After (stripped)" metadata={result.afterMetadata} />
          )}
          {beforeMetadata?.note && (
            <div className="metadata-stripped-status">
              <span className="metadata-stripped-badge metadata-stripped-badge--success">Metadata stripped</span>
              <p className="metadata-stripped-note">Image re-encoded through Canvas API. All EXIF data has been removed.</p>
            </div>
          )}
          {!beforeMetadata?.note && (
            <div className="metadata-stripped-status">
              <span className="metadata-stripped-badge metadata-stripped-badge--success">PDF metadata cleared</span>
            </div>
          )}
        </div>

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
      <InfoCard description="Remove hidden metadata from PDF and image files before sharing. Required before distributing documents externally under GDPR, PIPEDA, and PHIPA. Your file never leaves your browser." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".pdf,.jpg,.jpeg,.png"
          validationConfig={VALIDATION_CONFIG}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF or image file here"
          sublabel="Supports PDF, JPG, PNG"
        />
      )}

      {file && (
        <div className="strip-metadata-preview">
          <div className="strip-metadata-file-info">
            <p className="strip-metadata-file-name">{file.name}</p>
            <p className="strip-metadata-file-size">{formatFileSize(file.size)}</p>
            <p className="strip-metadata-file-type">
              {isPDF(file) ? 'PDF Document' : 'Image File'}
            </p>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {beforeMetadata && !beforeMetadata.note && (
            <MetadataTable label="Current metadata" metadata={beforeMetadata} />
          )}

          {beforeMetadata?.note && (
            <p className="strip-metadata-note">{beforeMetadata.note}</p>
          )}
        </div>
      )}

      {file && (
        <ActionButton
          label="Strip Metadata"
          onClick={handleStrip}
          loading={loading}
        />
      )}
    </div>
  );
}
