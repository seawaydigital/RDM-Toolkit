// Walk dist/assets/*.js, compute total gzipped size and entry chunk size.
// Emits JSON to stdout: { entryKB, totalKB, files: [{ name, kb, gzipKB }] }
//
// Used by .github/workflows/bundle-size.yml for PR regression checks.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST_ASSETS = 'dist/assets';

function human(bytes) {
  return Math.round(bytes / 1024);
}

function gzippedSize(path) {
  const buf = readFileSync(path);
  return gzipSync(buf, { level: 9 }).length;
}

const files = readdirSync(DIST_ASSETS)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const path = join(DIST_ASSETS, f);
    const rawBytes = statSync(path).size;
    const gzipBytes = gzippedSize(path);
    return {
      name: f,
      kb: human(rawBytes),
      gzipKB: human(gzipBytes),
      gzipBytes,
    };
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes);

// "entry chunk" = the index-*.js chunk
const entry = files.find((f) => /^index-/.test(f.name));
const entryKB = entry ? entry.gzipKB : 0;

const totalGzipBytes = files.reduce((sum, f) => sum + f.gzipBytes, 0);
const totalKB = human(totalGzipBytes);

process.stdout.write(
  JSON.stringify({
    entryKB,
    totalKB,
    files: files.map(({ name, kb, gzipKB }) => ({ name, kb, gzipKB })),
  })
);
