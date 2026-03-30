import { useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ErrorCard from '../../components/ui/ErrorCard';
import { buildOutputFilename } from '../../utils/filename';

function detectEncoding(bytes) {
  // Check for UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'UTF-8 (with BOM)', hasBOM: true, bomLength: 3 };
  }
  // Check for UTF-16 LE BOM
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { encoding: 'UTF-16 LE', hasBOM: true, bomLength: 2 };
  }
  // Check for UTF-16 BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { encoding: 'UTF-16 BE', hasBOM: true, bomLength: 2 };
  }

  // Look for Windows-1252 / Latin-1 indicators
  // Bytes in 0x80-0x9F range are control chars in Latin-1 but printable in Windows-1252
  let latin1Indicators = 0;
  let highByteCount = 0;
  const sampleSize = Math.min(bytes.length, 4096);

  for (let i = 0; i < sampleSize; i++) {
    const b = bytes[i];
    if (b >= 0x80 && b <= 0x9F) {
      latin1Indicators++;
    }
    if (b >= 0x80) {
      highByteCount++;
    }
  }

  // Check if valid UTF-8
  let isValidUTF8 = true;
  for (let i = 0; i < sampleSize; i++) {
    const b = bytes[i];
    if (b < 0x80) continue;
    let seqLen = 0;
    if ((b & 0xE0) === 0xC0) seqLen = 1;
    else if ((b & 0xF0) === 0xE0) seqLen = 2;
    else if ((b & 0xF8) === 0xF0) seqLen = 3;
    else { isValidUTF8 = false; break; }
    for (let j = 0; j < seqLen; j++) {
      i++;
      if (i >= sampleSize || (bytes[i] & 0xC0) !== 0x80) {
        isValidUTF8 = false;
        break;
      }
    }
    if (!isValidUTF8) break;
  }

  if (highByteCount === 0) {
    return { encoding: 'ASCII / UTF-8', hasBOM: false, bomLength: 0 };
  }

  if (isValidUTF8) {
    return { encoding: 'UTF-8 (no BOM)', hasBOM: false, bomLength: 0 };
  }

  if (latin1Indicators > 0) {
    return { encoding: 'Windows-1252 (likely)', hasBOM: false, bomLength: 0, needsFix: true };
  }

  return { encoding: 'ISO-8859-1 / Latin-1 (likely)', hasBOM: false, bomLength: 0, needsFix: true };
}

function decodeWindows1252(bytes) {
  // Windows-1252 to Unicode mapping for 0x80-0x9F range
  const cp1252Map = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178,
  };

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      result += String.fromCharCode(b);
    } else if (cp1252Map[b] !== undefined) {
      result += String.fromCharCode(cp1252Map[b]);
    } else {
      result += String.fromCharCode(b);
    }
  }
  return result;
}

export default function CSVEncodingFixer({ tool }) {
  const [file, setFile] = useState(null);
  const [rawBytes, setRawBytes] = useState(null);
  const [detectedEncoding, setDetectedEncoding] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fixedText, setFixedText] = useState(null);
  const [fixedPreview, setFixedPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setFixedText(null);
    setFixedPreview(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const encoding = detectEncoding(bytes);

      setFile(selectedFile);
      setRawBytes(bytes);
      setDetectedEncoding(encoding);

      // Preview first few rows using raw decoding
      let rawText;
      if (encoding.needsFix) {
        rawText = decodeWindows1252(bytes);
      } else {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        rawText = decoder.decode(encoding.hasBOM ? bytes.slice(encoding.bomLength) : bytes);
      }

      const lines = rawText.split('\n').slice(0, 6);
      setPreview(lines);
    } catch {
      setError('Something went wrong while reading the file. Please try a different file.');
    }
  }, []);

  const handleFix = useCallback(() => {
    if (!rawBytes) return;
    setError(null);
    try {
      let text;
      if (detectedEncoding.needsFix) {
        text = decodeWindows1252(rawBytes);
      } else if (detectedEncoding.hasBOM) {
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(rawBytes.slice(detectedEncoding.bomLength));
      } else {
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(rawBytes);
      }

      setFixedText(text);
      const lines = text.split('\n').slice(0, 6);
      setFixedPreview(lines);
    } catch {
      setError('Failed to re-encode the file. Please try a different file.');
    }
  }, [rawBytes, detectedEncoding]);

  const handleDownload = useCallback(() => {
    if (!fixedText || !file) return;
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(fixedText);
    const blob = new Blob([utf8Bytes], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildOutputFilename(file.name, 'utf8-fixed', 'csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fixedText, file]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setRawBytes(null);
    setDetectedEncoding(null);
    setPreview(null);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    setFile(null);
    setRawBytes(null);
    setDetectedEncoding(null);
    setPreview(null);
    setFixedText(null);
    setFixedPreview(null);
    setError(null);
  }, []);

  return (
    <div>
      <InfoCard description="Detect and fix character encoding issues in CSV files. Prevents silent data corruption when sharing datasets across institutions — a common source of research data integrity failures. All processing is local." />

      {error && <ErrorCard message={error} />}

      {!file && (
        <DropZone
          accept=".csv,.tsv,.txt"
          onFilesSelected={handleFileSelected}
          label="Drop a CSV or TSV file here or click to browse"
          sublabel="Accepts .csv, .tsv, and .txt files"
        />
      )}

      {file && detectedEncoding && (
        <div className="csv-encoding-panel">
          <div className="csv-encoding-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="csv-encoding-title">File: {file.name}</h3>
              <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                <X size={14} />
                Remove
              </button>
            </div>
            <div className="csv-encoding-detail">
              <span className="csv-encoding-label">Detected Encoding:</span>
              <span className={`csv-encoding-value ${detectedEncoding.needsFix ? 'csv-encoding-value--warning' : 'csv-encoding-value--ok'}`}>
                {detectedEncoding.encoding}
              </span>
            </div>
            {detectedEncoding.needsFix && (
              <p className="csv-encoding-explanation">
                This file appears to use Windows-1252 encoding, which can cause garbled characters
                (such as accented letters, curly quotes, and special symbols) when opened in programs
                expecting UTF-8. Re-encoding to UTF-8 will fix these display issues.
              </p>
            )}
            {!detectedEncoding.needsFix && (
              <p className="csv-encoding-explanation">
                This file already appears to be encoded in UTF-8 or ASCII. No re-encoding should
                be necessary, but you can still process it to remove the BOM or normalize the encoding.
              </p>
            )}
          </div>

          {preview && (
            <div className="csv-encoding-preview">
              <h4 className="csv-encoding-preview-title">Preview (first rows)</h4>
              <div className="csv-encoding-preview-table">
                {preview.map((line, i) => (
                  <div key={i} className="csv-encoding-preview-row">
                    <span className="csv-encoding-preview-num">{i + 1}</span>
                    <span className="csv-encoding-preview-text">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!fixedText && (
            <button className="action-button" onClick={handleFix}>
              Re-encode as UTF-8
            </button>
          )}

          {fixedPreview && (
            <div className="csv-encoding-preview" style={{ borderLeftColor: 'var(--accent-green)' }}>
              <h4 className="csv-encoding-preview-title" style={{ color: 'var(--accent-green)' }}>
                Fixed Preview (UTF-8)
              </h4>
              <div className="csv-encoding-preview-table">
                {fixedPreview.map((line, i) => (
                  <div key={i} className="csv-encoding-preview-row">
                    <span className="csv-encoding-preview-num">{i + 1}</span>
                    <span className="csv-encoding-preview-text">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fixedText && (
            <div className="result-panel-actions">
              <button className="result-panel-download" onClick={handleDownload}>
                <Download size={18} />
                Download UTF-8 File
              </button>
              <button className="result-panel-startover" onClick={handleStartOver}>
                Start Over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
