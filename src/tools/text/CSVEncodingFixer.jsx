import { useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ErrorCard from '../../components/ui/ErrorCard';
import { buildOutputFilename } from '../../utils/filename';
import { detectEncoding, decodeBytes, encodeUtf8 } from '../../utils/csvEncoding';

const outputExtension = name => {
  const ext = name.split('.').pop().toLowerCase();
  return ['csv', 'tsv', 'txt'].includes(ext) ? ext : 'csv';
};

export default function CSVEncodingFixer({ tool }) {
  const [file, setFile] = useState(null);
  const [rawBytes, setRawBytes] = useState(null);
  const [detectedEncoding, setDetectedEncoding] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fixedText, setFixedText] = useState(null);
  const [fixedPreview, setFixedPreview] = useState(null);
  const [error, setError] = useState(null);
  const [addBom, setAddBom] = useState(false);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setFixedText(null);
    setFixedPreview(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const encoding = detectEncoding(bytes);

      setFile(selectedFile);
      setRawBytes(bytes);
      setDetectedEncoding(encoding);

      // "Before" preview: for a file that needs fixing, show it the way
      // software expecting UTF-8 reads it, so the problem is visible.
      const rawText = encoding.needsFix
        ? new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\0/g, '')
        : decodeBytes(bytes, encoding);
      setPreview(rawText.split('\n').slice(0, 6));
    } catch {
      setError('Something went wrong while reading the file. Please try a different file.');
    }
  }, []);

  const handleFix = useCallback(() => {
    if (!rawBytes) return;
    setError(null);
    try {
      const text = decodeBytes(rawBytes, detectedEncoding);

      setFixedText(text);
      const lines = text.split('\n').slice(0, 6);
      setFixedPreview(lines);
    } catch {
      setError('Failed to re-encode the file. Please try a different file.');
    }
  }, [rawBytes, detectedEncoding]);

  const handleDownload = useCallback(() => {
    if (!fixedText || !file) return;
    const utf8Bytes = encodeUtf8(fixedText, { bom: addBom });
    const blob = new Blob([utf8Bytes], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildOutputFilename(file.name, 'utf8-fixed', outputExtension(file.name));
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fixedText, file, addBom]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setRawBytes(null);
    setDetectedEncoding(null);
    setPreview(null);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    setFile(null);
    setRawBytes(null);
    setDetectedEncoding(null);
    setPreview(null);
    setFixedText(null);
    setFixedPreview(null);
    setError(null);
    setAddBom(false);
  }, []);

  return (
    <div>
      <InfoCard description="Detect and fix character encoding issues in CSV files. Prevents silent data corruption when sharing datasets across institutions — a common source of research data integrity failures. All processing is local." />

      {error && <ErrorCard message={error} />}

      {!file && (
        <DropZone
          accept=".csv,.tsv,.txt"
          onFilesSelected={handleFileSelected}
          label="Drop a CSV or TSV file here or click to browse"
        />
      )}

      {file && detectedEncoding && (
        <div className="csv-encoding-panel">
          <div className="csv-encoding-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="csv-encoding-title">File: {file.name}</h3>
              <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                <X size={14} />
                Remove
              </button>
            </div>
            <div className="csv-encoding-detail">
              <span className="csv-encoding-label">Detected Encoding:</span>
              <span className={`csv-encoding-value ${detectedEncoding.needsFix ? 'csv-encoding-value--warning' : 'csv-encoding-value--ok'}`}>
                {detectedEncoding.encoding}
              </span>
            </div>
            {detectedEncoding.decoder.startsWith('utf-16') && (
              <p className="csv-encoding-explanation">
                This file is UTF-16, which is what Excel’s “Unicode Text” export produces. Most
                analysis software expects UTF-8 and shows a UTF-16 file as gibberish or with gaps
                between letters. Re-encoding converts it to UTF-8 without changing the text.
              </p>
            )}
            {detectedEncoding.decoder === 'windows-1252' && (
              <p className="csv-encoding-explanation">
                This file appears to use Windows-1252 encoding, which can cause garbled characters
                (such as accented letters, curly quotes, and special symbols) when opened in programs
                expecting UTF-8. Re-encoding to UTF-8 will fix these display issues.
              </p>
            )}
            {!detectedEncoding.needsFix && (
              <p className="csv-encoding-explanation">
                This file already appears to be encoded in UTF-8 or ASCII. No re-encoding should
                be necessary, but you can still process it to remove the BOM or normalize the encoding.
              </p>
            )}
          </div>

          {preview && (
            <div className="csv-encoding-preview" tabIndex={0} role="region" aria-label="Original preview">
              <h4 className="csv-encoding-preview-title">
                {detectedEncoding.needsFix ? 'How UTF-8 software reads it now (first rows)' : 'Preview (first rows)'}
              </h4>
              <div className="csv-encoding-preview-table">
                {preview.map((line, i) => (
                  <div key={i} className="csv-encoding-preview-row">
                    <span className="csv-encoding-preview-num">{i + 1}</span>
                    <span className="csv-encoding-preview-text">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!fixedText && (
            <button className="action-button" onClick={handleFix}>
              Re-encode as UTF-8
            </button>
          )}

          {fixedPreview && (
            <div className="csv-encoding-preview" style={{ borderLeftColor: 'var(--accent-green)' }} tabIndex={0} role="region" aria-label="Fixed preview">
              <h4 className="csv-encoding-preview-title" style={{ color: 'var(--accent-green)' }}>
                Fixed Preview (UTF-8)
              </h4>
              <div className="csv-encoding-preview-table">
                {fixedPreview.map((line, i) => (
                  <div key={i} className="csv-encoding-preview-row">
                    <span className="csv-encoding-preview-num">{i + 1}</span>
                    <span className="csv-encoding-preview-text">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fixedText && (
            <label className="csv-encoding-bom">
              <input type="checkbox" checked={addBom} onChange={e => setAddBom(e.target.checked)} />
              <span>
                Add a byte-order mark so Excel opens it correctly when double-clicked. Leave this
                off for R, Python and most other software.
              </span>
            </label>
          )}

          {fixedText && (
            <div className="result-panel-actions">
              <button className="result-panel-download" onClick={handleDownload}>
                <Download size={18} />
                Download UTF-8 File
              </button>
              <button className="result-panel-startover" onClick={handleStartOver}>
                Start Over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
