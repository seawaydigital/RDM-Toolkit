/**
 * When each research page's content was last checked against its sources, as
 * an ISO date. Shown at the foot of the page by ContentReviewed.jsx.
 *
 * Only change a date after a real review of the whole page — the per-claim
 * sources and the review checklist are in docs/CONTENT-REVIEW.md. Adding a new
 * section does not move the page's date.
 */
export const CONTENT_REVIEW = {
  'tasks': '2026-10-03',
  'how-this-works': '2026-09-30',
  'tri-agency-policy': '2026-09-30',
  'grants-identifiers': '2026-09-30',
  'thesis': '2026-10-03',
  'data-classification': '2026-10-02',
  'storage-calculator': '2026-09-30',
  'lakehead-dataverse': '2026-09-30',
  'drac-services': '2026-09-30',
  'acrobat-alternative': '2026-10-02',
  'glossary': '2026-10-03',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** '2026-10-02' → '2 October 2026' */
export function formatReviewDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function getReviewDate(page) {
  return CONTENT_REVIEW[page] || null;
}
