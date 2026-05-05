import { useState, useCallback } from 'react';
import { Copy, Check, FileText, Type, RotateCcw } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import { ANY_FILE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { hashFile } from '../../utils/crypto';

function HashResultRow({ filename, size, hash }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [hash]);

  return (
    <div className="hash-result-row">
      <div className="hash-result-file">
        <FileText size={16} />
        <span className="hash-result-filename">{filename}</span>
        {size != null && <span className="hash-result-size">{formatFileSize(size)}</span>}
      </div>
      <div className="hash-result-hash-row">
        <code className="hash-result-hash">{hash}</code>
        <button className="hash-copy-btn" onClick={handleCopy} title="Copy hash">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function SHA256Hasher({ tool, navigateTo }) {
  const [mode, setMode] = useState('file');
  const [files, setFiles] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [compareHash, setCompareHash] = useState('');

  const handleFilesSelected = useCallback((selectedFiles) => {
    setError(null);
    setResults([]);
    setFiles(selectedFiles);
  }, []);

  const handleHashFiles = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const hashes = [];
      for (const file of files) {
        const hash = await hashFile(file, algorithm);
        hashes.push({ filename: file.name, size: file.size, hash });
      }
      setResults(hashes);
    } catch (e) {
      setError(e.message || 'Failed to compute hash. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [files, algorithm]);

  const handleHashText = useCallback(async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(textInput);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      setResults([{ filename: 'Text input', size: null, hash }]);
    } catch (e) {
      setError(e.message || 'Failed to compute hash.');
    } finally {
      setLoading(false);
    }
  }, [textInput, algorithm]);

  const handleStartOver = useCallback(() => {
    setFiles([]);
    setTextInput('');
    setResults([]);
    setError(null);
    setCompareHash('');
  }, []);

  const compareResult = compareHash.trim() && results.length === 1
    ? compareHash.trim().toLowerCase() === results[0].hash.toLowerCase()
    : null;

  return (
    <div>
      <InfoCard description="Generate SHA-256 file hashes for integrity verification. Standard practice for dataset integrity verification in Data Management Plans (DMPs). Share the hash alongside datasets when publishing or transferring. All processing happens in your browser." />

      {error && <ErrorCard title="Error" message={error} />}

      {/* Mode toggle */}
      <div className="split-tabs">
        <button
          className={`split-tab ${mode === 'file' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('file'); handleStartOver(); }}
        >
          <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          File Hash
        </button>
        <button
          className={`split-tab ${mode === 'text' ? 'split-tab--active' : ''}`}
          onClick={() => { setMode('text'); handleStartOver(); }}
        >
          <Type size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Text Hash
        </button>
      </div>

      {/* Algorithm selector */}
      <div className="hash-algorithm-selector">
        <label className="hash-algorithm-label">Algorithm:</label>
        <select
          className="hash-algorithm-select"
          value={algorithm}
          onChange={e => { setAlgorithm(e.target.value); setResults([]); }}
          aria-label="Hash algorithm"
        >
          <option value="SHA-256">SHA-256 (recommended)</option>
          <option value="SHA-1">SHA-1 (legacy)</option>
          <option value="SHA-384">SHA-384</option>
          <option value="SHA-512">SHA-512</option>
        </select>
        {algorithm !== 'SHA-256' && (
          <p className="hash-algorithm-warning">Use SHA-256 for DMPs and compliance. Other algorithms are included for legacy compatibility only.</p>
        )}
      </div>

      {/* File mode */}
      {mode === 'file' && results.length === 0 && (
        <>
          {files.length === 0 && (
            <DropZone
              validationConfig={ANY_FILE_VALIDATION}
              multiple
              onFilesSelected={handleFilesSelected}
              label="Drop file(s) here or click to browse"
              sublabel="Any file type accepted. Multiple files supported."
            />
          )}

          {files.length > 0 && (
            <div className="hash-file-list">
              {files.map((f, i) => (
                <div key={i} className="hash-file-item">
                  <FileText size={16} />
                  <span className="hash-file-name">{f.name}</span>
                  <span className="hash-file-size">{formatFileSize(f.size)}</span>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <ActionButton
              label={`Generate ${algorithm} Hash${files.length > 1 ? 'es' : ''}`}
              onClick={handleHashFiles}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Text mode */}
      {mode === 'text' && results.length === 0 && (
        <>
          <textarea
            className="text-tool-textarea"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Type or paste text to hash..."
            rows={8}
            spellCheck={false}
          />
          <ActionButton
            label={`Generate ${algorithm} Hash`}
            onClick={handleHashText}
            disabled={!textInput.trim()}
            loading={loading}
          />
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="hash-results">
          <h3 className="hash-results-title">{algorithm} Hash{results.length > 1 ? 'es' : ''}</h3>
          {results.map((r, i) => (
            <HashResultRow
              key={i}
              filename={r.filename}
              size={r.size}
              hash={r.hash}
            />
          ))}

          {/* Compare mode */}
          <div className="hash-compare-section">
            <label className="hash-compare-label">Verify against expected hash:</label>
            <input
              type="text"
              className="hash-compare-input"
              value={compareHash}
              onChange={e => setCompareHash(e.target.value)}
              placeholder="Paste expected hash here to compare..."
              spellCheck={false}
            />
            {compareResult !== null && (
              <div className={`hash-compare-result ${compareResult ? 'hash-compare-result--match' : 'hash-compare-result--mismatch'}`}>
                {compareResult ? (
                  <><Check size={16} /> Hashes match — file integrity verified.</>
                ) : (
                  <><span style={{ color: 'var(--accent-red)' }}>Hashes do not match.</span> The file may have been modified.</>
                )}
              </div>
            )}
          </div>

          <button className="result-panel-startover" onClick={handleStartOver} style={{ marginTop: 'var(--space-lg)' }}>
            <RotateCcw size={16} />
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
