import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { stripImageMetadata as stripViaCanvas } from '../../utils/imageUtils';
import exifr from 'exifr';

const METADATA_FIELDS = [
  { key: 'latitude', label: 'GPS Latitude', icon: '\uD83D\uDCCD', isGPS: true },
  { key: 'longitude', label: 'GPS Longitude', icon: '\uD83D\uDCCD', isGPS: true },
  { key: 'Make', label: 'Camera Make', icon: '\uD83D\uDCF7' },
  { key: 'Model', label: 'Camera Model', icon: '\uD83D\uDCF7' },
  { key: 'DateTimeOriginal', label: 'Date Taken', icon: '\uD83D\uDCC5' },
  { key: 'Software', label: 'Software', icon: '\u2699\uFE0F' },
  { key: 'ColorSpace', label: 'Colour Space', icon: '\uD83C\uDFA8' },
  { key: 'Orientation', label: 'Orientation', icon: '\uD83D\uDCD0' },
  { key: 'ExposureTime', label: 'Exposure Time', icon: '\u26A1' },
  { key: 'FNumber', label: 'F-Number', icon: '\uD83D\uDD06' },
  { key: 'FocalLength', label: 'Focal Length', icon: '\uD83D\uDCCF' },
  { key: 'ISO', label: 'ISO Speed', icon: '\uD83D\uDD22' },
];

function formatMetaValue(key, value) {
  if (value === undefined || value === null) return null;
  if (key === 'latitude') return `${Math.abs(value).toFixed(4)}\u00B0 ${value >= 0 ? 'N' : 'S'}`;
  if (key === 'longitude') return `${Math.abs(value).toFixed(4)}\u00B0 ${value >= 0 ? 'E' : 'W'}`;
  if (key === 'ExposureTime') return value > 0 ? `1/${Math.round(1 / value)} sec` : `${value} sec`;
  if (key === 'FNumber') return `f/${value}`;
  if (key === 'FocalLength') return `${value} mm`;
  if (key === 'DateTimeOriginal' && value instanceof Date) return value.toLocaleString();
  return String(value);
}

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

export default function StripImageMetadata({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [hasGPS, setHasGPS] = useState(false);
  const [noMetadata, setNoMetadata] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [strippedVerification, setStrippedVerification] = useState(null);
  const [previewSize, setPreviewSize] = useState(200);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setMetadata(null);
    setHasGPS(false);
    setNoMetadata(false);
    setStrippedVerification(null);

    const url = URL.createObjectURL(selectedFile);

    // Verify it loads as an image
    const img = new Image();
    img.onload = async () => {
      setPreviewUrl(url);
      setFile(selectedFile);

      // Parse metadata with exifr
      try {
        const exifData = await exifr.parse(selectedFile, { gps: true, tiff: true, exif: true, ifd0: true });
        if (!exifData || Object.keys(exifData).length === 0) {
          setNoMetadata(true);
          return;
        }

        const parsed = {};
        let gpsFound = false;

        for (const field of METADATA_FIELDS) {
          const val = exifData[field.key];
          const formatted = formatMetaValue(field.key, val);
          if (formatted) {
            parsed[field.key] = formatted;
            if (field.isGPS) gpsFound = true;
          }
        }

        if (Object.keys(parsed).length === 0) {
          setNoMetadata(true);
        } else {
          setMetadata(parsed);
          setHasGPS(gpsFound);
        }
      } catch {
        // exifr may throw on unsupported formats - treat as no metadata
        setNoMetadata(true);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load the image. Please try a different file.');
    };
    img.src = url;
  }, []);

  const handleStrip = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // Re-draw through canvas to strip all EXIF
      const blob = await stripViaCanvas(file);
      const outputMime = getOutputMimeType(file);
      const ext = getExtFromMime(outputMime);
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'metadata-stripped', ext);

      // Verify stripping by parsing the output blob
      let verificationResult = {};
      try {
        const verifyData = await exifr.parse(blob, { gps: true, tiff: true, exif: true, ifd0: true });
        if (verifyData) {
          for (const field of METADATA_FIELDS) {
            const val = verifyData[field.key];
            const formatted = formatMetaValue(field.key, val);
            verificationResult[field.key] = formatted ? 'Still present' : 'Removed';
          }
        }
      } catch {
        // Parse failure on output means metadata was stripped
      }

      setStrippedVerification(verificationResult);
      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while stripping metadata. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setHasGPS(false);
    setNoMetadata(false);
    setError(null);
    setStrippedVerification(null);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setHasGPS(false);
    setNoMetadata(false);
    setResult(null);
    setError(null);
    setStrippedVerification(null);
  }, [result, previewUrl]);

  const cellStyle = {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
  };

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />

        {/* Before/After metadata table */}
        {metadata && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)' }}>
                  <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--text-secondary)' }}>Field</th>
                  <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--text-secondary)' }}>Before</th>
                  <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--text-secondary)' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {METADATA_FIELDS.filter(f => metadata[f.key]).map(field => {
                  const afterVal = strippedVerification?.[field.key];
                  const wasRemoved = !afterVal || afterVal === 'Removed';
                  return (
                    <tr key={field.key}>
                      <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                        {field.icon} {field.label}
                      </td>
                      <td style={{ ...cellStyle, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {metadata[field.key]}
                      </td>
                      <td style={{
                        ...cellStyle,
                        color: wasRemoved ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {wasRemoved ? '\u2705 Removed' : '\u274C Still present'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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

  return (
    <div>
      <InfoCard description="Reads and displays all hidden EXIF metadata in your image — including GPS location, camera model, and timestamps — then removes it permanently." />

      <div className="info-card" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: 'var(--space-lg)' }}>
        <p className="info-card-description" style={{ fontSize: 13 }}>
          Required under GDPR and PIPEDA before sharing images that may contain location or identity data.
        </p>
      </div>

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
              <p className="compress-file-size">{formatFileSize(file.size)}</p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {hasGPS && (
            <div className="error-card" role="alert" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: 'var(--space-lg)' }}>
              <p className="error-card-message" style={{ color: 'var(--accent-amber)' }}>
                This image contains your precise GPS location.
              </p>
            </div>
          )}

          {noMetadata && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
              color: 'var(--accent-green)',
              fontSize: 14,
            }}>
              No metadata detected. Nothing to strip.
            </div>
          )}

          {metadata && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--text-secondary)' }}>Field</th>
                    <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--text-secondary)' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {METADATA_FIELDS.filter(f => metadata[f.key]).map(field => (
                    <tr key={field.key}>
                      <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                        {field.icon} {field.label}
                      </td>
                      <td style={{ ...cellStyle, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {metadata[field.key]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!noMetadata && metadata && (
            <ActionButton
              label="Strip Metadata"
              onClick={handleStrip}
              loading={loading}
            />
          )}
        </>
      )}
    </div>
  );
}

