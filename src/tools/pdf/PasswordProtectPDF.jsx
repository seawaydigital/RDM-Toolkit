import { useState, useCallback, useMemo } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Applies password protection to a PDF so it requires a password to open. Encryption is applied using PDF-standard security, and the output remains a normal .pdf file that any PDF reader can prompt for a password.';

function getPasswordStrength(pw) {
  if (!pw) return { label: 'Too Short', level: 0 };
  if (pw.length < 6) return { label: 'Too Short', level: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', level: 1 };
  if (score <= 2) return { label: 'Moderate', level: 2 };
  if (score <= 3) return { label: 'Strong', level: 3 };
  return { label: 'Very Strong', level: 4 };
}

const STRENGTH_COLOURS = ['var(--accent-red)', 'var(--accent-red)', 'var(--accent-amber)', 'var(--accent-green)', 'var(--accent-green)'];

export default function PasswordProtectPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* Permission checkboxes */
  const [printingAllowed, setPrintingAllowed] = useState(true);
  const [copyingAllowed, setCopyingAllowed] = useState(false);
  const [editingAllowed, setEditingAllowed] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [thumbSize, setThumbSize] = useState(160);

  const strength = useMemo(() => getPasswordStrength(userPassword), [userPassword]);
  const passwordsMatch = userPassword === confirmPassword;
  const passwordValid = userPassword.length >= 6 && passwordsMatch;

  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setResult(null);
    try {
      const valid = await validatePDFHeader(f);
      if (!valid) {
        setError('The selected file does not appear to be a valid PDF.');
        return;
      }
      const bytes = await f.arrayBuffer();
      const uint8 = new Uint8Array(bytes).slice();

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(uint8.slice(), { ignoreEncryption: false });
      } catch (err) {
        if (err?.message?.toLowerCase().includes('encrypted') || err?.message?.toLowerCase().includes('password')) {
          setEncryptedError(true);
          return;
        }
        throw err;
      }

      setFile(f);
      setFileBytes(uint8);
      setPageCount(pdfDoc.getPageCount());

      const pdfJsDoc = await loadPdfDocument(uint8.slice());
      const thumb = await renderPageThumbnail(pdfJsDoc, 1);
      setThumbnail(thumb);
      pdfJsDoc.destroy();
    } catch {
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      // Load the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(fileBytes.slice());

      // Use the owner password if provided, otherwise default to the user password
      const effectiveOwnerPassword = ownerPassword.trim() || userPassword;

      // Save with encryption options applied via pdf-lib
      const encryptedBytes = await pdfDoc.save({
        useObjectStreams: false,
        userPassword: userPassword,
        ownerPassword: effectiveOwnerPassword,
        permissions: {
          printing: printingAllowed ? 'highResolution' : undefined,
          copying: copyingAllowed,
          modifying: editingAllowed,
        },
      });

      // Verify the output is non-empty and starts with %PDF
      if (!encryptedBytes || encryptedBytes.byteLength < 100) {
        throw new Error('Encrypted output appears empty or too small.');
      }

      const header = new TextDecoder().decode(encryptedBytes.slice(0, 5));
      if (header !== '%PDF-') {
        throw new Error('Output does not appear to be a valid PDF.');
      }

      const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({
        filename: buildOutputFilename(file.name, 'protected', 'pdf'),
        originalSize: file.size,
        resultSize: encryptedBytes.byteLength,
        downloadUrl: url,
      });
    } catch (err) {
      console.error('PDF encryption failed:', err);
      setError('Something went wrong while encrypting the PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setThumbnail(null);
    setPageCount(0);
    setError(null);
    setEncryptedError(false);
    setUserPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    handleRemoveFile();
    setResult(null);
  }

  if (result) {
    return (
      <div>
        <InfoCard description={DESCRIPTION} />
        <div className="info-card" style={{ borderLeftColor: 'var(--accent-green)', marginBottom: 'var(--space-lg)' }}>
          <p className="info-card-description" style={{ color: 'var(--accent-green)' }}>
            Password protection applied successfully. The PDF now requires the password you set to open.
          </p>
        </div>
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

      {encryptedError && <EncryptedPDFError onNavigate={navigateTo} />}
      {error && <ErrorCard title="Error" message={error} />}

      {!file && !encryptedError && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFilesSelected}
          label="Drop a PDF here or click to browse"
          sublabel="Single PDF file"
        />
      )}

      {file && (
        <>
          {thumbnail && (
            <div className="tool-file-preview">
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(80, s - 40))} disabled={thumbSize <= 80} aria-label="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-label">{thumbSize}px</span>
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>
              <img src={thumbnail} alt="First page preview" style={{ maxHeight: thumbSize * 2, borderRadius: 'var(--radius-sm)' }} />
              <div>
                <p className="tool-file-name">{file.name}</p>
                <p className="tool-file-size">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
              </div>
              <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                <X size={14} />
                Remove
              </button>
            </div>
          )}

          <div className="tool-options">
            {/* User Password */}
            <div className="tool-option-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label className="tool-option-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  placeholder="Enter a password (min 6 characters)"
                  style={{ width: '100%', paddingRight: '70px' }}
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Strength bar */}
            {userPassword.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', gap: 2, flex: 1, maxWidth: 200 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i < strength.level ? STRENGTH_COLOURS[strength.level] : 'var(--bg-tertiary)'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: STRENGTH_COLOURS[strength.level] }}>{strength.label}</span>
              </div>
            )}

            {/* Confirm Password */}
            <div className="tool-option-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label className="tool-option-label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the password"
                style={{ width: '100%' }}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 4 }}>Passwords do not match.</p>
              )}
            </div>

            {/* Owner Password (optional) */}
            <div className="tool-option-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label className="tool-option-label">Owner Password <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional, defaults to user password)</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={ownerPassword}
                onChange={e => setOwnerPassword(e.target.value)}
                placeholder="Separate owner password (optional)"
                style={{ width: '100%' }}
                autoComplete="new-password"
              />
            </div>

            {/* Permissions */}
            <div className="tool-option-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-sm)' }}>
              <label className="tool-option-label">Permissions</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={printingAllowed}
                  onChange={e => setPrintingAllowed(e.target.checked)}
                />
                Allow printing
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={copyingAllowed}
                  onChange={e => setCopyingAllowed(e.target.checked)}
                />
                Allow copying text and images
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editingAllowed}
                  onChange={e => setEditingAllowed(e.target.checked)}
                />
                Allow editing and annotations
              </label>
            </div>
          </div>

          <ActionButton
            label="Encrypt PDF"
            onClick={handleProcess}
            disabled={!passwordValid || processing}
            loading={processing}
          />
        </>
      )}
    </div>
  );
}
