import { useState, useMemo, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

const SEPARATORS = [
  { label: 'Tab', value: '\t' },
  { label: 'Space', value: ' ' },
  { label: 'Colon + Space', value: ': ' },
  { label: 'Pipe', value: ' | ' },
  { label: 'Dot + Space', value: '. ' },
];

const PADDING_MODES = [
  { label: 'None', value: 'none' },
  { label: 'Zero-pad', value: 'zero' },
  { label: 'Space-pad', value: 'space' },
];

function addLineNumbers(text, startNum, separator, padding) {
  if (!text) return '';
  const lines = text.split('\n');
  const maxNum = startNum + lines.length - 1;
  const maxWidth = String(maxNum).length;

  return lines.map((line, i) => {
    const num = startNum + i;
    let numStr = String(num);

    if (padding === 'zero') {
      numStr = numStr.padStart(maxWidth, '0');
    } else if (padding === 'space') {
      numStr = numStr.padStart(maxWidth, ' ');
    }

    return numStr + separator + line;
  }).join('\n');
}

function removeLineNumbers(text) {
  if (!text) return '';
  return text.split('\n').map(line => {
    // Try to remove common line number patterns:
    // "123\t", "123 ", "123: ", "123 | ", "123. "
    return line.replace(/^\s*\d+(\t| \| |[.:]\s| )/, '');
  }).join('\n');
}

export default function LineNumberAdder({ tool }) {
  const [inputText, setInputText] = useState('');
  const [startNum, setStartNum] = useState(1);
  const [separator, setSeparator] = useState('\t');
  const [padding, setPadding] = useState('none');
  const [mode, setMode] = useState('add'); // 'add' or 'remove'
  const [copied, setCopied] = useState(false);

  const outputText = useMemo(() => {
    if (!inputText) return '';
    if (mode === 'remove') {
      return removeLineNumbers(inputText);
    }
    return addLineNumbers(inputText, startNum, separator, padding);
  }, [inputText, startNum, separator, padding, mode]);

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

  const lineCount = inputText ? inputText.split('\n').length : 0;

  const tabStyle = (active) => ({
    padding: '8px 20px',
    border: 'none',
    background: active ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    borderRadius: '6px 6px 0 0',
    transition: 'background 0.15s',
  });

  return (
    <div>
      <InfoCard description="Add or remove line numbers from text. Customize the starting number, separator, and padding style. All processing happens locally in your browser." />

      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        <button style={tabStyle(mode === 'add')} onClick={() => setMode('add')}>Add Line Numbers</button>
        <button style={tabStyle(mode === 'remove')} onClick={() => setMode('remove')}>Remove Line Numbers</button>
      </div>

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder={mode === 'add' ? 'Paste text to add line numbers...' : 'Paste numbered text to remove line numbers...'}
        rows={10}
        spellCheck={false}
      />

      {mode === 'add' && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          margin: '12px 0',
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Start at:</label>
            <input
              type="number"
              value={startNum}
              onChange={e => { const v = parseInt(e.target.value, 10); setStartNum(Number.isNaN(v) ? 1 : v); }}
              min={0}
              style={{
                width: '70px',
                padding: '6px 8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Separator:</label>
            <select
              value={separator}
              onChange={e => setSeparator(e.target.value)}
              className="json-formatter-select"
            >
              {SEPARATORS.map(s => (
                <option key={s.label} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Padding:</label>
            <select
              value={padding}
              onChange={e => setPadding(e.target.value)}
              className="json-formatter-select"
            >
              {PADDING_MODES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lineCount} lines</span>
        </div>
      )}

      {outputText && (
        <div className="find-replace-output" style={{ marginTop: '12px' }}>
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">
              {mode === 'add' ? 'Numbered Output' : 'Numbers Removed'}
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
            rows={10}
            style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
