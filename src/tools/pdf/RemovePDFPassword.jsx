import { useState, useCallback } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { PDF_VALIDATION, ANY_FILE_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const DESCRIPTION =
  'Removes password protection from a PDF. Supports both standard PDF encryption and .pdf.enc files created by the Password Protect tool. Your file and password are processed locally and never transmitted.';

async function decryptEncBundle(encBytes, password) {
  const enc = new TextEncoder();
  const magic = new TextDecoder().decode(encBytes.slice(0, 8));
  if (magic !== 'PDFCRYPT') throw new Error('Not a valid encrypted bundle');

  const salt = encBytes.slice(8, 24);
  const iv = encBytes.slice(24, 36);
  const ciphertext = encBytes.slice(36);

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Uint8Array(decrypted);
}

export default function RemovePDFPassword({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [notProtected, setNotProtected] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [fileType, setFileType] = useState(null); // 'pdf-encrypted' | 'enc-bundle' | null

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setNotProtected(false);
    setNeedsPassword(false);
    setPassword('');
    setFileType(null);

    try {
      const rawBytes = await selectedFile.arrayBuffer();
      const bytesCopy = new Uint8Array(rawBytes).slice();

      // Check if it's a .pdf.enc bundle
      const header = new TextDecoder().decode(bytesCopy.slice(0, 8));
      if (header === 'PDFCRYPT') {
        setFile(selectedFile);
        setFileBytes(bytesCopy);
        setFileType('enc-bundle');
        setNeedsPassword(true);
        return;
      }

      // Check if it's a valid PDF
      const pdfHeader = String.fromCharCode(...bytesCopy.slice(0, 5));
      if (pdfHeader !== '%PDF-') {
        setError('This file does not appear to be a valid PDF or .pdf.enc file.');
        return;
      }

      setFile(selectedFile);
      setFileBytes(bytesCopy);

      // Try loading without password
      try {
        await PDFDocument.load(bytesCopy.slice());
        setNotProtected(true);
        setFileType(null);
      } catch (e) {
        if (e.message && (e.message.includes('encrypted') || e.message.includes('password'))) {
          setFileType('pdf-encrypted');
          setNeedsPassword(true);
        } else {
          setError('This file could not be read. It may be corrupted.');
        }
      }
    } catch {
      setError('Failed to read the file. Please try again.');
    }
  }, []);

  const handleRemovePassword = useCallback(async () => {
    if (!fileBytes || !password) return;
    setLoading(true);
    setError(null);

    try {
      let pdfBytes;

      if (fileType === 'enc-bundle') {
        // Decrypt .pdf.enc bundle
        try {
          pdfBytes = await decryptEncBundle(fileBytes, password);
        } catch {
          setError('Incorrect password or corrupted file. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        // Standard PDF encryption via pdf-lib
        let pdfDoc;
        try {
          pdfDoc = await PDFDocument.load(fileBytes.slice(), { password });
        } catch (e) {
          if (e.message && (e.message.includes('encrypted') || e.message.includes('password') || e.message.includes('incorrect'))) {
            setError('Incorrect password. Please try again.');
            setLoading(false);
            return;
          }
          throw e;
        }
        pdfBytes = await pdfDoc.save();
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.enc$/, '');
      const filename = buildOutputFilename(baseName, 'unlocked', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: pdfBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while removing the password. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, password, file, fileType]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileBytes(null);
    setPassword('');
    setError(null);
    setNotProtected(false);
    setNeedsPassword(false);
    setFileType(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    handleRemoveFile();
    setResult(null);
  }, [result, handleRemoveFile]);

  if (result) {
    return (
      <div>
        <InfoCard description={DESCRIPTION} />
        <ResultPanel
          filename={result.filename}
          originalSize={result.originalSize}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div>
      <InfoCard description={DESCRIPTION} />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          accept=".pdf,.enc"
          validationConfig={ANY_FILE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a password-protected PDF or .pdf.enc file here"
          sublabel="Accepts .pdf and .pdf.enc files"
        />
      )}

      {file && (
        <div className="tool-file-preview">
          <span className="tool-file-name">{file.name}</span>
          {fileType === 'enc-bundle' && (
            <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255, 194, 14, 0.1)', color: 'var(--accent-cyan)', borderRadius: 10 }}>
              Encrypted Bundle
            </span>
          )}
          <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
            <X size={14} />
            Remove
          </button>
        </div>
      )}

      {notProtected && (
        <div className="info-card" style={{ borderLeftColor: 'var(--accent-green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--accent-green)', marginBottom: 'var(--space-sm)' }}>
            <CheckCircle size={18} />
            <strong>No password detected</strong>
          </div>
          <p className="info-card-description">
            This PDF is not password-protected. No action needed.
          </p>
        </div>
      )}

      {needsPassword && (
        <>
          <div className="tool-options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <label className="tool-option-label" htmlFor="pdf-password">
                {fileType === 'enc-bundle' ? 'Enter the decryption password' : 'Enter the PDF password'}
              </label>
              <input
                id="pdf-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) handleRemovePassword();
                }}
              />
            </div>
          </div>

          <ActionButton
            label={fileType === 'enc-bundle' ? 'Decrypt File' : 'Remove Password'}
            onClick={handleRemovePassword}
            disabled={!password}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
