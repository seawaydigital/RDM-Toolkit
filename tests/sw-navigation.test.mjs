import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NAVIGATE_FALLBACK_DENYLIST } from '../scripts/sw-navigation.mjs';

// Workbox's NavigationRoute tests each denylist entry against pathname + search
// and answers with the app only when none matches.
function answeredWithApp(url) {
  const { pathname, search } = new URL(url, 'https://rdmtoolkit.ca');
  return !NAVIGATE_FALLBACK_DENYLIST.some((pattern) => pattern.test(pathname + search));
}

test('the app still answers its own addresses, online or offline', () => {
  for (const url of [
    '/',
    '/#merge-pdfs',
    '/#merge-pdfs?task=reb-package&step=2',
    '/?config=eyJmaWxlcyI6W119#storage-calculator', // Storage Calculator share link
    '/?config=1.5.txt',                             // a dot in the query is not a file name
    '/?utm_source=newsletter',
    '/index.html',
    '/index.html?config=eyJmaWxlcyI6W119',
    '/INDEX.HTML',
    '/no-such-page',
    '/tools/',
    '/v1.2/',
    '/a.b/c',
  ]) {
    assert.equal(answeredWithApp(url), true, `${url} should open the app`);
  }
});

test('plain files are left to open as themselves', () => {
  for (const url of [
    '/third-party-licenses.txt',
    '/third-party-licenses.txt?v=2',
    '/robots.txt',
    '/ROBOTS.TXT',
    '/sitemap.xml',
    '/.well-known/security.txt',
    '/.well-known/change-password', // no extension, still not an app address
    '/bundle-integrity.json',
    '/manifest.webmanifest',
    '/favicon.ico',
    '/sw.js',
    '/assets/index-BF6G9ReE.js',
    '/docs/report.final.pdf',
    '/notes.html.txt',
  ]) {
    assert.equal(answeredWithApp(url), false, `${url} should not be answered with the app`);
  }
});

test('the patterns keep no state between tests', () => {
  for (const pattern of NAVIGATE_FALLBACK_DENYLIST) {
    assert.ok(pattern instanceof RegExp);
    assert.doesNotMatch(pattern.flags, /[gy]/, `${pattern} must not be global or sticky`);
  }
});

// Files the host reads but nobody opens in a browser.
const HOST_CONTROL_FILES = new Set(['CNAME', '_headers', '.nojekyll']);

function filesUnder(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path, `${prefix}${name}/`) : [`${prefix}${name}`];
  });
}

test('every file published from public/ opens as itself', () => {
  for (const file of filesUnder('public')) {
    if (HOST_CONTROL_FILES.has(file)) continue;
    assert.equal(answeredWithApp(`/${file}`), false, `/${file} would be answered with the app`);
  }
});
