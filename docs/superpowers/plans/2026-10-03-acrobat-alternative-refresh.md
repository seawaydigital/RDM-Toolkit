# Acrobat Alternative Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Adobe Acrobat Alternative page (`#acrobat-alternative`) accurate as of October 2026 and consistent with the rest of RDM Toolkit in data sourcing, wording and visual style.

> **Superseded in review:** only two honest cards set `standardCovers` (edit PDF text, complex PDF→Word). The signature card was excluded because Adobe lists bulk send and reusable e-sign templates as Pro-only. The section heading became "When paid Acrobat still earns its keep", and other review fixes are recorded in CLAUDE.md's 2026-10-03 Recent Changes row.

**Architecture:** All changes are in one page component, `src/components/pages/AcrobatAlternative.jsx`, plus its `.aa-*` rules in `src/styles/global.css`. Tool names and the tool count come from `src/data/toolRegistry.js` (the way `HomePage.jsx` already does it). Adobe prices sit in one constant with their source and check date. A new `node --test` file guards the registry links. The page itself is JSX, which `node --test` cannot import, so the test reads the source text (the same approach `scripts/security-audit.mjs` takes).

**Tech Stack:** React 18, Vite 8, plain CSS in `global.css`, Node built-in test runner.

**Source:** the 2026-10-02 audit of this page (in conversation). Verified facts this plan relies on:
- Adobe Canada, Individuals → Annual, prepaid (read 2026-10-02 from adobe.com/ca/acrobat/plans.html): Acrobat Pro **C$311.88/yr**, Acrobat Standard **C$239.88/yr**, both before tax. Pro × 1.13 HST = C$352.42, so the page's $352 is right.
- Adobe's own comparison table lists these as **Standard** features, not Pro-only: "Edit text and images in PDFs", "Export PDFs to Word, Excel, and PowerPoint files", "Sign documents, request signatures, and track responses". Pro-only: OCR ("Turn scans into editable PDFs"), redaction, comparing PDFs.
- Lakehead runs Google Workspace for staff and students (lakeheadu.ca helpdesk pages). Excel's Get Data → From PDF is Windows-only. NAPS2 and Stirling-PDF claims are still accurate. All 9 external links return 200.

---

## Before you start: owner decisions

These change copy only. Each has a default so the work is not blocked.

1. **Is the $177 "Lakehead internal" rate still current for 2026–27?** It was added in April 2026 (commit `6885ea2`) and has no public source. *Default:* keep $177 and its label.
2. **Does Lakehead license an e-signature service** (e.g. DocuSign, Adobe Sign) that the page should name? *Default:* say "ask your department what is already licensed" and name no office (Task 3).

---

**Line numbers** below are from master at `dfa94e4`. They shift as earlier tasks land, so find each edit by the quoted code rather than the number.

---

## File map

| File | Change |
|---|---|
| `tests/acrobat-alternative.test.mjs` | **Create.** Guards: every tool the page links to exists; no hard-coded tool count. |
| `src/components/pages/AcrobatAlternative.jsx` | **Modify.** Registry-derived chips and count; one Adobe price constant; Acrobat Standard notes; copy fixes; calculator input and toggle fixes; editorial kicker. |
| `src/styles/global.css` (`.aa-*`, ~lines 12480–13330) | **Modify.** Editorial hero/section-title styling to match the other resource pages; new `.aa-honest-standard`; remove the unused `.aa-hero-eyebrow`. |
| `CLAUDE.md` | **Modify.** Pages table row for `#acrobat-alternative`; Recent Changes row; tests list. |

---

### Task 1: Tool chips and tool count come from the registry

Six of the ten "Research-specific tools" chips use a different name from the tool page they open (e.g. "SHA-256 File Hasher" opens "SHA-256 Hash Generator"). "Explore all 46 tools" is hard-coded; `HomePage.jsx` counts from the registry.

**Files:**
- Create: `tests/acrobat-alternative.test.mjs`
- Modify: `src/components/pages/AcrobatAlternative.jsx` (imports at lines 1–7; chip block at lines 562–582)

- [ ] **Step 1: Write the failing tests**

Create `tests/acrobat-alternative.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';

// The page is JSX, which node --test cannot import, so these checks read the
// source text — the same approach scripts/security-audit.mjs takes.
const SOURCE = readFileSync(
  new URL('../src/components/pages/AcrobatAlternative.jsx', import.meta.url),
  'utf8',
);
const KNOWN_IDS = new Set(ALL_TOOLS.map((t) => t.id));

test('every tool the page links to exists in the registry', () => {
  const tableIds = [...SOURCE.matchAll(/toolId: '([^']+)'/g)].map((m) => m[1]);
  const chipBlock = SOURCE.match(/const BEYOND_TOOL_IDS = \[([^\]]*)\]/);
  assert.ok(chipBlock, 'chips should be listed by id in BEYOND_TOOL_IDS');
  const chipIds = [...chipBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  assert.ok(tableIds.length >= 19, 'coverage table should link its RDM rows');
  assert.equal(chipIds.length, 10);
  assert.deepEqual([...tableIds, ...chipIds].filter((id) => !KNOWN_IDS.has(id)), []);
});

test('the page does not hard-code the tool count', () => {
  assert.doesNotMatch(SOURCE, /all \d+ tools/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/acrobat-alternative.test.mjs`
Expected: 2 failures: "chips should be listed by id in BEYOND_TOOL_IDS", and the second test matching `all 46 tools`.

- [ ] **Step 3: Implement**

In `AcrobatAlternative.jsx`, add the registry import after the `lucide-react` import (line 7):

```jsx
import { ALL_TOOLS, getToolById } from '../../data/toolRegistry';
```

Add this constant directly above `/* ─── Component ───` (line 238):

```jsx
/* Research tools shown in the "Beyond Acrobat" card. Names come from the
   registry so the chip always matches the tool page it opens. */
const BEYOND_TOOL_IDS = [
  'data-anonymizer',
  'sha256-hasher',
  'bibtex-formatter',
  'csv-json-converter',
  'encrypt-decrypt-text',
  'to-markdown',
  'password-generator',
  'checksum-verifier',
  'csv-diff',
  'encoding-detector',
];
```

Replace the chip block and the "Explore all" link (lines 562–582, from `<div className="aa-beyond-chips">` through the closing `</a>` of `.aa-beyond-all`) with:

```jsx
          <div className="aa-beyond-chips">
            {BEYOND_TOOL_IDS.map((id) => getToolById(id)).filter(Boolean).map((tool) => (
              <a key={tool.id} href={`#${tool.id}`} className="aa-beyond-chip">
                {tool.name}
              </a>
            ))}
          </div>
          <a href="#" className="aa-beyond-all" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
            Explore all {ALL_TOOLS.length} tools →
          </a>
```

(`href=""` became `href="#"`: an empty href points at the current page, not home.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/acrobat-alternative.test.mjs`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add tests/acrobat-alternative.test.mjs src/components/pages/AcrobatAlternative.jsx
git commit -m "Acrobat Alternative: take tool names and count from the registry"
```

---

### Task 2: One source for Adobe prices, and say where Acrobat Standard is enough

Three "Pro still wins when…" cards (editing PDF text, complex PDF → Word, sending for signature) describe jobs Adobe's cheaper Acrobat Standard also does. The retail price has no visible source or date.

**Files:**
- Modify: `src/components/pages/AcrobatAlternative.jsx` (lines 9–14 `PRICE_TIERS`; `HONEST_CASES` lines 181–236; coverage row line 140; hero badge line 270; honest intro lines 508–512; honest card render lines 540–542)
- Modify: `src/styles/global.css` (after `.aa-honest-prowins strong`, ~line 13195)

- [ ] **Step 1: Replace the pricing block (lines 9–14)**

```jsx
/* ─── Pricing ───────────────────────────────────────────────────────────── */

/* Adobe's Canadian retail prices, read from adobe.com/ca/acrobat/plans.html
   (Individuals → Annual, prepaid) on 2026-10-02. Both exclude tax. Re-check
   before each academic year. The Lakehead rate comes from the owner, not a
   public page. */
const ADOBE_CA = {
  checked: 'October 2026',
  proAnnual: 311.88,
  standardAnnual: 239.88,
};
const ONTARIO_HST = 0.13;

const PRICE_TIERS = [
  { id: 'low',  amount: 177, label: 'Lakehead internal', hint: 'Lakehead enterprise licensing, paid up-front for the full year' },
  {
    id: 'high',
    amount: Math.round(ADOBE_CA.proAnnual * (1 + ONTARIO_HST)),
    label: 'Retail (with HST)',
    hint: `Adobe’s Canadian price for an individual annual plan (C$${ADOBE_CA.proAnnual}, ${ADOBE_CA.checked}) plus 13% Ontario HST`,
  },
];
```

`Math.round(311.88 * 1.13)` is 352, so the calculator output does not change.

- [ ] **Step 2: Drive the hero badge from the tiers (line 270)**

```jsx
          <span className="aa-cost-paid">${PRICE_TIERS[0].amount}–${PRICE_TIERS[1].amount}&thinsp;/&thinsp;year</span>
```

- [ ] **Step 3: Flag the three cases Standard covers**

In `HONEST_CASES`, add `standardCovers: true,` as the last property of these three objects:
- `title: 'Editing the existing text or images in a PDF'`
- `title: 'Converting PDFs with complex layouts to Word'`
- `title: 'Sending documents out for signature'`

Example (the editing case after the change):

```jsx
  {
    title: 'Editing the existing text or images in a PDF',
    free: [
      { name: 'LibreOffice Draw', url: 'https://www.libreoffice.org', note: 'open source, all platforms; opens each text block as editable. Best for short fixes, and there is a learning curve.' },
    ],
    proWins: 'you edit PDFs often, or need paragraphs to reflow cleanly after an edit.',
    standardCovers: true,
  },
```

- [ ] **Step 4: Render the Standard note (replace lines 540–542)**

```jsx
                <p className="aa-honest-prowins">
                  <strong>{c.standardCovers ? 'Paid Acrobat still wins when' : 'Pro still wins when'}</strong> {c.proWins}
                </p>
                {c.standardCovers && (
                  <p className="aa-honest-standard">
                    You don’t need Pro for this: Acrobat Standard does it too, for
                    C${ADOBE_CA.standardAnnual} a year before tax instead of C${ADOBE_CA.proAnnual}.
                  </p>
                )}
```

- [ ] **Step 5: Update the honest-section intro (lines 508–512)**

```jsx
        <p className="aa-section-intro">
          Seven jobs RDM Toolkit can't do. Most have a free answer; each card says when
          paying for Acrobat is still worth it, and three of them don't need Pro at all —
          the cheaper Acrobat Standard does them. If none of these match your workflow,
          the toolkit above will likely serve you just as well.
        </p>
```

- [ ] **Step 6: Update the complex-layout coverage row (line 140)**

```jsx
      { task: 'PDF → Word (complex layouts)',        badge: 'gap',       label: 'No reliable free option — a paid Acrobat plan (Standard is enough) or another paid converter' },
```

- [ ] **Step 7: Add the CSS** after the `.aa-honest-prowins strong` rule (~line 13195):

```css
.aa-honest-standard {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: var(--space-xs) 0 0;
}
```

- [ ] **Step 8: Check and commit**

Run: `npm test`
Expected: all pass (the Task 1 tests still find 10 chips and every table id).

```bash
git add src/components/pages/AcrobatAlternative.jsx src/styles/global.css
git commit -m "Acrobat Alternative: source Adobe prices and note where Acrobat Standard is enough"
```

---

### Task 3: Copy accuracy fixes

**Files:**
- Modify: `src/components/pages/AcrobatAlternative.jsx` (LibreOffice `covers` lines 89–94; Compare row line 150; e-signature note line 223; hero subtitle lines 260–266)

- [ ] **Step 1: Hero subtitle (lines 260–266).** Only two of the five tools come through Lakehead, and the default calculator rate ($177) is not "a few hundred dollars".

```jsx
        <p className="aa-hero-subtitle">
          Before your next renewal, it's worth taking stock of what you actually use
          Acrobat Pro for. For most research workflows at Lakehead, those features are
          already covered by free tools — two of them provided through Lakehead — so you
          may be able to stop paying for a subscription that is quietly auto-renewing.
        </p>
```

- [ ] **Step 2: LibreOffice card (lines 89–94).** "Appropriate for OCAP® & PHIPA-governed data" is a compliance claim: whether a tool is allowed depends on the ethics protocol or data agreement, and claims like this were softened elsewhere on 2026-10-02. "Nothing leaves your device — ever" then repeats it.

```jsx
    covers: [
      'Small in-place text fixes in a PDF (opens in Draw)',
      'Export Writer & Calc files to PDF',
      'Works fully offline, so files never need to be uploaded',
      'Free and open source, for Windows, Mac and Linux',
    ],
```

- [ ] **Step 3: Compare row (line 150).** Word compares Word files. Acrobat Pro compares two PDFs.

```jsx
      { task: 'Compare two versions of a document',    badge: 'microsoft', label: 'Microsoft Word (Review → Compare) — for two PDFs, open each in Word first' },
```

- [ ] **Step 4: E-signature note (line 223).** "The Research Office" does not license e-signature tools. Apply owner decision 2. Default:

```jsx
      { name: 'Your unit’s e-signature service', url: null, note: 'ask your department what is already licensed.' },
```

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/AcrobatAlternative.jsx
git commit -m "Acrobat Alternative: correct Lakehead, LibreOffice and Word Compare wording"
```

---

### Task 4: Calculator input and plan toggles

From the code: clearing the user-count field turns it back into "1" straight away (`parseInt('') || 1` feeds a controlled input), so typing 25 gives 125. The plan buttons use `role="radio"` without the arrow-key handling that role needs. No other page uses `role="radio"`, and plain toggle buttons with `aria-pressed` need no extra keyboard code.

**Files:**
- Modify: `src/components/pages/AcrobatAlternative.jsx` (state lines 241–242; inputs lines 296–315; tiers lines 327–345)

- [ ] **Step 1: Reproduce the bug first.** Start the preview (see Task 6, Step 1), open `#acrobat-alternative`, and run in `javascript_tool`:

```js
const input = document.querySelector('.aa-calc-number');
const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setValue.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
const afterClear = input.value;
setValue.call(input, '25'); input.dispatchEvent(new Event('input', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
({ afterClear, field: input.value, formula: document.querySelector('.aa-calc-result-formula').textContent });
```

Expected **before** the fix: `afterClear: "1"`. If it already prints `""`, the bug does not reproduce: skip Steps 2–3 and say so in the PR.

- [ ] **Step 2: Keep a text value for the number field.** After `const [users, setUsers] = useState(1);` add:

```jsx
  const [usersText, setUsersText] = useState('1');
```

Replace the slider `onChange` (line 303):

```jsx
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setUsers(n);
                    setUsersText(String(n));
                  }}
```

Replace the number input's `value` and `onChange` (lines 311–312):

```jsx
                  value={usersText}
                  onChange={(e) => {
                    setUsersText(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n)) setUsers(n);
                  }}
                  onBlur={() => setUsersText(String(safeUsers))}
```

While the field is empty the result keeps the last valid count. On blur the field shows the clamped value (1–500).

- [ ] **Step 3: Toggle buttons instead of radios.** Replace lines 327 and 333–335:

```jsx
              <div className="aa-calc-tiers" role="group" aria-label="Acrobat Pro plan tier">
```

```jsx
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTierId(t.id)}
                      className={`aa-calc-tier${active ? ' aa-calc-tier--active' : ''}`}
                    >
```

- [ ] **Step 4: Re-run the Step 1 snippet.** Expected: `afterClear: ""`, `field: "25"`, `formula: "25 users × $177/yr (lakehead internal)"`. Then run:

```js
[...document.querySelectorAll('.aa-calc-tier')].map((b) => [b.textContent.slice(0, 4), b.getAttribute('aria-pressed')]);
```

Expected: `[["$177","true"],["$352","false"]]`.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/AcrobatAlternative.jsx
git commit -m "Acrobat Alternative: let the user count be retyped; plan tiers as toggle buttons"
```

---

### Task 5: Match the editorial style of the other resource pages

The 2026-04-17 editorial rollout covered How This Works, Request a Tool, Data Classification, Storage Calculator, Tri-Agency, DRAC and Dataverse, but not this page. It still has a grey sans eyebrow, a bold sans `h1`, and plain bold section titles. The pattern elsewhere: gold `.htw-kicker` (reused directly by DataClassification, GrantsAndIdentifiers, RequestATool, AccessibilityStatement), a Fraunces parchment title (`.tap-title`/`.drac-title`: 40px, weight 500), and Fraunces section titles with a hairline rule (`.htw-section-title`).

**Files:**
- Modify: `src/components/pages/AcrobatAlternative.jsx` (hero lines 255–258)
- Modify: `src/styles/global.css` (`.aa-hero-eyebrow` ~12490, `.aa-hero-title` ~12502, `.aa-calc-section .aa-section-title` ~12557–12565, `.aa-section-title` ~12829, `.aa-honest-header` ~13083, the `@media (max-width: 767px)` block ~12810)

- [ ] **Step 1: Kicker.** Replace lines 255–258:

```jsx
        <div className="htw-kicker">Subscription review</div>
```

`CircleDollarSign` is still used by the calculator label, so keep its import.

- [ ] **Step 2: Delete the `.aa-hero-eyebrow { … }` rule** (~line 12490). Nothing else uses it: `grep -n "aa-hero-eyebrow" src -r` should return nothing after Step 1.

- [ ] **Step 3: Replace the `.aa-hero-title` rule** (~line 12502) with:

```css
.aa-hero-title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 500;
  font-variation-settings: "opsz" 72, "SOFT" 40;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--text-parchment);
  margin-bottom: var(--space-md);
}
```

- [ ] **Step 4: Replace the `.aa-section-title` rule** (~line 12829) with the flex-rule pattern:

```css
.aa-section-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  font-variation-settings: "opsz" 36, "SOFT" 40;
  letter-spacing: -0.01em;
  color: var(--text-parchment);
  margin-bottom: var(--space-sm);
}

.aa-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border-hairline) 0%, transparent 100%);
}
```

- [ ] **Step 5: Fix the two headings that override it.** Replace the `.aa-calc-section .aa-section-title { display: inline-flex; … }` rule (~line 12557) with the version below. `inline-flex` would shrink the heading so the rule gets no width. Keep the `svg` colour rule after it.

```css
.aa-calc-section .aa-section-title {
  align-items: center;
}
```

The honest-section `h2` sits in a flex row beside its icon, so let it take the rest of the row. Add after `.aa-honest-header { … }` (~line 13083):

```css
.aa-honest-header .aa-section-title {
  flex: 1;
}
```

- [ ] **Step 6: Mobile size.** Inside the existing `@media (max-width: 767px)` block that starts ~line 12810, add:

```css
  .aa-hero-title {
    font-size: 32px;
  }
```

- [ ] **Step 7: Commit**

```bash
git add src/components/pages/AcrobatAlternative.jsx src/styles/global.css
git commit -m "Acrobat Alternative: editorial kicker, title and section rules like the other resource pages"
```

---

### Task 6: Verify on the production build

- [ ] **Step 1: Build and serve.** Run `npm run build`. If port 4173 is free, `preview_start` with name `RDM Toolkit — Preview (production build)`. If another session holds it, add this entry to `.claude/launch.json` temporarily and start it by name, then revert the file with `git checkout -- .claude/launch.json` at the end:

```json
    {
      "name": "RDM Toolkit — Preview alt",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "preview", "--", "--port", "4176", "--strictPort"],
      "port": 4176
    }
```

- [ ] **Step 2: Page checks.** Navigate to `/#acrobat-alternative` and run:

```js
await new Promise((r) => setTimeout(r, 1500));
({
  title: document.title,
  h1: document.querySelectorAll('h1').length,
  kicker: document.querySelector('.aa-hero .htw-kicker')?.textContent,
  titleFont: getComputedStyle(document.querySelector('.aa-hero-title')).fontFamily,
  badge: document.querySelector('.aa-cost-paid').textContent,
  standardNotes: document.querySelectorAll('.aa-honest-standard').length,
  chips: [...document.querySelectorAll('.aa-beyond-chip')].map((a) => a.textContent),
  explore: document.querySelector('.aa-beyond-all').textContent,
  retailHint: [...document.querySelectorAll('.aa-calc-tier-hint')][1].textContent,
  overflow: document.documentElement.scrollWidth > innerWidth,
});
```

Expected: title `Adobe Acrobat Alternative — RDM Toolkit`; `h1: 1`; kicker `Subscription review`; titleFont starting `Fraunces`; badge `$177–$352 / year` (with thin spaces); `standardNotes: 3`; chips include `SHA-256 Hash Generator`, `Strong Password Generator`, `Character Encoding Detector`; explore `Explore all 46 tools →`; retail hint containing `C$311.88, October 2026`; `overflow: false`.

- [ ] **Step 3: Calculator.** Re-run both snippets from Task 4, Step 4. Expected output as stated there.

- [ ] **Step 4: Console.** `read_console_messages` with `onlyErrors: true`. Expected: none.

- [ ] **Step 5: Phone width.** `resize_window` preset `mobile`, reload, re-run the Step 2 snippet. Expected: `overflow: false`. Then `resize_window` preset `desktop`. If the pane reports `innerWidth` 0 (CLAUDE.md Known gap #7), check the 375 px layout by hand instead.

- [ ] **Step 6: Screenshots.** Take a `screenshot` of the hero at desktop width, and one of the honest section showing a Standard note, for the PR.

- [ ] **Step 7: Accessibility scan.** This route is not in `scripts/axe-baseline.mjs`, so scan it directly while the preview runs:

```bash
npx axe "http://localhost:4176/#acrobat-alternative" --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --exit
```

Use port 4173 if Step 1 used the standard preview. Expected: `0 violations found!`. If chromedriver cannot start (seen before on this machine), record that in the PR rather than claiming a pass. Then run `npm run a11y:contrast` (expected exit 0). The new colours are existing tokens (`--text-parchment`, `--accent-primary`).

- [ ] **Step 8: Guardrails.**

```bash
npm test
npm run security:audit
```

Expected: all tests pass (previous 57 + 2 new = 59); security audit passes with 46 tools.

- [ ] **Step 9: Stop the preview** (`preview_stop`) and revert any temporary `.claude/launch.json` change.

---

### Task 7: Docs and PR

**Files:**
- Modify: `CLAUDE.md` (Pages table row for `#acrobat-alternative`; top of the Recent Changes table; `npm test` row in Local scripts)

- [ ] **Step 1: Pages table.** In the `#acrobat-alternative` row, replace the sentence that begins "When Acrobat Pro still earns its keep" with:

```
"When Acrobat Pro still earns its keep" is a `HONEST_CASES` array of 7 gaps (edit PDF text, OCR, complex PDF→Word, accessibility, search-redact, sending for signature, PKI signatures), each with a vetted free option and a "Pro still wins when…" line; three cases set `standardCovers` and show that Acrobat Standard is enough. Adobe prices live in the `ADOBE_CA` constant with their source and check date (re-check each academic year); the "Beyond Acrobat" chips and tool count come from the registry (`BEYOND_TOOL_IDS`, guarded by `tests/acrobat-alternative.test.mjs`).
```

- [ ] **Step 2: Recent Changes.** Add this row at the top of the table (use the actual merge date):

```
| 2026-10-03 | **Acrobat Alternative refresh** — follow-up to the 2026-10-02 audit. **Accuracy:** Adobe's own plan table shows Acrobat Standard (C$239.88/yr) edits PDF text, exports to Word and sends for signature, so the three matching honest cards now say Standard is enough; prices moved into one `ADOBE_CA` constant with source and check date (retail tier still C$352 = C$311.88 + 13% HST); hero no longer says "most" tools come through Lakehead (two do); LibreOffice card no longer claims to be "appropriate for OCAP® & PHIPA-governed data"; Word Compare row notes it works on Word files. **Consistency:** chips and "Explore all N tools" come from the registry (6 of 10 chip names differed from their tool pages); editorial kicker, Fraunces title and flex-rule section titles like the other resource pages. **Calculator:** the user-count field can be cleared and retyped (it snapped back to 1); plan tiers are `aria-pressed` toggles instead of an incomplete radio pattern. New `tests/acrobat-alternative.test.mjs`. |
```

- [ ] **Step 3: Tests list.** In the Local scripts `npm test` row, add before the final sentence: `` `tests/acrobat-alternative.test.mjs` checks every tool the Acrobat Alternative page links to exists and that it doesn't hard-code the tool count; ``.

- [ ] **Step 4: Commit and open the PR**

```bash
git add CLAUDE.md
git commit -m "docs: record the Acrobat Alternative refresh"
git push -u origin claude/adobe-acrobat-page-audit-fb3ecf
gh pr create --base master --title "Acrobat Alternative: Acrobat Standard, registry-driven chips, editorial styling" --body-file <scratchpad>/pr-body.md
```

The PR body should list the verified facts from the plan header, the owner decisions and what was chosen, the Task 6 results (including whether the axe scan ran), and the two screenshots. End it with the attribution line from the session. Then call `get_status` / `bind_pr` per the session's PR rules.
