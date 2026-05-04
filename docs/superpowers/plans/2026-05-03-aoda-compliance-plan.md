# AODA Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring rdmtoolkit.ca to a defensible "best-effort improvements toward WCAG 2.2 Level AA" posture before formal user testing begins.

**Architecture:** Foundation-first hybrid — fix design tokens, focus system, route announcements, and shared UI primitives once; surfaces inherit. Six phases, ~17 PRs, ~30–40 working days, target launch-readiness 2026-07-17. Verification via axe-core CLI + Lighthouse CI (already running) — no manual screen-reader testing in scope (per spec).

**Tech Stack:** React 18, Vite 5, plain CSS (no Tailwind, no CSS-in-JS), `@axe-core/cli` (new devDep), `@axe-core/react` (new devDep, dev-only), Node 24 built-in `node --test` for the one utility script.

**Spec:** [docs/superpowers/specs/2026-05-03-aoda-compliance-plan-design.md](../specs/2026-05-03-aoda-compliance-plan-design.md)

---

## How this plan is organized

This plan covers **Phase 0 (baseline tooling) and Phase 1 (foundations) in full task-level detail** — the immediately actionable work, ~7 working days. Phases 2–6 are milestone outlines pointing forward; each phase will get its own dedicated plan doc when its time comes. Rationale: writing 150+ TDD tasks for work two months out that will shift based on Phase 1 axe findings is brittle and wasteful.

**Plan files to be created over time:**
- `2026-05-03-aoda-compliance-plan.md` (this doc) — Phase 0+1 detail + Phase 2–6 outline
- `2026-05-XX-aoda-phase-2-ui-primitives.md` — drafted at start of Phase 2
- `2026-06-XX-aoda-phase-3-shell.md` — drafted at start of Phase 3
- `2026-06-XX-aoda-phase-4-info-pages.md` — drafted at start of Phase 4
- `2026-06-XX-aoda-phase-5-tools.md` — drafted at start of Phase 5
- `2026-07-XX-aoda-phase-6-deliverables.md` — drafted at start of Phase 6

---

## Verification rhythm (no test framework)

The repo has no unit-test framework (per `package.json`: only `dev`/`build`/`preview` + security audit scripts). Verification per task uses:

| Tool | When to run | Pass criteria |
|---|---|---|
| `npx @axe-core/cli http://localhost:4173/<route>` | After every code change to a route | Zero `critical` or `serious` violations |
| `npm run dev` + manual Tab/Enter/Escape | Interactive UI changes | Keyboard reachable; focus visible; expected announcements |
| `npm run build` | Before committing each task | Clean build, no new warnings |
| `node --test scripts/check-contrast.test.js` | After editing `check-contrast.js` | All assertions pass |
| Lighthouse CI (already running) | On push (CI) | Accessibility score ≥ 0.95 (raised from current 0.9 in Task 0.4) |

---

## File structure (Phases 0+1 only)

**New files:**
- `scripts/check-contrast.js` — pure-function contrast computation + token-combination audit
- `scripts/check-contrast.test.js` — `node --test` assertions for the function
- `scripts/axe-baseline.mjs` — driver script that boots http-server + runs axe CLI against 10 routes + writes results
- `docs/accessibility/baseline-2026-05-XX.json` — raw axe output (committed)
- `docs/accessibility/baseline-summary-2026-05-XX.md` — categorized summary (committed)
- `docs/accessibility/patterns.md` — conventions doc (skeleton drafted in Phase 1, finalized in Phase 2)

**Modified files (Phases 0+1):**
- `package.json` — devDeps `@axe-core/cli`, `@axe-core/react`, `http-server`
- `src/main.jsx` — dev-only `@axe-core/react` registration
- `src/App.jsx` — skip link, route announcer, `id="main-content"`, hashchange title update
- `src/styles/global.css` — focus-visible rule, skip-link styles, prefers-reduced-motion rule, `.on-gold-surface` modifier, route-announcer visually-hidden styles, possibly token adjustments
- `index.html` — `<html lang="en-CA">`
- `.github/lighthouse/lighthouserc.json` — accessibility threshold 0.9 → 0.95

---

# PHASE 0 — Baseline & Tooling

**Goal:** Install axe-core tooling, capture a categorized baseline of current accessibility failures, raise Lighthouse threshold, fix two trivial verified findings (`<html lang>`, Lighthouse threshold).

**Effort:** 1 working day · **PRs:** 1

---

### Task 0.1: Add accessibility devDependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Install devDeps**

```bash
npm install --save-dev @axe-core/cli @axe-core/react http-server
```

Expected: three new entries in `devDependencies` of `package.json`. `http-server` is needed because `vite preview` doesn't have a stable headless mode for axe-cli to hit.

- [ ] **Step 2: Verify install**

```bash
npx @axe-core/cli --version
npx http-server --version
```

Expected: both print version numbers without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(a11y): add @axe-core/cli, @axe-core/react, http-server devDeps"
```

---

### Task 0.2: Wire @axe-core/react in dev mode only

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: Read current main.jsx**

```bash
cat src/main.jsx
```

Confirm structure (likely `createRoot(...).render(<App />)`).

- [ ] **Step 2: Add dev-only axe registration**

Add at the top of `main.jsx`, after React imports, before `createRoot`:

```jsx
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    import('react').then((React) => {
      import('react-dom').then((ReactDOM) => {
        axe(React, ReactDOM, 1000);
      });
    });
  });
}
```

This logs accessibility violations to the browser console during `npm run dev` only. The dynamic imports keep `@axe-core/react` (~200KB) out of any production code path.

- [ ] **Step 3: Verify dev-only**

```bash
npm run build
ls -lh dist/assets/*.js | grep -i axe
```

Expected: no axe-core files in `dist/`. If any appear, the import didn't get tree-shaken — fix with explicit dynamic import guarding.

- [ ] **Step 4: Smoke test in dev**

```bash
npm run dev
```

Open the URL printed by Vite, open DevTools console, verify either no violations or violations clearly logged with the "axe" prefix. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx
git commit -m "build(a11y): wire @axe-core/react in dev mode only"
```

---

### Task 0.3: Fix verified findings — html lang + Lighthouse threshold

**Files:**
- Modify: `index.html`
- Modify: `.github/lighthouse/lighthouserc.json`

- [ ] **Step 1: Update `<html lang>`**

In `index.html` line 2, change:
```html
<html lang="en">
```
to:
```html
<html lang="en-CA">
```

- [ ] **Step 2: Raise Lighthouse accessibility threshold**

In `.github/lighthouse/lighthouserc.json` line 13, change:
```json
"categories:accessibility": ["error", { "minScore": 0.9 }],
```
to:
```json
"categories:accessibility": ["error", { "minScore": 0.95 }],
```

Note: this raises the *threshold* — Lighthouse must score ≥ 0.95 on accessibility for CI to pass. If the current site doesn't hit 0.95, this task's CI run will FAIL — that's the signal Phase 1 work is needed. Don't revert; let it be the forcing function.

- [ ] **Step 3: Smoke test build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add index.html .github/lighthouse/lighthouserc.json
git commit -m "a11y(foundations): set html lang=en-CA, raise Lighthouse a11y threshold to 0.95"
```

---

### Task 0.4: Create scripts/axe-baseline.mjs driver

**Files:**
- Create: `scripts/axe-baseline.mjs`

- [ ] **Step 1: Write the driver script**

Create `scripts/axe-baseline.mjs`:

```javascript
#!/usr/bin/env node
// Boots http-server against ./dist, runs axe CLI against representative routes,
// writes raw JSON + a categorized markdown summary to docs/accessibility/.
//
// Usage: npm run build && node scripts/axe-baseline.mjs

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFile, mkdir } from 'node:fs/promises';
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

function runAxe(url) {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['@axe-core/cli', url, '--tags', TAGS, '--stdout'], {
      shell: true,
    });
    let stdout = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        // axe-cli wraps results in an array per page
        const page = Array.isArray(parsed) ? parsed[0] : parsed;
        resolve({
          violations: page.violations || [],
          passes: (page.passes || []).length,
        });
      } catch {
        resolve({ violations: [], passes: 0, parseError: true });
      }
    });
  });
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
```

- [ ] **Step 2: Add npm script**

In `package.json` `scripts` block, add:
```json
"a11y:baseline": "node scripts/axe-baseline.mjs"
```

- [ ] **Step 3: Verify script exists and is well-formed**

```bash
node --check scripts/axe-baseline.mjs
```

Expected: no output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add scripts/axe-baseline.mjs package.json
git commit -m "build(a11y): add axe baseline scan script + npm run a11y:baseline"
```

---

### Task 0.5: Run baseline scan, capture results

**Files:**
- Create: `docs/accessibility/baseline-2026-05-XX.json` (auto)
- Create: `docs/accessibility/baseline-summary-2026-05-XX.md` (auto)

- [ ] **Step 1: Build the site**

```bash
npm run build
```

Expected: clean build. If errors, fix before proceeding.

- [ ] **Step 2: Run baseline scan**

```bash
npm run a11y:baseline
```

Expected: scans all 10 routes, writes JSON + markdown summary. May take 60–90 seconds.

If the script hangs on a route, check that `dist/` was built and that the route is reachable manually (`curl http://localhost:4173/`).

- [ ] **Step 3: Inspect summary**

```bash
cat docs/accessibility/baseline-summary-*.md
```

Read the categorized summary. Top recurring rules tell you which Phase 1 + Phase 2 fixes will have the biggest impact.

- [ ] **Step 4: Commit baseline**

```bash
git add docs/accessibility/baseline-*.{json,md}
git commit -m "docs(a11y): capture WCAG 2.2 AA baseline scan (10 routes)"
```

---

### Task 0.6: Open Phase 0 PR

- [ ] **Step 1: Push branch and open PR**

If working on a feature branch (recommended), push and open PR. If on master directly (small enough), skip.

```bash
git push origin master  # or your phase-0 branch
```

PR title: `feat(a11y): Phase 0 — axe-core tooling + baseline scan`

PR body should reference [docs/superpowers/specs/2026-05-03-aoda-compliance-plan-design.md](../specs/2026-05-03-aoda-compliance-plan-design.md) and link the baseline summary.

---

# PHASE 1 — Foundations

**Goal:** Install the global accessibility substrate (contrast tokens, focus ring, skip link, route announcer, motion preferences, semantic landmarks). After this, Phase 2–5 work inherits these for free.

**Effort:** 3–5 working days · **PRs:** 1

**Verification:** Re-run `npm run a11y:baseline` at end of phase. Top recurring rules from Phase 0 should drop substantially. Specifically, expect rules like `color-contrast`, `region`, `bypass`, `landmark-one-main`, `aria-hidden-focus` to clear.

---

### Task 1.1: Write contrast computation utility (TDD)

**Files:**
- Create: `scripts/check-contrast.js`
- Create: `scripts/check-contrast.test.js`

- [ ] **Step 1: Write failing test**

Create `scripts/check-contrast.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { contrastRatio, hexToRgb, parseColorValue } from './check-contrast.js';

test('hexToRgb parses 6-digit hex', () => {
  assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('#FFC20E'), { r: 255, g: 194, b: 14 });
});

test('hexToRgb parses 3-digit hex', () => {
  assert.deepEqual(hexToRgb('#FFF'), { r: 255, g: 255, b: 255 });
});

test('contrastRatio black on white = 21:1', () => {
  const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.01, `expected ~21, got ${ratio}`);
});

test('contrastRatio white on white = 1:1', () => {
  const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 1) < 0.01, `expected 1, got ${ratio}`);
});

test('parseColorValue handles hex', () => {
  assert.deepEqual(parseColorValue('#0A1628'), { r: 10, g: 22, b: 40 });
});

test('parseColorValue handles rgba composited over solid bg', () => {
  // rgba(255, 255, 255, 0.04) over #0A1628 should brighten the navy slightly
  const result = parseColorValue('rgba(255, 255, 255, 0.04)', { r: 10, g: 22, b: 40 });
  assert.ok(result.r > 10, 'red channel should brighten');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test scripts/check-contrast.test.js
```

Expected: FAIL — `Cannot find module './check-contrast.js'`.

- [ ] **Step 3: Implement check-contrast.js**

Create `scripts/check-contrast.js`:

```javascript
// WCAG 2.x contrast ratio computation.
// Refs:
//   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
//   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function srgbChannel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * srgbChannel(r) +
    0.7152 * srgbChannel(g) +
    0.0722 * srgbChannel(b)
  );
}

export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Composite an rgba foreground over a solid rgb background.
// Per CSS Color Module: out = fg.alpha * fg + (1 - fg.alpha) * bg
function composite(fg, alpha, bg) {
  return {
    r: Math.round(alpha * fg.r + (1 - alpha) * bg.r),
    g: Math.round(alpha * fg.g + (1 - alpha) * bg.g),
    b: Math.round(alpha * fg.b + (1 - alpha) * bg.b),
  };
}

// Parse "#RGB", "#RRGGBB", or "rgba(R, G, B, A)" into an rgb object.
// rgba is composited over the optional `bg` (defaults to white).
export function parseColorValue(value, bg = { r: 255, g: 255, b: 255 }) {
  const v = value.trim();
  if (v.startsWith('#')) return hexToRgb(v);
  const rgbaMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const fg = { r: +r, g: +g, b: +b };
    const alpha = a == null ? 1 : parseFloat(a);
    if (alpha === 1) return fg;
    return composite(fg, alpha, bg);
  }
  throw new Error(`Unsupported color value: ${value}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test scripts/check-contrast.test.js
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-contrast.js scripts/check-contrast.test.js
git commit -m "build(a11y): add WCAG contrast ratio utility + tests"
```

---

### Task 1.2: Audit all token combinations used in code

**Files:**
- Modify: `scripts/check-contrast.js` (add audit driver at end)

- [ ] **Step 1: Add audit driver**

Append to `scripts/check-contrast.js`:

```javascript
// Audit driver — run with `node scripts/check-contrast.js`
// Reads global.css, extracts CSS variable values, and reports
// which combinations actually used in code fail WCAG AA.

import { readFile } from 'node:fs/promises';

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const css = await readFile('src/styles/global.css', 'utf8');

  const tokens = {};
  // Extract --foo: #bar; or --foo: rgba(...);
  for (const match of css.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }

  // Combinations to audit — text on each background.
  const FG_TOKENS = ['text-primary', 'text-secondary', 'text-muted', 'text-parchment', 'accent-primary'];
  const BG_TOKENS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-card', 'bg-inset'];
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3.0;

  console.log('# Contrast audit\n');
  console.log('| Foreground | Background | Ratio | AA normal (4.5) | AA large (3.0) |');
  console.log('|---|---|---|---|---|');

  let failures = 0;
  for (const fg of FG_TOKENS) {
    for (const bg of BG_TOKENS) {
      const fgVal = tokens[fg];
      const bgVal = tokens[bg];
      if (!fgVal || !bgVal) continue;
      try {
        const bgRgb = parseColorValue(bgVal);
        const fgRgb = parseColorValue(fgVal, bgRgb);
        const ratio = contrastRatio(fgRgb, bgRgb);
        const passN = ratio >= AA_NORMAL ? '✅' : '❌';
        const passL = ratio >= AA_LARGE ? '✅' : '❌';
        if (ratio < AA_NORMAL) failures++;
        console.log(
          `| --${fg} | --${bg} | ${ratio.toFixed(2)} | ${passN} | ${passL} |`,
        );
      } catch (e) {
        console.log(`| --${fg} | --${bg} | ERROR | ${e.message} | |`);
      }
    }
  }
  console.log(`\nTotal AA-normal failures: ${failures}`);
  if (failures > 0 && process.argv.includes('--strict')) process.exit(1);
}
```

- [ ] **Step 2: Run the audit**

```bash
node scripts/check-contrast.js > docs/accessibility/contrast-audit-2026-05-XX.md
cat docs/accessibility/contrast-audit-2026-05-XX.md
```

Expected: a table showing every combination's ratio. Likely failures (predict from spec):
- `--text-muted` (#7C9BBF) on `--bg-primary` (#0A1628) — borderline
- `--accent-primary` (#FFC20E gold) as text on dark surfaces is for *large* text only; small-text uses on dark may pass; on parchment/light surfaces it likely fails

- [ ] **Step 3: Note failures**

Capture the failing combinations into a working list — Tasks 1.3–1.5 will address them by adjusting tokens.

- [ ] **Step 4: Commit audit output**

```bash
git add docs/accessibility/contrast-audit-2026-05-XX.md scripts/check-contrast.js
git commit -m "docs(a11y): contrast audit identifies failing token combinations"
```

---

### Task 1.3: Fix contrast token failures

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Read current token definitions**

```bash
grep -n -- "--text-muted\|--accent-primary\|--text-secondary" src/styles/global.css | head -20
```

- [ ] **Step 2: Adjust failing tokens**

For each combination that failed in Task 1.2:

If `--text-muted` (#7C9BBF) on `--bg-primary` fails: lighten to `#94A3B8` (matches `--text-secondary`) or pick a hue between current values that hits ≥ 4.5:1. Use the audit script to verify before committing:

```bash
# Edit token, then re-run:
node scripts/check-contrast.js
```

Add new tokens if needed (per spec):
- `--accent-on-light: #B78A00;` (darker gold for small text on light/parchment surfaces)
- `--focus-ring-on-gold: var(--bg-primary);` (navy ring for focus on gold backgrounds)

Place these alongside the existing `--accent-primary` definition.

- [ ] **Step 3: Re-run audit**

```bash
node scripts/check-contrast.js
```

Expected: failures count should be 0 for the audited combinations.

- [ ] **Step 4: Verify build still passes**

```bash
npm run build
```

- [ ] **Step 5: Smoke test visual changes**

```bash
npm run dev
```

Spot-check the home page, a research page (HowThisWorks), and a tool — verify the brand still feels right. Token changes should be subtle.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "a11y(foundations): adjust contrast tokens to pass WCAG AA"
```

---

### Task 1.4: Add focus-visible system

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add global :focus-visible rule**

Add near the top of `global.css` (after token definitions):

```css
/* ============================================================
   Accessibility: focus visibility (WCAG 2.4.7 + 2.4.11)
   Default: 2px gold outline + 2px offset on dark surfaces.
   On gold/parchment surfaces, swap to navy via .on-gold-surface.
   ============================================================ */

:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.on-gold-surface :focus-visible,
.on-gold-surface:focus-visible {
  outline-color: var(--focus-ring-on-gold);
}

/* Suppress the default focus ring only when :focus-visible isn't matched
   (mouse click on a button, etc.) — keyboard focus always visible. */
:focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] **Step 2: Audit existing `outline: none` declarations**

```bash
grep -n "outline:\s*none\|outline:\s*0" src/styles/global.css
```

For each match:
- If it's the `:focus:not(:focus-visible)` rule above, skip
- If it's a deliberate suppression (e.g., `outline: none` on a custom-styled element), confirm the element has another visible focus indicator (border color change, glow, etc.)
- If it's a blanket suppression with no replacement, REMOVE it — `:focus-visible` will provide the indicator

- [ ] **Step 3: Apply `.on-gold-surface` to gold-bg elements**

Add the class in JSX where elements have a gold background:

```bash
grep -rn "sidebar-cta\|aa-cost-badge" src/components/
```

Add `className="... on-gold-surface"` to the gold-surfaced elements identified.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Tab through the app — every focusable element shows a clear gold ring (or navy ring on gold surfaces). No focus indicators should be invisible.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/
git commit -m "a11y(foundations): add :focus-visible system with on-gold-surface override"
```

---

### Task 1.5: Add skip-link

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add skip-link CSS**

Add to `global.css` near the focus-visible rule:

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: var(--space-md);
  background: var(--bg-card);
  color: var(--text-primary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  z-index: 9999;
  border: 2px solid var(--accent-primary);
  transform: translateY(0);
  transition: top 0.18s ease;
}
.skip-link:focus {
  top: var(--space-md);
}
@media (prefers-reduced-motion: reduce) {
  .skip-link { transition: none; }
}
```

- [ ] **Step 2: Add skip-link JSX**

In `src/App.jsx`, find the top-level return statement. As the first child of the outermost wrapper, add:

```jsx
<a href="#main-content" className="skip-link">Skip to main content</a>
```

- [ ] **Step 3: Add id="main-content" to main wrapper**

Find the `<main>` element (or the equivalent — likely in `MainContent.jsx` or directly in `App.jsx`). Add `id="main-content"`:

```jsx
<main id="main-content">
  ...
</main>
```

If there's no `<main>` element currently, wrap MainContent's outermost div in one.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

1. Click the page (to ensure focus is somewhere benign).
2. Press Tab — first Tab should reveal the "Skip to main content" link.
3. Press Enter — focus should move to `#main-content`.
4. Tab again — focus should be on the first element inside main, NOT in topbar/sidebar.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/styles/global.css src/components/layout/MainContent.jsx
git commit -m "a11y(foundations): add skip-to-main-content link (WCAG 2.4.1)"
```

---

### Task 1.6: Add route-change live region

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add visually-hidden CSS utility**

Add to `global.css`:

```css
/* sr-only / visually-hidden — content present in DOM, not visually rendered. */
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```

- [ ] **Step 2: Add route announcer to App.jsx**

In `App.jsx`, add a state-backed announcement string and a hashchange handler:

```jsx
const [routeAnnouncement, setRouteAnnouncement] = useState('');

useEffect(() => {
  function announceRoute() {
    const route = window.location.hash.slice(1) || 'home';
    const tool = ALL_TOOLS.find(t => t.id === route);
    const PAGE_TITLES = {
      'how-this-works': 'How this works',
      'data-classification': 'Classify your data',
      'storage-calculator': 'Research storage calculator',
      'tri-agency-policy': 'Tri-Agency RDM Policy',
      'grants-identifiers': 'Grants and identifiers',
      'lakehead-dataverse': 'Lakehead Dataverse',
      'drac-services': 'DRAC services',
      'acrobat-alternative': 'Adobe Acrobat alternative',
      'request-a-tool': 'Request a tool',
      'accessibility': 'Accessibility statement',  // future, Phase 6
    };
    const title = tool ? tool.name : (PAGE_TITLES[route] || 'Home');
    const fullTitle = `${title} — RDM Toolkit`;
    document.title = fullTitle;
    setRouteAnnouncement(`${title}, page loaded`);
  }
  announceRoute(); // fire on initial mount too
  window.addEventListener('hashchange', announceRoute);
  return () => window.removeEventListener('hashchange', announceRoute);
}, []);
```

(Adapt to App.jsx's existing route-detection structure — there is likely already a hashchange listener; integrate, don't duplicate.)

In the JSX, add the live region near the top of the body (after the skip-link):

```jsx
<div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden" id="route-announcer">
  {routeAnnouncement}
</div>
```

- [ ] **Step 3: Smoke test with screen-reader simulation**

```bash
npm run dev
```

1. Open DevTools → Elements → find the `#route-announcer` div.
2. Click any sidebar tool — verify the div's text content updates to e.g. `"Compress PDF, page loaded"`.
3. Use the back/forward buttons — verify it updates.

(A real SR announcement check requires NVDA/VoiceOver — out of scope for automated-only testing per spec. The DOM update is what we control.)

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/styles/global.css
git commit -m "a11y(foundations): add route-change live region for hash-based navigation"
```

---

### Task 1.7: Add prefers-reduced-motion global rule

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add global motion-reduction rule**

Add near the top of `global.css`, after token definitions:

```css
/* Honor user motion preferences (WCAG 2.3.3, 2.2.2). */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Audit existing animation rules**

```bash
grep -nE "animation:|transition:|@keyframes" src/styles/global.css
```

For each animation/transition rule, verify it's covered by the global override above. If not (e.g., one uses `animation-duration` directly with `!important`), refactor.

The CLAUDE.md notes that the timeline section in HowThisWorks already respects `prefers-reduced-motion` — verify it still does after this change.

- [ ] **Step 3: Smoke test**

In your OS settings, enable "Reduce motion" (Windows: Settings → Accessibility → Visual effects → Animation effects off). Run `npm run dev`, verify:
- Welcome tour transitions no longer animate
- Hover lifts on cards don't animate
- Gold shimmer effect is static

Restore your motion preference after testing.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "a11y(foundations): honor prefers-reduced-motion globally"
```

---

### Task 1.8: Semantic HTML audit — landmarks

**Files:**
- Modify: `src/components/layout/Topbar.jsx`
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/layout/MainContent.jsx` (if needed)
- Modify: `src/App.jsx` (if needed)

- [ ] **Step 1: Audit current landmarks per route**

Run the dev server and use DevTools' Accessibility tree (Chrome DevTools → Elements → Accessibility tab). For each major route (home, a tool, an info page), confirm the page has:

- Exactly one `<header role="banner">` (or `<header>`) — Topbar
- Exactly one `<nav>` for primary navigation — Sidebar
- Exactly one `<main>` — content area
- Optional `<aside>`, `<footer>`

- [ ] **Step 2: Fix Topbar to use `<header>`**

In `Topbar.jsx`, change the outermost element to `<header role="banner">`:

```jsx
<header role="banner" className="topbar">
  ...
</header>
```

- [ ] **Step 3: Fix Sidebar to use `<nav>` with label**

In `Sidebar.jsx`, change the outermost element:

```jsx
<nav aria-label="Tool navigation" className="sidebar">
  ...
</nav>
```

(Multiple navs on a page must have unique `aria-label`s.)

- [ ] **Step 4: Confirm `<main>` element**

Should be in place from Task 1.5. Verify:

```bash
grep -rn "<main" src/components/ src/App.jsx
```

Expected: exactly one `<main id="main-content">` rendered per route.

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

In DevTools Accessibility tree, for each of 3 representative routes (home, /#compress-pdf, /#tri-agency-policy), confirm:
- One `banner` landmark (Topbar)
- One `navigation` landmark with name "Tool navigation" (Sidebar)
- One `main` landmark
- No duplicate landmarks

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Topbar.jsx src/components/layout/Sidebar.jsx src/components/layout/MainContent.jsx src/App.jsx
git commit -m "a11y(foundations): use semantic header/nav/main landmarks across shell"
```

---

### Task 1.9: Semantic HTML audit — heading hierarchy

**Files:** various (audit only; fixes per-page)

- [ ] **Step 1: Audit h1 count per route**

Use DevTools Accessibility tree's "Headings" filter for each of these routes:

```
/
/#how-this-works
/#data-classification
/#storage-calculator
/#tri-agency-policy
/#grants-identifiers
/#lakehead-dataverse
/#drac-services
/#acrobat-alternative
/#request-a-tool
/#compress-pdf  (representative tool)
```

For each route, verify:
- Exactly **one** `<h1>` (more = WCAG violation; zero = also violation)
- No skips in hierarchy (no h2 → h4 jumps)

- [ ] **Step 2: Note findings**

Capture findings in a temporary file `tmp/h1-audit.md` listing routes that violate. Common patterns:
- An info page might have an `<h1>` AND the App-level tool header `<h1>` — the App.jsx tool-header pattern only emits an h1 for tools, but verify it doesn't fire on info-page routes.
- Some pages may use `<h1>` for the hero title AND `<h1>` for a section title.

- [ ] **Step 3: Fix violations**

For each violating route, edit the relevant page component to change extra `<h1>`s to `<h2>`. This is a per-component edit — no shared pattern.

If the App-level tool-header is firing on info pages incorrectly, fix the conditional in App.jsx (likely a check against the route being a tool).

- [ ] **Step 4: Re-audit**

Run through the routes again, confirm one h1 each.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/ src/App.jsx
git commit -m "a11y(foundations): enforce single h1 + unbroken heading hierarchy per route"
```

---

### Task 1.10: Decorative SVG/icon audit

**Files:** various (mostly UI primitives + page components)

- [ ] **Step 1: Find all SVG and Icon usage**

```bash
grep -rn "from 'lucide-react'\|<svg" src/ | head -40
```

- [ ] **Step 2: Categorize each usage**

For each lucide icon or inline SVG, determine if it's:
- **Decorative** (paired with text label that conveys the same meaning) → add `aria-hidden="true"`
- **Meaningful standalone** (icon-only button, no accompanying text) → ensure parent has `aria-label`, icon itself can stay `aria-hidden`

Common cases:
- Sidebar tool item icons: decorative (paired with tool name) → `aria-hidden`
- Topbar feedback button on mobile (icon-only): meaningful → button needs `aria-label="Send feedback"`, icon `aria-hidden`
- DropZone Upload icon: decorative (paired with text label) → `aria-hidden`

- [ ] **Step 3: Apply changes**

For lucide icons:
```jsx
<Upload size={36} className="dropzone-icon" aria-hidden="true" />
```

For meaningful icon-only buttons, ensure the wrapping element has the label:
```jsx
<button aria-label="Send feedback">
  <MessageSquare size={20} aria-hidden="true" />
</button>
```

- [ ] **Step 4: Re-run baseline scan**

```bash
npm run build
npm run a11y:baseline
```

Compare to Task 0.5's baseline. Decorative-icon-related rules (`svg-img-alt`, `image-alt`, `button-name`) should be substantially reduced.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "a11y(foundations): mark decorative icons aria-hidden, label icon-only buttons"
```

---

### Task 1.11: Draft patterns.md skeleton

**Files:**
- Create: `docs/accessibility/patterns.md`

- [ ] **Step 1: Create the doc**

Create `docs/accessibility/patterns.md`:

```markdown
# Accessibility patterns — RDM Toolkit

Conventions established in Phase 1. Phases 2–6 follow these. Updated as patterns are added.

## Focus ring

- Use `:focus-visible`, never `:focus` alone.
- Default: 2px gold (`var(--accent-primary)`) outline + 2px offset on dark surfaces.
- On gold or parchment surfaces, add `.on-gold-surface` class — outline switches to navy via `--focus-ring-on-gold`.
- Never `outline: none` without a visible replacement.
- Reference: [src/styles/global.css](../../src/styles/global.css) `:focus-visible` rule.

## alert vs status

- `role="alert"` (assertive — interrupts SR speech): fatal errors only — encrypted PDF, save failed, network error.
- `role="status"` (polite — queues): warnings, success messages, neutral updates.
- Canonical example: [DropZone.jsx:162-163](../../src/components/ui/DropZone.jsx) — error uses `alert`, warning uses `status`.

## Live regions

- Single global `#route-announcer` (App.jsx) for hash route changes — announces "<page title>, page loaded".
- Per-tool `aria-live="polite"` regions for result completion.
- Use `aria-busy="true"` on parent during long operations.

## Modals (Phase 2)

[Drafted in Phase 2.A — extracts existing FeedbackModal pattern into useModalAccessibility hook.]

## aria-current="page"

- Active sidebar tool/page link.
- Visual styling stays as-is (gold rail).

## aria-disabled vs disabled

- For buttons in busy/conditional states, prefer `aria-disabled="true"` over native `disabled`.
- Keeps button keyboard-focusable so SR users can hear *why* it's not actionable.

## External links

- Visually-hidden text `(opens in new tab)` alongside any external-link icon.

## Decorative icons

- All lucide icons paired with text get `aria-hidden="true"`.
- Meaningful standalone icons (icon-only buttons): button gets `aria-label`; icon gets `aria-hidden`.

## Tables

- `<th scope="col">` and `<th scope="row">` always.
- `<caption>` for non-trivial tables.

## Forms

- `<label htmlFor>` always — never placeholder-only labels.
- `<fieldset>` + `<legend>` for radio groups.

## Headings

- Single `<h1>` per route.
- No skips in hierarchy.

## Best-effort canvas tools (Phase 5)

[To be drafted in Phase 5.B — additive alternative pattern (typed name / coordinate form / numeric input). Never a replacement that regresses sighted UX.]

## Motion preferences

- Global `prefers-reduced-motion: reduce` rule in `global.css` zeroes all animations/transitions.
- Component-specific overrides should respect this — never bypass with `!important` unless equally bypassed in the reduce rule.
```

- [ ] **Step 2: Commit**

```bash
git add docs/accessibility/patterns.md
git commit -m "docs(a11y): draft accessibility patterns conventions doc"
```

---

### Task 1.12: Re-run baseline scan, capture Phase 1 delta

**Files:**
- Create: `docs/accessibility/baseline-after-phase-1-2026-05-XX.json`
- Create: `docs/accessibility/baseline-after-phase-1-2026-05-XX.md`

- [ ] **Step 1: Build + scan**

```bash
npm run build
npm run a11y:baseline
```

Note: this writes baseline files with today's date. Rename the new ones to indicate Phase 1 completion:

```bash
TODAY=$(date +%Y-%m-%d)
mv docs/accessibility/baseline-${TODAY}.json docs/accessibility/baseline-after-phase-1-${TODAY}.json
mv docs/accessibility/baseline-summary-${TODAY}.md docs/accessibility/baseline-after-phase-1-${TODAY}.md
```

(Adjust the rename for Windows; on Windows use `move` or PowerShell `Rename-Item`.)

- [ ] **Step 2: Compare to Phase 0 baseline**

Diff the totals — critical and serious counts should drop substantially. Top recurring rules should shift.

```bash
diff docs/accessibility/baseline-summary-*.md
```

- [ ] **Step 3: Update Phase 0 baseline summary**

Append a Phase 1 delta section to the Phase 0 summary file (or write a new short comparison file `docs/accessibility/phase-1-delta.md`). Note rules that moved, count of remaining issues — this is the input to Phase 2 scope.

- [ ] **Step 4: Commit**

```bash
git add docs/accessibility/baseline-after-phase-1-*.{json,md}
git commit -m "docs(a11y): post-Phase-1 baseline scan — foundations delta captured"
```

---

### Task 1.13: Open Phase 1 PR

- [ ] **Step 1: Push and open PR**

```bash
git push
```

PR title: `feat(a11y): Phase 1 — foundations (tokens, focus ring, skip link, route announcer, motion, semantic HTML)`

PR body should:
- Reference [docs/superpowers/specs/2026-05-03-aoda-compliance-plan-design.md](../specs/2026-05-03-aoda-compliance-plan-design.md)
- Reference `docs/accessibility/patterns.md`
- Link both baseline summaries (before / after)
- Include the contrast-audit table

---

# PHASES 2–6 — Outline (each gets its own plan doc)

These phases will be expanded into dedicated plan files when their time comes. Drafting them now in TDD detail would lock in assumptions about work 2 months out that will shift based on Phase 1 axe-baseline findings.

---

## Phase 2 — Shared UI Primitives (Days 7–13, 2–3 PRs)

**Plan doc:** `docs/superpowers/plans/2026-05-XX-aoda-phase-2-ui-primitives.md` (drafted at start of Phase 2)

**Scope:** 13 components in `src/components/ui/`: ActionButton, DropZone, EncryptedPDFError, ErrorCard, FeedbackModal, HowItWorks, InfoCard, RelatedTools, ResultPanel, SearchBar, ToolSkeleton, Tooltip, WelcomeTour.

**Key deliverables:**
- `useModalAccessibility` hook extracted from existing FeedbackModal pattern; applied to WelcomeTour
- `SearchBar` combobox ARIA pattern (role=combobox + aria-activedescendant + arrow-key list nav)
- ResultPanel live-region announcement on result completion
- Tooltip dismissible/hoverable/persistent (WCAG 2.2 SC 1.4.13)
- ActionButton aria-disabled + aria-busy semantics
- patterns.md updated with the modal hook API + canvas-fallback pattern (forward reference)

**Suggested PR split:**
- 2A: Modals + status/alert (FeedbackModal hook extraction, WelcomeTour, ErrorCard, InfoCard, ResultPanel, EncryptedPDFError)
- 2B: Form-style inputs + hover/focus content + lists (DropZone tweaks, SearchBar combobox, ActionButton, Tooltip, RelatedTools, ToolSkeleton, HowItWorks)

**Verification:** axe scan against home + 1 tool of each category; manual keyboard-only flow through search-open → result select → escape; manual keyboard-only flow through Feedback button → fill → escape.

---

## Phase 3 — Global Shell (Days 14–16, 1 PR)

**Plan doc:** `docs/superpowers/plans/2026-06-XX-aoda-phase-3-shell.md` (drafted at start of Phase 3)

**Scope:** `App.jsx`, `Topbar.jsx`, `Sidebar.jsx`, `MainContent.jsx`.

**Key deliverables:**
- Topbar: header[role=banner], aria-label on wordmark/search/feedback/hamburger, hamburger aria-expanded
- Sidebar: nav[aria-label], aria-current=page on active item, More-Tools toggle aria-expanded/aria-controls, mobile drawer reuses useModalAccessibility hook (focus trap, body scroll lock, aria-hidden on app root), category labels as h2, sister-site link external-tab indicator
- App.jsx: hash-router fires title + announcer (already done in Phase 1 Task 1.6 — verify), drag-drop overlay aria-hidden, ErrorBoundary fallback role=alert + focus moves, modal-stack manager
- patterns.md updated with sidebar/topbar/drawer conventions

**Verification:** axe scan against home + 3 representative routes; manual flow opening mobile drawer (resize browser to mobile width) → escape closes → focus returns; SR check that route announcer still fires after Phase 3 changes.

---

## Phase 4 — 9 Information Pages (Days 17–23, 3 PRs)

**Plan doc:** `docs/superpowers/plans/2026-06-XX-aoda-phase-4-info-pages.md` (drafted at start of Phase 4)

**Scope:**
- PR 4a (prose-heavy): HowThisWorks, RequestATool, GrantsAndIdentifiers
- PR 4b (interactive): DataClassification (wizard), StorageCalculator (canvas chart + new visible data table), DRACServices (tabs ARIA pattern)
- PR 4c (heavy content): TriAgencyPolicy (SVG flowchart text alternative + 3×3 matrix table), LakeheadDataverse, AcrobatAlternative

**Key deliverables:**
- StorageCalculator: visible data table beside the chart (decision: visible by default; single source of truth)
- TriAgencyPolicy SVG flowchart: ~150-word `<title>` + `<desc>` walking the YES/NO branches
- DRACServices tabs: role=tablist/tab/tabpanel + arrow-key nav + Home/End first/last
- DataClassification wizard: fieldset/legend per question, live-region updates on Edit Answers
- All FAQ accordions verified using native `<details>`/`<summary>`
- All tables: `<th scope>`, `<caption>` where non-trivial
- AcrobatAlternative cost badge: re-verified for contrast post-Phase-1 token changes

**Verification:** axe scan against each modified route; Lighthouse a11y ≥ 0.95 per route; manual tab-through DataClassification wizard end-to-end.

---

## Phase 5 — 46 Tools, Batched (Days 24–37, 7 PRs)

**Plan doc:** `docs/superpowers/plans/2026-06-XX-aoda-phase-5-tools.md` (drafted at start of Phase 5)

**Scope:**
- 5a — PDF easy (13): compress-pdf, merge-pdfs, split-pdf, rotate-pages, add-page-numbers, add-cover-page, pdf-page-inspector, pdf-to-images, extract-images-from-pdf, pdf-page-delete, pdf-watermark, password-protect-pdf, remove-pdf-password
- 5b — PDF hard / canvas (4): reorder-pages, fillable-pdf-form, sign-pdf, pdf-redaction
- 5c — Image (6): compress-image, resize-image, image-cropper, convert-image-format, strip-image-metadata, image-to-pdf
- 5d — Text & Data primary (8): word-counter, find-replace, text-diff, json-formatter, csv-json-converter, to-markdown, bibtex-formatter, data-anonymizer
- 5e — Privacy & Security primary (4): strip-file-metadata, encrypt-decrypt-text, password-generator, sha256-hasher
- 5f — Archives (3): create-zip, extract-zip, file-size-analyser
- 5g — More overflow (8): whitespace-cleaner, remove-duplicate-lines, csv-diff, csv-encoding-fixer, markdown-preview, magic-byte-checker, checksum-verifier, encoding-detector

**Common per-tool checklist:**
- Explicit `<label htmlFor>` for every form field — no placeholder-only labels
- Tool component does NOT emit a second `<h1>`
- Buttons named for their action ("Compress PDF" not "Submit")
- Color-only success/error paired with text or icon
- Result completion announced via ResultPanel's live region
- Disabled/busy buttons use `aria-disabled` + `aria-busy`

**Canvas-tool best-effort fallbacks (PR 5b):**
- sign-pdf: tab-style picker — Draw (canvas) | Type (cursive font) | Upload (image)
- pdf-redaction: tab-style picker — Draw rectangles | By coordinates (page + x/y/w/h form)
- image-cropper: numeric crop inputs alongside drag canvas
- fillable-pdf-form: keyboard mode for field nudging; field list as text alternative

**Verification:** axe scan against 1 representative tool per category after each batch PR; manual keyboard-only flow through canvas-tool fallback paths in PR 5b.

---

## Phase 6 — Deliverables + CI Gate (Days 38–41, 1–2 PRs)

**Plan doc:** `docs/superpowers/plans/2026-07-XX-aoda-phase-6-deliverables.md` (drafted at start of Phase 6)

**Scope:**
- New page: `src/components/pages/AccessibilityStatement.jsx` at `#accessibility`
- Sidebar link to accessibility page (Research Resources group, near How This Works)
- FeedbackModal: topic selector (radio: General feedback / Bug report / Accessibility barrier / Tool request); accessibility-barrier prefills subject + adds hint paragraph
- Hash query support: `#accessibility?topic=a11y` auto-opens modal with topic preselected
- Internal audit report: `docs/accessibility/audit-report-2026-07-XX.md` summarizing baseline → fixes → outstanding gaps
- axe-core CI gate in `.github/workflows/deploy.yml` (boots http-server, runs axe against 10 routes, fails on critical+serious only); start as informational for 1-2 weeks then flip to required
- patterns.md final review pass

**Statement page content sections:** What we've done · Scope · Conformance posture (best-effort, automated only, ~30–40% coverage cite Deque) · Known limitations (4 canvas tools by name + alternatives) · What stays accessible · Accessible formats notice · Report a barrier (links to FeedbackModal) · Standards reference · Why best-effort · Last reviewed.

**Verification:** axe CI gate runs cleanly for 1 week before flipping to required; manual flow: barrier-report from Statement page → modal opens with topic preselected → email client opens with prefilled subject; Lighthouse a11y ≥ 0.95 site-wide.

---

# Cross-cutting reminders

## Per-PR checklist (use as PR template)

```markdown
## Accessibility PR checklist

- [ ] axe-cli scan against affected route(s) shows zero critical/serious violations
- [ ] Lighthouse accessibility score ≥ 0.95 on affected route(s)
- [ ] Keyboard-only smoke test: Tab through, Enter activates, Escape closes modals
- [ ] No new `outline: none` declarations without a visible replacement
- [ ] Decorative icons marked `aria-hidden="true"`; meaningful icon-only buttons have `aria-label`
- [ ] All new form fields have explicit `<label htmlFor>`
- [ ] All new tables have `<th scope>` and (if non-trivial) `<caption>`
- [ ] No new `role="alert"` for non-fatal updates — use `role="status"`
- [ ] Conventions in [docs/accessibility/patterns.md](../docs/accessibility/patterns.md) followed; doc updated if new pattern added
- [ ] Smoke-tested at mobile width (< 768px) where applicable
```

## Commit cadence

- One commit per task in this plan (small, atomic)
- One PR per phase (or per sub-batch in Phases 2/4/5)
- Never amend after push

## What NOT to do

- ❌ Don't run axe against routes that aren't in the spec's 10-route sample without a reason — it's noisy
- ❌ Don't add unit tests just for accessibility (codebase has no test framework; axe CLI is the verification mechanism)
- ❌ Don't claim "WCAG 2.2 AA conformant" anywhere — the posture is "best-effort improvements toward". This is a legal distinction.
- ❌ Don't replace canvas tools with non-canvas alternatives — canvas stays the default; alternatives are *additive*

## When stuck

- Spec at [docs/superpowers/specs/2026-05-03-aoda-compliance-plan-design.md](../specs/2026-05-03-aoda-compliance-plan-design.md) is the source of truth for decisions
- Patterns at [docs/accessibility/patterns.md](../accessibility/patterns.md) for conventions
- WCAG 2.2 AA quickref: https://www.w3.org/WAI/WCAG22/quickref/?levels=aaa
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Deque axe rules reference: https://dequeuniversity.com/rules/axe/
