import { useState, useMemo, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
  );
}

function toSentenceCase(str) {
  return str.replace(/(^|[.!?]\s+)(\w)/g, (match, sep, char) =>
    sep + char.toUpperCase()
  ).replace(/^(\w)/, (m) => m.toUpperCase());
}

function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function toConstantCase(str) {
  return toSnakeCase(str).toUpperCase();
}

const CONVERSIONS = [
  { label: 'UPPERCASE', fn: (s) => s.toUpperCase() },
  { label: 'lowercase', fn: (s) => s.toLowerCase() },
  { label: 'Title Case', fn: toTitleCase },
  { label: 'Sentence case', fn: toSentenceCase },
  { label: 'camelCase', fn: toCamelCase },
  { label: 'PascalCase', fn: toPascalCase },
  { label: 'snake_case', fn: toSnakeCase },
  { label: 'kebab-case', fn: toKebabCase },
  { label: 'CONSTANT_CASE', fn: toConstantCase },
];

export default function TextCaseConverter({ tool }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeCase, setActiveCase] = useState(null);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const characters = inputText.length;
    const words = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).length;
    return { characters, words };
  }, [inputText]);

  const handleConvert = useCallback((label, fn) => {
    setActiveCase(label);
    setOutputText(fn(inputText));
  }, [inputText]);

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

  return (
    <div>
      <InfoCard description="Convert text between different cases: UPPERCASE, lowercase, Title Case, camelCase, snake_case, and more. All processing happens locally in your browser." />

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
      }}>
        <span>{stats.characters} characters</span>
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <span>{stats.words} words</span>
      </div>

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setActiveCase(null); }}
        placeholder="Type or paste your text here..."
        rows={8}
        spellCheck={false}
      />

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '12px 0',
      }}>
        {CONVERSIONS.map(({ label, fn }) => (
          <button
            key={label}
            className="action-button"
            style={{
              width: 'auto',
              margin: 0,
              padding: '8px 16px',
              fontSize: '0.8rem',
              background: activeCase === label ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: activeCase === label ? '#fff' : 'var(--text-primary)',
              transition: 'all 0.15s',
            }}
            onClick={() => handleConvert(label, fn)}
            disabled={!inputText.trim()}
          >
            {label}
          </button>
        ))}
      </div>

      {outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">Result — {activeCase}</span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="text-tool-textarea text-tool-textarea--mono"
            value={outputText}
            readOnly
            rows={8}
            style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
