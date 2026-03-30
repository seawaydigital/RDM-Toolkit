import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

export default function QRCodeGenerator({ tool, navigateTo }) {
  const [text, setText] = useState('');
  const [size, setSize] = useState('medium');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [previewSize, setPreviewSize] = useState(200);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const sizeMap = { small: 128, medium: 256, large: 512 };
  const pixelSize = sizeMap[size] || 256;

  // Generate QR with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setQrDataUrl(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setError(null);
        const QRCodeModule = await import('qrcode');
        const QRCode = QRCodeModule.default || QRCodeModule;
        const dataUrl = await QRCode.toDataURL(text, {
          width: pixelSize,
          margin: 2,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });
        setQrDataUrl(dataUrl);
      } catch (e) {
        setError('Failed to generate QR code. The text may be too long for the selected error correction level.');
        setQrDataUrl(null);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, pixelSize, errorCorrection, fgColor, bgColor]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [qrDataUrl]);

  return (
    <div>
      <InfoCard description="Generate QR codes locally. Zero network request. Everything happens in your browser." />

      {error && <ErrorCard title="Error" message={error} />}

      {/* Text input */}
      <div className="qr-input-section">
        <label className="encrypt-label">Text or URL:</label>
        <textarea
          className="text-tool-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text or URL to encode..."
          rows={4}
          spellCheck={false}
        />
      </div>

      {/* Options row */}
      <div className="qr-options">
        <div className="qr-option-group">
          <label className="qr-option-label">Size:</label>
          <select
            className="qr-option-select"
            value={size}
            onChange={e => setSize(e.target.value)}
          >
            <option value="small">Small (128px)</option>
            <option value="medium">Medium (256px)</option>
            <option value="large">Large (512px)</option>
          </select>
        </div>

        <div className="qr-option-group">
          <label className="qr-option-label">Error correction:</label>
          <select
            className="qr-option-select"
            value={errorCorrection}
            onChange={e => setErrorCorrection(e.target.value)}
          >
            <option value="L">Low (7%)</option>
            <option value="M">Medium (15%)</option>
            <option value="Q">Quartile (25%)</option>
            <option value="H">High (30%)</option>
          </select>
        </div>

        <div className="qr-option-group">
          <label className="qr-option-label">Foreground:</label>
          <input
            type="color"
            className="qr-color-input"
            value={fgColor}
            onChange={e => setFgColor(e.target.value)}
          />
        </div>

        <div className="qr-option-group">
          <label className="qr-option-label">Background:</label>
          <input
            type="color"
            className="qr-color-input"
            value={bgColor}
            onChange={e => setBgColor(e.target.value)}
          />
        </div>
      </div>

      {/* Preview */}
      {qrDataUrl && (
        <div className="qr-preview-section">
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.max(100, s - 50))} disabled={previewSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{previewSize}px</span>
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.min(500, s + 50))} disabled={previewSize >= 500} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="qr-preview-wrapper">
            <img
              src={qrDataUrl}
              alt="Generated QR code"
              className="qr-preview-image"
              style={{ width: previewSize, height: previewSize }}
            />
          </div>
          <button className="result-panel-download" onClick={handleDownload}>
            <Download size={18} />
            Download PNG
          </button>
        </div>
      )}

      {!text.trim() && (
        <p className="qr-placeholder-text">Enter text or a URL above to generate a QR code in real time.</p>
      )}
    </div>
  );
}
