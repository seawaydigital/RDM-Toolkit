/**
 * Shared facts for the Privacy statement and Terms of use pages, and the
 * footer that links them. Open decisions about both pages (who provides the
 * site, legal review, content licence) are listed in docs/LEGAL-PAGES.md.
 */

/** Date both pages were last changed in substance. Shown on each page. */
export const LEGAL_UPDATED = '2026-10-25';

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

/** Footer links to the site's policy pages. Each hash must be a route. */
export const POLICY_PAGES = [
  { hash: 'privacy', label: 'Privacy' },
  { hash: 'terms', label: 'Terms of use' },
  { hash: 'accessibility', label: 'Accessibility' },
];
