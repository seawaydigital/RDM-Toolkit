#!/usr/bin/env node
// Boots http-server against ./dist, runs axe CLI against representative routes,
// writes raw JSON + a categorized markdown summary to docs/accessibility/.
//
// Usage: npm run build && node scripts/axe-baseline.mjs

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

// 10 representative routes — covers all primitives, page types, tool categories
const ROUTES = [
  '/',
  '/#how-this-works',
  '/#data-classification',
  '/#storage-calculator',
  '/#tri-agency-policy',
  '/#compress-pdf',
  '/#compress-image',
  '/#word-counter',
  '/#password-generator',
  '/#extract-zip',
];

const TAGS = 'wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa';

async function main() {
  if (!existsSync('dist')) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Start http-server
  const server = spawn('npx', ['http-server', 'dist', '-p', String(PORT), '-s'], {
    stdio: 'ignore',
    shell: true,
  });
  // Wait for server to come up
  await sleep(2000);

  await mkdir('docs/accessibility', { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const allResults = [];

  try {
    for (const route of ROUTES) {
      const url = `${BASE}${route}`;
      console.log(`Scanning ${url}...`);
      const result = await runAxe(url);
      allResults.push({ route, ...result });
    }
    await writeFile(
      `docs/accessibility/baseline-${today}.json`,
      JSON.stringify(allResults, null, 2),
    );
    await writeFile(
      `docs/accessibility/baseline-summary-${today}.md`,
      buildSummary(allResults, today),
    );
    console.log(`\nBaseline written to docs/accessibility/baseline-${today}.{json,md}`);
  } finally {
    server.kill();
  }
}

async function runAxe(url) {
  // axe-cli's default stdout is human-readable text; --save writes a JSON file.
  // Use a unique tmpfile per route to avoid collisions.
  const safe = url.replace(/[^a-z0-9]/gi, '_');
  const outFile = `tmp-axe-${safe}.json`;
  await new Promise((resolve) => {
    const proc = spawn(
      'npx',
      ['@axe-core/cli', url, '--tags', TAGS, '--save', outFile],
      { shell: true, stdio: 'inherit' },
    );
    proc.on('close', () => resolve());
  });
  try {
    const raw = await readFile(outFile, 'utf8');
    const parsed = JSON.parse(raw);
    // axe-cli's --save writes either a single object or an array depending on URL count;
    // for one URL it's a single object.
    const page = Array.isArray(parsed) ? parsed[0] : parsed;
    await unlink(outFile).catch(() => {});
    return {
      violations: page.violations || [],
      passes: (page.passes || []).length,
    };
  } catch (e) {
    await unlink(outFile).catch(() => {});
    return { violations: [], passes: 0, parseError: e.message };
  }
}

function buildSummary(results, today) {
  const sevCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const lines = [`# Accessibility baseline — ${today}`, ''];
  lines.push(`Routes scanned: ${results.length}`, '');
  lines.push('## Per-route summary', '');
  lines.push('| Route | Violations | Critical | Serious | Moderate | Minor |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of results) {
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of r.violations) counts[v.impact] = (counts[v.impact] || 0) + 1;
    sevCounts.critical += counts.critical;
    sevCounts.serious += counts.serious;
    sevCounts.moderate += counts.moderate;
    sevCounts.minor += counts.minor;
    lines.push(
      `| \`${r.route}\` | ${r.violations.length} | ${counts.critical} | ${counts.serious} | ${counts.moderate} | ${counts.minor} |`,
    );
  }
  lines.push('', '## Totals', '');
  lines.push(`- Critical: ${sevCounts.critical}`);
  lines.push(`- Serious: ${sevCounts.serious}`);
  lines.push(`- Moderate: ${sevCounts.moderate}`);
  lines.push(`- Minor: ${sevCounts.minor}`);
  lines.push('', '## Top recurring rules', '');
  const ruleCounts = {};
  for (const r of results) {
    for (const v of r.violations) {
      ruleCounts[v.id] = (ruleCounts[v.id] || 0) + v.nodes.length;
    }
  }
  const sorted = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);
  for (const [id, n] of sorted.slice(0, 15)) {
    lines.push(`- \`${id}\`: ${n} instances`);
  }
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
