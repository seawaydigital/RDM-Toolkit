// Size thresholds in bytes
const MB = 1024 * 1024;

export const PDF_VALIDATION = {
  allowedMimes: ['application/pdf'],
  allowedExtensions: ['pdf'],
  warnSize: 50 * MB,
  blockSize: 200 * MB,
  label: 'PDF',
};

export const IMAGE_VALIDATION = {
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif', 'image/tiff', 'image/x-icon'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff', 'tif', 'ico'],
  warnSize: 20 * MB,
  blockSize: 100 * MB,
  label: 'image',
};

export const ARCHIVE_VALIDATION = {
  allowedMimes: ['application/zip', 'application/x-zip-compressed'],
  allowedExtensions: ['zip'],
  warnSize: 100 * MB,
  blockSize: 500 * MB,
  label: 'archive',
};

export const ANY_FILE_VALIDATION = {
  allowedMimes: null,
  allowedExtensions: null,
  warnSize: 100 * MB,
  blockSize: 500 * MB,
  label: 'file',
};

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Validate a file against a config.
 * Returns { valid: boolean, warning: string|null, error: string|null }
 */
export function validateFile(file, config) {
  const ext = getExtension(file.name);

  // Check MIME type
  if (config.allowedMimes && !config.allowedMimes.includes(file.type)) {
    // Also check extension as fallback — some browsers report empty MIME
    if (config.allowedExtensions && !config.allowedExtensions.includes(ext)) {
      const types = config.allowedExtensions.map(e => `.${e}`).join(', ');
      return {
        valid: false,
        warning: null,
        error: `This tool accepts ${types} files. Please upload a compatible file.`,
      };
    }
  }

  // Check extension
  if (config.allowedExtensions && !config.allowedExtensions.includes(ext)) {
    const types = config.allowedExtensions.map(e => `.${e}`).join(', ');
    return {
      valid: false,
      warning: null,
      error: `This tool accepts ${types} files. Please upload a compatible file.`,
    };
  }

  // Check block size
  if (config.blockSize && file.size > config.blockSize) {
    const limitMB = Math.round(config.blockSize / MB);
    return {
      valid: false,
      warning: null,
      error: `This file exceeds the ${limitMB}MB limit for this tool.`,
    };
  }

  // Check warn size
  if (config.warnSize && file.size > config.warnSize) {
    const limitMB = Math.round(config.warnSize / MB);
    return {
      valid: true,
      warning: `This file is over ${limitMB}MB. Processing may take longer than usual.`,
      error: null,
    };
  }

  return { valid: true, warning: null, error: null };
}

/**
 * Validate PDF header by reading first 5 bytes.
 * Returns a promise that resolves to true if valid PDF.
 */
export function validatePDFHeader(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result);
      const header = String.fromCharCode(...arr.slice(0, 5));
      resolve(header === '%PDF-');
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 5));
  });
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}
