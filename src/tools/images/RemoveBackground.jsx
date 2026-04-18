import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const BG_REMOVAL_VALIDATION = {
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  warnSize: 20 * 1024 * 1024,
  blockSize: 100 * 1024 * 1024,
  label: 'image',
};

export default function RemoveBackground({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [largeImageWarning, setLargeImageWarning] = useState(false);
  const [previewSize, setPreviewSize] = useState(250);

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);
    setResultPreviewUrl(null);
    setProgress(0);
    setLargeImageWarning(false);

    const url = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      if (img.naturalWidth > 4000 || img.naturalHeight > 4000) {
        setLargeImageWarning(true);
      }
      setPreviewUrl(url);
      setFile(selectedFile);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load the image. Please try a different file.');
    };
    img.src = url;
  }, []);

  const handleRemoveBackground = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Dynamic import to avoid loading the large library upfront
      const { removeBackground } = await import('@imgly/background-removal');

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (total > 0) {
            setProgress(Math.round((current / total) * 100));
          }
        },
        publicPath: `${window.location.origin}/assets/imgly/`,
      });

      const resultUrl = URL.createObjectURL(blob);
      setResultPreviewUrl(resultUrl);

      const filename = buildOutputFilename(file.name, 'bg-removed', 'png');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: resultUrl,
      });
    } catch (err) {
      console.error('Background removal failed:', err);
      setError('Background removal failed. Try a different image or reduce file size first.');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setError(null);
    setProgress(0);
    setLargeImageWarning(false);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultPreviewUrl && resultPreviewUrl !== result?.downloadUrl) {
      URL.revokeObjectURL(resultPreviewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setResultPreviewUrl(null);
    setOriginalDimensions(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setLargeImageWarning(false);
  }, [result, previewUrl, resultPreviewUrl]);

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />

        {/* Zoom controls */}
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.max(100, s - 50))} disabled={previewSize <= 100} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-label">{previewSize}px</span>
          <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.min(500, s + 50))} disabled={previewSize >= 500} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Side-by-side before/after */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Before</p>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Original"
                style={{
                  maxWidth: '100%',
                  maxHeight: previewSize,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              />
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>After</p>
            {resultPreviewUrl && (
              <img
                src={resultPreviewUrl}
                alt="Background removed"
                className="transparent-preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: previewSize,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              />
            )}
          </div>
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
      <InfoCard description="Removes the background from any image using a neural network that runs entirely in your browser — powered by WebAssembly. Your image pixels never leave your device. No API key required." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp"
          validationConfig={BG_REMOVAL_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
        />
      )}

      {file && (
        <>
          <div className="compress-preview">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="compress-thumbnail"
                style={{ width: 100 }}
              />
            )}
            <div className="compress-file-info">
              <p className="compress-file-name">{file.name}</p>
              <p className="compress-file-size">
                {formatFileSize(file.size)}
                {originalDimensions && ` — ${originalDimensions.width} × ${originalDimensions.height}px`}
              </p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {largeImageWarning && (
            <div className="info-card" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: 'var(--space-lg)' }}>
              <p className="info-card-description" style={{ fontSize: 13 }}>
                This image is larger than 4000px. Processing may be slow or fail. Consider using the Resize Image tool first to reduce dimensions.
              </p>
            </div>
          )}

          {loading && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                Processing... {progress > 0 ? `${progress}%` : 'Loading model...'}
              </p>
              <div style={{
                width: '100%',
                height: 8,
                background: 'var(--bg-tertiary)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.max(progress, 5)}%`,
                  height: '100%',
                  background: 'var(--accent-cyan)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                The neural network model runs locally in your browser. This may take 10-60 seconds depending on image size and your device.
              </p>
            </div>
          )}

          <ActionButton
            label="Remove Background"
            onClick={handleRemoveBackground}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
