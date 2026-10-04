# Site Content Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship task-based navigation, new Thesis and Glossary pages, AI guidance, content review dates, and tool-page improvements described in `docs/superpowers/specs/2026-10-03-site-content-improvements-design.md`.

**Architecture:** Content lives in plain data modules under `src/data/` (workflows, glossary, content review, disambiguation) that node tests can import; React components only render them. Task progress rides in the hash query (`#tool?task=x&step=n`), parsed by a pure `src/utils/route.js`. New pages are statically imported like the existing ones, so no new JS chunk is created (the bundle-integrity gate rejects new chunk names).

**Tech Stack:** React 18, Vite 8 (Rolldown), plain CSS in `src/styles/global.css`, `node --test`.

**Delivery:** three stacked PRs. PR 1 = Tasks 1–7 on `claude/site-content-improvements-872695`. PR 2 = Tasks 8–14 on `claude/content-pages` branched from PR 1. PR 3 = Tasks 15–19 on `claude/tool-pages` branched from PR 2.

**Gates for every PR:** `npm test`, `npm run security:audit`, `npm run build`, bundle compare (`node scripts/bundle-integrity.mjs --compare <master json> --current <pr json> --max-growth-pct 10`), browser check on `npm run preview`, CLAUDE.md updated.

---

## PR 1 — Task-based navigation

### Task 1: Hash route parsing (`src/utils/route.js`)

**Files:** Create `src/utils/route.js`, `tests/route.test.mjs`. Modify `src/App.jsx:121-127`.

- [ ] **Step 1: Failing test** — `tests/route.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash } from '../src/utils/route.js';

const known = { pages: new Set(['tasks', 'glossary']), toolIds: new Set(['merge-pdfs']) };

test('empty hash is home', () => {
  assert.deepEqual(parseHash('', known), { page: null, toolId: null, params: {} });
});
test('tool and page paths', () => {
  assert.equal(parseHash('#merge-pdfs', known).toolId, 'merge-pdfs');
  assert.equal(parseHash('#tasks', known).page, 'tasks');
});
test('query params are split off the path', () => {
  const r = parseHash('#merge-pdfs?task=reb-package&step=2', known);
  assert.equal(r.toolId, 'merge-pdfs');
  assert.deepEqual(r.params, { task: 'reb-package', step: '2' });
});
test('unknown path is home, params dropped', () => {
  assert.deepEqual(parseHash('#nope?task=x', known), { page: null, toolId: null, params: {} });
});
test('buildHash round-trips and omits empty params', () => {
  assert.equal(buildHash('merge-pdfs', { task: 'reb-package', step: 2 }), 'merge-pdfs?task=reb-package&step=2');
  assert.equal(buildHash('tasks', {}), 'tasks');
  assert.equal(buildHash('tasks'), 'tasks');
});
```

- [ ] **Step 2:** `node --test tests/route.test.mjs` → FAIL (module not found).
- [ ] **Step 3: Implement** — `src/utils/route.js`

```js
// Hash routing: "#<path>?<query>". The path is a tool id or a page hash; the
// query carries optional state such as task progress (?task=…&step=…) or a
// glossary term (?term=…). Kept pure so it can be unit-tested in node.

export function parseHash(hash, { pages, toolIds }) {
  const raw = (hash || '').replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  if (!path) return { page: null, toolId: null, params: {} };
  const isPage = pages.has(path);
  const isTool = !isPage && toolIds.has(path);
  if (!isPage && !isTool) return { page: null, toolId: null, params: {} };
  const params = Object.fromEntries(new URLSearchParams(query));
  return { page: isPage ? path : null, toolId: isTool ? path : null, params };
}

export function buildHash(path, params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return path;
  return `${path}?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}
```

- [ ] **Step 4:** test passes.
- [ ] **Step 5: Wire into App** — replace `getRouteFromHash()`:

```js
const TOOL_IDS = new Set(ALL_TOOLS.map(t => t.id));
function getRouteFromHash() {
  const route = parseHash(window.location.hash, { pages: PAGES, toolIds: TOOL_IDS });
  return { ...route, task: getTaskFromParams(route.params) };   // getTaskFromParams from Task 2
}
```

`navigateTo(target)` must accept a full hash (`'merge-pdfs?task=…'`); its `isTool` check uses `target.split('?')[0]`. `grep -rn "location.hash" src` and confirm no other reader compares the raw hash to an id.
- [ ] **Step 6:** commit `feat(routing): parse hash query params`.

### Task 2: Workflow data (`src/data/workflows.js`)

**Files:** Create `src/data/workflows.js`, `tests/workflows.test.mjs`.

- [ ] **Step 1: Failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, WORKFLOWS, getWorkflow, getTaskFromParams, stepHash } from '../src/data/workflows.js';
import { ALL_TOOLS } from '../src/data/toolRegistry.js';

const toolIds = new Set(ALL_TOOLS.map(t => t.id));
const pageIds = new Set(['data-classification', 'storage-calculator', 'tri-agency-policy', 'lakehead-dataverse', 'thesis']);
const stageIds = new Set(STAGES.map(s => s.id));

test('ids are unique and stages valid', () => {
  const ids = WORKFLOWS.map(w => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const w of WORKFLOWS) assert.ok(stageIds.has(w.stage), w.id);
});
test('every step points at exactly one real tool or page and explains itself', () => {
  for (const w of WORKFLOWS) {
    assert.ok(w.steps.length >= 2, w.id);
    for (const s of w.steps) {
      assert.ok(Boolean(s.tool) !== Boolean(s.page), `${w.id}: tool xor page`);
      if (s.tool) assert.ok(toolIds.has(s.tool), `${w.id}: ${s.tool}`);
      if (s.page) assert.ok(pageIds.has(s.page), `${w.id}: ${s.page}`);
      assert.ok(s.why && s.why.length > 10, `${w.id}: why`);
    }
  }
});
test('getTaskFromParams validates id and step range', () => {
  const w = WORKFLOWS[0];
  assert.deepEqual(getTaskFromParams({ task: w.id, step: '1' }), { id: w.id, step: 1 });
  assert.equal(getTaskFromParams({ task: w.id, step: '0' }), null);
  assert.equal(getTaskFromParams({ task: w.id, step: String(w.steps.length + 1) }), null);
  assert.equal(getTaskFromParams({ task: 'nope', step: '1' }), null);
  assert.equal(getTaskFromParams({}), null);
});
test('stepHash builds the hash for a step', () => {
  const w = getWorkflow('verify-transfer');
  assert.equal(stepHash(w, 1), 'sha256-hasher?task=verify-transfer&step=1');
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** with the nine tasks from the spec table. Shape:

```js
import { buildHash } from '../utils/route.js';

export const STAGES = [
  { id: 'plan', label: 'Plan', blurb: 'Before you collect anything' },
  { id: 'collect', label: 'Collect', blurb: 'Gathering data and documents' },
  { id: 'analyse', label: 'Analyse', blurb: 'Cleaning and checking data' },
  { id: 'share', label: 'Share', blurb: 'Sending files to other people' },
  { id: 'preserve', label: 'Preserve', blurb: 'Depositing and archiving' },
];

export const WORKFLOWS = [ /* { id, title, stage, summary, keywords: [], featured?: true, note?, steps: [{ tool|page, why, caveat? }] } */ ];

export function getWorkflow(id) { return WORKFLOWS.find(w => w.id === id) || null; }
export function getTaskFromParams(params = {}) {
  const w = getWorkflow(params.task);
  const step = Number.parseInt(params.step, 10);
  if (!w || !Number.isInteger(step) || step < 1 || step > w.steps.length) return null;
  return { id: w.id, step };
}
export function stepHash(workflow, step) {
  const s = workflow.steps[step - 1];
  return buildHash(s.tool || s.page, { task: workflow.id, step });
}
```

`collect` has no task in the initial set; render stages that have tasks only (Tasks page filters empty stages). The `thesis` page id is valid in PR 1 tests ahead of the page itself; in PR 1 the thesis step is left out of `thesis-pdf` and added in Task 9.
- [ ] **Step 4:** pass. **Step 5:** commit `feat(tasks): workflow data`.

### Task 3: `usePreferences` hook

**Files:** Create `src/hooks/usePreferences.js`. Modify `scripts/security-audit.mjs:220-226` (add `'src/hooks/usePreferences.js'`).

```js
import { useState, useCallback } from 'react';

// Per-viewer UI preferences (currently: sidebar browse mode). Stored locally;
// wiped by ClearLocalData like everything else.
const STORAGE_KEY = 'rdm_prefs_v1';
const DEFAULTS = { browseMode: 'type' };

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch { return { ...DEFAULTS }; }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(read);
  const setPref = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  return [prefs, setPref];
}
```

- [ ] `npm run security:audit` passes. Commit `feat(prefs): usePreferences hook`.

### Task 4: WorkflowBar

**Files:** Create `src/components/ui/WorkflowBar.jsx`. Modify `src/App.jsx` (render above tool header and above page content when `route.task`), `src/styles/global.css` (`.workflow-bar*`).

Behaviour: `nav aria-label="Task progress"`; kicker "Task · Step N of M"; title links to `#tasks`; ordered mini-list of step names (current marked `aria-current="step"`); current `why` and `caveat` (amber); buttons Previous (hidden on step 1), Next (`stepHash(w, n+1)`) or Finish (→ `#tasks`), Exit task (→ current path without query). Step names: tool → registry name, page → `PAGE_TITLES` (pass as prop from App).

- [ ] Commit `feat(tasks): step-by-step bar`.

### Task 5: Tasks page

**Files:** Create `src/components/pages/Tasks.jsx`. Modify `src/App.jsx` (`PAGES`, `PAGE_TITLES['tasks'] = 'Common Tasks'`, render), `global.css` (`.tasks-*`).

Layout: `.htw` wrapper, `.htw-kicker` "Start from a goal", h1 "Common tasks", lede explaining the tools are the same — this just strings them together and nothing is uploaded between steps. One section per stage (stage label as `.htw-section-title`, blurb), cards with title, summary, numbered step list (names + why), optional note, "Start task" button (`navigateTo(stepHash(w, 1))`).

- [ ] Commit `feat(tasks): common tasks page`.

### Task 6: Sidebar browse mode + homepage section

**Files:** Modify `src/components/layout/Sidebar.jsx`, `src/components/home/HomePage.jsx`, `src/App.jsx` (pass prefs), `global.css` (`.sidebar-mode*`, `.homepage-tasks*`).

- Sidebar: `role="radiogroup" aria-label="Browse tools"` with two `role="radio"` buttons (By file type / By task) above the categories. Task mode renders stages → task buttons (start task; active when `route.task.id` matches) and a "See all tasks" link to `#tasks`; the More Tools block is hidden in task mode. Research Resources links unchanged; add "Common Tasks" link (`ListChecks` icon) at the top of that group.
- When a task is active, the sidebar shows task mode automatically for that session render (does not overwrite the saved preference).
- HomePage: "Start from a task" section after the bento — featured tasks (`featured: true`, four of them) as cards + "All tasks →" link.
- [ ] Commit `feat(tasks): sidebar task mode and homepage section`.

### Task 7: Search tasks and pages (`src/data/searchIndex.js`)

**Files:** Create `src/data/searchIndex.js`, `tests/searchIndex.test.mjs`. Modify `src/components/ui/SearchBar.jsx`.

```js
// tests/searchIndex.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchAll } from '../src/data/searchIndex.js';

test('finds tools by tag, tasks by title, pages by title', () => {
  assert.ok(searchAll('merge').some(r => r.kind === 'tool' && r.id === 'merge-pdfs'));
  assert.ok(searchAll('participant').some(r => r.kind === 'task'));
  assert.ok(searchAll('dataverse').some(r => r.kind === 'page' && r.id === 'lakehead-dataverse'));
});
test('tools rank before tasks before pages; capped', () => {
  const kinds = searchAll('pdf').map(r => r.kind);
  const order = { tool: 0, task: 1, page: 2, term: 3 };
  for (let i = 1; i < kinds.length; i++) assert.ok(order[kinds[i - 1]] <= order[kinds[i]]);
  assert.ok(kinds.length <= 10);
});
test('blank query returns nothing', () => { assert.deepEqual(searchAll('  '), []); });
```

`searchAll(query)` returns `{ kind, id, title, description, hash, emoji }[]`. Page entries are a local `SEARCHABLE_PAGES` array (hash, title, description, keywords) — single source used by search only. Glossary terms (`kind: 'term'`, hash `glossary?term=<id>`) are added in Task 11. SearchBar: use `searchAll`, render a small kind label for non-tool results, `handleSelect(hash)`. Placeholder text → "Search tools, tasks and guides…"; aria-label "Search".

- [ ] Commit `feat(search): include tasks and pages`.

**PR 1 close-out:** CLAUDE.md (pages table `#tasks`, directory structure, Recent Changes, test list), gates, browser run (start `share-participant-data` from the homepage → Next ×2 → Finish; Exit mid-task; toggle sidebar mode, reload, mode persists; search "participant"), PR.

---

## PR 2 — Pages and guidance (branch `claude/content-pages` from PR 1)

### Task 8: AI guidance

**Files:** Modify `src/components/pages/HowThisWorks.jsx` (new card in "Where This Model Ends" + FAQ entry), `src/data/toolRegistry.js` (to-markdown description: "Convert PDF, HTML, CSV, TXT, Markdown, RTF and JSON to clean Markdown for notes, documentation or other tools."), `src/data/toolExplainers.js` (`TOOL_CAVEATS['to-markdown']`, update explainer lines that mention AI).

Copy requirements: say that pasting into a web AI tool sends the text to that company's servers — the opposite of how this site works; check your data's classification first (link `#data-classification`); do not paste Confidential or identifiable participant data into an AI tool unless your REB approval and Lakehead's RDM office confirm that specific tool is permitted; de-identify first where you can (link De-identify); ask `INSTITUTION.rdmEmail`. Do not name an approved tool. Commit.

### Task 9: Thesis page

**Files:** Create `src/components/pages/ThesisAndDissertation.jsx`. Modify `src/data/institutionConfig.js` (add `graduateStudies: { name: 'Faculty of Graduate Studies', thesisProcessUrl, dissertationProcessUrl, licenceFormUrl, embargoFormUrl, embargoProcedureUrl }`, `knowledgeCommonsUrl`), `src/App.jsx` (`thesis`, title "Thesis & Dissertation"), `src/components/layout/Sidebar.jsx` (`GraduationCap` icon, after Grants & Identifiers), `src/data/workflows.js` (append thesis page step to `thesis-pdf`; add `'thesis'` to test page set), `global.css` (`.thesis-*` only if existing `.htw-*` classes are insufficient).

Sections: hero; "What FGS needs from your final PDF" (PDF/A, not locked or password-protected, no written or digital signatures — quote FGS once, link the process page; therefore do not use Password Protect PDF or Sign PDF on the final copy); "Assembling the PDF" (write it as one document in Word/LibreOffice and export PDF/A — Word: File → Save As → PDF → Options → "PDF/A compliant"; LibreOffice: Export as PDF → "Archive (PDF/A, ISO 19005)"; if you must combine PDFs, use Page Inspector + Merge, then convert with OCRmyPDF `--output-type pdfa` and check with veraPDF; our tools do not produce PDF/A); "Forms" (Licence to the University; optional embargo form + procedure); "Where it ends up" (Knowledge Commons); "The data behind your thesis" (consent forms decide what you may share; deposit shareable data in LU Dataverse; your supervisor's DMP may already govern it; keep identifiable data off personal cloud); "Start the task" button for `thesis-pdf`; contact FGS. Verify every URL returns 200 and Word/LibreOffice menu paths against Microsoft/LibreOffice help before writing. Commit.

### Task 10: Content review dates

**Files:** Create `src/data/contentReview.js`, `src/components/ui/ContentReviewed.jsx`, `docs/CONTENT-REVIEW.md`, `tests/contentReview.test.mjs`. Modify every research page (render `<ContentReviewed page="…" />` at the foot), `src/App.jsx` (listen for `rdm:open-feedback` → `openFeedback(null)`).

```js
// src/data/contentReview.js
export const CONTENT_REVIEW = {
  'how-this-works': '2026-09-30', 'tri-agency-policy': '2026-09-30', 'grants-identifiers': '2026-09-30',
  'data-classification': '2026-10-02', 'storage-calculator': '2026-09-30', 'lakehead-dataverse': '2026-09-30',
  'drac-services': '2026-09-30', 'acrobat-alternative': '2026-10-02', 'thesis': '2026-10-03',
  'glossary': '2026-10-03', 'tasks': '2026-10-03',
};
export function formatReviewDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}
```

Test: every key is a valid ISO date not in the future relative to a fixed "today" passed in; `formatReviewDate('2026-10-02') === '2 October 2026'`; required page list ⊆ keys. Component: `<p className="content-reviewed">Content last checked <time dateTime=…>…</time>. Spot something out of date? <button>Tell us</button></p>`. CONTENT-REVIEW.md: per page, a table of time-sensitive claims → source URL → date checked, plus a "how to review" checklist. Dates: use the dates the last accuracy passes actually covered each page (Sep 30 pass covered all sub-pages; Oct 2 covered Data Classification + Acrobat). Commit.

### Task 11: Glossary page

**Files:** Create `src/data/glossary.js`, `src/components/pages/Glossary.jsx`, `tests/glossary.test.mjs`. Modify `src/App.jsx`, Sidebar (`BookA` icon, last in Research Resources before Request a Tool), `src/data/searchIndex.js` (terms), HowThisWorks / TriAgencyPolicy / Thesis (one "Glossary" link each).

Entry shape `{ id, term, aka?: [], definition, related?: [termId], link?: { label, hash } }`. Test: ids unique and kebab-case; related ids resolve; definitions ≤ 400 chars. Page: A–Z button index; `?term=<id>` param scrolls to and highlights that entry on mount (read from `route.params`, passed as prop). Definitions must match how the rest of the site uses each term (e.g. coded data = TCPS 2 Art. 5.5 wording used in De-identify; FIPPA covers Ontario universities; PHIPA for health information). Commit.

### Task 12: Homepage resources

**File:** `src/components/home/HomePage.jsx` `RESEARCH_PAGES` → Classify, Storage, Tri-Agency, Grants & Identifiers, Lakehead Dataverse, Thesis, DRAC, Acrobat Alternative, Glossary (icons from lucide). Check the grid wraps cleanly at 3 columns / 1 column. Commit.

### Task 13: How This Works "On this page"

**File:** `HowThisWorks.jsx` — give each `<section>` an `id` and `tabIndex={-1}` heading; a `nav aria-label="On this page"` list of buttons calling `scrollToSection(id)` (smooth unless `prefers-reduced-motion`, then focus). CSS `.htw-toc*`. Commit.

### Task 14: DMP crosswalk

**File:** `TriAgencyPolicy.jsx` — new section "Writing your DMP: where to find each answer": table (scroll-region pattern: `tabIndex={0}`, `role="region"`, `aria-label`) of the seven DMP Assistant sections → what reviewers look for → resource on this site (button/links). Note that some funder templates use different headings. Commit.

**PR 2 close-out:** CLAUDE.md, gates, browser: all three new routes + every research page shows the review line, glossary `?term=` deep link, TOC scroll, 375 px, PR.

---

## PR 3 — Tool pages (branch `claude/tool-pages` from PR 2)

### Task 15: "Use this one when…"

**Files:** `src/data/toolExplainers.js` (`TOOL_DISAMBIGUATION` + `getDisambiguation(id)`), `src/components/ui/ToolCaveats.jsx` (named export `ToolDisambiguation`), `src/App.jsx` (render after header), CSS `.tool-disambig`, test in `tests/explainers.test.mjs` (every key and target id exists; each pair is defined both ways).

Shape: `{ 'strip-file-metadata': { other: 'strip-image-metadata', text: 'Only have photos? Strip Image Metadata shows every EXIF field (GPS, camera, timestamps) before removing it.' }, … }`. Commit.

### Task 16: 15 explainers

**File:** `src/data/toolExplainers.js`. For each tool, read its source file first and describe only what the code does (library, flow, limits). Update the header comment's coverage count to 38. Extend `tests/explainers.test.mjs`: each of the 15 ids has whatItDoes/howItWorks/privacy/verify.quick. One commit per ~5 explainers.

### Task 17: Search synonyms

**File:** `src/data/toolRegistry.js` tags. Extend `tests/searchIndex.test.mjs`: `shrink` → compress-pdf/compress-image; `combine` → merge-pdfs; `gps` → strip-image-metadata; `anonymise` → data-anonymizer; `black out` → pdf-redaction. Commit.

### Task 18: Sample file builders

**Files:** Create `src/utils/sampleFiles.js`, `tests/sampleFiles.test.mjs`.

- `buildSampleParticipantsCsv()` → string; header `participant_id,full_name,email,phone,site,interview_date,notes`; 8 rows of obviously fictional people (`example.org` emails, 555 numbers).
- `buildExifSegment({ make, model, lat, lon, dateTime })` → `Uint8Array` APP1 (`FF E1`, "Exif\0\0", big-endian TIFF, IFD0 Make/Model/DateTime + GPS IFD pointer; GPS IFD with lat/lon refs and rationals).
- `insertExif(jpegBytes, segment)` → bytes with segment after SOI.
- `createSampleCsvFile()`, `createSamplePhotoFile()` (canvas → JPEG blob → insertExif → `File`), `createSamplePdfFile()` (dynamic `import('@cantoo/pdf-lib')`, 2 pages of fictional interview notes with names/phone numbers to redact).

Test: CSV has 9 lines and 7 columns; `exifr.parse(insertExif(minimalJpeg, buildExifSegment({...})), { gps: true })` returns the lat/lon (±1e-4), Make and Model. Commit.

### Task 19: "Try a sample" in DropZone + three tools

**Files:** `src/components/ui/DropZone.jsx` (optional `sample` prop → button below the zone, `type="button"`, calls `sample.create()` then `processFiles([file])`; error → existing error state), `DataAnonymizer.jsx`, `PDFRedaction.jsx`, `StripImageMetadata.jsx` (pass `sample`), CSS `.drop-zone-sample`. Build and inspect `dist/assets`: if Rolldown emitted a `sampleFiles` chunk, pin `/src/utils/sampleFiles.js` to `'index'` in `vite.config.js` manualChunks. Commit.

**PR 3 close-out:** CLAUDE.md (explainer count, new data maps, sample files), gates, browser: disambiguation lines on all 12 tools, each sample loads and the tool processes it, explainers render, PR.
