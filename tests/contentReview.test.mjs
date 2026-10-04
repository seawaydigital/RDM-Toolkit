import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_REVIEW, formatReviewDate, getReviewDate } from '../src/data/contentReview.js';
import { PAGE_IDS } from '../src/data/pages.js';

// Every page whose content makes time-sensitive claims must show a review date.
const REVIEWED_PAGES = [
  'tasks', 'how-this-works', 'tri-agency-policy', 'grants-identifiers', 'thesis',
  'data-classification', 'storage-calculator', 'lakehead-dataverse', 'drac-services',
  'acrobat-alternative', 'glossary',
];

test('every reviewed page has a date, and every date belongs to a real page', () => {
  for (const page of REVIEWED_PAGES) assert.ok(CONTENT_REVIEW[page], `${page} has no review date`);
  for (const page of Object.keys(CONTENT_REVIEW)) assert.ok(PAGE_IDS.has(page), `${page} is not a route`);
});

test('dates are real ISO calendar dates', () => {
  for (const [page, iso] of Object.entries(CONTENT_REVIEW)) {
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/, page);
    const date = new Date(`${iso}T00:00:00Z`);
    assert.equal(date.toISOString().slice(0, 10), iso, `${page}: ${iso} is not a calendar date`);
  }
});

test('formatReviewDate writes the date out in words', () => {
  assert.equal(formatReviewDate('2026-10-02'), '2 October 2026');
  assert.equal(formatReviewDate('2027-01-31'), '31 January 2027');
});

test('getReviewDate returns null for pages without one', () => {
  assert.equal(getReviewDate('request-a-tool'), null);
  assert.equal(getReviewDate('thesis'), CONTENT_REVIEW.thesis);
});
