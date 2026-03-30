import { useState, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

function computeDiff(oldLines, newLines) {
  // Myers diff algorithm — simple O(ND) implementation
  const N = oldLines.length;
  const M = newLines.length;
  const max = N + M;
  const v = new Array(2 * max + 1);
  v[max + 1] = 0;
  const trace = [];

  for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) {
        x = v[max + k + 1];
      } else {
        x = v[max + k - 1] + 1;
      }
      let y = x - k;
      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      v[max + k] = x;
      if (x >= N && y >= M) {
        // Backtrack
        return backtrack(trace, max, N, M, oldLines, newLines);
      }
    }
  }
  return [];
}

function backtrack(trace, max, N, M, oldLines, newLines) {
  const moves = [];
  let x = N;
  let y = M;
  for (let d = trace.length - 1; d > 0; d--) {
    const v = trace[d - 1];
    const k = x - y;
    let prevK;
    if (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v[max + prevK];
    const prevY = prevX - prevK;
    // Diagonal moves (equal lines)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      moves.unshift({ type: 'equal', oldLine: x, newLine: y, text: oldLines[x] });
    }
    if (d > 0) {
      if (x === prevX) {
        // Insert
        y--;
        moves.unshift({ type: 'added', newLine: y, text: newLines[y] });
      } else {
        // Delete
        x--;
        moves.unshift({ type: 'removed', oldLine: x, text: oldLines[x] });
      }
    }
  }
  // Remaining diagonals
  while (x > 0 && y > 0) {
    x--;
    y--;
    moves.unshift({ type: 'equal', oldLine: x, newLine: y, text: oldLines[x] });
  }
  return moves;
}

export default function TextDiff({ tool }) {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCompare = useCallback(() => {
    setError(null);
    try {
      const oldLines = originalText.split('\n');
      const newLines = modifiedText.split('\n');
      const diff = computeDiff(oldLines, newLines);
      const added = diff.filter(d => d.type === 'added').length;
      const removed = diff.filter(d => d.type === 'removed').length;
      const unchanged = diff.filter(d => d.type === 'equal').length;
      setDiffResult({ lines: diff, added, removed, unchanged });
    } catch (e) {
      setError('Something went wrong while comparing. Please try again.');
    }
  }, [originalText, modifiedText]);

  return (
    <div>
      <InfoCard description="Line-by-line comparison of two texts using the Myers diff algorithm. Added lines are shown in green, removed lines in red, and unchanged lines in grey. All processing happens locally." />

      {error && <ErrorCard message={error} />}

      <div className="text-diff-inputs">
        <div className="text-diff-input-col">
          <label className="text-diff-label">Original</label>
          <textarea
            className="text-tool-textarea"
            value={originalText}
            onChange={e => { setOriginalText(e.target.value); setDiffResult(null); }}
            placeholder="Paste original text here..."
            rows={12}
            spellCheck={false}
          />
        </div>
        <div className="text-diff-input-col">
          <label className="text-diff-label">Modified</label>
          <textarea
            className="text-tool-textarea"
            value={modifiedText}
            onChange={e => { setModifiedText(e.target.value); setDiffResult(null); }}
            placeholder="Paste modified text here..."
            rows={12}
            spellCheck={false}
          />
        </div>
      </div>

      <button
        className="action-button"
        onClick={handleCompare}
        disabled={!originalText.trim() || !modifiedText.trim()}
      >
        Compare
      </button>

      {diffResult && (
        <div className="text-diff-result">
          <div className="text-diff-summary">
            <span className="text-diff-stat text-diff-stat--added">+{diffResult.added} added</span>
            <span className="text-diff-stat text-diff-stat--removed">-{diffResult.removed} removed</span>
            <span className="text-diff-stat text-diff-stat--unchanged">{diffResult.unchanged} unchanged</span>
          </div>
          <div className="text-diff-output">
            {diffResult.lines.map((line, i) => (
              <div
                key={i}
                className={`text-diff-line text-diff-line--${line.type}`}
              >
                <span className="text-diff-line-prefix">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="text-diff-line-text">{line.text || '\u00A0'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
