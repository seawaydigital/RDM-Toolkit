import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

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

function normalizeRows(rows) {
  const maxCols = Math.max(...rows.map(r => r.length), 0);
  return rows.map(r => {
    const padded = [...r];
    while (padded.length < maxCols) padded.push('');
    return padded;
  });
}

export default function CSVDiff({ tool }) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [fileNameA, setFileNameA] = useState('');
  const [fileNameB, setFileNameB] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileA = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileNameA(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setTextA(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleFileB = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileNameB(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setTextB(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleCompare = useCallback(() => {
    setError(null);
    try {
      const rowsA = normalizeRows(parseCSV(textA));
      const rowsB = normalizeRows(parseCSV(textB));

      if (rowsA.length === 0 && rowsB.length === 0) {
        setError('Both inputs are empty.');
        return;
      }

      const maxRows = Math.max(rowsA.length, rowsB.length);
      const maxCols = Math.max(
        rowsA.length > 0 ? rowsA[0].length : 0,
        rowsB.length > 0 ? rowsB[0].length : 0
      );
      const diffRows = [];
      let addedRows = 0;
      let removedRows = 0;
      let changedRows = 0;
      let unchangedRows = 0;

      for (let i = 0; i < maxRows; i++) {
        const a = i < rowsA.length ? rowsA[i] : null;
        const b = i < rowsB.length ? rowsB[i] : null;

        if (!a) {
          addedRows++;
          const cells = b.map(cell => ({ value: cell, status: 'added' }));
          diffRows.push({ status: 'added', cells });
        } else if (!b) {
          removedRows++;
          const cells = a.map(cell => ({ value: cell, status: 'removed' }));
          diffRows.push({ status: 'removed', cells });
        } else {
          const cells = [];
          let rowChanged = false;
          for (let j = 0; j < maxCols; j++) {
            const va = j < a.length ? a[j] : '';
            const vb = j < b.length ? b[j] : '';
            if (va !== vb) {
              rowChanged = true;
              cells.push({ valueA: va, valueB: vb, status: 'changed' });
            } else {
              cells.push({ value: va, status: 'equal' });
            }
          }
          if (rowChanged) {
            changedRows++;
            diffRows.push({ status: 'changed', cells });
          } else {
            unchangedRows++;
            diffRows.push({ status: 'equal', cells });
          }
        }
      }

      setDiffResult({ rows: diffRows, addedRows, removedRows, changedRows, unchangedRows, maxCols });
    } catch (e) {
      setError('Failed to parse or compare CSV data. Please check the format.');
    }
  }, [textA, textB]);

  return (
    <div>
      <InfoCard description="Cell-level comparison of two CSV files. Added rows appear in green, removed rows in red, and changed cells in yellow. Essential for dataset version control and research reproducibility auditing. All processing is local." />

      {error && <ErrorCard message={error} />}

      <div className="text-diff-inputs">
        <div className="text-diff-input-col">
          <label className="text-diff-label">
            Original CSV
            {fileNameA && <span className="csv-diff-filename"> ({fileNameA})</span>}
          </label>
          <div className="csv-diff-upload">
            <label className="text-tool-file-btn">
              Upload CSV
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileA} style={{ display: 'none' }} />
            </label>
            <span className="csv-diff-or">or paste below</span>
          </div>
          <textarea
            className="text-tool-textarea"
            value={textA}
            onChange={e => { setTextA(e.target.value); setDiffResult(null); }}
            placeholder="Paste CSV data here..."
            rows={8}
            spellCheck={false}
          />
        </div>
        <div className="text-diff-input-col">
          <label className="text-diff-label">
            Modified CSV
            {fileNameB && <span className="csv-diff-filename"> ({fileNameB})</span>}
          </label>
          <div className="csv-diff-upload">
            <label className="text-tool-file-btn">
              Upload CSV
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileB} style={{ display: 'none' }} />
            </label>
            <span className="csv-diff-or">or paste below</span>
          </div>
          <textarea
            className="text-tool-textarea"
            value={textB}
            onChange={e => { setTextB(e.target.value); setDiffResult(null); }}
            placeholder="Paste CSV data here..."
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      <button
        className="action-button"
        onClick={handleCompare}
        disabled={!textA.trim() || !textB.trim()}
      >
        Compare CSV
      </button>

      {diffResult && (
        <div className="csv-diff-result">
          <div className="text-diff-summary">
            <span className="text-diff-stat text-diff-stat--added">+{diffResult.addedRows} added</span>
            <span className="text-diff-stat text-diff-stat--removed">-{diffResult.removedRows} removed</span>
            <span className="text-diff-stat text-diff-stat--changed">{diffResult.changedRows} changed</span>
            <span className="text-diff-stat text-diff-stat--unchanged">{diffResult.unchangedRows} unchanged</span>
          </div>
          <div className="csv-diff-table-wrapper">
            <table className="csv-diff-table">
              <thead>
                <tr>
                  <th className="csv-diff-row-num">#</th>
                  {Array.from({ length: diffResult.maxCols }, (_, i) => (
                    <th key={i}>Col {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diffResult.rows.map((row, ri) => (
                  <tr key={ri} className={`csv-diff-row csv-diff-row--${row.status}`}>
                    <td className="csv-diff-row-num">{ri + 1}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className={`csv-diff-cell csv-diff-cell--${cell.status}`}>
                        {cell.status === 'changed' ? (
                          <div className="csv-diff-cell-change">
                            <span className="csv-diff-cell-old">{cell.valueA || '\u00A0'}</span>
                            <span className="csv-diff-cell-new">{cell.valueB || '\u00A0'}</span>
                          </div>
                        ) : (
                          cell.value || '\u00A0'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
