import { useState, useCallback, useMemo } from 'react';
import { Lock, Unlock, Copy, Check } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import InfoCard from '../../components/ui/InfoCard';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import { encryptText, decryptText } from '../../utils/crypto';

const STRENGTH_CONFIG = [
  { label: 'Very Weak', color: 'var(--accent-red)' },
  { label: 'Weak',      color: 'var(--accent-red)' },
  { label: 'Fair',      color: 'var(--accent-amber)' },
  { label: 'Strong',    color: 'var(--accent-cyan)' },
  { label: 'Very Strong', color: 'var(--accent-green)' },
];

function getPasswordStrength(password) {
  if (!password) return { label: '', level: 0, color: '', feedback: '' };
  const result = zxcvbn(password);
  const cfg = STRENGTH_CONFIG[result.score];
  const suggestion = result.feedback.suggestions[0] || result.feedback.warning || '';
  return { label: cfg.label, level: result.score, color: cfg.color, feedback: suggestion };
}

export default function EncryptDecryptText({ tool, navigateTo }) {
  const [mode, setMode] = useState('encrypt');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleEncrypt = useCallback(async () => {
    if (!inputText.trim() || !password) return;
    setLoading(true);
    setError(null);
    setOutput('');

    try {
      const encrypted = await encryptText(inputText, password);
      setOutput(encrypted);
    } catch (e) {
      setError(e.message || 'Encryption failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [inputText, password]);

  const handleDecrypt = useCallback(async () => {
    if (!inputText.trim() || !password) return;
    setLoading(true);
    setError(null);
    setOutput('');

    try {
      const decrypted = await decryptText(inputText.trim(), password);
      setOutput(decrypted);
    } catch {
      setError('Decryption failed. Check that the password and encrypted text are correct.');
    } finally {
      setLoading(false);
    }
  }, [inputText, password]);

  const handleCopyOutput = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  const handleClear = useCallback(() => {
    setInputText('');
    setPassword('');
    setOutput('');
    setError(null);
  }, []);

  return (
    <div>
      <InfoCard description="Encrypts plain text using AES-256-GCM with PBKDF2 key derivation. Nothing is transmitted — encryption and decryption happen entirely in your browser." />

      {error && <ErrorCard title="Error" message={error} />}

      {/* Mode toggle */}
      <div className="split-tabs">
        <button
          className={`split-tab ${mode === 'encrypt' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('encrypt'); handleClear(); }}
        >
          <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Encrypt
        </button>
        <button
          className={`split-tab ${mode === 'decrypt' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('decrypt'); handleClear(); }}
        >
          <Unlock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Decrypt
        </button>
      </div>

      {/* Input area */}
      <div className="encrypt-input-section">
        <label className="encrypt-label">
          {mode === 'encrypt' ? 'Plain text to encrypt:' : 'Encrypted text (Base64) to decrypt:'}
        </label>
        <textarea
          className="text-tool-textarea"
          value={inputText}
          onChange={e => { setInputText(e.target.value); setOutput(''); }}
          placeholder={mode === 'encrypt'
            ? 'Type or paste the text you want to encrypt...'
            : 'Paste the Base64 encrypted text here...'}
          rows={6}
          spellCheck={false}
        />
      </div>

      {/* Password input */}
      <div className="encrypt-password-section">
        <label className="encrypt-label">Password / Passphrase:</label>
        <input
          type="password"
          className="encrypt-password-input"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={mode === 'encrypt' ? 'Enter a strong password...' : 'Enter the password used for encryption...'}
          autoComplete="off"
        />
        {mode === 'encrypt' && password && (
          <div className="password-strength">
            <div className="password-strength-bar">
              {[1, 2, 3, 4].map(i => (
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
              {strength.label}
            </span>
            {strength.feedback && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                — {strength.feedback}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action */}
      {!output && (
        <ActionButton
          label={mode === 'encrypt' ? 'Encrypt Text' : 'Decrypt Text'}
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={!inputText.trim() || !password}
          loading={loading}
        />
      )}

      {/* Output */}
      {output && (
        <div className="encrypt-output-section">
          <div className="encrypt-output-header">
            <label className="encrypt-label">
              {mode === 'encrypt' ? 'Encrypted output (Base64):' : 'Decrypted text:'}
            </label>
            <button className="hash-copy-btn" onClick={handleCopyOutput}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="encrypt-output-text">{output}</pre>

          <button className="result-panel-startover" onClick={handleClear} style={{ marginTop: 'var(--space-md)' }}>
            Clear & Start Over
          </button>
        </div>
      )}
    </div>
  );
}
