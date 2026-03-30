import { Download, RotateCcw } from 'lucide-react';
import { formatFileSize } from '../../utils/fileValidation';

export default function ResultPanel({
  filename,
  originalSize,
  resultSize,
  downloadUrl,
  onStartOver,
  preview,
}) {
  const percentChange = originalSize && resultSize
    ? Math.round(((resultSize - originalSize) / originalSize) * 100)
    : null;

  function handleDownload() {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="result-panel">
      {preview && <div className="result-panel-preview">{preview}</div>}

      <div className="result-panel-info">
        <p className="result-panel-filename">{filename}</p>
        {originalSize != null && resultSize != null && (
          <p className="result-panel-sizes">
            {formatFileSize(originalSize)} {'\u2192'} {formatFileSize(resultSize)}
            {percentChange !== null && (
              <span className={`result-panel-change ${percentChange <= 0 ? 'result-panel-change--good' : 'result-panel-change--bad'}`}>
                {percentChange <= 0 ? '' : '+'}{percentChange}%
              </span>
            )}
          </p>
        )}
      </div>

      <div className="result-panel-actions">
        <button className="result-panel-download" onClick={handleDownload}>
          <Download size={18} />
          Download
        </button>
        <button className="result-panel-startover" onClick={onStartOver}>
          <RotateCcw size={16} />
          Start Over
        </button>
      </div>
    </div>
  );
}
