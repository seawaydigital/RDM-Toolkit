export function buildOutputFilename(originalName, toolSlug, outputExtension) {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const safeName = baseName
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${safeName}-${toolSlug}.${outputExtension}`;
}
