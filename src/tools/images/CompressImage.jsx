import { useState, useCallback, useRef, useEffect } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const MAX_WIDTH_OPTIONS = [
  { label: 'Original', value: null },
  { label: '1920px', value: 1920 },
  { label: '1280px', value: 1280 },
  { label: '800px', value: 800 },
  { label: '640px', value: 640 },
];

/**
 * Map input MIME to the output MIME used during compression.
 * PNG is converted to WebP so the quality slider actually works.
 */
function getOutputMimeType(file) {
  if (file.type === 'image/jpeg') return 'image/jpeg';
  if (file.type === 'image/webp') return 'image/webp';
  if (file.type === 'image/png') return 'image/webp';
  return 'image/jpeg';
}

function getExtFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export default function CompressImage({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const debounceRef = useRef(null);
  const [liveEstimate, setLiveEstimate] = useState(null);
  const [previewSize, setPreviewSize] = useState(200);

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);
    setLiveEstimate(null);

    const url = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setPreviewUrl(url);
      setFile(selectedFile);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load the image. Please try a different file.');
    };
    img.src = url;
  }, []);

  // Live preview estimate with debounce
  useEffect(() => {
    if (!file || !originalDimensions) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      compressToBlob(file, quality, maxWidth, originalDimensions).then(blob => {
        if (blob) {
          setLiveEstimate(blob.size);
        }
      }).catch(() => {});
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [file, quality, maxWidth, originalDimensions]);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const blob = await compressToBlob(file, quality, maxWidth, originalDimensions);
      const outputMime = getOutputMimeType(file);
      const ext = getExtFromMime(outputMime);
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'compressed', ext);

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while compressing the image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, quality, maxWidth, originalDimensions]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setError(null);
    setLiveEstimate(null);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setQuality(80);
    setMaxWidth(null);
    setResult(null);
    setError(null);
    setLiveEstimate(null);
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
                alt="Image preview"
                style={{ maxHeight: 200, maxWidth: 300, borderRadius: 'var(--radius-sm)' }}
              />
            ) : null
          }
        />
      </div>
    );
  }

  const isPNG = file?.type === 'image/png';

  return (
    <div>
      <InfoCard description="Reduces image file size by adjusting quality and optionally scaling dimensions. All compression runs on your device using the Canvas API — your photos never leave your machine." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp,.bmp"
          validationConfig={IMAGE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
          sublabel="Accepts JPG, PNG, WebP, BMP"
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
                {formatFileSize(file.size)}
                {originalDimensions && ` — ${originalDimensions.width} × ${originalDimensions.height}px`}
              </p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {isPNG && (
            <div className="info-card" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: 'var(--space-lg)' }}>
              <p className="info-card-description" style={{ fontSize: 13 }}>
                PNG is a lossless format. Your image will be compressed as WebP so the quality slider takes effect. The output file will be a .webp.
              </p>
            </div>
          )}

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
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                Quality: {quality}%
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                Max Width
              </label>
              <select
                value={maxWidth ?? ''}
                onChange={e => setMaxWidth(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              >
                {MAX_WIDTH_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
                ))}
              </select>
            </div>

            {liveEstimate !== null && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Estimated size: {formatFileSize(liveEstimate)}{' '}
                ({Math.round(((liveEstimate - file.size) / file.size) * 100)}%)
              </p>
            )}
          </div>

          <ActionButton
            label="Compress Image"
            onClick={handleCompress}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

function compressToBlob(file, quality, maxWidth, originalDimensions) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let width = originalDimensions.width;
      let height = originalDimensions.height;

      if (maxWidth && width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

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

      canvas.toBlob(
        blob => {
          canvas.remove();
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        outputMime,
        quality / 100
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
