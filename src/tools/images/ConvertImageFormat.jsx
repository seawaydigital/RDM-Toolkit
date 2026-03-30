import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const OUTPUT_FORMATS = [
  { value: 'image/jpeg', ext: 'jpg', label: 'JPG', desc: 'Best for photos. Lossy compression, small file size.', hasQuality: true },
  { value: 'image/png', ext: 'png', label: 'PNG', desc: 'Lossless. Preserves transparency. Best for screenshots and graphics.', hasQuality: false },
  { value: 'image/webp', ext: 'webp', label: 'WebP', desc: 'Modern format. Best compression ratio. Supported by all modern browsers.', hasQuality: true },
  { value: 'image/bmp', ext: 'bmp', label: 'BMP', desc: 'Uncompressed bitmap. Large file size. Use only when required by legacy software.', hasQuality: false },
];

export default function ConvertImageFormat({ tool }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [outputFormat, setOutputFormat] = useState('image/png');
  const [quality, setQuality] = useState(85);
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
      setPreviewUrl(url);
      setFile(selectedFile);

      // Default output to a different format than input
      const inputMime = selectedFile.type;
      if (inputMime === 'image/png') setOutputFormat('image/jpeg');
      else if (inputMime === 'image/jpeg') setOutputFormat('image/png');
      else setOutputFormat('image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load the image. Please try a different file.');
    };
    img.src = url;
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const blob = await convertImage(file, outputFormat, quality);
      const fmt = OUTPUT_FORMATS.find(f => f.value === outputFormat);
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'converted', fmt.ext);

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong during conversion. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, outputFormat, quality]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }, [previewUrl]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOutputFormat('image/png');
    setQuality(85);
    setResult(null);
    setError(null);
  }, [result, previewUrl]);

  const selectedFormat = OUTPUT_FORMATS.find(f => f.value === outputFormat);

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

  return (
    <div>
      <InfoCard description="Converts images between formats using the browser's Canvas API — no server involved." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.tif,.ico"
          validationConfig={IMAGE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
          sublabel="Accepts JPG, PNG, WebP, BMP, GIF, TIFF, ICO"
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
                Output Format
              </label>
              <select
                value={outputFormat}
                onChange={e => setOutputFormat(e.target.value)}
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
                {OUTPUT_FORMATS.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
              {selectedFormat && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                  {selectedFormat.desc}
                </p>
              )}
            </div>

            {selectedFormat?.hasQuality && (
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
            )}
          </div>

          <ActionButton
            label={`Convert to ${selectedFormat?.label || 'Format'}`}
            onClick={handleConvert}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

function convertImage(file, outputMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      // Fill white background for formats that don't support transparency
      if (outputMime === 'image/jpeg' || outputMime === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const qualityArg = (outputMime === 'image/jpeg' || outputMime === 'image/webp')
        ? quality / 100
        : undefined;

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
