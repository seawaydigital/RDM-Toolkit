import { useState, useCallback } from 'react';
import { FileText, RotateCcw, RefreshCw } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ErrorCard from '../../components/ui/ErrorCard';

const styles = {
  section: {
    marginBottom: 'var(--space-lg)',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-xs)',
    fontWeight: 500,
  },
  resultsTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-md)',
  },
  detectionCard: {
    padding: 'var(--space-md)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)',
    marginBottom: 'var(--space-md)',
  },
  detectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-xs) 0',
  },
  detectionLabel: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  detectionValue: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  confidenceHigh: { color: 'var(--accent-green)' },
  confidenceMedium: { color: 'var(--accent-amber)' },
  confidenceLow: { color: 'var(--accent-red)' },
  hexDump: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    background: 'var(--bg-tertiary)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    overflowX: 'auto',
    whiteSpace: 'pre',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    marginBottom: 'var(--space-md)',
  },
  preview: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.82rem',
    background: 'var(--bg-secondary)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: 200,
    overflowY: 'auto',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-md)',
  },
  reinterpretSection: {
    padding: 'var(--space-md)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)',
    marginBottom: 'var(--space-md)',
  },
  select: {
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    marginLeft: 'var(--space-sm)',
    marginRight: 'var(--space-sm)',
  },
  reinterpretBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'var(--accent-blue)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  startOver: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginTop: 'var(--space-md)',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-md)',
  },
};

const ENCODINGS = ['utf-8', 'iso-8859-1', 'windows-1252', 'utf-16le', 'utf-16be', 'ascii'];

function isValidUTF8(bytes) {
  let i = 0;
  let validMultibyte = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b <= 0x7f) {
      i++;
    } else if (b >= 0xc2 && b <= 0xdf) {
      if (i + 1 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80) return { valid: false, multibyte: validMultibyte };
      validMultibyte++;
      i += 2;
    } else if (b >= 0xe0 && b <= 0xef) {
      if (i + 2 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80 || (bytes[i + 2] & 0xc0) !== 0x80) return { valid: false, multibyte: validMultibyte };
      validMultibyte++;
      i += 3;
    } else if (b >= 0xf0 && b <= 0xf4) {
      if (i + 3 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80 || (bytes[i + 2] & 0xc0) !== 0x80 || (bytes[i + 3] & 0xc0) !== 0x80) return { valid: false, multibyte: validMultibyte };
      validMultibyte++;
      i += 4;
    } else {
      return { valid: false, multibyte: validMultibyte };
    }
  }
  return { valid: true, multibyte: validMultibyte };
}

function detectEncoding(bytes) {
  // Check BOMs first
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: 'UTF-8 (with BOM)', confidence: 'High', bom: true };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { encoding: 'UTF-16 LE (with BOM)', confidence: 'High', bom: true };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { encoding: 'UTF-16 BE (with BOM)', confidence: 'High', bom: true };
  }

  // Check if pure ASCII
  let isAscii = true;
  let hasHighBytes = false;
  let hasNullBytes = false;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) hasNullBytes = true;
    if (bytes[i] > 0x7e || (bytes[i] < 0x20 && bytes[i] !== 0x0a && bytes[i] !== 0x0d && bytes[i] !== 0x09 && bytes[i] !== 0)) {
      isAscii = false;
    }
    if (bytes[i] > 0x7f) hasHighBytes = true;
  }

  // Null bytes suggest UTF-16 without BOM
  if (hasNullBytes) {
    // Check alternating null pattern
    let lePattern = 0;
    let bePattern = 0;
    for (let i = 0; i < Math.min(bytes.length - 1, 100); i += 2) {
      if (bytes[i + 1] === 0 && bytes[i] !== 0) lePattern++;
      if (bytes[i] === 0 && bytes[i + 1] !== 0) bePattern++;
    }
    if (lePattern > bePattern && lePattern > 5) {
      return { encoding: 'UTF-16 LE (no BOM)', confidence: 'Medium', bom: false };
    }
    if (bePattern > lePattern && bePattern > 5) {
      return { encoding: 'UTF-16 BE (no BOM)', confidence: 'Medium', bom: false };
    }
  }

  if (isAscii && !hasHighBytes && !hasNullBytes) {
    return { encoding: 'ASCII', confidence: 'High', bom: false };
  }

  // Check valid UTF-8
  const utf8Check = isValidUTF8(bytes);
  if (utf8Check.valid && utf8Check.multibyte > 0) {
    return { encoding: 'UTF-8', confidence: 'High', bom: false };
  }
  if (utf8Check.valid && utf8Check.multibyte === 0) {
    return { encoding: 'ASCII / UTF-8', confidence: 'High', bom: false };
  }

  // Likely Latin-1 / Windows-1252 range
  if (hasHighBytes) {
    let latin1Chars = 0;
    let cp1252Chars = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] >= 0xa0 && bytes[i] <= 0xff) latin1Chars++;
      if (bytes[i] >= 0x80 && bytes[i] <= 0x9f) cp1252Chars++;
    }
    if (cp1252Chars > 0) {
      return { encoding: 'Windows-1252', confidence: 'Medium', bom: false };
    }
    if (latin1Chars > 0) {
      return { encoding: 'ISO-8859-1 (Latin-1)', confidence: 'Medium', bom: false };
    }
  }

  return { encoding: 'Unknown', confidence: 'Low', bom: false };
}

function formatHexDump(bytes, maxBytes) {
  const slice = bytes.slice(0, maxBytes);
  const lines = [];
  for (let i = 0; i < slice.length; i += 16) {
    const offset = i.toString(16).padStart(8, '0');
    const hexParts = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < slice.length) {
        hexParts.push(slice[i + j].toString(16).padStart(2, '0'));
        const b = slice[i + j];
        ascii += (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.';
      } else {
        hexParts.push('  ');
        ascii += ' ';
      }
    }
    const hex = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');
    lines.push(`${offset}  ${hex}  |${ascii}|`);
  }
  return lines.join('\n');
}

function decodeAs(bytes, encoding) {
  try {
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(bytes);
  } catch {
    return '[Unable to decode with this encoding]';
  }
}

export default function EncodingDetector({ tool, navigateTo }) {
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [rawBytes, setRawBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [reinterpretEncoding, setReinterpretEncoding] = useState('utf-8');
  const [reinterpretResult, setReinterpretResult] = useState(null);

  const handleFilesSelected = useCallback((selectedFiles) => {
    setError(null);
    setResult(null);
    setReinterpretResult(null);
    const file = selectedFiles[0];
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result);
      setRawBytes(bytes);
      const detection = detectEncoding(bytes);
      const decoderLabel = detection.encoding.toLowerCase().includes('utf-16 le') ? 'utf-16le'
        : detection.encoding.toLowerCase().includes('utf-16 be') ? 'utf-16be'
        : detection.encoding.toLowerCase().includes('utf-8') ? 'utf-8'
        : detection.encoding.toLowerCase().includes('windows-1252') ? 'windows-1252'
        : detection.encoding.toLowerCase().includes('iso-8859-1') ? 'iso-8859-1'
        : 'utf-8';
      const preview = decodeAs(bytes.slice(0, 2048), decoderLabel);
      setResult({ ...detection, preview, hexDump: formatHexDump(bytes, 32) });
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsArrayBuffer(file);
  }, []);

  const handleReinterpret = useCallback(() => {
    if (!rawBytes) return;
    const text = decodeAs(rawBytes.slice(0, 2048), reinterpretEncoding);
    setReinterpretResult(text);
  }, [rawBytes, reinterpretEncoding]);

  const handleReset = useCallback(() => {
    setError(null);
    setResult(null);
    setRawBytes(null);
    setFileName('');
    setFileSize(0);
    setReinterpretResult(null);
  }, []);

  const confidenceStyle = result
    ? result.confidence === 'High' ? styles.confidenceHigh
    : result.confidence === 'Medium' ? styles.confidenceMedium
    : styles.confidenceLow
    : {};

  return (
    <div>
      <InfoCard description={tool.description || "Detect the character encoding of text files using byte-level heuristics. Identifies UTF-8, UTF-16, Latin-1, ASCII, and more. All processing happens in your browser."} />

      {error && <ErrorCard title="Error" message={error} />}

      {!result && (
        <DropZone
          accept="*"
          onFilesSelected={handleFilesSelected}
          label="Drop a text file here or click to browse"
          sublabel="Any file type accepted. Raw bytes will be analyzed."
        />
      )}

      {result && (
        <div>
          <div style={styles.fileInfo}>
            <FileText size={14} />
            <span>{fileName}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
              {fileSize.toLocaleString()} bytes
            </span>
          </div>

          <h3 style={styles.resultsTitle}>Detection Results</h3>

          <div style={styles.detectionCard}>
            <div style={styles.detectionRow}>
              <span style={styles.detectionLabel}>Detected Encoding</span>
              <span style={styles.detectionValue}>{result.encoding}</span>
            </div>
            <div style={styles.detectionRow}>
              <span style={styles.detectionLabel}>Confidence</span>
              <span style={{ ...styles.detectionValue, ...confidenceStyle }}>{result.confidence}</span>
            </div>
            <div style={styles.detectionRow}>
              <span style={styles.detectionLabel}>BOM Present</span>
              <span style={styles.detectionValue}>{result.bom ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Byte Analysis (first 32 bytes)</label>
            <div style={styles.hexDump}>{result.hexDump}</div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Text Preview (detected encoding)</label>
            <div style={styles.preview}>{result.preview}</div>
          </div>

          <div style={styles.reinterpretSection}>
            <label style={styles.label}>Re-interpret as different encoding</label>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 'var(--space-xs)' }}>
              <select
                style={styles.select}
                value={reinterpretEncoding}
                onChange={e => setReinterpretEncoding(e.target.value)}
              >
                {ENCODINGS.map(enc => (
                  <option key={enc} value={enc}>{enc}</option>
                ))}
              </select>
              <button style={styles.reinterpretBtn} onClick={handleReinterpret}>
                <RefreshCw size={14} /> Decode
              </button>
            </div>
            {reinterpretResult !== null && (
              <div style={{ ...styles.preview, marginTop: 'var(--space-sm)' }}>
                {reinterpretResult}
              </div>
            )}
          </div>

          <button style={styles.startOver} onClick={handleReset}>
            <RotateCcw size={14} /> Start Over
          </button>
        </div>
      )}
    </div>
  );
}
