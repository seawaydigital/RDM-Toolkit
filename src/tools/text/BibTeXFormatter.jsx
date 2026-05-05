import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

const REQUIRED_FIELDS = {
  article: ['author', 'title', 'journal', 'year'],
  book: ['author', 'title', 'publisher', 'year'],
  inproceedings: ['author', 'title', 'booktitle', 'year'],
  conference: ['author', 'title', 'booktitle', 'year'],
  incollection: ['author', 'title', 'booktitle', 'publisher', 'year'],
  phdthesis: ['author', 'title', 'school', 'year'],
  mastersthesis: ['author', 'title', 'school', 'year'],
  techreport: ['author', 'title', 'institution', 'year'],
  misc: [],
  unpublished: ['author', 'title', 'note'],
  inbook: ['author', 'title', 'chapter', 'publisher', 'year'],
  proceedings: ['title', 'year'],
  manual: ['title'],
  booklet: ['title'],
};

const FIELD_ORDER = [
  'author', 'title', 'journal', 'booktitle', 'editor',
  'volume', 'number', 'series', 'pages', 'chapter',
  'publisher', 'address', 'school', 'institution', 'organization',
  'edition', 'month', 'year', 'doi', 'url', 'isbn', 'issn',
  'abstract', 'keywords', 'note',
];

function parseBibTeX(input) {
  const entries = [];
  const errors = [];

  // Match @type{key, ... } blocks
  const entryRegex = /@(\w+)\s*\{([^,]*),\s*([\s\S]*?)(?=\n@|\n*$)/g;
  let match;

  while ((match = entryRegex.exec(input)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const body = match[3];

    if (type === 'string' || type === 'preamble' || type === 'comment') continue;

    const fields = {};
    // Parse fields: name = {value} or name = "value" or name = number
    const fieldRegex = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase();
      const fieldValue = fieldMatch[2] !== undefined ? fieldMatch[2]
        : fieldMatch[3] !== undefined ? fieldMatch[3]
        : fieldMatch[4];
      fields[fieldName] = fieldValue;
    }

    // Validation
    const requiredFields = REQUIRED_FIELDS[type] || [];
    const missingFields = requiredFields.filter(f => !fields[f]);
    if (missingFields.length > 0) {
      errors.push(`${key}: missing required field(s): ${missingFields.join(', ')}`);
    }

    entries.push({ type, key, fields });
  }

  if (entries.length === 0 && input.trim().length > 0) {
    errors.push('No valid BibTeX entries found. Ensure entries follow @type{key, ...} format.');
  }

  return { entries, errors };
}

function formatEntry(entry, fixCapitalization) {
  const type = fixCapitalization ? entry.type.toLowerCase() : entry.type;
  let result = `@${type}{${entry.key},\n`;

  // Sort fields by standard order
  const sortedFieldNames = Object.keys(entry.fields).sort((a, b) => {
    const aIdx = FIELD_ORDER.indexOf(a);
    const bIdx = FIELD_ORDER.indexOf(b);
    const aPos = aIdx === -1 ? 999 : aIdx;
    const bPos = bIdx === -1 ? 999 : bIdx;
    return aPos - bPos;
  });

  sortedFieldNames.forEach((name, i) => {
    const fieldName = fixCapitalization ? name.toLowerCase() : name;
    const value = entry.fields[name];
    const comma = ',';
    // Use numeric-only values without braces
    if (/^\d+$/.test(value)) {
      result += `  ${fieldName.padEnd(12)} = ${value}${comma}\n`;
    } else {
      result += `  ${fieldName.padEnd(12)} = {${value}}${comma}\n`;
    }
  });

  result += '}';
  return result;
}

function sortEntries(entries, sortBy) {
  return [...entries].sort((a, b) => {
    if (sortBy === 'key') return a.key.localeCompare(b.key);
    if (sortBy === 'year') {
      const ya = parseInt(a.fields.year || '0', 10);
      const yb = parseInt(b.fields.year || '0', 10);
      return ya - yb;
    }
    if (sortBy === 'author') {
      return (a.fields.author || '').localeCompare(b.fields.author || '');
    }
    return 0;
  });
}

export default function BibTeXFormatter({ tool }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [entries, setEntries] = useState([]);
  const [errors, setErrors] = useState([]);
  const [sortBy, setSortBy] = useState('none');
  const [fixCaps, setFixCaps] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleFormat = useCallback(() => {
    const { entries: parsed, errors: parseErrors } = parseBibTeX(inputText);
    setErrors(parseErrors);

    if (parsed.length === 0) {
      setEntries([]);
      setOutputText('');
      return;
    }

    let sorted = sortBy !== 'none' ? sortEntries(parsed, sortBy) : parsed;
    setEntries(sorted);

    const formatted = sorted.map(e => formatEntry(e, fixCaps)).join('\n\n');
    setOutputText(formatted);
  }, [inputText, sortBy, fixCaps]);

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

  const entryTypeColor = (type) => {
    const colors = {
      article: '#569CD6',
      book: '#CE9178',
      inproceedings: '#4EC9B0',
      conference: '#4EC9B0',
      phdthesis: '#DCDCAA',
      mastersthesis: '#DCDCAA',
      techreport: '#C586C0',
      misc: '#9CDCFE',
    };
    return colors[type] || 'var(--text-secondary)';
  };

  return (
    <div>
      <InfoCard description="Parse, validate, and format BibTeX entries. Checks for missing required fields, sorts entries, and standardizes formatting. All processing happens locally in your browser." />

      {errors.length > 0 && errors.map((err, i) => (
        <ErrorCard key={i} title="Validation Warning" message={err} />
      ))}

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setEntries([]); setErrors([]); }}
        placeholder={`Paste your BibTeX entries here...\n\nExample:\n@article{smith2024,\n  author = {John Smith},\n  title = {A Great Paper},\n  journal = {Nature},\n  year = {2024},\n}`}
        rows={12}
        spellCheck={false}
      />

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
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="json-formatter-select"
            aria-label="Sort BibTeX entries by"
          >
            <option value="none">No sorting</option>
            <option value="key">Citation key</option>
            <option value="year">Year</option>
            <option value="author">Author</option>
          </select>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}>
          <input type="checkbox" checked={fixCaps} onChange={e => setFixCaps(e.target.checked)} />
          Lowercase field names
        </label>

        <button
          className="action-button"
          style={{ width: 'auto', margin: 0 }}
          onClick={handleFormat}
          disabled={!inputText.trim()}
        >
          Format
        </button>
      </div>

      {/* Parsed entry cards */}
      {entries.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'} Parsed
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '8px',
          }}>
            {entries.map((entry, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
                fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-tertiary)',
                    color: entryTypeColor(entry.type),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}>
                    @{entry.type}
                  </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {entry.key}
                  </span>
                </div>
                {entry.fields.title && (
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: 1.4 }}>
                    {entry.fields.title}
                  </div>
                )}
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {[entry.fields.author, entry.fields.year, entry.fields.journal || entry.fields.booktitle]
                    .filter(Boolean)
                    .join(' — ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">Formatted BibTeX</span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="text-tool-textarea text-tool-textarea--mono"
            value={outputText}
            readOnly
            rows={Math.min(20, outputText.split('\n').length + 1)}
            style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
