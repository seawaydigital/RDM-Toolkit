/**
 * Determine the best output MIME type for compression.
 * - JPEG stays JPEG
 * - WebP stays WebP
 * - PNG converts to WebP for actual lossy compression (PNG ignores quality param)
 * - Everything else becomes JPEG
 */
function getCompressOutputType(inputType) {
  if (inputType === 'image/jpeg') return 'image/jpeg';
  if (inputType === 'image/webp') return 'image/webp';
  if (inputType === 'image/png') return 'image/webp'; // PNG is lossless; convert to WebP for real compression
  return 'image/jpeg';
}

/**
 * Compress an image using Canvas API only — no external compression library.
 *
 * For PNG inputs the output is WebP so the quality parameter actually takes effect.
 * For JPEG and WebP the original format is preserved.
 * White background fill is only applied for JPEG output (no transparency support).
 */
export function compressImage(file, quality, maxWidthPx = null) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (maxWidthPx && width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const outputType = getCompressOutputType(file.type);

      // Fill white background only for JPEG (no transparency)
      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        blob => {
          canvas.remove();
          resolve(blob);
        },
        outputType,
        quality / 100
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image.'));
    };
    img.src = url;
  });
}

/**
 * Strip all image metadata by redrawing through Canvas.
 * Preserves the original format (JPEG stays JPEG, PNG stays PNG, WebP stays WebP).
 */
export function stripImageMetadata(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      // Preserve original format for strip (no compression conversion)
      let outputType = file.type;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(outputType)) {
        outputType = 'image/png';
      }

      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // High quality for strip — we want to preserve appearance, not compress
      const qualityArg = outputType === 'image/png' ? undefined : 0.95;
      canvas.toBlob(
        blob => {
          canvas.remove();
          resolve(blob);
        },
        outputType,
        qualityArg
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image.'));
    };
    img.src = url;
  });
}
