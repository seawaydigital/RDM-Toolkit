import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

const DEFAULT_OPTIONS = {
  stripTrailing: true,
  stripLeading: false,
  removeBlankLines: false,
  collapseBlankLines: false,
  normalizeLF: false,
  normalizeCRLF: false,
  tabsToSpaces: false,
  spacesToTabs: false,
  tabWidth: 4,
};

function cleanWhitespace(text, options) {
  let result = text;

  // Normalize line endings first if requested
  if (options.normalizeLF) {
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  } else if (options.normalizeCRLF) {
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  }

  // Convert tabs to spaces
  if (options.tabsToSpaces) {
    const spaces = ' '.repeat(options.tabWidth);
    result = result.replace(/\t/g, spaces);
  }

  // Convert spaces to tabs
  if (options.spacesToTabs && !options.tabsToSpaces) {
    const spaces = ' '.repeat(options.tabWidth);
    const regex = new RegExp(spaces.replace(/ /g, ' '), 'g');
    // Only convert leading spaces
    const lineEnd = options.normalizeCRLF ? '\r\n' : '\n';
    result = result.split(/\r?\n/).map(line => {
      const match = line.match(/^( +)/);
      if (match) {
        const leading = match[1];
        const converted = leading.replace(regex, '\t');
        return converted + line.slice(leading.length);
      }
      return line;
    }).join(lineEnd);
  }

  // Process lines
  const lineEnd = options.normalizeCRLF ? '\r\n' : '\n';
  let lines = result.split(/\r?\n/);

  if (options.stripTrailing) {
    lines = lines.map(line => line.replace(/\s+$/, ''));
  }

  if (options.stripLeading) {
    lines = lines.map(line => line.replace(/^\s+/, ''));
  }

  if (options.removeBlankLines) {
    lines = lines.filter(line => line.trim() !== '');
  } else if (options.collapseBlankLines) {
    const collapsed = [];
    let prevBlank = false;
    for (const line of lines) {
      const isBlank = line.trim() === '';
      if (isBlank && prevBlank) continue;
      collapsed.push(line);
      prevBlank = isBlank;
    }
    lines = collapsed;
  }

  return lines.join(lineEnd);
}

function computeDiffStats(original, cleaned) {
  const origLines = original.split(/\r?\n/);
  const cleanLines = cleaned.split(/\r?\n/);
  const linesChanged = origLines.filter((line, i) => line !== (cleanLines[i] || '')).length;
  const linesDiff = origLines.length - cleanLines.length;
  const charsRemoved = original.length - cleaned.length;
  return { linesChanged, linesRemoved: linesDiff > 0 ? linesDiff : 0, charsRemoved };
}

export default function WhitespaceCleaner({ tool }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [diffStats, setDiffStats] = useState(null);
  const [copied, setCopied] = useState(false);

  const setOption = (key, value) => {
    setOptions(prev => {
      const next = { ...prev, [key]: value };
      // Mutual exclusions
      if (key === 'removeBlankLines' && value) next.collapseBlankLines = false;
      if (key === 'collapseBlankLines' && value) next.removeBlankLines = false;
      if (key === 'normalizeLF' && value) next.normalizeCRLF = false;
      if (key === 'normalizeCRLF' && value) next.normalizeLF = false;
      if (key === 'tabsToSpaces' && value) next.spacesToTabs = false;
      if (key === 'spacesToTabs' && value) next.tabsToSpaces = false;
      return next;
    });
  };

  const handleApply = useCallback(() => {
    const cleaned = cleanWhitespace(inputText, options);
    setOutputText(cleaned);
    setDiffStats(computeDiffStats(inputText, cleaned));
  }, [inputText, options]);

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

  const checkboxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '4px 0',
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const sectionLabelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  };

  return (
    <div>
      <InfoCard description="Clean up whitespace: strip trailing/leading spaces, remove or collapse blank lines, normalize line endings, and convert between tabs and spaces. All processing happens locally in your browser." />

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setDiffStats(null); }}
        placeholder="Paste text to clean up whitespace..."
        rows={10}
        spellCheck={false}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        margin: '12px 0',
        padding: '16px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
      }}>
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Whitespace</div>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.stripTrailing} onChange={e => setOption('stripTrailing', e.target.checked)} />
            Strip trailing whitespace
          </label>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.stripLeading} onChange={e => setOption('stripLeading', e.target.checked)} />
            Strip leading whitespace
          </label>
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Blank Lines</div>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.removeBlankLines} onChange={e => setOption('removeBlankLines', e.target.checked)} />
            Remove blank lines
          </label>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.collapseBlankLines} onChange={e => setOption('collapseBlankLines', e.target.checked)} />
            Collapse multiple to one
          </label>
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Line Endings</div>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.normalizeLF} onChange={e => setOption('normalizeLF', e.target.checked)} />
            Normalize to LF (Unix)
          </label>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.normalizeCRLF} onChange={e => setOption('normalizeCRLF', e.target.checked)} />
            Normalize to CRLF (Windows)
          </label>
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Tabs / Spaces</div>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.tabsToSpaces} onChange={e => setOption('tabsToSpaces', e.target.checked)} />
            Convert tabs to spaces
          </label>
          <label style={checkboxStyle}>
            <input type="checkbox" checked={options.spacesToTabs} onChange={e => setOption('spacesToTabs', e.target.checked)} />
            Convert spaces to tabs
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tab width:</label>
            <input
              type="number"
              aria-label="Tab width"
              value={options.tabWidth}
              onChange={e => setOption('tabWidth', Math.max(1, parseInt(e.target.value, 10) || 4))}
              min={1}
              max={16}
              style={{
                width: '55px',
                padding: '4px 6px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>
      </div>

      <button
        className="action-button"
        style={{ width: 'auto', margin: '0 0 12px 0' }}
        onClick={handleApply}
        disabled={!inputText.trim()}
      >
        Apply
      </button>

      {diffStats && (
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '12px',
          padding: '10px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{diffStats.linesChanged}</strong> lines changed</span>
          {diffStats.linesRemoved > 0 && (
            <span><strong style={{ color: 'var(--text-primary)' }}>{diffStats.linesRemoved}</strong> lines removed</span>
          )}
          <span>
            <strong style={{ color: diffStats.charsRemoved > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
              {diffStats.charsRemoved > 0 ? `-${diffStats.charsRemoved}` : diffStats.charsRemoved}
            </strong> chars
          </span>
        </div>
      )}

      {outputText !== '' && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">Cleaned Result</span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="text-tool-textarea text-tool-textarea--mono"
            value={outputText}
            readOnly
            rows={10}
            style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
