import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  STORED_ITEMS,
  LEGAL_UPDATED,
  POLICY_PAGES,
  OPEN_SOURCE,
  LICENCE_NAMES,
  THIRD_PARTY_LICENCES_FILE,
} from '../src/data/legal.js';
import { PAGE_IDS } from '../src/data/pages.js';
import { PROJECT } from '../src/data/institutionConfig.js';
import { LICENCES_FILE, collectLicences } from '../scripts/third-party-licenses.mjs';

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

// Every key the app writes to browser storage, found as a string literal.
// legal.js is skipped: it is the list being checked.
function storageKeysInSource() {
  const keys = new Set();
  for (const file of sourceFiles('src')) {
    if (file.replace(/\\/g, '/').endsWith('src/data/legal.js')) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(/['"`](rdm_[a-z0-9_]+)['"`]/g)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

test('the privacy statement describes every key the app stores', () => {
  const described = new Set(STORED_ITEMS.flatMap(item => item.keys));
  for (const key of storageKeysInSource()) {
    assert.ok(described.has(key), `${key} is stored but not listed in STORED_ITEMS (src/data/legal.js)`);
  }
});

test('the privacy statement lists no key the app no longer stores', () => {
  const used = storageKeysInSource();
  for (const item of STORED_ITEMS) {
    for (const key of item.keys) assert.ok(used.has(key), `${key} is listed but not used in src/`);
  }
});

test('each stored item says what it holds and why', () => {
  for (const item of STORED_ITEMS) {
    assert.ok(item.name && item.holds && item.why, `${item.keys.join(', ')} is missing a field`);
  }
});

test('the last-updated date is a real ISO calendar date', () => {
  assert.match(LEGAL_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${LEGAL_UPDATED}T00:00:00Z`).toISOString().slice(0, 10), LEGAL_UPDATED);
});

test('every footer policy link is a real page', () => {
  for (const { hash } of POLICY_PAGES) assert.ok(PAGE_IDS.has(hash), `#${hash} is not a route`);
});

test('the site names who maintains it', () => {
  assert.ok(PROJECT.maintainer.name && PROJECT.maintainer.title);
});

// ---- Open-source credits on the Terms of use page ----

const productionDependencies = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies);

// '(MIT OR GPL-3.0-or-later)' → ['MIT', 'GPL-3.0-or-later']
function licencesOffered(packageName) {
  const { license } = JSON.parse(readFileSync(join('node_modules', packageName, 'package.json'), 'utf8'));
  return String(license).replace(/[()]/g, '').split(/\s+OR\s+/);
}

test('every production dependency is credited exactly once, and nothing else is', () => {
  const credited = OPEN_SOURCE.flatMap(entry => entry.packages);
  assert.equal(new Set(credited).size, credited.length, 'a package is credited twice in OPEN_SOURCE');
  for (const name of productionDependencies) {
    assert.ok(credited.includes(name), `${name} is a dependency but is not credited in OPEN_SOURCE (src/data/legal.js)`);
  }
  for (const name of credited) {
    assert.ok(productionDependencies.includes(name), `${name} is credited but is not a dependency in package.json`);
  }
});

test('each credit names a licence the package itself offers', () => {
  for (const { name, packages, licence } of OPEN_SOURCE) {
    for (const packageName of packages) {
      const offered = licencesOffered(packageName);
      assert.ok(offered.includes(licence), `${name}: ${packageName} is offered under ${offered.join(' or ')}, not ${licence}`);
    }
  }
});

test('every credited licence has a name to show on the page', () => {
  for (const { name, licence } of OPEN_SOURCE) assert.ok(LICENCE_NAMES[licence], `${name}: no display name for ${licence}`);
});

// ---- The licence texts themselves (third-party-licenses.txt, written by the build) ----

test('the Terms page links to the licences file the build writes, in a new tab', () => {
  assert.equal(THIRD_PARTY_LICENCES_FILE, LICENCES_FILE, 'the page would link to a file the build does not write');
  const page = readFileSync('src/components/pages/TermsOfUse.jsx', 'utf8');
  assert.match(page, /const LICENCES_URL = .*THIRD_PARTY_LICENCES_FILE/, 'the link address is not built from THIRD_PARTY_LICENCES_FILE');
  assert.match(
    page,
    /<a\s+href=\{LICENCES_URL\}\s+target="_blank"\s+rel="noopener noreferrer"\s*>/,
    'TermsOfUse.jsx has no new-tab link to the licences file',
  );
});

test('every credited project has its licence text in that file, under the licence it is credited with', () => {
  const { packages } = collectLicences({ root: process.cwd() });
  for (const { name, packages: packageNames, licence } of OPEN_SOURCE) {
    for (const packageName of packageNames) {
      const entry = packages.find((pkg) => pkg.name === packageName);
      assert.ok(entry, `${name}: ${packageName} has no licence text in ${LICENCES_FILE}`);
      assert.ok(
        entry.license.split(/\s+OR\s+/).includes(licence),
        `${name}: the file lists ${packageName} under ${entry.license}, the page credits it under ${licence}`,
      );
    }
  }
});
