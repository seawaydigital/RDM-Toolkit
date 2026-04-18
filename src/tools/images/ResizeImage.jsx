import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

function getOutputMimeType(file) {
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function getExtFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export default function ResizeImage({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [mode, setMode] = useState('pixels');
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [percentage, setPercentage] = useState(100);
  const [lockAspect, setLockAspect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [previewSize, setPreviewSize] = useState(200);

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);

    const url = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
      setTargetWidth(img.naturalWidth);
      setTargetHeight(img.naturalHeight);
      setPercentage(100);
      setPreviewUrl(url);
      setFile(selectedFile);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load the image. Please try a different file.');
    };
    img.src = url;
  }, []);

  const handleWidthChange = useCallback((val) => {
    const w = Math.max(1, Math.round(Number(val) || 1));
    setTargetWidth(w);
    if (lockAspect && originalWidth > 0) {
      setTargetHeight(Math.max(1, Math.round((w / originalWidth) * originalHeight)));
    }
  }, [lockAspect, originalWidth, originalHeight]);

  const handleHeightChange = useCallback((val) => {
    const h = Math.max(1, Math.round(Number(val) || 1));
    setTargetHeight(h);
    if (lockAspect && originalHeight > 0) {
      setTargetWidth(Math.max(1, Math.round((h / originalHeight) * originalWidth)));
    }
  }, [lockAspect, originalWidth, originalHeight]);

  const handlePercentageChange = useCallback((val) => {
    const pct = Math.max(1, Math.round(Number(val) || 1));
    setPercentage(pct);
  }, []);

  const finalWidth = mode === 'percentage'
    ? Math.max(1, Math.round(originalWidth * percentage / 100))
    : targetWidth;
  const finalHeight = mode === 'percentage'
    ? Math.max(1, Math.round(originalHeight * percentage / 100))
    : targetHeight;

  const handleResize = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const blob = await resizeImage(file, finalWidth, finalHeight);
      const outputMime = getOutputMimeType(file);
      const ext = getExtFromMime(outputMime);
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'resized', ext);

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while resizing the image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, finalWidth, finalHeight]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setTargetWidth(0);
    setTargetHeight(0);
    setPercentage(100);
    setError(null);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setTargetWidth(0);
    setTargetHeight(0);
    setPercentage(100);
    setResult(null);
    setError(null);
  }, [result, previewUrl]);

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
            previewUrl ? (
              <img
                src={previewUrl}
                alt="Original image"
                style={{ maxHeight: 200, maxWidth: 300, borderRadius: 'var(--radius-sm)' }}
              />
            ) : null
          }
        />
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };

  return (
    <div>
      <InfoCard description="Changes image dimensions by pixel or percentage scale using the Canvas API." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp,.bmp"
          validationConfig={IMAGE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
        />
      )}

      {file && (
        <>
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.max(100, s - 50))} disabled={previewSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{previewSize}px</span>
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.min(500, s + 50))} disabled={previewSize >= 500} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="compress-preview">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="compress-thumbnail"
                style={{ maxHeight: previewSize, maxWidth: '100%' }}
              />
            )}
            <div className="compress-file-info">
              <p className="compress-file-name">{file.name}</p>
              <p className="compress-file-size">
                {formatFileSize(file.size)} — {originalWidth} × {originalHeight}px
              </p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                onClick={() => setMode('pixels')}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm) var(--space-md)',
                  background: mode === 'pixels' ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                  color: mode === 'pixels' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Pixel Dimensions
              </button>
              <button
                onClick={() => setMode('percentage')}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm) var(--space-md)',
                  background: mode === 'percentage' ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                  color: mode === 'percentage' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Percentage Scale
              </button>
            </div>

            {mode === 'pixels' ? (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={e => setLockAspect(e.target.checked)}
                  />
                  Lock aspect ratio
                </label>

                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={targetWidth}
                      onChange={e => handleWidthChange(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18, paddingTop: 20 }}>{'\u00D7'}</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={targetHeight}
                      onChange={e => handleHeightChange(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                  Scale: {percentage}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={percentage}
                  onChange={e => handlePercentageChange(e.target.value)}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                  Output: {finalWidth} × {finalHeight}px
                </p>
              </div>
            )}
          </div>

          <ActionButton
            label="Resize Image"
            onClick={handleResize}
            loading={loading}
            disabled={finalWidth < 1 || finalHeight < 1}
          />
        </>
      )}
    </div>
  );
}

function resizeImage(file, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const outputMime = getOutputMimeType(file);
      if (outputMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const qualityArg = (outputMime === 'image/jpeg' || outputMime === 'image/webp') ? 0.92 : undefined;
      canvas.toBlob(
        blob => {
          canvas.remove();
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        outputMime,
        qualityArg
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
