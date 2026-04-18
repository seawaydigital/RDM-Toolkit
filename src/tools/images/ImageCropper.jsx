import { useState, useCallback, useRef, useEffect } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

function getExtFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/bmp') return 'bmp';
  return 'jpg';
}

function getOutputMime(file) {
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  return 'image/png'; // default to PNG to maintain quality
}

export default function ImageCropper({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [previewSize, setPreviewSize] = useState(400);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Crop selection state (in image coordinates)
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef(null);

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);
    setCropStart(null);
    setCropEnd(null);

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

  // Convert mouse event to image-space coordinates
  const eventToImageCoords = useCallback((e) => {
    const imgEl = imgRef.current;
    if (!imgEl || !originalDimensions) return null;
    const rect = imgEl.getBoundingClientRect();
    const scaleX = originalDimensions.width / rect.width;
    const scaleY = originalDimensions.height / rect.height;
    const x = Math.round(Math.max(0, Math.min(originalDimensions.width, (e.clientX - rect.left) * scaleX)));
    const y = Math.round(Math.max(0, Math.min(originalDimensions.height, (e.clientY - rect.top) * scaleY)));
    return { x, y };
  }, [originalDimensions]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const coords = eventToImageCoords(e);
    if (!coords) return;
    setCropStart(coords);
    setCropEnd(coords);
    setIsDragging(true);
  }, [eventToImageCoords]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const coords = eventToImageCoords(e);
    if (coords) setCropEnd(coords);
  }, [isDragging, eventToImageCoords]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Listen for mouseup and mousemove on window to handle drag outside image
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      const coords = eventToImageCoords(e);
      if (coords) setCropEnd(coords);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, eventToImageCoords]);

  // Compute normalized crop rect
  const getCropRect = useCallback(() => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    if (w < 1 || h < 1) return null;
    return { x, y, w, h };
  }, [cropStart, cropEnd]);

  const cropRect = getCropRect();

  const handleCrop = useCallback(async () => {
    if (!file || !cropRect || !originalDimensions) return;
    setLoading(true);
    setError(null);

    try {
      const blob = await cropToBlob(file, cropRect, originalDimensions);
      const outputMime = getOutputMime(file);
      const ext = getExtFromMime(outputMime);
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'cropped', ext);

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while cropping the image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, cropRect, originalDimensions]);

  const handleResetSelection = useCallback(() => {
    setCropStart(null);
    setCropEnd(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setCropStart(null);
    setCropEnd(null);
    setError(null);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setCropStart(null);
    setCropEnd(null);
    setResult(null);
    setError(null);
    setPreviewSize(400);
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
            result.downloadUrl ? (
              <img
                src={result.downloadUrl}
                alt="Cropped preview"
                style={{ maxHeight: 200, maxWidth: 300, borderRadius: 'var(--radius-sm)' }}
              />
            ) : null
          }
        />
      </div>
    );
  }

  // Compute overlay clip path for the crop selection overlay
  const getOverlayStyle = () => {
    if (!cropRect || !originalDimensions || !imgRef.current) return null;
    const imgEl = imgRef.current;
    const rect = imgEl.getBoundingClientRect();
    const scaleX = rect.width / originalDimensions.width;
    const scaleY = rect.height / originalDimensions.height;
    return {
      left: cropRect.x * scaleX,
      top: cropRect.y * scaleY,
      width: cropRect.w * scaleX,
      height: cropRect.h * scaleY,
    };
  };

  const overlayPos = getOverlayStyle();

  return (
    <div>
      <InfoCard description="Crop images by drawing a selection rectangle. All processing runs in your browser — your photos never leave your machine." />

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
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.max(150, s - 50))} disabled={previewSize <= 150} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{previewSize}px</span>
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.min(800, s + 50))} disabled={previewSize >= 800} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="compress-preview">
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'crosshair',
                userSelect: 'none',
                maxWidth: '100%',
              }}
              onMouseDown={handleMouseDown}
            >
              {previewUrl && (
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Preview"
                  draggable={false}
                  style={{
                    maxHeight: previewSize,
                    maxWidth: '100%',
                    display: 'block',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              )}

              {/* Dark overlay outside crop area using box-shadow technique */}
              {overlayPos && imgRef.current && (
                <div style={{
                  position: 'absolute',
                  top: overlayPos.top,
                  left: overlayPos.left,
                  width: overlayPos.width,
                  height: overlayPos.height,
                  background: 'transparent',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  border: '2px dashed rgba(255, 255, 255, 0.8)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }} />
              )}
            </div>

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

          {/* Crop dimensions display */}
          {cropRect && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
              marginBottom: 'var(--space-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-md)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Selection: <strong style={{ color: 'var(--text-primary)' }}>{cropRect.w} × {cropRect.h}px</strong>
                <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>
                  at ({cropRect.x}, {cropRect.y})
                </span>
              </p>
              <button
                onClick={handleResetSelection}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-xs) var(--space-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                Reset Selection
              </button>
            </div>
          )}

          {!cropRect && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Click and drag on the image to select the area you want to crop.
              </p>
            </div>
          )}

          <ActionButton
            label="Crop Image"
            onClick={handleCrop}
            loading={loading}
            disabled={!cropRect}
          />
        </>
      )}
    </div>
  );
}

function cropToBlob(file, cropRect, originalDimensions) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropRect.w;
      canvas.height = cropRect.h;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        img,
        cropRect.x, cropRect.y, cropRect.w, cropRect.h,
        0, 0, cropRect.w, cropRect.h
      );
      URL.revokeObjectURL(url);

      const outputMime = getOutputMime(file);
      canvas.toBlob(
        (blob) => {
          canvas.remove();
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        outputMime,
        1.0 // max quality to maintain original quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
