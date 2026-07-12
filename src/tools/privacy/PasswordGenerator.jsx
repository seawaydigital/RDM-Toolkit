import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

function calculateEntropy(length, charset) {
  if (!charset || charset.length === 0) return 0;
  return Math.floor(length * Math.log2(charset.length));
}

function getStrengthFromEntropy(entropy) {
  if (entropy < 40) return { label: 'Weak', color: 'var(--accent-red)', level: 1 };
  if (entropy < 60) return { label: 'Fair', color: 'var(--accent-amber)', level: 2 };
  if (entropy < 80) return { label: 'Good', color: 'var(--accent-cyan)', level: 3 };
  if (entropy < 100) return { label: 'Strong', color: 'var(--accent-green)', level: 4 };
  return { label: 'Very Strong', color: 'var(--accent-green)', level: 5 };
}

function buildCharset(options) {
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  const AMBIGUOUS = '0OoIl1';

  let charset = '';
  if (options.uppercase) charset += UPPER;
  if (options.lowercase) charset += LOWER;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;
  if (!charset) charset = LOWER + NUMBERS;

  if (options.excludeAmbiguous) {
    charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
  }
  return charset;
}

function generatePasswordFromCharset(length, charset) {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values).map(v => charset[v % charset.length]).join('');
}

function PasswordRow({ password, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [password]);

  return (
    <div className="password-row">
      {index != null && <span className="password-row-index">#{index + 1}</span>}
      <code className="password-row-value">{password}</code>
      <button className="hash-copy-btn" onClick={handleCopy} title="Copy password">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function PasswordGenerator({ tool, navigateTo }) {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(1);
  const [passwords, setPasswords] = useState([]);

  const options = useMemo(() => ({
    uppercase, lowercase, numbers, symbols, excludeAmbiguous,
  }), [uppercase, lowercase, numbers, symbols, excludeAmbiguous]);

  const charset = useMemo(() => buildCharset(options), [options]);
  const entropy = useMemo(() => calculateEntropy(length, charset), [length, charset]);
  const strength = useMemo(() => getStrengthFromEntropy(entropy), [entropy]);

  const handleGenerate = useCallback(() => {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(generatePasswordFromCharset(length, charset));
    }
    setPasswords(results);
  }, [length, charset, count]);

  return (
    <div>
      <InfoCard description="Generate cryptographically secure passwords using your browser's native crypto.getRandomValues() API. No data is transmitted. Nothing leaves your device." />

      {/* Length slider */}
      <div className="password-option-section">
        <label className="password-option-label" htmlFor="pw-length">
          Length: <strong>{length}</strong>
        </label>
        <input
          id="pw-length"
          type="range"
          className="password-slider"
          min={8}
          max={64}
          value={length}
          onChange={e => setLength(Number(e.target.value))}
        />
        <div className="password-slider-labels">
          <span>8</span>
          <span>64</span>
        </div>
      </div>

      {/* Character options */}
      <div className="password-checkboxes">
        <label className="password-checkbox">
          <input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} />
          Uppercase (A-Z)
        </label>
        <label className="password-checkbox">
          <input type="checkbox" checked={lowercase} onChange={e => setLowercase(e.target.checked)} />
          Lowercase (a-z)
        </label>
        <label className="password-checkbox">
          <input type="checkbox" checked={numbers} onChange={e => setNumbers(e.target.checked)} />
          Numbers (0-9)
        </label>
        <label className="password-checkbox">
          <input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} />
          Symbols (!@#$%...)
        </label>
        <label className="password-checkbox">
          <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} />
          Exclude ambiguous (0, O, I, l, 1)
        </label>
      </div>

      {/* Batch count */}
      <div className="password-option-section">
        <label className="password-option-label" htmlFor="pw-count">
          Number of passwords: <strong>{count}</strong>
        </label>
        <input
          id="pw-count"
          type="range"
          className="password-slider"
          min={1}
          max={20}
          value={count}
          onChange={e => setCount(Number(e.target.value))}
        />
        <div className="password-slider-labels">
          <span>1</span>
          <span>20</span>
        </div>
      </div>

      {/* Strength preview */}
      <div className="password-strength-preview">
        <div className="password-strength-bar">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="password-strength-segment"
              style={{
                background: i <= strength.level ? strength.color : 'var(--bg-tertiary)',
              }}
            />
          ))}
        </div>
        <span className="password-strength-label" style={{ color: strength.color }}>
          {strength.label} ({entropy} bits of entropy)
        </span>
      </div>

      {/* Generate button */}
      <button className="action-button" onClick={handleGenerate}>
        <RefreshCw size={18} />
        Generate Password{count > 1 ? 's' : ''}
      </button>

      {/* Results */}
      {passwords.length > 0 && (
        <div className="password-results">
          {passwords.map((pw, i) => (
            <PasswordRow
              key={`${pw}-${i}`}
              password={pw}
              index={count > 1 ? i : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
