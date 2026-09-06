#!/usr/bin/env node
// Rewrites an existing dist/ for a host other than rdmtoolkit.ca.
//
// `npm run build` always produces a dist/ for the current GitHub Pages deploy.
// This script adapts a copy of that output for a different domain:
//   1. deletes CNAME  — a GitHub Pages domain binding. Inert on a normal web
//      server, but it would hijack the domain if the receiving team ever
//      deployed the folder to GitHub Pages.
//   2. rewrites security.txt's Canonical: — RFC 9116 says a security.txt whose
//      Canonical does not match its own URL should not be trusted.
//   3. replaces EVERY occurrence of https://rdmtoolkit.ca in index.html. In
//      practice that is the absolute social-meta URLs (og:url, og:image) and
//      the canonical link, which have to be absolute per their specs. It is a
//      blanket replace rather than a per-tag one, so anything absolute added
//      to index.html later is carried along automatically — but that also
//      means any deliberate reference to the rdmtoolkit.ca origin placed in
//      index.html would be rewritten too. Keep such references out of the
//      HTML entry (they belong in a component) or teach this script to skip
//      them.
//
// Usage: node scripts/build-handoff.mjs --domain rdmtoolkit.lakeheadu.ca

import { readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const domainFlag = args.indexOf('--domain');
if (domainFlag === -1 || !args[domainFlag + 1]) {
  console.error('Usage: node scripts/build-handoff.mjs --domain <hostname>');
  process.exit(1);
}

const domain = args[domainFlag + 1];
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
  console.error(`Not a valid hostname: ${domain}`);
  process.exit(1);
}

const distDir = resolve(process.cwd(), 'dist');
if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// CNAME may legitimately be absent (an earlier run already removed it), but
// index.html and security.txt are produced by every build. If either is
// missing, something is wrong with the build and staying quiet would ship an
// unrewritten security.txt — the exact RFC 9116 mismatch this script exists to
// prevent — while printing a success message. Fail loudly instead.
const required = {
  'index.html': resolve(distDir, 'index.html'),
  '.well-known/security.txt': resolve(distDir, '.well-known', 'security.txt'),
};
const missing = Object.entries(required)
  .filter(([, path]) => !existsSync(path))
  .map(([name]) => name);
if (missing.length > 0) {
  console.error(`dist/ is missing expected build output: ${missing.join(', ')}`);
  console.error('Re-run `npm run build` — do not publish this dist/.');
  process.exit(1);
}

const origin = `https://${domain}`;
const changes = [];

// 1. Drop the GitHub Pages CNAME.
const cnamePath = resolve(distDir, 'CNAME');
if (existsSync(cnamePath)) {
  rmSync(cnamePath);
  changes.push('removed CNAME');
}

// Rewrite a file in place, but only if the replacement actually changes it.
//
// Reads directly and handles ENOENT rather than testing with existsSync first:
// a check-then-read pair is a time-of-check/time-of-use race (the file can
// vanish between the two calls), which is both a real if unlikely failure mode
// and something CodeQL flags. Both required files are already verified present
// above, so a miss here means the build output changed underneath us.
function rewriteInPlace(path, transform, label) {
  let before;
  try {
    before = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  const after = transform(before);
  if (before === after) return;
  writeFileSync(path, after);
  changes.push(label);
}

// 2. Repoint security.txt Canonical.
rewriteInPlace(
  resolve(distDir, '.well-known', 'security.txt'),
  (text) => text.replace(
    /^Canonical: https:\/\/[^/]+\/\.well-known\/security\.txt$/m,
    `Canonical: ${origin}/.well-known/security.txt`,
  ),
  'rewrote security.txt Canonical',
);

// 3. Repoint absolute social-meta URLs.
rewriteInPlace(
  resolve(distDir, 'index.html'),
  (text) => text.replace(/https:\/\/rdmtoolkit\.ca/g, origin),
  'rewrote absolute meta URLs in index.html',
);

if (changes.length === 0) {
  console.log(`No changes needed for ${domain}.`);
} else {
  console.log(`dist/ prepared for ${origin}:`);
  for (const change of changes) console.log(`  - ${change}`);
}
