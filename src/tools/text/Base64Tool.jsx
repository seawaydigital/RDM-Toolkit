import { useState, useCallback } from 'react';
import { Copy, Check, Upload } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

function isBase64(str) {
  if (!str || str.length === 0) return false;
  const cleaned = str.replace(/\s/g, '');
  if (cleaned.length < 4) return false;
  if (cleaned.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned);
}

export default function Base64Tool({ tool }) {
  const [mode, setMode] = useState('encode');
  const [inputMode, setInputMode] = useState('text');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  const handleTextChange = useCallback((val) => {
    setInputText(val);
    setOutputText('');
    setError(null);
    setAutoDetected(false);

    // Auto-detect base64
    if (val.trim().length > 8 && isBase64(val.trim())) {
      setAutoDetected(true);
    }
  }, []);

  const handleEncode = useCallback(() => {
    setError(null);
    try {
      // Use TextEncoder for proper UTF-8 handling
      const bytes = new TextEncoder().encode(inputText);
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      setOutputText(btoa(binary));
    } catch (e) {
      setError('Failed to encode text to Base64.');
    }
  }, [inputText]);

  const handleDecode = useCallback(() => {
    setError(null);
    try {
      const binary = atob(inputText.trim());
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      setOutputText(new TextDecoder().decode(bytes));
    } catch (e) {
      setError('Failed to decode Base64. Make sure the input is valid Base64.');
    }
  }, [inputText]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setOutputText('');

    const reader = new FileReader();
    if (mode === 'encode') {
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1] || '';
        setOutputText(base64);
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsDataURL(file);
    } else {
      reader.onload = (ev) => {
        setInputText(ev.target.result);
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);
    }
    e.target.value = '';
  }, [mode]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = outputText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputText]);

  const handleProcess = useCallback(() => {
    if (mode === 'encode') {
      if (inputMode === 'text') {
        handleEncode();
      }
      // File mode is handled on upload
    } else {
      handleDecode();
    }
  }, [mode, inputMode, handleEncode, handleDecode]);

  return (
    <div>
      <InfoCard description="Encode or decode Base64 text and files. Uses native browser APIs for encoding and decoding. All processing happens locally — nothing is transmitted." />

      {error && <ErrorCard message={error} />}

      <div className="split-tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button
          className={`split-tab ${mode === 'encode' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('encode'); setOutputText(''); setError(null); setAutoDetected(false); }}
        >
          Encode
        </button>
        <button
          className={`split-tab ${mode === 'decode' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('decode'); setOutputText(''); setError(null); setAutoDetected(false); }}
        >
          Decode
        </button>
      </div>

      {mode === 'encode' && (
        <div className="text-tool-options" style={{ marginBottom: 'var(--space-md)' }}>
          <label className="text-tool-toggle">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'text'}
              onChange={() => { setInputMode('text'); setOutputText(''); }}
            />
            <span>Text</span>
          </label>
          <label className="text-tool-toggle">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'file'}
              onChange={() => { setInputMode('file'); setOutputText(''); }}
            />
            <span>File</span>
          </label>
        </div>
      )}

      {autoDetected && mode === 'encode' && (
        <div className="text-tool-summary" style={{ marginBottom: 'var(--space-md)' }}>
          This looks like Base64 input. Did you mean to{' '}
          <button
            style={{ color: 'var(--accent-cyan)', background: 'none', textDecoration: 'underline', padding: 0 }}
            onClick={() => { setMode('decode'); setOutputText(''); }}
          >
            decode
          </button>
          {' '}instead?
        </div>
      )}

      {(mode === 'decode' || inputMode === 'text') && (
        <textarea
          className="text-tool-textarea text-tool-textarea--mono"
          value={inputText}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={mode === 'encode'
            ? 'Type or paste text to encode...'
            : 'Paste Base64 string to decode...'
          }
          rows={8}
          spellCheck={false}
        />
      )}

      {mode === 'encode' && inputMode === 'file' && (
        <div className="base64-file-upload">
          <label className="text-tool-file-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} />
            Choose File
            <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          {fileName && <span className="csv-diff-filename" style={{ marginLeft: 'var(--space-sm)' }}>{fileName}</span>}
        </div>
      )}

      {(mode === 'decode' || (mode === 'encode' && inputMode === 'text')) && (
        <button
          className="action-button"
          onClick={handleProcess}
          disabled={!inputText.trim()}
        >
          {mode === 'encode' ? 'Encode' : 'Decode'}
        </button>
      )}

      {outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">
              {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
            </span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="text-tool-textarea text-tool-textarea--mono"
            value={outputText}
            readOnly
            rows={8}
          />
        </div>
      )}
    </div>
  );
}
