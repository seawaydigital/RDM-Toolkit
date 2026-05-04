import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { validateFile } from '../../utils/fileValidation';
import { getDroppedFiles } from '../../utils/droppedFile';

/**
 * Format the accept string into a human-readable label.
 * e.g. ".pdf" -> "PDF"  |  ".pdf,.png" -> "PDF, PNG"
 */
function formatAcceptLabel(accept) {
  if (!accept) return null;
  return accept
    .split(',')
    .map(s => s.trim().replace(/^\./, '').toUpperCase())
    .join(', ');
}

export default function DropZone({
  accept,
  validationConfig,
  multiple = false,
  onFilesSelected,
  label,
  sublabel,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const inputRef = useRef(null);

  const processFiles = useCallback((fileList) => {
    setError(null);
    setWarning(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (validationConfig) {
      const errors = [];
      const warnings = [];
      const valid = [];
      for (const file of files) {
        const result = validateFile(file, validationConfig);
        if (!result.valid) {
          errors.push(result.error);
        } else {
          if (result.warning) warnings.push(result.warning);
          valid.push(file);
        }
      }
      if (errors.length > 0) {
        setError(errors[0]);
        return;
      }
      if (warnings.length > 0) {
        setWarning(warnings[0]);
      }
      if (valid.length > 0) {
        onFilesSelected(multiple ? valid : [valid[0]]);
      }
    } else {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  }, [validationConfig, multiple, onFilesSelected]);

  // Pick up any file that was globally dropped onto the app
  useEffect(() => {
    const dropped = getDroppedFiles();
    if (dropped && dropped.length > 0) {
      processFiles(dropped);
    }
  }, [processFiles]);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function handleInputChange(e) {
    processFiles(e.target.files);
    e.target.value = '';
  }

  const formattedTypes = formatAcceptLabel(accept);

  // Derive max size in MB from validationConfig if available
  const maxSizeMB = (() => {
    if (!validationConfig) return null;
    if (validationConfig.maxSizeMB != null) return validationConfig.maxSizeMB;
    if (validationConfig.maxSize != null) return Math.round(validationConfig.maxSize / (1024 * 1024));
    return null;
  })();

  const ariaLabel = label ?? (formattedTypes
    ? `Drop a ${formattedTypes} file here or click to browse`
    : 'Drop a file here or click to browse');

  return (
    <div className="dropzone-wrapper">
      <div
        className={`dropzone ${isDragOver ? 'dropzone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
      >
        <Upload size={36} className="dropzone-icon" aria-hidden="true" />

        <p className="dropzone-label dropzone-label--desktop">Drop your file here</p>
        <p className="dropzone-label dropzone-label--mobile">Tap to choose a file</p>

        {formattedTypes && (
          <p className="dropzone-sublabel">Supports {formattedTypes} files</p>
        )}

        {sublabel && <p className="dropzone-sublabel">{sublabel}</p>}

        {maxSizeMB != null && (
          <p className="dropzone-sublabel">Max size: {maxSizeMB} MB</p>
        )}

        <p className="dropzone-browse-link">or click to browse</p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="dropzone-input"
          tabIndex={-1}
        />
      </div>
      {error && <p className="dropzone-error" role="alert">{error}</p>}
      {warning && <p className="dropzone-warning" role="status">{warning}</p>}
    </div>
  );
}
