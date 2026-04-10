export const CATEGORIES = [
  {
    id: 'pdf',
    label: 'PDF Tools',
    emoji: '\u{1F4C4}',
    primary: true,
    description: 'Merge, split, compress, rotate, sign, and encrypt PDF documents.',
    tools: [
      { id: 'merge-pdfs', name: 'Merge PDFs', slug: 'merged', description: 'Combine multiple PDF files into a single document in the order you choose.', tags: ['pdf', 'documentation'], related: ['split-pdf', 'compress-pdf', 'add-page-numbers'] },
      { id: 'split-pdf', name: 'Split PDF', slug: 'split', description: 'Extract specific pages or page ranges from a PDF into separate files.', tags: ['pdf', 'documentation'], related: ['merge-pdfs', 'pdf-page-delete', 'reorder-pages'] },
      { id: 'compress-pdf', name: 'Compress PDF', slug: 'compressed', description: 'Reduce PDF file size by optimising embedded content.', tags: ['pdf', 'compression'], related: ['merge-pdfs', 'compress-image', 'pdf-to-images'] },
      { id: 'rotate-pages', name: 'Rotate PDF Pages', slug: 'rotated', description: 'Rotate individual pages or all pages at once to fix orientation.', tags: ['pdf'], related: ['reorder-pages', 'pdf-page-delete'] },
      { id: 'reorder-pages', name: 'Reorder PDF Pages', slug: 'reordered', description: 'Rearrange the pages of a PDF into any order you choose.', tags: ['pdf'], related: ['rotate-pages', 'split-pdf', 'pdf-page-delete'] },
      { id: 'add-page-numbers', name: 'Add Page Numbers', slug: 'numbered', description: 'Embed page numbers directly into a PDF at a position and style you choose.', tags: ['pdf', 'documentation'], related: ['merge-pdfs', 'pdf-watermark', 'sign-pdf'] },
      { id: 'sign-pdf', name: 'Sign PDF', slug: 'signed', description: 'Draw or type a signature and place it anywhere on a PDF page.', tags: ['pdf', 'documentation'], related: ['password-protect-pdf', 'pdf-watermark', 'add-page-numbers'] },
      { id: 'password-protect-pdf', name: 'Password Protect PDF', slug: 'protected', description: 'Apply AES-256 encryption to a PDF so it requires a password to open.', tags: ['pdf', 'security', 'privacy'], related: ['remove-pdf-password', 'sign-pdf', 'encrypt-decrypt-text'] },
      { id: 'remove-pdf-password', name: 'Remove PDF Password', slug: 'unlocked', description: 'Remove the open password from a password-protected PDF.', tags: ['pdf', 'security'], related: ['password-protect-pdf', 'sign-pdf'] },
      { id: 'extract-images-from-pdf', name: 'Extract Images from PDF', slug: 'images-extracted', description: 'Pull all embedded images out of a PDF and package them as a ZIP.', tags: ['pdf', 'image'], related: ['pdf-to-images', 'compress-image', 'strip-image-metadata'] },
      { id: 'pdf-watermark', name: 'PDF Watermark', slug: 'watermarked', description: 'Add text watermarks like DRAFT or CONFIDENTIAL to every page of a PDF.', tags: ['pdf', 'documentation'], related: ['pdf-redaction', 'sign-pdf', 'add-page-numbers'] },
      { id: 'pdf-redaction', name: 'PDF Redaction', slug: 'redacted', description: 'Black out sensitive text or areas in a PDF before sharing.', tags: ['pdf', 'privacy', 'security'], related: ['pdf-watermark', 'strip-file-metadata', 'data-anonymizer'] },
      { id: 'pdf-page-delete', name: 'Delete PDF Pages', slug: 'pages-deleted', description: 'Remove specific pages from a PDF document.', tags: ['pdf'], related: ['split-pdf', 'reorder-pages', 'rotate-pages'] },
      { id: 'pdf-to-images', name: 'PDF to Images', slug: 'as-images', description: 'Export each page of a PDF as a high-quality PNG or JPG image.', tags: ['pdf', 'image', 'conversion'], related: ['extract-images-from-pdf', 'compress-image', 'image-to-pdf'] },
      { id: 'add-cover-page', name: 'Add Cover Page', slug: 'with-cover', description: 'Prepend a custom-designed cover page to any PDF — set a title, author, department, date, and colour scheme. Runs entirely in your browser.', tags: ['pdf', 'cover', 'documentation', 'report'], related: ['merge-pdfs', 'add-page-numbers', 'pdf-watermark'] },
      { id: 'pdf-page-inspector', name: 'PDF Page Inspector', slug: 'resized', description: 'Inspect exact page dimensions and resize pages to Letter, A4, Legal, and other standard formats.', tags: ['pdf', 'resize', 'page size', 'format'], related: ['rotate-pages', 'reorder-pages', 'compress-pdf'] },
    ],
  },
  {
    id: 'images',
    label: 'Image Tools',
    emoji: '\u{1F5BC}\uFE0F',
    primary: true,
    description: 'Compress, convert, resize, crop, and strip metadata from images.',
    tools: [
      { id: 'compress-image', name: 'Compress Image', slug: 'compressed', description: 'Reduce image file size by adjusting quality and optionally scaling dimensions.', tags: ['image', 'compression'], related: ['resize-image', 'convert-image-format', 'compress-pdf'] },
      { id: 'convert-image-format', name: 'Convert Image Format', slug: 'converted', description: 'Convert images between formats using the browser\'s Canvas API.', tags: ['image', 'conversion', 'file-format'], related: ['compress-image', 'resize-image', 'image-to-pdf'] },
      { id: 'resize-image', name: 'Resize Image', slug: 'resized', description: 'Change image dimensions by pixel or percentage scale.', tags: ['image'], related: ['compress-image', 'image-cropper', 'convert-image-format'] },
      { id: 'image-cropper', name: 'Image Cropper', slug: 'cropped', description: 'Crop images to a custom selection area before downloading.', tags: ['image'], related: ['resize-image', 'strip-image-metadata', 'compress-image'] },
      { id: 'strip-image-metadata', name: 'Strip Image Metadata', slug: 'metadata-stripped', description: 'Read and display all hidden EXIF metadata, then remove it permanently.', tags: ['image', 'privacy', 'metadata'], related: ['strip-file-metadata', 'data-anonymizer', 'image-cropper'] },
      { id: 'image-to-pdf', name: 'Image to PDF', slug: 'as-pdf', description: 'Embed one or more images into a PDF document, one image per page.', tags: ['image', 'pdf', 'conversion'], related: ['merge-pdfs', 'pdf-to-images', 'compress-image'] },
    ],
  },
  {
    id: 'text',
    label: 'Text & Data Tools',
    emoji: '\u{1F4DD}',
    primary: true,
    description: 'Count words, find and replace, diff text, format JSON and CSV.',
    tools: [
      { id: 'word-counter', name: 'Word & Character Counter', slug: null, description: 'Live word, character, sentence, and paragraph counts.', tags: ['text', 'analysis'], related: ['text-diff', 'find-replace'] },
      { id: 'find-replace', name: 'Find & Replace', slug: null, description: 'Find and replace text with regex support.', tags: ['text'], related: ['word-counter', 'text-diff', 'whitespace-cleaner'] },
      { id: 'text-diff', name: 'Text Diff Checker', slug: null, description: 'Line-by-line comparison of two texts.', tags: ['text', 'data-integrity'], related: ['csv-diff', 'find-replace', 'word-counter'] },
      { id: 'json-formatter', name: 'JSON Formatter & Validator', slug: null, description: 'Format, minify, and validate JSON.', tags: ['text', 'data-integrity', 'file-format'], related: ['xml-yaml-formatter', 'csv-json-converter'] },
      { id: 'csv-json-converter', name: 'CSV \u2194 JSON Converter', slug: 'converted', description: 'Convert between CSV and JSON formats.', tags: ['text', 'conversion', 'file-format'], related: ['json-formatter', 'csv-diff', 'csv-encoding-fixer'] },
      { id: 'data-anonymizer', name: 'Data Anonymizer', slug: 'anonymized', description: 'Find and replace names, emails, and IDs in CSV or text with pseudonyms.', tags: ['privacy', 'research', 'text'], related: ['pdf-redaction', 'strip-file-metadata', 'strip-image-metadata'] },
      { id: 'bibtex-formatter', name: 'BibTeX Formatter', slug: null, description: 'Clean up, validate, and format BibTeX citation entries.', tags: ['text', 'documentation', 'research'], related: ['markdown-preview', 'word-counter'] },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    emoji: '\u{1F512}',
    primary: true,
    description: 'Strip metadata, hash files, encrypt text, generate passwords.',
    tools: [
      { id: 'strip-file-metadata', name: 'Strip File Metadata', slug: 'metadata-stripped', description: 'Remove hidden metadata from PDF and image files.', tags: ['privacy', 'metadata'], related: ['strip-image-metadata', 'data-anonymizer', 'pdf-redaction'] },
      { id: 'sha256-hasher', name: 'SHA-256 Hash Generator', slug: null, description: 'Generate SHA-256 file hashes for integrity verification.', tags: ['data-integrity', 'security'], related: ['checksum-verifier', 'magic-byte-checker'] },
      { id: 'encrypt-decrypt-text', name: 'Encrypt / Decrypt Text', slug: null, description: 'Encrypt text using AES-256-GCM with PBKDF2 key derivation.', tags: ['security', 'privacy'], related: ['password-generator', 'password-protect-pdf', 'base64-tool'] },
      { id: 'password-generator', name: 'Strong Password Generator', slug: null, description: 'Generate cryptographically secure passwords.', tags: ['security', 'privacy'], related: ['encrypt-decrypt-text', 'password-protect-pdf'] },
      { id: 'qr-code-generator', name: 'QR Code Generator', slug: null, description: 'Generate QR codes locally. Zero network request.', tags: ['research'], related: ['password-generator'] },
    ],
  },
  // ── More Tools (collapsed by default) ──
  {
    id: 'archives',
    label: 'File & Archive Tools',
    emoji: '\u{1F4E6}',
    primary: false,
    description: 'Create and extract ZIP archives, analyse file sizes.',
    tools: [
      { id: 'create-zip', name: 'Create ZIP Archive', slug: 'archived', description: 'Package multiple files into a single ZIP archive.', tags: ['compression', 'file-format'], related: ['extract-zip', 'file-size-analyser'] },
      { id: 'extract-zip', name: 'Extract ZIP', slug: 'extracted', description: 'Open a ZIP archive and download files individually or all at once.', tags: ['file-format'], related: ['create-zip', 'file-size-analyser', 'checksum-verifier'] },
      { id: 'file-size-analyser', name: 'File Size Analyser', slug: null, description: 'Read file name, size, type, and last modified date from any file.', tags: ['analysis'], related: ['file-size-converter', 'create-zip'] },
    ],
  },
  {
    id: 'text-more',
    label: 'More Text Tools',
    emoji: '\u{1F4CB}',
    primary: false,
    description: 'Additional text processing and formatting utilities.',
    tools: [
      { id: 'remove-duplicate-lines', name: 'Remove Duplicate Lines', slug: null, description: 'Remove duplicate lines from text input.', tags: ['text', 'data-integrity'], related: ['whitespace-cleaner', 'find-replace'] },
      { id: 'csv-diff', name: 'CSV Diff Checker', slug: null, description: 'Cell-level comparison of two CSV files.', tags: ['text', 'data-integrity', 'analysis'], related: ['text-diff', 'csv-json-converter', 'csv-encoding-fixer'] },
      { id: 'base64-tool', name: 'Base64 Encode / Decode', slug: null, description: 'Encode or decode Base64 text and files.', tags: ['text', 'conversion'], related: ['encrypt-decrypt-text', 'sha256-hasher'] },
      { id: 'csv-encoding-fixer', name: 'CSV Encoding Fixer', slug: 'utf8-fixed', description: 'Detect and fix character encoding issues in CSV files.', tags: ['text', 'data-integrity', 'file-format'], related: ['csv-diff', 'csv-json-converter', 'encoding-detector'] },
      { id: 'xml-yaml-formatter', name: 'XML / YAML Formatter', slug: null, description: 'Format, validate, and prettify XML and YAML data.', tags: ['text', 'file-format', 'data-integrity'], related: ['json-formatter', 'text-diff'] },
      { id: 'markdown-preview', name: 'Markdown Preview', slug: null, description: 'Render Markdown to styled HTML with live preview and export.', tags: ['text', 'documentation'], related: ['word-counter', 'bibtex-formatter'] },
      { id: 'text-case-converter', name: 'Text Case Converter', slug: null, description: 'Convert text between UPPER, lower, Title, Sentence, camelCase, and more.', tags: ['text'], related: ['find-replace', 'whitespace-cleaner'] },
      { id: 'line-number-adder', name: 'Line Number Adder', slug: null, description: 'Add line numbers to any text for code review or annotation.', tags: ['text'], related: ['whitespace-cleaner', 'text-diff'] },
      { id: 'whitespace-cleaner', name: 'Whitespace Cleaner', slug: null, description: 'Strip trailing spaces, normalize line endings, and fix tabs vs spaces.', tags: ['text', 'data-integrity'], related: ['remove-duplicate-lines', 'find-replace', 'text-case-converter'] },
    ],
  },
  {
    id: 'privacy-more',
    label: 'More Security Tools',
    emoji: '\u{1F50D}',
    primary: false,
    description: 'File verification, encoding detection, and checksum tools.',
    tools: [
      { id: 'magic-byte-checker', name: 'Magic Byte Checker', slug: null, description: 'Verify a file\'s true format by reading its binary signature.', tags: ['data-integrity', 'file-format'], related: ['sha256-hasher', 'encoding-detector', 'checksum-verifier'] },
      { id: 'checksum-verifier', name: 'Checksum Batch Verifier', slug: null, description: 'Verify a manifest of checksums against uploaded files for data integrity.', tags: ['data-integrity', 'security', 'research'], related: ['sha256-hasher', 'magic-byte-checker', 'extract-zip'] },
      { id: 'encoding-detector', name: 'Character Encoding Detector', slug: null, description: 'Identify the character encoding of any text file.', tags: ['file-format', 'data-integrity'], related: ['csv-encoding-fixer', 'magic-byte-checker'] },
    ],
  },
  {
    id: 'calculators',
    label: 'Calculators & Converters',
    emoji: '\u{1F5A9}',
    primary: false,
    description: 'Convert units, calculate dates, timestamps, and file sizes.',
    tools: [
      { id: 'unit-converter', name: 'Unit Converter', slug: null, description: 'Convert between units of length, weight, temperature, and more.', tags: ['research', 'analysis'], related: ['date-difference', 'file-size-converter'] },
      { id: 'date-difference', name: 'Date Difference Calculator', slug: null, description: 'Calculate the difference between two dates.', tags: ['research', 'analysis'], related: ['timestamp-converter', 'unit-converter'] },
      { id: 'timestamp-converter', name: 'Unix Timestamp Converter', slug: null, description: 'Convert between Unix timestamps and human-readable dates.', tags: ['research', 'data-integrity'], related: ['date-difference', 'unit-converter'] },
      { id: 'file-size-converter', name: 'File Size Converter', slug: null, description: 'Convert between bytes, KB, MB, GB, TB, and PB.', tags: ['analysis'], related: ['file-size-analyser', 'unit-converter'] },
    ],
  },
  {
    id: 'developer',
    label: 'Developer Tools',
    emoji: '\u{1F6E0}\uFE0F',
    primary: false,
    description: 'Test regex, generate UUIDs.',
    tools: [
      { id: 'regex-tester', name: 'Regex Tester', slug: null, description: 'Test regular expressions with real-time match highlighting.', tags: ['text', 'analysis'], related: ['find-replace', 'text-diff'] },
      { id: 'uuid-generator', name: 'UUID Generator', slug: null, description: 'Generate v4 UUIDs for dataset identifiers or record keys.', tags: ['research', 'data-integrity'], related: ['sha256-hasher', 'password-generator'] },
    ],
  },
];

// Primary categories (shown by default)
export const PRIMARY_CATEGORIES = CATEGORIES.filter(c => c.primary);

// "More Tools" categories (collapsed by default)
export const MORE_CATEGORIES = CATEGORIES.filter(c => !c.primary);

// Flat list of all tools with category info
export const ALL_TOOLS = CATEGORIES.flatMap(cat =>
  cat.tools.map(tool => ({
    ...tool,
    category: cat.id,
    categoryLabel: cat.label,
    categoryEmoji: cat.emoji,
  }))
);

export function getToolById(id) {
  return ALL_TOOLS.find(t => t.id === id) || null;
}
