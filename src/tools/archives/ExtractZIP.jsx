import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Download, RotateCcw, FileArchive, X } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ErrorCard from '../../components/ui/ErrorCard';
import { ARCHIVE_VALIDATION, formatFileSize } from '../../utils/fileValidation';

export default function ExtractZIP({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [zipInstance, setZipInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState(null);
  const [totalUncompressed, setTotalUncompressed] = useState(0);
  const [encryptedFiles, setEncryptedFiles] = useState([]);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setEntries([]);
    setZipInstance(null);
    setEncryptedFiles([]);
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      setZipInstance(zip);
      setFile(selectedFile);

      const fileEntries = [];
      const encrypted = [];
      let totalSize = 0;

      // ZIP bomb guard — tally declared uncompressed sizes before decompressing anything
      const MAX_DECOMPRESSED_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
      let declaredTotal = 0;
      zip.forEach((_, zipEntry) => {
        if (!zipEntry.dir) declaredTotal += zipEntry._data?.uncompressedSize ?? 0;
      });
      if (declaredTotal > MAX_DECOMPRESSED_BYTES) {
        throw new Error(`ZIP_BOMB: declared decompressed size (${(declaredTotal / 1024 / 1024 / 1024).toFixed(1)} GB) exceeds the 5 GB safety limit.`);
      }

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;

        // JSZip marks encrypted entries — check if decompression is possible
        if (zipEntry._data && zipEntry._data.compressedSize === 0 && zipEntry._data.uncompressedSize > 0) {
          encrypted.push(relativePath);
        }

        const uncompressedSize = zipEntry._data?.uncompressedSize ?? 0;
        totalSize += uncompressedSize;

        fileEntries.push({
          path: relativePath,
          name: relativePath.split('/').pop() || relativePath,
          size: uncompressedSize,
          date: zipEntry.date,
        });
      });

      // Sort by path for a clean listing
      fileEntries.sort((a, b) => a.path.localeCompare(b.path));

      setEntries(fileEntries);
      setTotalUncompressed(totalSize);
      setEncryptedFiles(encrypted);
    } catch (e) {
      const msg = e?.message || '';
      if (msg.startsWith('ZIP_BOMB:')) {
        setError(`This archive was blocked for safety: its declared decompressed size exceeds 5 GB. If this is a legitimate large archive, please extract it with a desktop tool instead.`);
      } else if (msg.toLowerCase().includes('encrypted') || msg.toLowerCase().includes('password')) {
        setError('This ZIP archive is password-protected. JSZip cannot extract encrypted archives in the browser. Please use a desktop tool to decrypt it first.');
      } else {
        setError('Something went wrong while reading the ZIP file. Please make sure it is a valid ZIP archive.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerDownload = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadFile = useCallback(async (entry) => {
    if (!zipInstance) return;
    try {
      const data = await zipInstance.file(entry.path)?.async('blob');
      if (data) {
        triggerDownload(data, entry.name);
      }
    } catch {
      setError(`Failed to extract "${entry.name}". The file may be corrupted or encrypted.`);
    }
  }, [zipInstance, triggerDownload]);

  const handleDownloadAll = useCallback(async () => {
    if (!zipInstance || entries.length === 0) return;
    setDownloadingAll(true);
    setError(null);

    try {
      for (const entry of entries) {
        if (encryptedFiles.includes(entry.path)) continue;
        const data = await zipInstance.file(entry.path)?.async('blob');
        if (data) {
          triggerDownload(data, entry.name);
          // Small delay between downloads to avoid browser throttling
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } catch {
      setError('Something went wrong while extracting files. Some files may not have been downloaded.');
    } finally {
      setDownloadingAll(false);
    }
  }, [zipInstance, entries, encryptedFiles, triggerDownload]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setEntries([]);
    setZipInstance(null);
    setError(null);
    setEncryptedFiles([]);
    setTotalUncompressed(0);
  }, []);

  const handleStartOver = useCallback(() => {
    setFile(null);
    setEntries([]);
    setZipInstance(null);
    setError(null);
    setEncryptedFiles([]);
    setTotalUncompressed(0);
  }, []);

  const formatDate = (date) => {
    if (!date) return '\u2014';
    try {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '\u2014';
    }
  };

  return (
    <div>
      <InfoCard
        description="Opens a ZIP archive and lists its contents, letting you download files individually or all at once. Extraction runs entirely in your browser."
      />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".zip"
          validationConfig={ARCHIVE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a ZIP file here or click to browse"
          sublabel="Accepts .zip files"
        />
      )}

      {loading && (
        <div className="tool-loading">
          <div className="tool-loading-spinner" />
          <p>Reading archive contents...</p>
        </div>
      )}

      {file && entries.length > 0 && (
        <div className="extract-container">
          <div className="extract-summary">
            <FileArchive size={20} />
            <div className="extract-summary-text">
              <p className="extract-summary-filename">{file.name}</p>
              <p className="extract-summary-meta">
                {entries.length} file{entries.length !== 1 ? 's' : ''} &middot; {formatFileSize(file.size)} compressed &middot; {formatFileSize(totalUncompressed)} uncompressed
              </p>
            </div>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {encryptedFiles.length > 0 && (
            <div className="extract-encrypted-warning">
              {encryptedFiles.length} file{encryptedFiles.length !== 1 ? 's are' : ' is'} encrypted and cannot be extracted in the browser.
            </div>
          )}

          <div className="extract-file-table">
            <div className="extract-file-table-header">
              <span className="extract-col-name">Name</span>
              <span className="extract-col-size">Size</span>
              <span className="extract-col-date">Modified</span>
              <span className="extract-col-action"></span>
            </div>
            {entries.map((entry) => {
              const isEncrypted = encryptedFiles.includes(entry.path);
              return (
                <div key={entry.path} className={`extract-file-row ${isEncrypted ? 'extract-file-row--encrypted' : ''}`}>
                  <span className="extract-col-name extract-file-name" title={entry.path}>
                    {entry.path}
                  </span>
                  <span className="extract-col-size">{formatFileSize(entry.size)}</span>
                  <span className="extract-col-date">{formatDate(entry.date)}</span>
                  <span className="extract-col-action">
                    {isEncrypted ? (
                      <span className="extract-encrypted-badge">Encrypted</span>
                    ) : (
                      <button
                        className="extract-download-btn"
                        onClick={() => handleDownloadFile(entry)}
                        aria-label={`Download ${entry.name}`}
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="extract-actions">
            <ActionButton
              label={`Download All (${entries.length - encryptedFiles.length} file${(entries.length - encryptedFiles.length) !== 1 ? 's' : ''})`}
              onClick={handleDownloadAll}
              disabled={entries.length === 0 || entries.length === encryptedFiles.length}
              loading={downloadingAll}
            />
            <button className="result-panel-startover" onClick={handleStartOver}>
              <RotateCcw size={16} />
              Start Over
            </button>
          </div>
        </div>
      )}

      {file && entries.length === 0 && !loading && !error && (
        <div className="extract-empty">
          <p>This archive appears to be empty.</p>
          <button className="result-panel-startover" onClick={handleStartOver}>
            <RotateCcw size={16} />
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
