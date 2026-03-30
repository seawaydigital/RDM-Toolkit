import { useState, useMemo, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';
import { Copy, Check } from 'lucide-react';

const COMMON_PATTERNS = [
  { label: 'Email Address', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'g' },
  { label: 'URL', pattern: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*', flags: 'gi' },
  { label: 'IPv4 Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
  { label: 'Phone Number', pattern: '[\\+]?[(]?[0-9]{1,4}[)]?[\\-\\s\\.]?[0-9]{1,4}[\\-\\s\\.]?[0-9]{1,9}', flags: 'g' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', flags: 'g' },
  { label: 'UUID', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', flags: 'g' },
  { label: 'Hex Colour', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi' },
  { label: 'HTML Tag', pattern: '<\\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>', flags: 'g' },
];

export default function RegexTester({ tool }) {
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [flagG, setFlagG] = useState(true);
  const [flagI, setFlagI] = useState(false);
  const [flagM, setFlagM] = useState(false);
  const [flagS, setFlagS] = useState(false);
  const [flagU, setFlagU] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const flags = useMemo(() => {
    let f = '';
    if (flagG) f += 'g';
    if (flagI) f += 'i';
    if (flagM) f += 'm';
    if (flagS) f += 's';
    if (flagU) f += 'u';
    return f;
  }, [flagG, flagI, flagM, flagS, flagU]);

  const { regex, error: regexError } = useMemo(() => {
    if (!pattern) return { regex: null, error: null };
    try {
      return { regex: new RegExp(pattern, flags), error: null };
    } catch (e) {
      return { regex: null, error: e.message };
    }
  }, [pattern, flags]);

  const matches = useMemo(() => {
    if (!regex || !testString) return [];
    const results = [];
    let match;
    // Use a copy to avoid infinite loops with zero-length matches
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let safety = 0;
    while ((match = re.exec(testString)) !== null && safety < 10000) {
      safety++;
      results.push({
        fullMatch: match[0],
        index: match.index,
        endIndex: match.index + match[0].length,
        groups: match.slice(1),
      });
      if (match[0].length === 0) re.lastIndex++;
    }
    // If not global flag, only return first
    if (!flagG && results.length > 0) return [results[0]];
    return results;
  }, [regex, testString, flagG]);

  const highlightedParts = useMemo(() => {
    if (!matches.length || !testString) return null;
    const parts = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.index > lastEnd) {
        parts.push({ text: testString.slice(lastEnd, m.index), highlight: false });
      }
      parts.push({ text: testString.slice(m.index, m.endIndex), highlight: true });
      lastEnd = m.endIndex;
    }
    if (lastEnd < testString.length) {
      parts.push({ text: testString.slice(lastEnd), highlight: false });
    }
    return parts;
  }, [matches, testString]);

  const handlePreset = useCallback((preset) => {
    setPattern(preset.pattern);
    // Set flags from preset
    const f = preset.flags || '';
    setFlagG(f.includes('g'));
    setFlagI(f.includes('i'));
    setFlagM(f.includes('m'));
    setFlagS(f.includes('s'));
    setFlagU(f.includes('u'));
  }, []);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* ignore */ }
  }, []);

  return (
    <div>
      <InfoCard description="Test regular expressions with real-time match highlighting. Supports flags for global, case-insensitive, multiline, and dotall modes. Includes common pattern presets. All processing happens locally in your browser." />

      <div className="regex-tester-panel">
        <div className="regex-tester-input-group">
          <label className="regex-tester-label">Regular Expression</label>
          <div className="regex-tester-pattern-row">
            <span className="regex-tester-delim">/</span>
            <input
              type="text"
              className="regex-tester-pattern-input"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              spellCheck={false}
              autoComplete="off"
            />
            <span className="regex-tester-delim">/{flags}</span>
          </div>
        </div>

        <div className="regex-tester-flags">
          <label className="regex-tester-flag">
            <input type="checkbox" checked={flagG} onChange={e => setFlagG(e.target.checked)} />
            <span className="regex-tester-flag-code">g</span>
            <span className="regex-tester-flag-label">global</span>
          </label>
          <label className="regex-tester-flag">
            <input type="checkbox" checked={flagI} onChange={e => setFlagI(e.target.checked)} />
            <span className="regex-tester-flag-code">i</span>
            <span className="regex-tester-flag-label">case-insensitive</span>
          </label>
          <label className="regex-tester-flag">
            <input type="checkbox" checked={flagM} onChange={e => setFlagM(e.target.checked)} />
            <span className="regex-tester-flag-code">m</span>
            <span className="regex-tester-flag-label">multiline</span>
          </label>
          <label className="regex-tester-flag">
            <input type="checkbox" checked={flagS} onChange={e => setFlagS(e.target.checked)} />
            <span className="regex-tester-flag-code">s</span>
            <span className="regex-tester-flag-label">dotall</span>
          </label>
          <label className="regex-tester-flag">
            <input type="checkbox" checked={flagU} onChange={e => setFlagU(e.target.checked)} />
            <span className="regex-tester-flag-code">u</span>
            <span className="regex-tester-flag-label">unicode</span>
          </label>
        </div>

        <div className="regex-tester-presets">
          <span className="regex-tester-presets-label">Common patterns:</span>
          <div className="regex-tester-presets-list">
            {COMMON_PATTERNS.map(p => (
              <button
                key={p.label}
                className="regex-tester-preset-btn"
                onClick={() => handlePreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {regexError && (
          <ErrorCard title="Invalid Pattern" message={regexError} />
        )}

        <div className="regex-tester-input-group">
          <label className="regex-tester-label">Test String</label>
          <textarea
            className="regex-tester-textarea"
            value={testString}
            onChange={e => setTestString(e.target.value)}
            placeholder="Enter text to test against..."
            rows={6}
            spellCheck={false}
          />
        </div>

        {highlightedParts && (
          <div className="regex-tester-input-group">
            <label className="regex-tester-label">
              Highlighted Matches
              <span className="regex-tester-match-count">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
            </label>
            <div className="regex-tester-highlighted">
              {highlightedParts.map((part, i) =>
                part.highlight ? (
                  <mark key={i} className="regex-tester-highlight">{part.text}</mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </div>
          </div>
        )}

        {matches.length > 0 && (
          <div className="regex-tester-input-group">
            <label className="regex-tester-label">Match Details</label>
            <div className="regex-tester-matches">
              {matches.map((m, i) => (
                <div key={i} className="regex-tester-match-card">
                  <div className="regex-tester-match-header">
                    <span className="regex-tester-match-num">Match {i + 1}</span>
                    <span className="regex-tester-match-index">Index {m.index}&ndash;{m.endIndex}</span>
                    <button
                      className="regex-tester-match-copy"
                      onClick={() => handleCopy(m.fullMatch, `match-${i}`)}
                      title="Copy match"
                    >
                      {copiedField === `match-${i}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <code className="regex-tester-match-value">{m.fullMatch}</code>
                  {m.groups.length > 0 && (
                    <div className="regex-tester-match-groups">
                      {m.groups.map((g, gi) => (
                        <div key={gi} className="regex-tester-match-group">
                          <span className="regex-tester-group-label">Group {gi + 1}:</span>
                          <code className="regex-tester-group-value">{g ?? '(undefined)'}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pattern && testString && !regexError && matches.length === 0 && (
          <div className="regex-tester-no-match">
            No matches found.
          </div>
        )}
      </div>
    </div>
  );
}
