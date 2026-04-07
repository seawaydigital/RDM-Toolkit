import { useState, useCallback, useMemo } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, Download, Copy, Check } from 'lucide-react';
import { formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const CSV_VALIDATION = {
  allowedMimes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  allowedExtensions: ['csv'],
  warnSize: 50 * 1024 * 1024,
  blockSize: 200 * 1024 * 1024,
  label: 'CSV',
};

const STRATEGIES = [
  { value: 'pseudonym', label: 'Pseudonym (Person-1, Person-2, ...)' },
  { value: 'hash', label: 'Hash (SHA-256, first 8 chars)' },
  { value: 'redact', label: 'Redact ([REDACTED])' },
];

const DETECTION_PATTERNS = [
  { type: 'email', label: 'Email Address',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { type: 'phone', label: 'Phone Number',
    // North American + international formats
    regex: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}(?!\d)/g },
  { type: 'name', label: 'Person Name (capitalized)',
    // Handles: "John Smith", "Mary-Jane Watson", "O'Connor", "Dr. Smith", "van der Berg"
    regex: /\b(?:Dr|Mr|Mrs|Ms|Prof)\.?\s+[A-Z][a-zA-Z'\-]+(?:\s+(?:van|de|der|den|le|la|les|el|al|von|zu|da|dos|das|di|du))?(?:\s+[A-Z][a-zA-Z'\-]+)+\b|\b[A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+)+\b/g },
  { type: 'sin', label: 'Canadian SIN',
    regex: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g },
  { type: 'postalcode', label: 'Canadian Postal Code',
    regex: /\b[A-CEGHJ-NPR-TV-Z]\d[A-CEGHJ-NPR-TV-Z][\s\-]?\d[A-CEGHJ-NPR-TV-Z]\d\b/gi },
  { type: 'ip', label: 'IP Address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: 'url', label: 'URL / Website',
    regex: /https?:\/\/[^\s,;"'<>]+/gi },
  { type: 'date', label: 'Date (YYYY-MM-DD or similar)',
    regex: /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b|\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b/g },
];

// Simple SHA-256 using SubtleCrypto
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    const row = [];
    let inQuotes = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cell);
          cell = '';
        } else {
          cell += ch;
        }
      }
    }
    row.push(cell);
    result.push(row);
  }
  return result;
}

function rowToCSV(row) {
  return row.map(cell => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
  }).join(',');
}

export default function DataAnonymizer({ tool }) {
  const [mode, setMode] = useState('csv'); // 'csv' | 'text'

  return (
    <div>
      <InfoCard description="Anonymize sensitive data in CSV files or free text for research ethics and privacy compliance. All processing runs in your browser — your data never leaves your machine." />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 'var(--space-lg)',
        borderBottom: '2px solid var(--border)',
      }}>
        {[
          { key: 'csv', label: 'CSV Mode' },
          { key: 'text', label: 'Text Mode' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: 'none',
              border: 'none',
              borderBottom: mode === tab.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: mode === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: mode === tab.key ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              marginBottom: -2,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'csv' ? <CSVMode /> : <TextMode />}
    </div>
  );
}

/* ========== CSV MODE ========== */

function CSVMode() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [selectedCols, setSelectedCols] = useState(new Set());
  const [strategy, setStrategy] = useState('pseudonym');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);
    setSelectedCols(new Set());

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(reader.result);
        if (parsed.length < 2) {
          setError('CSV file must have at least a header row and one data row.');
          return;
        }
        setHeaders(parsed[0]);
        setCsvData(parsed);
        setFile(selectedFile);
      } catch {
        setError('Failed to parse the CSV file. Please check the format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };
    reader.readAsText(selectedFile);
  }, []);

  const toggleColumn = useCallback((index) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleAnonymize = useCallback(async () => {
    if (!csvData || selectedCols.size === 0) return;
    setLoading(true);
    setError(null);

    try {
      const mapping = new Map(); // for consistent pseudonyms
      let counter = 0;

      const processedRows = [];
      for (let r = 0; r < csvData.length; r++) {
        if (r === 0) {
          processedRows.push(csvData[0]);
          continue;
        }
        const row = [...csvData[r]];
        for (const colIdx of selectedCols) {
          if (colIdx >= row.length) continue;
          const original = row[colIdx].trim();
          if (!original) continue;

          if (strategy === 'pseudonym') {
            if (!mapping.has(original)) {
              counter++;
              mapping.set(original, `Person-${counter}`);
            }
            row[colIdx] = mapping.get(original);
          } else if (strategy === 'hash') {
            if (!mapping.has(original)) {
              const hash = await sha256(original);
              mapping.set(original, hash.slice(0, 8));
            }
            row[colIdx] = mapping.get(original);
          } else {
            row[colIdx] = '[REDACTED]';
          }
        }
        processedRows.push(row);
      }

      const csvString = processedRows.map(rowToCSV).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'anonymized', 'csv');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong during anonymization. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [csvData, selectedCols, strategy, file]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setCsvData(null);
    setHeaders([]);
    setSelectedCols(new Set());
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setCsvData(null);
    setHeaders([]);
    setSelectedCols(new Set());
    setResult(null);
    setError(null);
    setStrategy('pseudonym');
  }, [result]);

  if (result) {
    return (
      <ResultPanel
        filename={result.filename}
        originalSize={result.originalSize}
        resultSize={result.resultSize}
        downloadUrl={result.downloadUrl}
        onStartOver={handleStartOver}
      />
    );
  }

  const previewRows = csvData ? csvData.slice(1, 11) : [];

  return (
    <div>
      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".csv"
          validationConfig={CSV_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a CSV file here or click to browse"
          sublabel="Accepts .csv files"
        />
      )}

      {file && csvData && (
        <>
          {/* File info bar */}
          <div className="compress-preview">
            <div className="compress-file-info">
              <p className="compress-file-name">{file.name}</p>
              <p className="compress-file-size">
                {formatFileSize(file.size)} — {csvData.length - 1} rows, {headers.length} columns
              </p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {/* Column selection */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
              Select columns to anonymize:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {headers.map((header, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: selectedCols.has(idx) ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                    color: selectedCols.has(idx) ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'background 0.15s, color 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.has(idx)}
                    onChange={() => toggleColumn(idx)}
                    style={{ display: 'none' }}
                  />
                  {header}
                </label>
              ))}
            </div>
          </div>

          {/* Strategy selector */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
              Replacement strategy:
            </label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
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
              {STRATEGIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Table preview */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            overflowX: 'auto',
          }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
              Preview (first {Math.min(previewRows.length, 10)} rows):
            </label>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left',
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderBottom: '2px solid var(--border)',
                      color: selectedCols.has(i) ? 'var(--accent-blue)' : 'var(--text-primary)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                      {selectedCols.has(i) && ' *'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderBottom: '1px solid var(--border)',
                        color: selectedCols.has(cIdx) ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ActionButton
            label="Anonymize CSV"
            onClick={handleAnonymize}
            loading={loading}
            disabled={selectedCols.size === 0}
          />
        </>
      )}
    </div>
  );
}

/* ========== TEXT MODE ========== */

function TextMode() {
  const [inputText, setInputText] = useState('');
  const [detectedItems, setDetectedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [resultText, setResultText] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleDetect = useCallback(() => {
    if (!inputText.trim()) return;
    setError(null);
    setResultText(null);

    const found = [];
    const seen = new Set();

    for (const pattern of DETECTION_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(inputText)) !== null) {
        const key = `${match[0]}@${match.index}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({
            id: key,
            text: match[0],
            type: pattern.type,
            label: pattern.label,
            index: match.index,
          });
        }
      }
    }

    found.sort((a, b) => a.index - b.index);
    setDetectedItems(found);
    setSelectedItems(new Set(found.map(f => f.id)));
  }, [inputText]);

  const toggleItem = useCallback((id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAnonymize = useCallback(() => {
    if (detectedItems.length === 0) return;
    setError(null);

    const mapping = new Map();
    let counter = 0;

    // Sort selected items by index descending so replacements don't shift positions
    const itemsToReplace = detectedItems
      .filter(item => selectedItems.has(item.id))
      .sort((a, b) => b.index - a.index);

    let result = inputText;
    for (const item of itemsToReplace) {
      if (!mapping.has(item.text)) {
        counter++;
        mapping.set(item.text, `Person-${counter}`);
      }
      const replacement = mapping.get(item.text);
      result = result.slice(0, item.index) + replacement + result.slice(item.index + item.text.length);
    }

    setResultText(result);
  }, [inputText, detectedItems, selectedItems]);

  const handleCopy = useCallback(async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  }, [resultText]);

  const handleDownload = useCallback(() => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const filename = buildOutputFilename('text-input.txt', 'anonymized', 'txt');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultText]);

  const handleReset = useCallback(() => {
    setInputText('');
    setDetectedItems([]);
    setSelectedItems(new Set());
    setResultText(null);
    setError(null);
    setCopied(false);
  }, []);

  // Build highlighted preview
  const highlightedPreview = useMemo(() => {
    if (detectedItems.length === 0 || !inputText) return null;

    const sorted = [...detectedItems].sort((a, b) => a.index - b.index);
    const parts = [];
    let lastEnd = 0;

    for (const item of sorted) {
      if (item.index > lastEnd) {
        parts.push({ text: inputText.slice(lastEnd, item.index), highlight: false });
      }
      parts.push({
        text: item.text,
        highlight: true,
        selected: selectedItems.has(item.id),
        type: item.type,
      });
      lastEnd = item.index + item.text.length;
    }
    if (lastEnd < inputText.length) {
      parts.push({ text: inputText.slice(lastEnd), highlight: false });
    }

    return parts;
  }, [inputText, detectedItems, selectedItems]);

  const typeColors = {
    email: 'var(--accent-blue)',
    phone: 'var(--accent-amber)',
    name: '#a78bfa',
  };

  return (
    <div>
      {error && <ErrorCard title="Error" message={error} />}

      {!resultText && (
        <>
          {/* Text input */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
              Paste your text:
            </label>
            <textarea
              value={inputText}
              onChange={e => {
                setInputText(e.target.value);
                setDetectedItems([]);
                setSelectedItems(new Set());
              }}
              placeholder="Enter text containing names, emails, or phone numbers to anonymize..."
              style={{
                width: '100%',
                minHeight: 150,
                padding: 'var(--space-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Detect button */}
          {detectedItems.length === 0 && (
            <ActionButton
              label="Detect Sensitive Data"
              onClick={handleDetect}
              disabled={!inputText.trim()}
            />
          )}

          {/* Highlighted preview */}
          {highlightedPreview && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                Detected items ({detectedItems.length}):
              </label>
              <div style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {highlightedPreview.map((part, i) =>
                  part.highlight ? (
                    <span
                      key={i}
                      style={{
                        background: part.selected
                          ? (typeColors[part.type] || 'var(--accent-blue)') + '33'
                          : 'transparent',
                        borderBottom: `2px solid ${part.selected ? (typeColors[part.type] || 'var(--accent-blue)') : 'var(--border)'}`,
                        borderRadius: 2,
                        padding: '0 2px',
                        transition: 'background 0.15s',
                      }}
                    >
                      {part.text}
                    </span>
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Detected items list with checkboxes */}
          {detectedItems.length > 0 && (
            <>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)',
                maxHeight: 250,
                overflowY: 'auto',
              }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                  Confirm which items to anonymize:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {detectedItems.map(item => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 13,
                        background: selectedItems.has(item.id) ? 'var(--bg-tertiary)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                        fontWeight: 600,
                        background: (typeColors[item.type] || 'var(--accent-blue)') + '22',
                        color: typeColors[item.type] || 'var(--accent-blue)',
                        textTransform: 'uppercase',
                      }}>
                        {item.type}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <ActionButton
                label="Anonymize Text"
                onClick={handleAnonymize}
                disabled={selectedItems.size === 0}
              />
            </>
          )}

          {detectedItems.length === 0 && inputText.trim() && highlightedPreview === null && null}
        </>
      )}

      {/* Result */}
      {resultText !== null && (
        <div>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
              Anonymized result:
            </label>
            <div style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'var(--bg-tertiary)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}>
              {resultText}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              Download
            </button>

            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
