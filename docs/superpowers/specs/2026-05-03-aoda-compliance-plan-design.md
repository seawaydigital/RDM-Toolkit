# AODA Compliance Plan — RDM Toolkit

**Date:** 2026-05-03
**Status:** Design (pre-implementation)
**Owner:** Andrew Austin (andrew@seawaydigital.ca)
**Target site:** rdmtoolkit.ca (this codebase)

---

## Executive summary

Bring the RDM Toolkit site to a defensible "best-effort improvements toward WCAG 2.2 Level AA" posture before formal user testing begins. Six phases over ~11 calendar weeks, ~30–40 working days of effort, ~17 pull requests. Bookended by an axe-core baseline (Phase 0) and an axe-core CI gate (Phase 6). Foundations and shared UI primitives are fixed once and inherited everywhere — so by the time we get to the 46 tools, most are tweaks rather than rewrites.

This is not a formal WCAG conformance claim. The Accessibility Statement page that ships in Phase 6 will explicitly state the posture, the limitations, and how users can report barriers.

---

## Decisions (from brainstorming, 2026-05-03)

| # | Question | Answer |
|---|---|---|
| 1 | Standard | **WCAG 2.2 Level AA** (forward-proofs the audit; aligns with where Canadian higher-ed accessibility offices are landing) |
| 2 | Scope | rdmtoolkit.ca only. Design fixes (CSS variables, shared UI primitives, ARIA patterns) so RS Toolkit can adopt them as a follow-up. GitHub repo artifacts (README, CONTRIBUTING) out of scope — they are developer docs, not the public service. |
| 3 | Timeline | Pre-launch sweep — ship before formal user testing starts. Self-paced. Realistic target launch-readiness: **2026-07-17**. |
| 4 | Testing | Automated only (axe-core + Lighthouse already running). **Best-effort posture in public claims** — never "WCAG 2.2 AA conformant". Phrases used: "best-effort improvements toward WCAG 2.2 AA", "no critical or serious axe violations on representative routes". |
| 5 | Deliverables | Accessibility Statement page (`#accessibility`), accessibility-barrier feedback channel (extend FeedbackModal), accessible-formats notice, internal audit report, axe-core CI gate. Skip VPAT / ACR. |

---

## Approach: Foundation-first hybrid (six phases)

Rejected alternatives: "Top-down by Success Criterion" (each SC touches dozens of files; unshippable), "Bottom-up by surface, one PR per page/tool" (~55 PRs; same SC re-solved 50+ times; pattern drift risk).

**Why foundation-first wins:** with shared primitives clean (Phase 2), most of the 46 tools become tweaks rather than rewrites. ~17 PRs total.

| Phase | Focus | Effort | PRs |
|---|---|---|---|
| 0 | Baseline scan + axe-core dev tooling | 1 day | 1 |
| 1 | Design tokens + foundation fixes | 3–5 days | 1 |
| 2 | Shared UI primitives (12 components) | 5–7 days | 2–3 |
| 3 | Global shell (App, Topbar, Sidebar) | 2–3 days | 1 |
| 4 | 9 information pages | 5–7 days | 3 |
| 5 | 46 tools (batched by category) | 10–14 days | 7 |
| 6 | Deliverables + CI gate | 3–4 days | 1–2 |
| | **Total** | **29–41 days** | **~17** |

---

## Phase 0 — Baseline and tooling (Day 1)

### What ships

1. New devDeps in `package.json`:
   - `@axe-core/cli` — for CI + scripted runs
   - `@axe-core/react` — for dev-time console violations
   - `http-server` (or equivalent) — to serve `dist/` for axe runs
2. `main.jsx` adds `if (import.meta.env.DEV)` guard around `@axe-core/react` registration → console flags violations during development; **zero prod bundle impact** verified by build size diff
3. New `scripts/axe-baseline.sh` runs axe against ~10 representative routes and saves results
4. `docs/accessibility/baseline-2026-05-XX.json` — raw axe results (committed)
5. `docs/accessibility/baseline-summary-2026-05-XX.md` — categorized summary: failures by severity (`critical` / `serious` / `moderate` / `minor`) × surface (shell / page / tool category)

### Representative route sample (10 routes)

- `/` (home)
- `/#how-this-works`
- `/#data-classification` (interactive wizard)
- `/#storage-calculator` (canvas chart)
- `/#tri-agency-policy` (heaviest content)
- `/#compress-pdf` (representative PDF tool)
- `/#compress-image` (representative image tool)
- `/#word-counter` (representative text tool)
- `/#password-generator` (representative privacy tool)
- `/#extract-zip` (representative archive tool)

### Verified findings (confirmed 2026-05-03)

- **Lighthouse accessibility threshold:** currently `0.9` in `.github/lighthouse/lighthouserc.json` with severity `error` (already gates the build). **Action: raise to `0.95`** as part of Phase 0.
- **`<html lang>`:** currently `en` in `index.html`. **Action: change to `en-CA`** as part of Phase 0 (single-line edit).
- **Existing CI infra:** the recent security hardening (`scripts/security-audit.mjs`, `scripts/bundle-integrity.mjs`, `.github/workflows/security.yml`, `scorecard.yml`, `public/_headers`) is orthogonal to the axe gate. The axe step in `deploy.yml` runs after build, before deploy — same slot as the existing `npm audit --omit=dev --audit-level=critical`. Verify CSP `<meta>` tags don't block axe-core injection (axe-core runs as a script in the page; CSP `default-src 'self'` should permit it since axe is bundled, not CDN-loaded).

---

## Phase 1 — Foundations (Days 2–6)

### 1.1 Contrast token audit

New `scripts/check-contrast.js`. Reads `--text-*` and `--bg-*` from `src/styles/global.css`, enumerates combinations actually used in the codebase (grep for `color:`/`background:` references), computes WCAG contrast ratios, fails if below 4.5:1 (text) or 3:1 (UI).

**Likely failures (predict before running):**
- `--text-muted` (#7C9BBF) on `--bg-primary` (#0A1628) — borderline; may need to lift to closer to `--text-secondary`
- Gold `#FFC20E` as small text on light surfaces (e.g., AcrobatAlternative cost badge — already flagged)
- Gold on gold (e.g., focus ring on the Sidebar pinned CTA)

**Fix strategy:** adjust tokens, not components. CLAUDE.md already shows precedent (`--bg-secondary` was warmed in a prior pass). New tokens may be needed:
- `--text-muted-aa` (darker variant of `--text-muted` that passes 4.5:1)
- `--accent-on-light` (darker gold for small text on light/parchment surfaces)
- `--focus-ring-on-gold` (navy ring for elements on gold backgrounds)

### 1.2 Focus ring system

Global `:focus-visible` rule in `global.css`:
```css
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.on-gold-surface :focus-visible {
  outline-color: var(--focus-ring-on-gold);
}
```

Audit & remove any `outline: none` without replacement. The `.sidebar-cta`, `.aa-cost-badge`, and any gold-bordered card should add `.on-gold-surface` to swap focus ring color.

### 1.3 Skip link

Inject at top of body via `App.jsx`:
```jsx
<a href="#main-content" className="skip-link">Skip to main content</a>
```

CSS: visually-hidden until focused, then 1st-screen visible. Add `id="main-content"` to App's `<main>` wrapper.

### 1.4 Route-change live region

Single global `<div role="status" aria-live="polite" className="visually-hidden" id="route-announcer">` in App.jsx. On hashchange, set its text to `${pageTitle}, page loaded`. Hash routing doesn't fire SR announcements natively — this is the workaround.

Also update `document.title` on hashchange (likely already done; verify).

### 1.5 Motion preferences

Global rule:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Audit: WelcomeTour transitions, gold shimmer top-edge effects, hover lifts, timeline animation in HowThisWorks. Per CLAUDE.md, some already respect `prefers-reduced-motion` (timeline section). Finish the job.

### 1.6 Semantic HTML audit

Verify across all routes:
- Exactly one `<h1>` per route (Tool Header pattern emits one — confirm info pages don't double up)
- Heading hierarchy unbroken (no h2 → h4 jumps)
- Landmarks present: `<header role="banner">`, `<nav>`, `<main id="main-content">`, optional `<aside>` for sidebar
- All decorative SVGs/icons get `aria-hidden="true"`
- All meaningful icons either have `<title>` (SVG) or accompanying text

### 1.7 `<html lang>`

Verify `lang="en-CA"` in `index.html`. Affects screen reader pronunciation of "centre", "organisation", "behaviour" — important for the Canadian audience.

---

## Phase 2 — Shared UI primitives (Days 7–13)

12 components in `src/components/ui/`. Grouped by issue class — same fix pattern applies across multiple components.

### 2.A Modals/overlays — `FeedbackModal`, `WelcomeTour`

- `role="dialog" aria-modal="true" aria-labelledby={titleId}`
- **Focus trap**: Tab/Shift-Tab cycles within modal (FeedbackModal currently restores focus on close but doesn't trap)
- Initial focus on first focusable element or close button
- Escape and backdrop click both close (verify both)
- Body scroll lock when open
- Reusable hook: `useModalAccessibility({ isOpen, onClose, initialFocusRef })` to encapsulate the pattern; mobile sidebar drawer (Phase 3) reuses it

### 2.B Status & alert messaging — `ErrorCard`, `InfoCard`, `ResultPanel`, `EncryptedPDFError`, `DropZone` errors/warnings

- Split `role="alert"` (assertive — fatal errors only) from `role="status"` (polite — warnings, success, neutral updates)
- **Bug to fix:** DropZone currently uses `role="alert"` for both error AND warning ([DropZone.jsx:162-163](src/components/ui/DropZone.jsx:162))
- Wire success result announcements through ResultPanel: when a result becomes available, announce "PDF compressed, file ready for download" via the existing live region

### 2.C Form-style inputs — `DropZone`, `SearchBar`, `ActionButton`

- **DropZone** is already 80% there: has `role="button"`, `tabIndex={0}`, `aria-label`, keyboard handler. Remaining: split alert/status (2.B), confirm 24×24 minimum target size (WCAG 2.2 SC 2.5.8 Level AA — note final SC is 24×24 not 44×44).
- **SearchBar** (Ctrl/Cmd+K) — implement combobox ARIA pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant` for arrow-key result navigation. Announce result count via live region.
- **ActionButton** — confirm all instances use real `<button>` (not `<div onClick>`). Add `aria-disabled` (NOT native `disabled` attribute) when in busy state — keeps the button keyboard-reachable so screen reader users can hear *why* it's not actionable. Add `aria-busy="true"` during processing.

### 2.D Hover/focus content — `Tooltip`

WCAG 2.2 SC 1.4.13 (Content on Hover or Focus) requires:
- **Dismissible**: Esc closes the tooltip without moving cursor
- **Hoverable**: cursor can move from trigger onto tooltip content without it disappearing
- **Persistent**: stays visible until dismissed, focus moves, or trigger no longer hovered

Implementation: show on `focus` events too (not hover-only), `aria-describedby` from trigger → tooltip content, Esc handler.

### 2.E Lists & navigation — `RelatedTools`

Wrap in `<ul>` / `<li>`. Each card a single `<a>` (not nested clickable divs). Card title doubles as link text. Verify `RelatedTools.jsx` already uses `<h2>` for the section title (per CLAUDE.md it does after recent rework).

### 2.F Loading states — `ToolSkeleton`, `ActionButton` busy

- Mark `ToolSkeleton` `aria-hidden="true"` (decorative)
- Communicate loading via `aria-busy="true"` on the parent surface
- Result panel listens for `aria-busy` flip → announces completion

### 2.G Disclosure widgets — `HowItWorks` (the per-tool explainer accordion)

Verify uses native `<details>` / `<summary>` (per CLAUDE.md it does — accessibility comes free with native elements).

### Patterns doc

Drafted at end of Phase 2: `docs/accessibility/patterns.md`. Codifies:
- Focus trap pattern + `useModalAccessibility` API
- `alert` vs `status` decision rules
- Focus ring rules (default + on-gold variant)
- Contrast rules (token combinations approved/forbidden)
- `aria-current` usage
- Dialog ARIA shape
- Live region usage (when to announce, what to announce)
- Motion preferences

Linked from every accessibility-related PR description in Phases 3–6 so reviewers can verify against a single source. Also serves as the portable artifact RS Toolkit can adopt verbatim.

---

## Phase 3 — Global shell (Days 14–16, 1 PR)

### 3.1 `Topbar.jsx`

- Wrap in `<header role="banner">` (one per page max — verify no nested banners)
- Wordmark anchor: `aria-label="RDM Toolkit, home"`
- Search button: `aria-label="Search tools"`; verify `kbd` shortcut hint (Ctrl/Cmd+K) is read alongside
- Feedback button (icon-only on mobile per CLAUDE.md, 40×40 tap target): add `aria-label="Send feedback"`
- "How This Works" link: real `<a>` with hash href (verify)
- Mobile hamburger: `aria-label="Open navigation menu"`, `aria-expanded={isOpen}`, `aria-controls="sidebar"`

### 3.2 `Sidebar.jsx`

- `<nav aria-label="Tool navigation">` — must be uniquely labelled since `<header>` may also contain a nav
- Active tool gets `aria-current="page"` (currently visual-only via gold rail per global.css)
- "More Tools" toggle: `aria-expanded`, `aria-controls`
- Sister-site RS Toolkit link: visually-hidden text `(opens in new tab)` for screen readers (the icon already conveys this visually)
- Pinned "Request a Tool" CTA card: real `<a>` (verify)
- Category labels: emit as `<h2>` so heading hierarchy is navigable
- **Mobile drawer**: reuse Phase 2.A `useModalAccessibility` — focus trap when open, body scroll lock, `aria-hidden="true"` on app root while open. Verify Escape close still works (CLAUDE.md says it does).

### 3.3 `App.jsx`

- Hash router: on `hashchange`, set `document.title = "${pageTitle} — RDM Toolkit"` AND fire the Phase 1 live region (`#route-announcer` text update)
- Global drag-drop overlay: mark `aria-hidden="true"` (purely visual; underlying DropZones are keyboard-accessible)
- ErrorBoundary fallback: `role="alert"` on the error card, focus moves to the "Try Again" button on error
- Modal-stack manager: prevents drag-drop event hijacking when a modal is open (FeedbackModal, WelcomeTour, fullscreen FillablePDFForm)
- Verify `<main id="main-content">` wraps content

---

## Phase 4 — 9 information pages (Days 17–23, 3 PRs)

### PR 4a — Prose-heavy (3 pages)

`HowThisWorks`, `RequestATool`, `GrantsAndIdentifiers`.

Per-page checklist:
- Single `<h1>` (likely from page header; verify)
- Heading hierarchy unbroken
- Descriptive link text — no "click here" / "read more" without context
- All decorative icons `aria-hidden="true"`
- Tables (HowThisWorks 4-card security tools grid is a list, not a table — confirm) get proper `<th scope>` if any are tables
- External links: visually-hidden `(opens in new tab)` for SR users

### PR 4b — Interactive (3 pages)

**`DataClassification`** (wizard):
- Each question wrapped in `<fieldset>` with `<legend>`
- Radio groups have proper `name` attribute
- Live region announces "Classification updated to {level}" when answers change
- Edit Answers button restores wizard state — focus returns to first question
- Control matrix table: `<th scope="col">` (column headers) + `<th scope="row">` (level names)
- Per CLAUDE.md, current control matrix table uses gradient fade signaling horizontal scroll — verify keyboard scroll works

**`StorageCalculator`** (canvas chart):
- **Add visible data table beside/below the canvas chart** (decision from Section 3 — visible by default, single source of truth)
- 14 file category inputs each get explicit `<label htmlFor>`
- Chart canvas `aria-hidden="true"` (decorative — table is the source of truth)
- DMP export button announces "Data Management Plan downloaded"
- URL save/load doesn't affect a11y but verify hash-based config loads announce page state
- LUFA 7-year minimum + OCAP® flag: ensure these tooltips/notes follow Phase 2.D Tooltip rules

**`DRACServices`** (tabs):
- Full ARIA tabs pattern: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected={active}`, `aria-controls`, arrow-key navigation between tabs (Left/Right cycles, Home/End first/last), Tab moves focus into panel
- Reference: WAI-ARIA Authoring Practices Tabs pattern

### PR 4c — Heavy content (3 pages)

**`TriAgencyPolicy`** (heaviest):
- **SVG deposit flowchart** (per CLAUDE.md — proper SVG with diamonds + arrowheads): wrap in `role="img"` with `<title>` + `<desc>` containing a textual decision-tree summary (~150 words walking through the YES/NO branches). This is genuinely careful writing — ~1 day of effort just for this.
- **3×3 pillar matrix table** (per CLAUDE.md — already present): proper `<table>` with `<caption>`, `<th scope="col">` for agencies (CIHR/NSERC/SSHRC), `<th scope="row">` for pillars
- Indigenous governance cards (6 governance frameworks): list semantics
- FAQ accordions: native `<details>`/`<summary>` (verify)
- EDI in Research Planning section: heading hierarchy, no rabbit-hole nesting

**`LakeheadDataverse`**:
- 6 benefit cards: list semantics
- Repository picker table (LU Dataverse vs FRDR vs Zenodo): proper table semantics with column scope
- 8-step deposit walkthrough: `<ol>` with proper sequence
- FAQ accordion: native `<details>`/`<summary>`
- Contact CTA: descriptive link text ("Email Dr. Ayeni about Borealis deposit", not "click here")

**`AcrobatAlternative`**:
- **Cost badge contrast** (gold-on-gold risk per Phase 1 audit): if it fails, swap to `--accent-on-light` or restructure
- Task coverage table (large, per CLAUDE.md uses Fragment+key after PR fix): proper scope attributes; verify keyboard horizontal scroll on mobile
- 4-card "Free Stack" grid: list semantics
- Beyond-Acrobat chips: list semantics; chips are not interactive (verify — they're labels not buttons)

---

## Phase 5 — 46 tools, batched by category (Days 24–37, 7 PRs)

### Common per-tool checklist (applies to all 46)

- Explicit `<label htmlFor>` for every form field — no placeholder-only labels
- Tool component does NOT emit a second `<h1>` (App.jsx's tool header pattern owns the h1)
- All buttons have action-descriptive labels ("Compress PDF" not "Submit", "Download merged PDF" not "Download")
- Color-only success/error signaling paired with text or icon (e.g., not just a green border — needs a checkmark + "Compressed successfully")
- Result completion announced via ResultPanel's live region
- Disabled/busy buttons: `aria-disabled` + `aria-busy` (not native `disabled`)

### PR 5a — PDF easy (13 tools)

`Compress`, `Merge`, `Split`, `Rotate`, `AddPageNumbers`, `AddCoverPage`, `PdfPageInspector`, `PDFToImages`, `ExtractImagesFromPDF`, `PDFPageDelete`, `PDFWatermark`, `PasswordProtect`, `RemovePDFPassword`.

Mostly DropZone + ResultPanel — once one is done the others are repetitions. ~2–3 days.

### PR 5b — PDF hard, canvas/drag tools (4 tools) — biggest single chunk, ~4–5 days

**`ReorderPages` + `MergePDFs` page-order**:
- Uses `@dnd-kit/core`. Verify keyboard sensor enabled — arrow keys move selected page in the order.
- WCAG 2.2 SC 2.5.7 Drag Movement: drag-only is forbidden; keyboard alternative required.
- Visual indicator showing keyboard mode is active.

**`FillablePDFForm`** (per CLAUDE.md has split-pane editor + fullscreen):
- Click-to-place is fine for sighted/mouse users.
- Add: keyboard mode where Tab navigates the existing-fields list, arrow keys nudge selected field 1px (Shift+arrow 10px).
- Field-list panel becomes the text alternative — already exists per CLAUDE.md as the right-rail props panel; add keyboard navigation between list items.
- Page preview marked decorative for SR users (the field list IS the document representation).

**`SignPDF`** (canvas signature):
- Canvas handwriting has no realistic keyboard equivalent.
- **Best-effort fallback** (additive, not replacement): add a tab-style picker at top of the tool — "Draw" (existing canvas) | "Type" (typed name in cursive font, embedded as text) | "Upload" (signature image upload).
- Default tab is "Draw" so sighted/mouse users see no UX regression.
- Document the canvas limitation explicitly in the Accessibility Statement.

**`PDFRedaction`** (canvas drawing):
- Same constraint as SignPDF.
- **Best-effort fallback**: tab-style picker — "Draw rectangles" (existing canvas) | "By coordinates" (form: page #, x, y, width, height; add to redaction list).
- Both modes commit to the same redaction list which then drives the existing PHIPA-grade rasterization pipeline (per CLAUDE.md commit `3550e23`).
- Default to canvas; alternative path documented in Statement page.

### PR 5c — Image (6 tools), ~2 days

`CompressImage`, `ConvertImageFormat`, `ResizeImage`, `StripImageMetadata`, `ImageToPDF`, **`ImageCropper`**.

ImageCropper is the only one needing a fallback: numeric crop inputs (top/left/width/height in px) alongside the existing drag-to-crop canvas. Same additive-tab pattern as SignPDF.

### PR 5d — Text & Data (8 tools), ~1–2 days

`WordCounter`, `FindReplace`, `RemoveDuplicateLines`, `TextDiff`, `CSVDiff`, `JSONFormatter`, `CSVJSONConverter`, `MarkdownPreview`, `WhitespaceCleaner`, `BibTeXFormatter`, `FileToMarkdown`, `DataAnonymizer` (de-identify research data).

Mostly `<textarea>`-driven. Verify monospace text contrast in code-output blocks.

For DataAnonymizer specifically (per CLAUDE.md — column groups + row-aware coding): verify the column-cycling chip pattern is keyboard-accessible (Tab to chip, Space/Enter to cycle group). Add live region announcement when a chip's group changes.

### PR 5e — Privacy & Security (4 tools), ~1 day

`StripFileMetadata`, `SHA256Hasher`, `EncryptDecryptText`, `PasswordGenerator`, `MagicByteChecker`, `ChecksumVerifier`, `EncodingDetector`.

- `EncryptDecryptText`: zxcvbn password strength meter — announce score changes via live region ("Password strength: strong"). Currently visual-only.
- `PasswordGenerator`: copy-to-clipboard button announces "Password copied to clipboard".

### PR 5f — Archives (3 tools), ~0.5 day

`CreateZIP`, `ExtractZIP`, `FileSizeAnalyser`. File lists need `<ul>`/`<li>` semantics. CreateZIP's drag-reorder of files (if present) needs the @dnd-kit keyboard sensor verified.

### PR 5g — More Text (5) + More Security (3) combined, ~1 day

`WhitespaceCleaner` (already in 5d), `RemoveDuplicateLines`, `CSVDiff`, `CSVEncodingFixer`, `MarkdownPreview` — most overlap with 5d.

`MagicByteChecker`, `ChecksumVerifier`, `EncodingDetector` — already in 5e.

NOTE: 5d/5e/5f/5g overlap in current scope; will reconcile category boundaries in the implementation plan based on actual file structure rather than registry categories.

---

## Phase 6 — Deliverables and CI gate (Days 38–41)

### 6.1 Accessibility Statement page (`#accessibility`)

New `src/components/pages/AccessibilityStatement.jsx`. Registered in `App.jsx` `PAGES` Set. Sidebar link in **Research Resources** group near "How This Works" — meta page about the site, not a research tool.

Content sections (~450 words total):

1. **What we've done** — "Best-effort improvements toward WCAG 2.2 Level AA, validated by automated testing (axe-core) integrated into our deployment pipeline."
2. **Scope** — rdmtoolkit.ca only. RS Toolkit (rs.rdmtoolkit.ca) is undergoing its own review.
3. **Conformance posture** — explicit honest statement: not independently audited, not tested with real users with disabilities, automated testing catches roughly 30–40% of barriers (cite Deque's published research).
4. **Known limitations** — by name:
   - Sign PDF: handwriting on canvas. Alternative: type your name (cursive font) or upload a signature image.
   - PDF Redaction: drawing rectangles requires a pointer device. Alternative: specify page + coordinates as numbers.
   - Image Cropper: drag-to-crop requires a pointer device. Alternative: numeric inputs (top/left/width/height).
   - Fillable PDF Form: placing fields by clicking on a page preview. Alternative: arrow-key field nudging once a field is selected; field list panel as text alternative.
5. **What stays accessible** — the other 42 tools, all 9 information pages, navigation, search, file uploads (Enter/Space activates every drop zone).
6. **Accessible formats** — "If you need this content in another format (large print, plain text, audio), email {INSTITUTION.rdmEmail} and we'll help." (AODA IASR §12 requirement.)
7. **Report a barrier** — links to Feedback (auto-opens modal with "Accessibility barrier" topic preselected). Response window: 5 business days during academic year.
8. **Standards we're working toward** — hyperlink to WCAG 2.2 AA quickref.
9. **Why best-effort, not full conformance** — short paragraph: small Lakehead-affiliated team, manual screen reader and disabled-user testing beyond current capacity, choosing transparency over overclaiming.
10. **Last reviewed** — date stamp. Manual review every 6 months minimum (or whenever a new tool/page is added).

### 6.2 Accessibility-barrier feedback channel

Extend `FeedbackModal.jsx` with a topic selector at the top of the form:
- Radio group: "General feedback" (default), "Bug report", "Accessibility barrier", "Tool request"
- "Accessibility barrier" prefills email subject `[RDM Toolkit] Accessibility barrier — {tool/page}`
- When that topic is selected, show a hint paragraph above the description: *"Help us understand: what tool/page, what you were trying to do, what assistive technology you use (if applicable)."*
- Accessibility Statement page links open the modal with topic preselected (e.g., via `?topic=a11y` query param parsed in App.jsx; modal opens, topic radio set, focus moves to description textarea)
- All flows route to `INSTITUTION.rdmEmail`

Satisfies AODA IASR §80.50 (feedback mechanism).

### 6.3 Internal audit report

`docs/accessibility/audit-report-2026-05-XX.md`. Sections:

1. Baseline — date, axe-core version + command, Lighthouse a11y score before
2. Failures by surface × severity (table from baseline JSON)
3. Fixes applied per phase (Phase 1 / 2 / 3 / 4 / 5 with concrete bullets)
4. Outstanding gaps — canvas tool limitations + anything axe couldn't verify (focus order ambiguities, content meaningfulness, etc.)
5. Verification — final axe run, final Lighthouse score, before/after screenshots of contrast fixes, baseline → final delta
6. Sign-off — date + reviewer

Useful future reference; if Lakehead's accessibility office or a complainant ever asks "what did you do," this is the answer.

### 6.4 axe-core CI gate

New step in `.github/workflows/deploy.yml`, after build, before deploy:

```yaml
- name: Build
  run: npm run build
- name: a11y check
  run: |
    npx http-server dist -p 4173 &
    sleep 3
    npx @axe-core/cli http://localhost:4173 \
      http://localhost:4173/#how-this-works \
      http://localhost:4173/#data-classification \
      http://localhost:4173/#storage-calculator \
      http://localhost:4173/#tri-agency-policy \
      http://localhost:4173/#compress-pdf \
      http://localhost:4173/#compress-image \
      http://localhost:4173/#word-counter \
      http://localhost:4173/#password-generator \
      http://localhost:4173/#extract-zip \
      --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa \
      --exit
```

`--exit` flag: non-zero exit on any violation. We'll filter by severity (only fail on `critical` + `serious`) by parsing the JSON output in a small script `scripts/axe-ci-gate.js` — simpler than `--exit` and gives us severity control.

**Rollout:**
- First 1–2 weeks after Phase 6: gate runs as **informational** (logs results, doesn't fail build) to surface flakiness
- Then flip to **required** for builds to pass

### 6.5 Patterns doc finalization

`docs/accessibility/patterns.md` (drafted in Phase 2) gets a final review pass: cross-references to actual implementations, code snippets are real, all conventions used in Phases 3–5 are documented.

---

## Calendar (Pre-launch sweep, target 2026-07-17)

Today: 2026-05-03. Part-time pace assumed.

| Week | Dates | In flight |
|---|---|---|
| 1 | May 4–8 | Phase 0 + start Phase 1 (contrast script, focus ring) |
| 2 | May 11–15 | Phase 1 wraps; start Phase 2 (modals, status/alert split) |
| 3 | May 18–22 | Phase 2 (SearchBar combobox, primitives, patterns.md) |
| 4 | May 25–29 | Phase 3 — global shell |
| 5 | June 1–5 | PR 4a (prose pages) |
| 6 | June 8–12 | PR 4b (interactive: wizard, chart, tabs) |
| 7 | June 15–19 | PR 4c (heavy: SVG flowchart, matrix, tables) |
| 8 | June 22–26 | PR 5a (PDF easy) + 5c (Image) |
| 9 | June 29–July 3 | PR 5b (PDF hard — canvas fallbacks) — **biggest single chunk** |
| 10 | July 6–10 | PR 5d/5e/5f/5g (text, privacy, archives, more) |
| 11 | July 13–17 | Phase 6 — Statement page, FeedbackModal topic, audit report, CI gate, buffer |

**Target launch-readiness: July 17, 2026.** If formal user testing starts mid-to-late July, this hits the window.

If pace runs faster (pairing with Claude often does), the calendar compresses naturally. If slower, Phase 5b is the most compressible — defer some canvas-tool alternatives to V2 with a Statement page note.

---

## Risk register

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Canvas tool fallbacks feel less polished** — typed name as signature isn't handwriting | Statement page lists this explicitly. Alternative is *additive* (button alongside canvas, not replacement). Default mode is unchanged for sighted/mouse users. |
| 2 | **Pattern drift between PRs done weeks apart** | `patterns.md` is single source of truth, referenced in every PR description. Optional: PR template that requires pattern doc citations for accessibility-touching changes. |
| 3 | **Contrast token fixes may shift brand colors** | Phase 1 script flags exact failures; owner (Andrew) signs off on each token change. Likely candidates: `--text-muted` darkening, gold-on-light fallback color. Lakehead brand guidelines may pin specific hexes — verify before changing. |
| 4 | **FillablePDFForm + SignPDF + PDFRedaction are complex codebases** — keyboard alternatives risk regressing existing flows | Preview-server verification required per PR; "manual smoke test on dev server" mandatory checkbox in PR description. Per CLAUDE.md, PR #14 already shipped a major PDFRedaction rewrite — be careful not to regress the PHIPA rasterization pipeline. |
| 5 | **CI gate may be flaky** — axe-core occasionally times out on lazy routes | Tune thresholds + retry settings in Phase 6. Start as informational for 1–2 weeks, then enforce. |
| 6 | **WCAG 2.2 SC 3.2.6 Consistent Help** — feedback button must stay in topbar across all routes | Add a snapshot/integration test asserting Feedback button presence on every route. Or document as a manual review item in PR template. |
| 7 | **"AODA conformant" overclaim risk** — best-effort posture is not legal conformance | Statement page wording is precise ("best-effort improvements toward WCAG 2.2 AA"); audit report explicitly notes this. Reminder in audit report: never use "AODA conformant" or "WCAG 2.2 AA conformant" in grant docs, marketing, etc. |
| 8 | **RS Toolkit divergence** — sister site may diverge from established patterns | `patterns.md` ships in this site's `docs/`. Recommend RS Toolkit imports it verbatim when its own pass starts. |
| 9 | **Lakehead institutional accessibility plan alignment** — RDM Toolkit may need to be mentioned in Lakehead's annual accessibility report | Audit report doc + Statement page give the materials needed. Confirm with Lakehead Accessibility Office whether RDM Toolkit needs to be listed. |

---

## Out of scope (deliberate)

- **Manual screen reader testing** (NVDA / VoiceOver / JAWS) — would require Q4 Option B+; user chose A
- **Recruited disabled-user testing** — out of scope for Q4 Option A
- **VPAT / formal conformance report** — incompatible with best-effort posture (Q5 Option F skipped)
- **RS Toolkit code changes** — separate engagement; `patterns.md` is portable
- **GitHub README / CONTRIBUTING.md** — internal docs, not the public service
- **Mobile app accessibility** — no native app; PWA inherits browser accessibility
- **Internationalization (i18n)** — site is English-only; not in current scope
- **Color-blind simulation testing** beyond automated contrast — automated covers contrast; manual color-blind testing requires Q4 Option B
- **Cognitive accessibility / plain-language audit** — WCAG 2.2 AA does not require plain language at AA; Lakehead's audience is researchers (graduate level), so jargon is appropriate

---

## Cross-cutting conventions (codified in `docs/accessibility/patterns.md`)

These are the conventions Phase 1–2 establish and Phases 3–6 follow:

1. **Focus ring:** 2px gold outline + 2px offset on dark surfaces; navy ring on gold surfaces. Use `:focus-visible`, never `:focus`. Never `outline: none` without a visible replacement.
2. **`alert` vs `status`:** `role="alert"` for fatal errors only (interrupts SR speech). `role="status"` for warnings, success, neutral updates.
3. **Live regions:** Single global `#route-announcer` for route changes. Per-tool `aria-live` regions for result completion. `aria-busy` during processing.
4. **Modals:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Focus trap. Escape + backdrop close. Body scroll lock. Use `useModalAccessibility` hook.
5. **`aria-current="page"`** for active sidebar tool / page link. Visual styling stays as-is (gold rail).
6. **`aria-disabled` not `disabled`** for buttons in busy/conditional states — keeps SR users able to focus and learn why.
7. **External links:** visually-hidden `(opens in new tab)` text alongside the icon.
8. **Decorative icons:** `aria-hidden="true"`. Meaningful icons: `<title>` (SVG) or text label.
9. **Tables:** `<th scope="col">` and `<th scope="row">` always. `<caption>` for non-trivial tables.
10. **Forms:** `<label htmlFor>` always. `<fieldset>` + `<legend>` for radio groups.
11. **Headings:** Single `<h1>` per route. Unbroken hierarchy.
12. **Best-effort canvas tools:** additive alternative (typed name / coordinate form / numeric input) — never a replacement that regresses sighted UX. Documented in Statement page.

---

## Open questions / verification items

Items 1 and 2 confirmed during design (see Phase 0 "Verified findings"). Remaining:

1. Whether CSP `<meta>` tags interfere with axe-core injection (likely fine since axe is bundled, not CDN-loaded — confirm in Phase 0)
2. Lakehead brand guidelines on gold #FFC20E — is this a fixed hex or is there flexibility for accessibility-driven darkening on light surfaces? (Phase 1 contrast script will identify exact failures; check before adjusting tokens.)
3. Lakehead Accessibility Office: does RDM Toolkit need to be listed in the institutional annual accessibility report? (Affects audit report distribution; ask before Phase 6 ships.)
4. Confirm `@dnd-kit/core` keyboard sensor is enabled in `MergePDFs` and `ReorderPages` — if not, that's added in Phase 5b
5. After the 2026-05-03 security hardening pass added `public/_headers`: confirm whether the site is now (or about to be) served from Cloudflare Pages or similar. If so, real HTTP-header CSP supersedes meta-tag CSP, removing the "frame-ancestors ignored in meta" caveat — accessibility-irrelevant but worth noting.

---

## Next step after this design

Hand off to the `superpowers:writing-plans` skill to produce a detailed phase-by-phase implementation plan with file-level changes, verification commands, and PR descriptions.
