/**
 * Shared facts for the Privacy statement and Terms of use pages, and the
 * footer that links them. The decisions behind both pages' wording are
 * recorded in docs/LEGAL-PAGES.md.
 */

/** Date both pages were last changed in substance. Shown on each page. */
export const LEGAL_UPDATED = '2026-11-20';

/**
 * Everything the app keeps in the browser's own storage. tests/legal.test.mjs
 * fails if code stores a key that is not listed here, or if a listed key is no
 * longer used, so the privacy statement cannot drift from the code.
 */
export const STORED_ITEMS = [
  {
    name: 'Recently used tools',
    keys: ['rdm_recent_tools'],
    holds: 'The names of the last five tools you opened.',
    why: 'Shown on the home page and in search so you can get back to them.',
  },
  {
    name: 'Sidebar view',
    keys: ['rdm_prefs_v1'],
    holds: 'Whether the sidebar lists tools by file type or by task.',
    why: 'So the sidebar looks the way you left it.',
  },
  {
    name: 'Welcome tour',
    keys: ['rdm_tour_dismissed_v1'],
    holds: 'A note that you have closed the welcome tour.',
    why: 'So the tour does not open on every visit.',
  },
  {
    name: 'Tester usage log (only if you turn it on)',
    keys: ['rdm_usage_log_consent', 'rdm_usage_log_v1'],
    holds: 'Your answer to the welcome tour’s usage-log question. If you said yes: up to 500 entries recording which tools and pages you opened and when, your browser’s name and window size, and the type and first 200 characters of any error message. It never records file names, file contents or anything you type.',
    why: 'So you can attach it to a feedback email when reporting a problem. It is never sent anywhere automatically.',
  },
];

/**
 * The open-source software the site ships, grouped as the Terms of use page
 * credits it. `licence` is the SPDX id the software is used under; for a
 * dual-licensed package it is the one chosen. tests/legal.test.mjs fails if a
 * production dependency in package.json is missing here, if an entry names a
 * package that is no longer a dependency, or if a licence does not match the
 * package's own package.json.
 */
export const OPEN_SOURCE = [
  { name: 'React', packages: ['react', 'react-dom'], licence: 'MIT' },
  { name: 'pdf-lib', packages: ['@cantoo/pdf-lib', '@pdf-lib/fontkit'], licence: 'MIT' },
  { name: 'JSZip', packages: ['jszip'], licence: 'MIT' },
  { name: 'zxcvbn', packages: ['zxcvbn'], licence: 'MIT' },
  { name: 'exifr', packages: ['exifr'], licence: 'MIT' },
  { name: 'Turndown', packages: ['turndown', 'turndown-plugin-gfm'], licence: 'MIT' },
  { name: 'dnd kit', packages: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'], licence: 'MIT' },
  { name: 'PDF.js', packages: ['pdfjs-dist'], licence: 'Apache-2.0' },
  { name: 'DOMPurify', packages: ['dompurify'], licence: 'Apache-2.0' },
  { name: 'Lucide', packages: ['lucide-react'], licence: 'ISC' },
  { name: 'IBM Plex typefaces', packages: ['@fontsource/ibm-plex-sans', '@fontsource/ibm-plex-mono'], licence: 'OFL-1.1' },
  { name: 'Fraunces typeface', packages: ['@fontsource/fraunces'], licence: 'OFL-1.1' },
];

/** How each licence in OPEN_SOURCE is written on the page. */
export const LICENCE_NAMES = {
  'MIT': 'MIT licence',
  'Apache-2.0': 'Apache Licence 2.0',
  'ISC': 'ISC licence',
  'OFL-1.1': 'SIL Open Font Licence 1.1',
};

/** Footer links to the site's policy pages. Each hash must be a route. */
export const POLICY_PAGES = [
  { hash: 'privacy', label: 'Privacy' },
  { hash: 'terms', label: 'Terms of use' },
  { hash: 'accessibility', label: 'Accessibility' },
];
