import { useState, useCallback } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';
import { buildOutputFilename } from '../../utils/filename';

function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function csvToJSON(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('CSV must have at least a header row and one data row.');
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = i < row.length ? row[i] : '';
    });
    return obj;
  });
  return data;
}

function jsonToCSV(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Input must be a non-empty JSON array of objects.');
  }
  // Collect all keys from all objects
  const keysSet = new Set();
  for (const item of data) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('Each item in the array must be a plain object.');
    }
    for (const key of Object.keys(item)) {
      keysSet.add(key);
    }
  }
  const keys = Array.from(keysSet);

  function escapeCSVField(val) {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const header = keys.map(escapeCSVField).join(',');
  const rows = data.map(obj =>
    keys.map(k => escapeCSVField(obj[k])).join(',')
  );
  return [header, ...rows].join('\n');
}

export default function CSVJSONConverter({ tool }) {
  const [mode, setMode] = useState('csv-to-json');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputText(ev.target.result);
      setOutputText('');
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleConvert = useCallback(() => {
    setError(null);
    try {
      if (mode === 'csv-to-json') {
        const data = csvToJSON(inputText);
        setOutputText(JSON.stringify(data, null, 2));
      } else {
        const csv = jsonToCSV(inputText);
        setOutputText(csv);
      }
    } catch (e) {
      setError(e.message);
      setOutputText('');
    }
  }, [mode, inputText]);

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

  const handleDownload = useCallback(() => {
    if (!outputText) return;
    const ext = mode === 'csv-to-json' ? 'json' : 'csv';
    const mimeType = mode === 'csv-to-json' ? 'application/json' : 'text/csv';
    const name = fileName
      ? buildOutputFilename(fileName, 'converted', ext)
      : `converted.${ext}`;
    const blob = new Blob([outputText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputText, mode, fileName]);

  return (
    <div>
      <InfoCard description="Convert between CSV and JSON formats. Handles quoted fields and special characters. All processing happens in your browser — nothing is transmitted." />

      {error && <ErrorCard message={error} />}

      <div className="split-tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button
          className={`split-tab ${mode === 'csv-to-json' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('csv-to-json'); setOutputText(''); setError(null); }}
        >
          CSV → JSON
        </button>
        <button
          className={`split-tab ${mode === 'json-to-csv' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('json-to-csv'); setOutputText(''); setError(null); }}
        >
          JSON → CSV
        </button>
      </div>

      <div className="csv-diff-upload" style={{ marginBottom: 'var(--space-md)' }}>
        <label className="text-tool-file-btn">
          Upload {mode === 'csv-to-json' ? 'CSV' : 'JSON'}
          <input
            type="file"
            accept={mode === 'csv-to-json' ? '.csv,.tsv,.txt' : '.json'}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
        {fileName && <span className="csv-diff-filename">{fileName}</span>}
        <span className="csv-diff-or">or paste below</span>
      </div>

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setError(null); }}
        placeholder={mode === 'csv-to-json'
          ? 'Paste CSV data here (first row as headers)...'
          : 'Paste JSON array here (e.g. [{"name": "Alice"}, ...])...'
        }
        rows={10}
        spellCheck={false}
      />

      <button
        className="action-button"
        onClick={handleConvert}
        disabled={!inputText.trim()}
      >
        Convert
      </button>

      {outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">
              {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="text-tool-copy-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className="text-tool-copy-btn" onClick={handleDownload}>
                <Download size={14} />
                Download
              </button>
            </div>
          </div>
          <textarea
            className="text-tool-textarea text-tool-textarea--mono"
            value={outputText}
            readOnly
            rows={12}
          />
        </div>
      )}
    </div>
  );
}
