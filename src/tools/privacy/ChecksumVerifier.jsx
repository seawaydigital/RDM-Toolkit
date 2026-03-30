import { useState, useCallback } from 'react';
import { Copy, Check, FileText, Download, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import { ANY_FILE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { hashFile } from '../../utils/crypto';

const styles = {
  tabs: {
    display: 'flex',
    gap: 0,
    marginBottom: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border-primary)',
  },
  tab: {
    flex: 1,
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--bg-secondary)',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'background 0.15s, color 0.15s',
  },
  tabActive: {
    background: 'var(--accent-blue)',
    color: '#fff',
  },
  section: {
    marginBottom: 'var(--space-lg)',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-xs)',
    fontWeight: 500,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: 'var(--space-sm)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.82rem',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  resultsTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-md)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
    marginBottom: 'var(--space-md)',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--space-xs) var(--space-sm)',
    borderBottom: '2px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  td: {
    padding: 'var(--space-xs) var(--space-sm)',
    borderBottom: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
  hashCell: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    wordBreak: 'break-all',
    maxWidth: 220,
  },
  statusMatch: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--accent-green)',
    fontWeight: 600,
    fontSize: '0.82rem',
  },
  statusMismatch: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--accent-red)',
    fontWeight: 600,
    fontSize: '0.82rem',
  },
  summaryBar: {
    display: 'flex',
    gap: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-md)',
    fontSize: '0.85rem',
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
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 'var(--space-xs) var(--space-md)',
    background: 'var(--accent-green)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  startOver: {
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
    marginLeft: 'var(--space-sm)',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    padding: 'var(--space-sm)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-md)',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
  },
  fileSize: {
    color: 'var(--text-tertiary)',
    fontSize: '0.78rem',
    marginLeft: 'auto',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-md)',
  },
};

function parseManifest(text) {
  const lines = text.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const entries = [];
  for (const line of lines) {
    // Standard checksum format: hash  filename (two spaces) or hash *filename (binary)
    const match = line.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match) {
      entries.push({ hash: match[1].toLowerCase(), filename: match[2].trim() });
    }
  }
  return entries;
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
    <button style={styles.copyBtn} onClick={handleCopy} title="Copy hash">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ChecksumVerifier({ tool, navigateTo }) {
  const [mode, setMode] = useState('verify');
  const [manifestText, setManifestText] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyResults, setVerifyResults] = useState([]);
  const [generateResults, setGenerateResults] = useState([]);

  const handleReset = useCallback(() => {
    setManifestText('');
    setFiles([]);
    setError(null);
    setVerifyResults([]);
    setGenerateResults([]);
  }, []);

  const handleManifestFile = useCallback((selectedFiles) => {
    const file = selectedFiles[0];
    const reader = new FileReader();
    reader.onload = () => setManifestText(reader.result);
    reader.onerror = () => setError('Failed to read manifest file.');
    reader.readAsText(file);
  }, []);

  const handleFilesSelected = useCallback((selectedFiles) => {
    setError(null);
    setFiles(selectedFiles);
  }, []);

  const handleVerify = useCallback(async () => {
    const manifest = parseManifest(manifestText);
    if (manifest.length === 0) {
      setError('No valid checksum entries found in manifest. Expected format: sha256hash  filename');
      return;
    }
    if (files.length === 0) {
      setError('Please upload files to verify.');
      return;
    }
    setLoading(true);
    setError(null);
    setVerifyResults([]);
    try {
      const results = [];
      for (const file of files) {
        const computed = await hashFile(file, 'SHA-256');
        const entry = manifest.find(m => m.filename === file.name);
        results.push({
          filename: file.name,
          size: file.size,
          expected: entry ? entry.hash : null,
          computed,
          match: entry ? entry.hash === computed : null,
        });
      }
      // Also flag manifest entries that had no matching file
      for (const entry of manifest) {
        if (!files.find(f => f.name === entry.filename)) {
          results.push({
            filename: entry.filename,
            size: null,
            expected: entry.hash,
            computed: null,
            match: null,
          });
        }
      }
      setVerifyResults(results);
    } catch (e) {
      setError(e.message || 'Failed to compute hashes.');
    } finally {
      setLoading(false);
    }
  }, [manifestText, files]);

  const handleGenerate = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setGenerateResults([]);
    try {
      const results = [];
      for (const file of files) {
        const hash = await hashFile(file, 'SHA-256');
        results.push({ filename: file.name, size: file.size, hash });
      }
      setGenerateResults(results);
    } catch (e) {
      setError(e.message || 'Failed to compute hashes.');
    } finally {
      setLoading(false);
    }
  }, [files]);

  const handleDownloadManifest = useCallback(() => {
    const content = generateResults.map(r => `${r.hash}  ${r.filename}`).join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SHA256SUMS.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [generateResults]);

  const handleCopyAllHashes = useCallback(() => {
    const content = generateResults.map(r => `${r.hash}  ${r.filename}`).join('\n');
    navigator.clipboard.writeText(content);
  }, [generateResults]);

  const matchCount = verifyResults.filter(r => r.match === true).length;
  const mismatchCount = verifyResults.filter(r => r.match === false).length;
  const missingCount = verifyResults.filter(r => r.computed === null).length;
  const notInManifest = verifyResults.filter(r => r.expected === null).length;

  return (
    <div>
      <InfoCard description={tool.description || "Verify file integrity against SHA-256 checksum manifests, or generate manifests for your files. All processing happens in your browser."} />

      {error && <ErrorCard title="Error" message={error} />}

      {/* Mode tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(mode === 'verify' ? styles.tabActive : {}) }}
          onClick={() => { setMode('verify'); handleReset(); }}
        >
          <CheckCircle size={14} />
          Verify Files
        </button>
        <button
          style={{ ...styles.tab, ...(mode === 'generate' ? styles.tabActive : {}) }}
          onClick={() => { setMode('generate'); handleReset(); }}
        >
          <FileText size={14} />
          Generate Manifest
        </button>
      </div>

      {/* ===== VERIFY MODE ===== */}
      {mode === 'verify' && verifyResults.length === 0 && (
        <>
          <div style={styles.section}>
            <label style={styles.label}>1. Paste manifest or upload a checksum file</label>
            <textarea
              style={styles.textarea}
              value={manifestText}
              onChange={e => setManifestText(e.target.value)}
              placeholder={"e.g.\ne3b0c44298fc1c149afbf4c8996fb924...  data.csv\na7ffc6f8bf1ed76651c14756a061d662...  report.pdf"}
              spellCheck={false}
            />
            <div style={{ marginTop: 'var(--space-xs)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Or upload a manifest file:
            </div>
            <div style={{ marginTop: 'var(--space-xs)' }}>
              <DropZone
                accept="*"
                onFilesSelected={handleManifestFile}
                label="Drop manifest file here"
                sublabel="Text file with SHA-256 checksums"
              />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>2. Upload files to verify</label>
            {files.length === 0 ? (
              <DropZone
                validationConfig={ANY_FILE_VALIDATION}
                multiple
                onFilesSelected={handleFilesSelected}
                label="Drop file(s) to verify"
                sublabel="Multiple files supported"
              />
            ) : (
              <div style={styles.fileList}>
                {files.map((f, i) => (
                  <div key={i} style={styles.fileItem}>
                    <FileText size={14} />
                    <span>{f.name}</span>
                    <span style={styles.fileSize}>{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ActionButton
            label="Verify Checksums"
            onClick={handleVerify}
            disabled={!manifestText.trim() || files.length === 0}
            loading={loading}
          />
        </>
      )}

      {/* Verify results */}
      {mode === 'verify' && verifyResults.length > 0 && (
        <div>
          <h3 style={styles.resultsTitle}>Verification Results</h3>

          <div style={styles.summaryBar}>
            {matchCount > 0 && <span style={{ color: 'var(--accent-green)' }}>{matchCount} matched</span>}
            {mismatchCount > 0 && <span style={{ color: 'var(--accent-red)' }}>{mismatchCount} mismatched</span>}
            {missingCount > 0 && <span style={{ color: 'var(--accent-amber)' }}>{missingCount} missing file(s)</span>}
            {notInManifest > 0 && <span style={{ color: 'var(--text-tertiary)' }}>{notInManifest} not in manifest</span>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>File</th>
                  <th style={styles.th}>Expected</th>
                  <th style={styles.th}>Computed</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {verifyResults.map((r, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{r.filename}</td>
                    <td style={{ ...styles.td, ...styles.hashCell }}>
                      {r.expected ? `${r.expected.slice(0, 16)}...` : <span style={{ color: 'var(--text-tertiary)' }}>N/A</span>}
                    </td>
                    <td style={{ ...styles.td, ...styles.hashCell }}>
                      {r.computed ? `${r.computed.slice(0, 16)}...` : <span style={{ color: 'var(--text-tertiary)' }}>Not uploaded</span>}
                    </td>
                    <td style={styles.td}>
                      {r.match === true && (
                        <span style={styles.statusMatch}><CheckCircle size={14} /> Match</span>
                      )}
                      {r.match === false && (
                        <span style={styles.statusMismatch}><XCircle size={14} /> Mismatch</span>
                      )}
                      {r.match === null && r.computed === null && (
                        <span style={{ color: 'var(--accent-amber)', fontSize: '0.82rem' }}>Missing</span>
                      )}
                      {r.match === null && r.expected === null && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Not in manifest</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.actions}>
            <button style={styles.startOver} onClick={handleReset}>
              <RotateCcw size={14} /> Start Over
            </button>
          </div>
        </div>
      )}

      {/* ===== GENERATE MODE ===== */}
      {mode === 'generate' && generateResults.length === 0 && (
        <>
          <div style={styles.section}>
            <label style={styles.label}>Upload files to generate checksums</label>
            {files.length === 0 ? (
              <DropZone
                validationConfig={ANY_FILE_VALIDATION}
                multiple
                onFilesSelected={handleFilesSelected}
                label="Drop file(s) here or click to browse"
                sublabel="Multiple files supported. SHA-256 hashes will be computed for each."
              />
            ) : (
              <div style={styles.fileList}>
                {files.map((f, i) => (
                  <div key={i} style={styles.fileItem}>
                    <FileText size={14} />
                    <span>{f.name}</span>
                    <span style={styles.fileSize}>{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {files.length > 0 && (
            <ActionButton
              label={`Generate SHA-256 Checksum${files.length > 1 ? 's' : ''}`}
              onClick={handleGenerate}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Generate results */}
      {mode === 'generate' && generateResults.length > 0 && (
        <div>
          <h3 style={styles.resultsTitle}>SHA-256 Checksums</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>File</th>
                  <th style={styles.th}>Size</th>
                  <th style={styles.th}>SHA-256 Hash</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {generateResults.map((r, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{r.filename}</td>
                    <td style={styles.td}>{formatFileSize(r.size)}</td>
                    <td style={{ ...styles.td, ...styles.hashCell }}>{r.hash}</td>
                    <td style={styles.td}>
                      <CopyButton text={r.hash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.actions}>
            <button style={styles.downloadBtn} onClick={handleDownloadManifest}>
              <Download size={14} /> Download Manifest
            </button>
            <button style={styles.copyBtn} onClick={handleCopyAllHashes}>
              <Copy size={12} /> Copy All
            </button>
            <button style={styles.startOver} onClick={handleReset}>
              <RotateCcw size={14} /> Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
