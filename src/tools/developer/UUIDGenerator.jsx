import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

const styles = {
  section: {
    marginBottom: 'var(--space-lg)',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-lg)',
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  label: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  select: {
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
  },
  numberInput: {
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap',
    marginBottom: 'var(--space-lg)',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'var(--accent-blue)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  dangerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'transparent',
    border: '1px solid var(--accent-red)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--accent-red)',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginBottom: 'var(--space-md)',
  },
  uuidRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    padding: '4px var(--space-sm)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
  },
  uuidIndex: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    minWidth: 32,
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
  },
  uuidValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    flex: 1,
    userSelect: 'all',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  },
  countBadge: {
    fontSize: '0.78rem',
    color: 'var(--text-tertiary)',
    marginBottom: 'var(--space-xs)',
  },
};

function generateUUIDv4() {
  // RFC 4122 version 4 UUID using crypto.getRandomValues
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set version 4 (0100 in bits 6-7 of byte 6)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant 10xx (bits 6-7 of byte 8)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatUUID(uuid, format) {
  switch (format) {
    case 'uppercase-hyphens':
      return uuid.toUpperCase();
    case 'lowercase-no-hyphens':
      return uuid.replace(/-/g, '');
    case 'uppercase-no-hyphens':
      return uuid.replace(/-/g, '').toUpperCase();
    case 'lowercase-hyphens':
    default:
      return uuid;
  }
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button style={styles.copyBtn} onClick={handleCopy} title="Copy UUID">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CopyAllButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button style={styles.secondaryBtn} onClick={handleCopy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied All' : 'Copy All'}
    </button>
  );
}

export default function UUIDGenerator({ tool, navigateTo }) {
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState('lowercase-hyphens');
  const [uuids, setUuids] = useState([]);

  const handleGenerate = useCallback(() => {
    const n = Math.max(1, Math.min(100, count));
    const newUuids = [];
    for (let i = 0; i < n; i++) {
      newUuids.push(formatUUID(generateUUIDv4(), format));
    }
    setUuids(newUuids);
  }, [count, format]);

  const handleGenerateMore = useCallback(() => {
    const n = Math.max(1, Math.min(100, count));
    const newUuids = [];
    for (let i = 0; i < n; i++) {
      newUuids.push(formatUUID(generateUUIDv4(), format));
    }
    setUuids(prev => [...prev, ...newUuids]);
  }, [count, format]);

  const handleClear = useCallback(() => {
    setUuids([]);
  }, []);

  const allText = uuids.join('\n');

  return (
    <div>
      <InfoCard description={tool.description || "Generate cryptographically secure UUID v4 identifiers using your browser's native crypto.getRandomValues() API. No data is transmitted."} />

      {/* Options */}
      <div style={styles.optionsGrid}>
        <div style={styles.optionGroup}>
          <label style={styles.label}>Count (1-100)</label>
          <input
            type="number"
            style={styles.numberInput}
            min={1}
            max={100}
            value={count}
            onChange={e => setCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
          />
        </div>
        <div style={styles.optionGroup}>
          <label style={styles.label}>Format</label>
          <select
            style={styles.select}
            value={format}
            onChange={e => setFormat(e.target.value)}
          >
            <option value="lowercase-hyphens">lowercase with hyphens</option>
            <option value="uppercase-hyphens">UPPERCASE with hyphens</option>
            <option value="lowercase-no-hyphens">lowercase no hyphens</option>
            <option value="uppercase-no-hyphens">UPPERCASE no hyphens</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.buttonRow}>
        <button style={styles.primaryBtn} onClick={handleGenerate}>
          <RefreshCw size={14} />
          Generate
        </button>
        {uuids.length > 0 && (
          <>
            <button style={styles.secondaryBtn} onClick={handleGenerateMore}>
              <RefreshCw size={14} />
              Generate More
            </button>
            <CopyAllButton text={allText} />
            <button style={styles.dangerBtn} onClick={handleClear}>
              <Trash2 size={14} />
              Clear
            </button>
          </>
        )}
      </div>

      {/* UUID list */}
      {uuids.length > 0 && (
        <div>
          <div style={styles.countBadge}>{uuids.length} UUID{uuids.length !== 1 ? 's' : ''} generated</div>
          <div style={styles.listContainer}>
            {uuids.map((uuid, i) => (
              <div key={`${uuid}-${i}`} style={styles.uuidRow}>
                <span style={styles.uuidIndex}>{i + 1}</span>
                <code style={styles.uuidValue}>{uuid}</code>
                <CopyButton text={uuid} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
