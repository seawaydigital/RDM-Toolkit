import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { X } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { ANY_FILE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

export default function CreateZIP({ tool, navigateTo }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFilesSelected = useCallback((selected) => {
    setError(null);
    setResult(null);
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleCreateZip = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const zip = new JSZip();

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        zip.file(file.name, buffer);
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(files[0].name, 'archived', 'zip');

      setResult({
        filename,
        originalSize: totalSize,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while creating the ZIP archive. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [files, totalSize]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFiles([]);
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
          preview={
            <div className="zip-result-summary">
              <p className="zip-result-count">{files.length} file{files.length !== 1 ? 's' : ''} archived</p>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <InfoCard
        description="Packages multiple files of any type into a single ZIP archive. Compression runs in your browser using JSZip — your files are never uploaded."
      />

      {error && <ErrorCard title="Error" message={error} />}

      <DropZone
        accept="*"
        validationConfig={ANY_FILE_VALIDATION}
        multiple
        onFilesSelected={handleFilesSelected}
        label="Drop files here or click to browse"
        sublabel="Any file type accepted"
      />

      {files.length > 0 && (
        <div className="zip-file-list">
          <div className="zip-file-list-header">
            <span className="zip-file-list-title">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
            <span className="zip-file-list-total">Total: {formatFileSize(totalSize)}</span>
          </div>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="zip-file-item">
              <div className="zip-file-item-info">
                <span className="zip-file-item-name">{file.name}</span>
                <span className="zip-file-item-size">{formatFileSize(file.size)}</span>
              </div>
              <button
                className="zip-file-item-remove"
                onClick={() => handleRemoveFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ActionButton
          label={`Create ZIP Archive (${files.length} file${files.length !== 1 ? 's' : ''})`}
          onClick={handleCreateZip}
          disabled={files.length === 0}
          loading={loading}
        />
      )}
    </div>
  );
}
