#!/usr/bin/env node
// Boots http-server against ./dist, runs axe CLI against representative routes,
// writes raw JSON + a categorized markdown summary to docs/accessibility/.
//
// Usage: npm run build && node scripts/axe-baseline.mjs
//
// Windows: axe-cli drives Chrome via selenium-webdriver. For headless Chrome
// to launch, chromedriver must match the installed Chrome version. Run
// `npx browser-driver-manager install chrome` once; it downloads matching
// binaries. This script reads CHROME_TEST_PATH + CHROMEDRIVER_TEST_PATH from
// the environment (set by browser-driver-manager) and falls back to the system
// Chrome at the standard Windows path. axe-cli adds --no-sandbox automatically
// when CHROME_TEST_PATH is set (see node_modules/@axe-core/cli/dist/src/lib/webdriver.js).

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

// Build env vars for axe-cli subprocess.
// axe-cli reads CHROME_TEST_PATH / CHROMEDRIVER_TEST_PATH to select binaries
// and, crucially, adds --no-sandbox to Chrome when CHROME_TEST_PATH is set.
// Priority: existing env var > standard Windows system Chrome path.
function buildAxeEnv() {
  const env = { ...process.env };
  const systemChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (!env.CHROME_TEST_PATH && existsSync(systemChrome)) {
    env.CHROME_TEST_PATH = systemChrome;
  }
  // CHROMEDRIVER_TEST_PATH is left to whatever browser-driver-manager set;
  // if absent, axe-cli falls back to node_modules/chromedriver (may version-mismatch).
  return env;
}

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
  // axe-cli's --save writes a JSON file; stdout is human-readable text.
  // Use a unique tmpfile per route to avoid collisions.
  const safe = url.replace(/[^a-z0-9]/gi, '_');
  const outFile = `tmp-axe-${safe}.json`;
  await new Promise((resolve) => {
    const proc = spawn(
      'npx',
      ['@axe-core/cli', url, '--tags', TAGS, '--save', outFile],
      { shell: true, stdio: 'ignore', env: buildAxeEnv() },
    );
    proc.on('close', () => resolve());
  });
  try {
    const raw = await readFile(outFile, 'utf8');
    const parsed = JSON.parse(raw);
    // axe-cli --save always writes an array (one element per URL scanned).
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
  // Surface routes that failed to scan — otherwise a Chrome/axe-cli crash on
  // a single route is hidden behind a phantom "0 violations" row in the table.
  const errorRoutes = results.filter((r) => r.parseError);
  if (errorRoutes.length > 0) {
    lines.push('', '## ⚠️ Routes that failed to scan', '');
    lines.push('These routes could not be parsed — counts above are missing them.', '');
    for (const r of errorRoutes) {
      lines.push(`- \`${r.route}\`: ${r.parseError}`);
    }
  }
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
