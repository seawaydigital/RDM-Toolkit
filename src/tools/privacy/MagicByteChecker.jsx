import { useState, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, RotateCcw, X } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ErrorCard from '../../components/ui/ErrorCard';
import { ANY_FILE_VALIDATION, formatFileSize } from '../../utils/fileValidation';

// Binary file signatures (magic bytes)
const FILE_SIGNATURES = [
  { name: 'PDF',           extensions: ['pdf'],            bytes: [0x25, 0x50, 0x44, 0x46] },               // %PDF
  { name: 'PNG',           extensions: ['png'],            bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { name: 'JPEG',          extensions: ['jpg', 'jpeg'],    bytes: [0xFF, 0xD8, 0xFF] },
  { name: 'GIF',           extensions: ['gif'],            bytes: [0x47, 0x49, 0x46, 0x38] },               // GIF8
  { name: 'WebP',          extensions: ['webp'],           bytes: [0x52, 0x49, 0x46, 0x46], offset4: [0x57, 0x45, 0x42, 0x50] },
  { name: 'TIFF (LE)',     extensions: ['tiff', 'tif'],    bytes: [0x49, 0x49, 0x2A, 0x00] },
  { name: 'TIFF (BE)',     extensions: ['tiff', 'tif'],    bytes: [0x4D, 0x4D, 0x00, 0x2A] },
  { name: 'BMP',           extensions: ['bmp'],            bytes: [0x42, 0x4D] },
  { name: 'PSD',           extensions: ['psd'],            bytes: [0x38, 0x42, 0x50, 0x53] },               // 8BPS
  { name: 'ZIP / DOCX / XLSX', extensions: ['zip', 'docx', 'xlsx', 'pptx', 'odt'], bytes: [0x50, 0x4B, 0x03, 0x04] },
  { name: 'ZIP (empty)',   extensions: ['zip'],            bytes: [0x50, 0x4B, 0x05, 0x06] },
  { name: 'GZIP',          extensions: ['gz', 'tgz'],      bytes: [0x1F, 0x8B] },
  { name: 'RAR',           extensions: ['rar'],            bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] },   // Rar!
  { name: '7-Zip',         extensions: ['7z'],             bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] },
  { name: 'BZip2',         extensions: ['bz2'],            bytes: [0x42, 0x5A, 0x68] },                     // BZh
  { name: 'Legacy Office (DOC/XLS/PPT)', extensions: ['doc', 'xls', 'ppt'], bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },
  { name: 'MP3 (ID3)',     extensions: ['mp3'],            bytes: [0x49, 0x44, 0x33] },                     // ID3
  { name: 'MP3 (sync)',    extensions: ['mp3'],            bytes: [0xFF, 0xFB] },
  { name: 'FLAC',          extensions: ['flac'],           bytes: [0x66, 0x4C, 0x61, 0x43] },               // fLaC
  { name: 'OGG',           extensions: ['ogg', 'oga', 'ogv'], bytes: [0x4F, 0x67, 0x67, 0x53] },            // OggS
  { name: 'MKV / WebM',    extensions: ['mkv', 'webm'],    bytes: [0x1A, 0x45, 0xDF, 0xA3] },
  { name: 'EXE / DLL',     extensions: ['exe', 'dll'],     bytes: [0x4D, 0x5A] },                           // MZ
  { name: 'ELF',           extensions: ['elf', 'so', 'o', ''], bytes: [0x7F, 0x45, 0x4C, 0x46] },          // .ELF
  { name: 'Java Class',    extensions: ['class'],          bytes: [0xCA, 0xFE, 0xBA, 0xBE] },
  { name: 'SQLite',        extensions: ['sqlite', 'db', 'sqlite3'], bytes: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65] }, // SQLite
  { name: 'WASM',          extensions: ['wasm'],           bytes: [0x00, 0x61, 0x73, 0x6D] },
];

// Text-based file types that have no magic bytes
const TEXT_BASED_TYPES = [
  'md', 'ipynb', 'csv', 'json', 'py', 'r', 'sql', 'txt', 'xml', 'html',
  'css', 'js', 'ts', 'yaml', 'yml', 'toml', 'sh', 'log', 'bib', 'ris', 'tex',
];

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function matchSignature(headerBytes) {
  for (const sig of FILE_SIGNATURES) {
    if (sig.bytes.length > headerBytes.length) continue;
    const match = sig.bytes.every((b, i) => headerBytes[i] === b);
    if (match) {
      // WebP has an extra check at offset 8
      if (sig.offset4) {
        if (headerBytes.length < 12) continue;
        const extraMatch = sig.offset4.every((b, i) => headerBytes[8 + i] === b);
        if (!extraMatch) continue;
      }
      return sig;
    }
  }
  return null;
}

function formatHexDump(bytes, count = 32) {
  const slice = bytes.slice(0, count);
  const hexParts = [];
  const asciiParts = [];
  for (let i = 0; i < slice.length; i++) {
    hexParts.push(slice[i].toString(16).toUpperCase().padStart(2, '0'));
    asciiParts.push(slice[i] >= 32 && slice[i] <= 126 ? String.fromCharCode(slice[i]) : '.');
  }
  // Group hex in pairs of 8
  const hexLines = [];
  const asciiLines = [];
  for (let i = 0; i < hexParts.length; i += 16) {
    hexLines.push(hexParts.slice(i, i + 16).join(' '));
    asciiLines.push(asciiParts.slice(i, i + 16).join(''));
  }
  return hexLines.map((h, i) => `${(i * 16).toString(16).toUpperCase().padStart(8, '0')}  ${h.padEnd(47)}  |${asciiLines[i]}|`).join('\n');
}

async function validateTextFile(file, ext) {
  try {
    const text = await file.slice(0, 4096).text();
    if (ext === 'json' || ext === 'ipynb') {
      // Try parsing as JSON
      const fullText = await file.text();
      const parsed = JSON.parse(fullText);
      if (ext === 'ipynb') {
        return parsed.nbformat !== undefined
          ? { valid: true, detail: 'Valid Jupyter Notebook (contains "nbformat" key).' }
          : { valid: false, detail: 'JSON file but missing "nbformat" key — may not be a valid Jupyter Notebook.' };
      }
      return { valid: true, detail: 'Valid JSON.' };
    }
    // Generic text check: see if content is mostly printable
    const printable = text.split('').filter(c => c.charCodeAt(0) >= 32 || c === '\n' || c === '\r' || c === '\t').length;
    return printable / text.length > 0.9
      ? { valid: true, detail: 'File content appears to be text.' }
      : { valid: false, detail: 'File content contains many non-printable characters.' };
  } catch (e) {
    if (ext === 'json' || ext === 'ipynb') {
      return { valid: false, detail: `Invalid JSON: ${e.message}` };
    }
    return { valid: false, detail: 'Could not read file as text.' };
  }
}

export default function MagicByteChecker({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setAnalysis(null);
    setFile(selectedFile);

    try {
      const ext = getExtension(selectedFile.name);
      const headerSlice = await selectedFile.slice(0, 32).arrayBuffer();
      const headerBytes = new Uint8Array(headerSlice);
      const hexDump = formatHexDump(headerBytes, 32);

      const sig = matchSignature(headerBytes);

      if (sig) {
        const extensionMatches = sig.extensions.includes(ext);
        setAnalysis({
          detectedType: sig.name,
          declaredExtension: ext || '(none)',
          match: extensionMatches,
          hexDump,
          isTextBased: false,
          textValidation: null,
        });
      } else if (TEXT_BASED_TYPES.includes(ext)) {
        // Text-based file
        const textResult = await validateTextFile(selectedFile, ext);
        setAnalysis({
          detectedType: `Text-based (${ext.toUpperCase()})`,
          declaredExtension: ext,
          match: textResult.valid,
          hexDump,
          isTextBased: true,
          textValidation: textResult.detail,
        });
      } else {
        setAnalysis({
          detectedType: 'Unknown',
          declaredExtension: ext || '(none)',
          match: false,
          hexDump,
          isTextBased: false,
          textValidation: null,
        });
      }
    } catch (e) {
      setError(e.message || 'Failed to analyse file.');
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setAnalysis(null);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    setFile(null);
    setAnalysis(null);
    setError(null);
  }, []);

  return (
    <div>
      <InfoCard description="Verify a file's true format by reading its binary signature (magic bytes). Use this to confirm a file is what it claims to be before ingesting into a research pipeline. All analysis happens locally in your browser." />

      {error && <ErrorCard title="Error" message={error} />}

      {!file && (
        <DropZone
          validationConfig={ANY_FILE_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop any file here to check its magic bytes"
          sublabel="Any file type accepted"
        />
      )}

      {file && analysis && (
        <div className="magic-byte-result">
          {/* Match status */}
          <div className={`magic-byte-status ${analysis.match ? 'magic-byte-status--match' : 'magic-byte-status--mismatch'}`}>
            {analysis.match ? (
              <ShieldCheck size={20} />
            ) : analysis.detectedType === 'Unknown' ? (
              <AlertTriangle size={20} />
            ) : (
              <ShieldAlert size={20} />
            )}
            <span className="magic-byte-status-text">
              {analysis.match
                ? 'File signature matches declared extension.'
                : analysis.detectedType === 'Unknown'
                  ? 'No known binary signature found.'
                  : 'File signature does not match declared extension.'}
            </span>
          </div>

          <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
            <X size={14} />
            Remove
          </button>

          {/* Details table */}
          <div className="magic-byte-details">
            <table className="metadata-table">
              <tbody>
                <tr>
                  <td className="metadata-table-key">File name</td>
                  <td className="metadata-table-value">{file.name}</td>
                </tr>
                <tr>
                  <td className="metadata-table-key">File size</td>
                  <td className="metadata-table-value">{formatFileSize(file.size)}</td>
                </tr>
                <tr>
                  <td className="metadata-table-key">Declared extension</td>
                  <td className="metadata-table-value">.{analysis.declaredExtension || '(none)'}</td>
                </tr>
                <tr>
                  <td className="metadata-table-key">Detected type</td>
                  <td className="metadata-table-value">{analysis.detectedType}</td>
                </tr>
                {analysis.isTextBased && analysis.textValidation && (
                  <tr>
                    <td className="metadata-table-key">Validation</td>
                    <td className="metadata-table-value">{analysis.textValidation}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {analysis.isTextBased && (
            <p className="magic-byte-note">
              Text-based files do not have magic bytes. Identification is based on the file extension and content validation.
            </p>
          )}

          {/* Hex dump */}
          <div className="magic-byte-hex-section">
            <h4 className="magic-byte-hex-title">First 32 bytes (hex dump)</h4>
            <pre className="magic-byte-hex-dump">{analysis.hexDump}</pre>
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
