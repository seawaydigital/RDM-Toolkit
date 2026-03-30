import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ErrorCard from '../../components/ui/ErrorCard';
import { ANY_FILE_VALIDATION, formatFileSize } from '../../utils/fileValidation';

const FILE_TYPE_CATEGORIES = {
  image:    { label: 'Image',    color: '#FFC20E' },
  document: { label: 'Document', color: '#8B5CF6' },
  archive:  { label: 'Archive',  color: '#F59E0B' },
  code:     { label: 'Code',     color: '#10B981' },
  data:     { label: 'Data',     color: '#EC4899' },
  media:    { label: 'Media',    color: '#EF4444' },
  other:    { label: 'Other',    color: '#64748B' },
};

function getFileCategory(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || mime.startsWith('audio/') || ['mp4', 'mp3', 'wav', 'avi', 'mkv', 'mov', 'flac', 'ogg', 'webm'].includes(ext)) {
    return 'media';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'tex'].includes(ext)) {
    return 'document';
  }
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'php', 'css', 'html', 'xml', 'sh', 'bat', 'ps1', 'yaml', 'yml', 'toml'].includes(ext)) {
    return 'code';
  }
  if (['csv', 'json', 'sql', 'db', 'sqlite', 'parquet', 'feather', 'arrow', 'tsv'].includes(ext)) {
    return 'data';
  }
  return 'other';
}

function formatDate(date) {
  if (!date) return '\u2014';
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '\u2014';
  }
}

export default function FileSizeAnalyser({ tool, navigateTo }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const handleFilesSelected = useCallback((selected) => {
    setError(null);
    setFiles((prev) => {
      const combined = [...prev, ...selected];
      // Sort by size descending
      return combined.sort((a, b) => b.size - a.size);
    });
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSize = files.length > 0 ? files[0].size : 1;

  const handleStartOver = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  return (
    <div>
      <InfoCard
        description="Reads file name, size, type, and last modified date from any file without opening or processing it. Nothing is uploaded — the browser reads metadata from your local file system."
      />

      {error && <ErrorCard title="Error" message={error} />}

      <DropZone
        accept="*"
        validationConfig={ANY_FILE_VALIDATION}
        multiple
        onFilesSelected={handleFilesSelected}
        label="Drop files here or click to browse"
        sublabel="Any file type accepted — add as many as you like"
      />

      {files.length > 0 && (
        <div className="analyser-container">
          <div className="analyser-summary">
            <span className="analyser-summary-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            <span className="analyser-summary-total">Total: {formatFileSize(totalSize)}</span>
          </div>

          <div className="analyser-legend">
            {Object.entries(FILE_TYPE_CATEGORIES).map(([key, cat]) => {
              const hasFiles = files.some((f) => getFileCategory(f) === key);
              if (!hasFiles) return null;
              return (
                <span key={key} className="analyser-legend-item">
                  <span className="analyser-legend-dot" style={{ background: cat.color }} />
                  {cat.label}
                </span>
              );
            })}
          </div>

          <div className="analyser-table">
            <div className="analyser-table-header">
              <span className="analyser-col-name">File Name</span>
              <span className="analyser-col-type">Type</span>
              <span className="analyser-col-size">Size</span>
              <span className="analyser-col-date">Last Modified</span>
            </div>
            {files.map((file, index) => {
              const category = getFileCategory(file);
              const catInfo = FILE_TYPE_CATEGORIES[category];
              const barWidth = maxSize > 0 ? (file.size / maxSize) * 100 : 0;

              return (
                <div key={`${file.name}-${index}`} className="analyser-row">
                  <div className="analyser-row-main">
                    <span className="analyser-col-name analyser-file-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="analyser-col-type">
                      <span className="analyser-type-badge" style={{ color: catInfo.color, background: `${catInfo.color}20` }}>
                        {catInfo.label}
                      </span>
                    </span>
                    <span className="analyser-col-size">{formatFileSize(file.size)}</span>
                    <span className="analyser-col-date">{formatDate(file.lastModified)}</span>
                  </div>
                  <div className="analyser-bar-track">
                    <div
                      className="analyser-bar-fill"
                      style={{ width: `${barWidth}%`, background: catInfo.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="analyser-actions">
            <button className="result-panel-startover" onClick={handleStartOver}>
              <RotateCcw size={16} />
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
