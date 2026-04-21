import { useState, useCallback, useMemo } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { X, Download, Copy, Check, KeyRound, AlertTriangle } from 'lucide-react';
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
  {
    value: 'coded',
    label: 'Coded \u2014 reversible with a key file',
    blurb: 'Consistent pseudonyms (Person-1, Person-2\u2026). You download the data AND a separate key file mapping originals to pseudonyms. TCPS 2 calls this "coded information" \u2014 store the key file separately and encrypted.',
    filenameSlug: 'coded',
  },
  {
    value: 'pseudonymized',
    label: 'Pseudonymized \u2014 one-way hash, no key retained',
    blurb: 'Each value replaced with a short SHA-256 hash. Consistent across rows, but no mapping is saved \u2014 you cannot reverse this without the original dataset.',
    filenameSlug: 'pseudonymized',
  },
  {
    value: 'anonymized',
    label: 'Anonymized \u2014 irreversible redaction',
    blurb: 'Every selected value is replaced with [REDACTED]. Destructive and not reversible.',
    filenameSlug: 'anonymized',
  },
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
      <InfoCard description="De-identify sensitive data in CSV files or free text for REB / Tri-Agency / PHIPA workflows. Choose coded (reversible with a key file), pseudonymized (one-way hash), or anonymized (irreversible). All processing runs in your browser \u2014 your data never leaves your machine." />

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

const DEFAULT_GROUP_PREFIXES = ['Person', 'Org', 'Site', 'Entity'];

function CSVMode() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [colGroup, setColGroup] = useState({}); // { [colIdx]: groupIdx }
  const [groupPrefixes, setGroupPrefixes] = useState(['Person']);
  const [collapseColumns, setCollapseColumns] = useState(false);
  const [strategy, setStrategy] = useState('coded');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const selectedCols = useMemo(
    () => new Set(Object.keys(colGroup).map(Number)),
    [colGroup]
  );

  const groupColumns = useMemo(() => {
    const map = groupPrefixes.map(() => []);
    for (const [ci, gi] of Object.entries(colGroup)) {
      if (gi < map.length) map[gi].push(Number(ci));
    }
    return map.map(arr => arr.sort((a, b) => a - b));
  }, [colGroup, groupPrefixes]);

  const hasMultiColGroup = useMemo(
    () => groupColumns.some(cols => cols.length > 1),
    [groupColumns]
  );

  const handleFileSelected = useCallback(([selectedFile]) => {
    setError(null);
    setResult(null);
    setColGroup({});
    setGroupPrefixes(['Person']);
    setCollapseColumns(false);

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
    setColGroup(prev => {
      if (index in prev) {
        const next = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: 0 };
    });
  }, []);

  const cycleGroup = useCallback((colIdx) => {
    const current = colGroup[colIdx] ?? 0;
    const next = current + 1;
    if (next >= groupPrefixes.length) {
      setGroupPrefixes(prev => [
        ...prev,
        DEFAULT_GROUP_PREFIXES[prev.length] || `Group${prev.length + 1}`,
      ]);
    }
    setColGroup(prev => ({ ...prev, [colIdx]: next }));
  }, [colGroup, groupPrefixes.length]);

  const addGroup = useCallback(() => {
    setGroupPrefixes(prev => [
      ...prev,
      DEFAULT_GROUP_PREFIXES[prev.length] || `Group${prev.length + 1}`,
    ]);
  }, []);

  const removeGroup = useCallback((gIdx) => {
    if (gIdx === 0) return;
    setColGroup(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v === gIdx) next[k] = 0;
        else if (v > gIdx) next[k] = v - 1;
        else next[k] = v;
      }
      return next;
    });
    setGroupPrefixes(prev => prev.filter((_, i) => i !== gIdx));
  }, []);

  const updateGroupPrefix = useCallback((gIdx, value) => {
    setGroupPrefixes(prev => prev.map((p, i) => (i === gIdx ? value : p)));
  }, []);

  const handleAnonymize = useCallback(async () => {
    if (!csvData || selectedCols.size === 0) return;
    setLoading(true);
    setError(null);

    try {
      // Build per-group state: one Map + counter per group
      const groupState = groupPrefixes.map((prefix, gIdx) => ({
        prefix: (prefix || `Group${gIdx + 1}`).trim() || `Group${gIdx + 1}`,
        colIdxs: groupColumns[gIdx] || [],
        map: new Map(),
        counter: 0,
      }));

      const processedRows = [csvData[0]];

      for (let r = 1; r < csvData.length; r++) {
        const row = [...csvData[r]];

        for (const gs of groupState) {
          if (gs.colIdxs.length === 0) continue;

          const values = gs.colIdxs.map(ci => (row[ci] ?? '').trim());
          if (!values.some(v => v)) continue; // entire group blank in this row

          const composite = values.join('|');

          if (!gs.map.has(composite)) {
            if (strategy === 'coded') {
              gs.counter++;
              gs.map.set(composite, `${gs.prefix}-${gs.counter}`);
            } else if (strategy === 'pseudonymized') {
              const hash = await sha256(composite);
              gs.map.set(composite, hash.slice(0, 8));
            } else {
              gs.map.set(composite, '[REDACTED]');
            }
          }

          const pseudonym = gs.map.get(composite);

          if (collapseColumns && gs.colIdxs.length > 1) {
            row[gs.colIdxs[0]] = pseudonym;
            for (let i = 1; i < gs.colIdxs.length; i++) {
              row[gs.colIdxs[i]] = '';
            }
          } else {
            for (const ci of gs.colIdxs) {
              row[ci] = pseudonym;
            }
          }
        }

        processedRows.push(row);
      }

      const strategyConfig = STRATEGIES.find(s => s.value === strategy);
      const slug = strategyConfig?.filenameSlug || 'deidentified';

      const csvString = processedRows.map(rowToCSV).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, slug, 'csv');

      let keyFile = null;
      if (strategy === 'coded') {
        const keyRows = [['group', 'original_columns', 'original_values', 'pseudonym']];
        const groupSummary = [];
        // Sort smaller groups first so they aren't buried below thousands of Person rows
        const sortedGroups = groupState
          .filter(gs => gs.map.size > 0)
          .sort((a, b) => a.map.size - b.map.size);
        for (const gs of sortedGroups) {
          const colNames = gs.colIdxs.map(ci => headers[ci] ?? `col_${ci}`).join(' | ');
          for (const [composite, pseudonym] of gs.map.entries()) {
            const originalValues = composite.split('|').join(' | ');
            keyRows.push([gs.prefix, colNames, originalValues, pseudonym]);
          }
          groupSummary.push({ prefix: gs.prefix, count: gs.map.size });
        }
        if (keyRows.length > 1) {
          const keyCsv = keyRows.map(rowToCSV).join('\n');
          const keyBlob = new Blob([keyCsv], { type: 'text/csv' });
          keyFile = {
            filename: buildOutputFilename(file.name, 'keyfile', 'csv'),
            size: keyBlob.size,
            downloadUrl: URL.createObjectURL(keyBlob),
            entries: keyRows.length - 1,
            groupSummary,
          };
        }
      }

      setResult({
        filename,
        originalSize: file.size,
        resultSize: blob.size,
        downloadUrl: url,
        strategy,
        keyFile,
      });
    } catch {
      setError('Something went wrong during de-identification. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [csvData, selectedCols, groupColumns, groupPrefixes, collapseColumns, strategy, file, headers]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setCsvData(null);
    setHeaders([]);
    setColGroup({});
    setGroupPrefixes(['Person']);
    setCollapseColumns(false);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    if (result?.keyFile?.downloadUrl) URL.revokeObjectURL(result.keyFile.downloadUrl);
    setFile(null);
    setCsvData(null);
    setHeaders([]);
    setColGroup({});
    setGroupPrefixes(['Person']);
    setCollapseColumns(false);
    setResult(null);
    setError(null);
    setStrategy('coded');
  }, [result]);

  if (result) {
    return (
      <>
        <ResultPanel
          filename={result.filename}
          originalSize={result.originalSize}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
        {result.keyFile && <KeyFileCard keyFile={result.keyFile} />}
      </>
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
              Select columns to de-identify:
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

          {/* Column groups */}
          {selectedCols.size > 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
                Column groups:
              </label>
              <p style={{ margin: '0 0 var(--space-md) 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                {'Columns in the same group are coded together as one entity per row \u2014 useful when e.g. First Name + Last Name identify the same person. Each group gets its own prefix. Click a column chip to move it to the next group.'}
              </p>

              {groupPrefixes.map((prefix, gIdx) => {
                const cols = groupColumns[gIdx] || [];
                if (cols.length === 0 && gIdx > 0) return null;
                return (
                  <div key={gIdx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, minWidth: 60 }}>
                      Group {gIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={prefix}
                      onChange={e => updateGroupPrefix(gIdx, e.target.value)}
                      placeholder="Prefix"
                      style={{
                        width: 120,
                        padding: '4px 8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                      {cols.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {'(no columns \u2014 click a chip in another group to move it here)'}
                        </span>
                      )}
                      {cols.map(ci => (
                        <button
                          key={ci}
                          onClick={() => cycleGroup(ci)}
                          title={`Move "${headers[ci]}" to next group`}
                          style={{
                            padding: '2px 8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {headers[ci]} <span style={{ color: 'var(--text-muted)' }}>{'\u2192'}</span>
                        </button>
                      ))}
                    </div>
                    {gIdx > 0 && (
                      <button
                        onClick={() => removeGroup(gIdx)}
                        title="Remove this group (columns move back to Group 1)"
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-muted)',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} style={{ verticalAlign: 'middle' }} />
                      </button>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
                <button
                  onClick={addGroup}
                  style={{
                    padding: '4px 10px',
                    background: 'transparent',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  + Add group
                </button>
                {hasMultiColGroup && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={collapseColumns}
                      onChange={e => setCollapseColumns(e.target.checked)}
                    />
                    Collapse each multi-column group to a single ID column (blank the rest)
                  </label>
                )}
              </div>
            </div>
          )}

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
            <p style={{
              margin: 'var(--space-sm) 0 0 0',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
            }}>
              {STRATEGIES.find(s => s.value === strategy)?.blurb}
            </p>
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
                      {selectedCols.has(i) && (
                        <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                          G{(colGroup[i] ?? 0) + 1}
                        </span>
                      )}
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
            label="De-identify CSV"
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
  const [resultKeyFile, setResultKeyFile] = useState(null);
  const [strategy, setStrategy] = useState('coded');
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

  const handleAnonymize = useCallback(async () => {
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
        if (strategy === 'coded') {
          counter++;
          mapping.set(item.text, `Person-${counter}`);
        } else if (strategy === 'pseudonymized') {
          const hash = await sha256(item.text);
          mapping.set(item.text, hash.slice(0, 8));
        } else {
          mapping.set(item.text, '[REDACTED]');
        }
      }
      const replacement = mapping.get(item.text);
      result = result.slice(0, item.index) + replacement + result.slice(item.index + item.text.length);
    }

    setResultText(result);

    if (resultKeyFile?.downloadUrl) URL.revokeObjectURL(resultKeyFile.downloadUrl);

    if (strategy === 'coded' && mapping.size > 0) {
      const keyRows = [['original', 'pseudonym']];
      for (const [original, pseudonym] of mapping.entries()) {
        keyRows.push([original, pseudonym]);
      }
      const keyCsv = keyRows.map(rowToCSV).join('\n');
      const keyBlob = new Blob([keyCsv], { type: 'text/csv' });
      setResultKeyFile({
        filename: buildOutputFilename('text-input.txt', 'keyfile', 'csv'),
        size: keyBlob.size,
        downloadUrl: URL.createObjectURL(keyBlob),
        entries: mapping.size,
      });
    } else {
      setResultKeyFile(null);
    }
  }, [inputText, detectedItems, selectedItems, strategy, resultKeyFile]);

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
    const strategyConfig = STRATEGIES.find(s => s.value === strategy);
    const slug = strategyConfig?.filenameSlug || 'deidentified';
    const blob = new Blob([resultText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const filename = buildOutputFilename('text-input.txt', slug, 'txt');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultText, strategy]);

  const handleReset = useCallback(() => {
    if (resultKeyFile?.downloadUrl) URL.revokeObjectURL(resultKeyFile.downloadUrl);
    setInputText('');
    setDetectedItems([]);
    setSelectedItems(new Set());
    setResultText(null);
    setResultKeyFile(null);
    setError(null);
    setCopied(false);
  }, [resultKeyFile]);

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
                  Confirm which items to de-identify:
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
                <p style={{
                  margin: 'var(--space-sm) 0 0 0',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--text-muted)',
                }}>
                  {STRATEGIES.find(s => s.value === strategy)?.blurb}
                </p>
              </div>

              <ActionButton
                label="De-identify Text"
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
              De-identified result:
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

          {resultKeyFile && <KeyFileCard keyFile={resultKeyFile} />}
        </div>
      )}
    </div>
  );
}

/* ========== KEY FILE CARD ========== */

function KeyFileCard({ keyFile }) {
  function handleDownload() {
    const a = document.createElement('a');
    a.href = keyFile.downloadUrl;
    a.download = keyFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div style={{ marginTop: 'var(--space-lg)' }}>
      {/* Warning strip */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-sm)',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderLeft: '3px solid var(--accent-amber)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
        marginBottom: 'var(--space-md)',
      }}>
        <AlertTriangle size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-primary)' }}>
          <strong style={{ color: 'var(--accent-amber)' }}>Store the key file separately and encrypted.</strong>
          {' '}Anyone with both the de-identified data and this key file can re-identify every record. TCPS 2 Article 5.5 requires that coded data and the re-identification key be held by different people or stored in separate, access-controlled locations.
        </div>
      </div>

      {/* Key file download card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
      }}>
        <KeyRound size={20} color="var(--accent-primary)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {keyFile.filename}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {'Re-identification key \u2014 '}{keyFile.entries} {keyFile.entries === 1 ? 'entry' : 'entries'}
            {keyFile.groupSummary && keyFile.groupSummary.length > 1 && (
              <span style={{ marginLeft: 6 }}>
                ({keyFile.groupSummary.map(g => `${g.count} ${g.prefix}`).join(' + ')})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Download size={14} />
          Download key
        </button>
      </div>
    </div>
  );
}
