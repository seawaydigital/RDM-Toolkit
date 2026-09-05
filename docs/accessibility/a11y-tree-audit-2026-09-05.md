# Accessibility tree audit — top 5 tools

**Date:** 2026-09-05
**Method:** Automated inspection of the browser accessibility tree and DOM, against the production build (`npm run build` + `vite preview`, real headers and enforced CSP, port 4173).
**Scope:** merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text

## What this is and is not

This audit reads the accessibility tree — the same data a screen reader consumes — and checks accessible names, labelling, live regions, heading structure and landmarks. It is a machine-checkable subset of a manual screen-reader pass.

**No screen reader was run.** No NVDA, JAWS, or VoiceOver session was used at any point. Announcement behaviour, virtual-cursor navigation, announcement timing and the actual listening experience are NOT covered here and still require a human tester with NVDA. Nothing in this document should be cited as screen-reader testing.

To go beyond a static snapshot, several checks were exercised live: the "How this tool works" disclosure was expanded on all five routes, a CSV file was loaded into De-identify Research Data (both CSV and Text modes), a PNG was loaded into Strip Image Metadata, and Encrypt Text was run to completion in Encrypt/Decrypt Text. These were done by dispatching real `change`/`input` events with synthetic `File`/`DataTransfer` objects and by clicking real DOM buttons via script — this exercises the app's actual production code paths (not a mock), but it is still automated interaction, not a screen-reader session. Where a check could not be exercised this way, it is marked inconclusive below rather than assumed.

## Summary

| Tool | One h1 | No skipped levels | Landmarks | All controls named | Inputs labelled | Live regions | Focus order |
|---|---|---|---|---|---|---|---|
| Merge PDFs | PASS | FAIL | PASS | PASS | PASS (n/a — no native form controls) | FAIL | PASS |
| Compress PDF | PASS | FAIL | PASS | FAIL | PASS (n/a — no native form controls) | FAIL | PASS |
| De-identify Research Data | PASS | FAIL | PASS | PASS* | FAIL | FAIL | FAIL (CSV mode) |
| Strip Image Metadata | PASS | FAIL | PASS | PASS | PASS (n/a — no native form controls) | FAIL | PASS |
| Encrypt / Decrypt Text | PASS | FAIL | PASS | PASS** | FAIL | FAIL | PASS |

\* De-identify Research Data has zero controls that are literally unnamed by the raw accessible-name algorithm; its failure is that three checkboxes in CSV mode are removed from the accessibility tree entirely (see Finding 3) — a more severe defect than a missing name, tracked under Focus order / operability instead.
\** The Encrypt/Decrypt Text inputs do carry an accessible name (their `placeholder`), so they pass the "is there a name at all" check — the problem is that it's the *wrong* name (see Finding 2), which is what the Inputs-labelled check catches.

## Findings

### Finding 1: Every route jumps from `<h1>` to `<h3>`, skipping `<h2>`, inside the shared "How this tool works" panel
- **Route(s):** merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text (all five)
- **WCAG:** 1.3.1 Info and Relationships (Level A)
- **Severity:** moderate
- **Evidence:** Live DOM query after expanding the disclosure button (`.hiw-toggle`) on every route, e.g. on Merge PDFs:
  ```
  ["H1: Merge PDFs","H3: What it does","H3: How it works","H3: What stays on your device",
   "H3: What to know before you use it","H3: Check for yourself","H4: The quick check (30 seconds)",
   "H4: The thorough check (for the skeptical)","H2: You might also need3 · suggested"]
  ```
  Identical pattern (H1 → H3 → H3 → H3 → H3 → H3 → H4 → H4 → H2) confirmed on all five routes. Source: `src/components/ui/HowItWorks.jsx` wraps its five sections in a `<section aria-label="How this tool works">` (not a heading) containing `<h3 className="hiw-section-title">` at lines 61, 70, 111, 123, 135, with `<h4 className="hiw-verify-heading">` at lines 143 and 149. The page's only `<h2>` is the "You might also need" related-tools heading, which is rendered *after* this panel in the DOM.
- **Expected:** The panel's own toggle/section should introduce an `<h2>` (or the five subsections should be `<h4>`/lower if the panel is conceptually a sub-region of the tool, whichever fits the intended outline) so the sequence never skips a level.
- **Suggested fix:** In `src/components/ui/HowItWorks.jsx`, either (a) promote the section titles to `<h2>` and demote the two verify headings to `<h3>` given there is no other h2 on tool pages before this point, or (b) give the toggle button's own label an `<h2>` wrapper and keep the five subsections as `<h3>`. Either resolves the skip; (b) reads better structurally since "How this tool works" is itself a top-level section of the tool page, same level as "You might also need".

### Finding 2: Encrypt/Decrypt Text's "Plain text" and "Password" labels are not programmatically associated — accessible name falls back to the placeholder
- **Route(s):** encrypt-decrypt-text
- **WCAG:** 3.3.2 Labels or Instructions (Level A), 1.3.1 Info and Relationships (Level A), 2.5.3 Label in Name (Level A)
- **Severity:** serious
- **Evidence:** Live accessibility-tree read (`read_page`) on encrypt-decrypt-text:
  ```
  label "Plain text to encrypt:" [ref_65]
  textbox "Type or paste the text you want to encrypt..." [ref_66] placeholder="Type or paste the text you want to encrypt..."
  label "Password / Passphrase:" [ref_67]
  textbox "Enter a strong password..." [ref_68] type="password" placeholder="Enter a strong password..."
  ```
  The textbox's *computed accessible name* is the placeholder text, not the adjacent visible label. Confirmed via direct DOM query as well (`ta.previousElementSibling.tagName === 'LABEL'`, `ta.id === ''`). Source: `src/tools/privacy/EncryptDecryptText.jsx` lines 108–110 (`<label className="encrypt-label">Plain text...</label>` as a sibling, not wrapping, with no `htmlFor`) followed by the `<textarea>` at line 111 with no `id`; same pattern at lines 125–133 for the password input.
- **Expected:** A screen reader should announce "Plain text to encrypt, edit text" and "Password / Passphrase, edit text, protected" — the actual visible label, not a placeholder that disappears once the user starts typing and is redundant with a hint.
- **Suggested fix:** Add matching `id`/`htmlFor` pairs (e.g. `id="encrypt-input"` / `htmlFor="encrypt-input"`) or wrap the `<textarea>`/`<input>` inside the `<label>` element, in `src/tools/privacy/EncryptDecryptText.jsx`.

### Finding 3: Three column-selection checkboxes in De-identify Research Data (CSV mode) are `display: none` and completely removed from the accessibility tree and keyboard tab order
- **Route(s):** data-anonymizer (CSV mode only)
- **WCAG:** 2.1.1 Keyboard (Level A), 4.1.2 Name, Role, Value (Level A)
- **Severity:** blocker
- **Evidence:** Loaded a real 2-row CSV (`Last Name,First Name,Employer`) via a dispatched `change` event on the real drop-zone input (exercising the app's actual `DropZone` → `DataAnonymizer` code path, not a mock). Live DOM query on the resulting "Select columns to de-identify" chips:
  ```json
  [
    {"display":"none","tabIndex":0,"inTabOrder":false,"parentLabelText":"Last Name"},
    {"display":"none","tabIndex":0,"inTabOrder":false,"parentLabelText":"First Name"},
    {"display":"none","tabIndex":0,"inTabOrder":false,"parentLabelText":"Employer"}
  ]
  ```
  The wrapping `<label>` elements themselves have `tabIndex: -1` (a plain `<label>` is never in the native tab order). Source: `src/tools/research/DataAnonymizer.jsx` line 477–482, `<input type="checkbox" ... style={{ display: 'none' }} />` inside a styled `<label>` chip (lines 460–484). CSS `display: none` removes an element from the layout, the tab order, and the platform accessibility tree in every major browser — this is deterministic, standards-defined behaviour, not something that needed live-AT confirmation to state with confidence.
  For contrast, the equivalent "Confirm which items to de-identify" checkboxes in **Text mode** (same tool) do NOT have this problem — they render with `display: block` and are reachable (verified live: `{"display":"block"}` × 3 after running Detect Sensitive Data on real text).
- **Expected:** A keyboard-only or screen-reader user must be able to choose which columns are treated as one de-identification entity. Currently, in CSV mode, they cannot reach or operate this control at all — the tool silently uses whatever default grouping exists, with no way to change it without a mouse.
- **Suggested fix:** In `src/tools/research/DataAnonymizer.jsx`, replace `style={{ display: 'none' }}` on the checkbox with the project's existing `.visually-hidden` clip-based pattern (already defined in `src/styles/global.css` for exactly this purpose — see the route announcer) so the checkbox stays in the tab order and accessibility tree while the custom chip styling remains the visible affordance. Also add a `:focus-visible` style on the parent chip label (via `:has()` or a sibling selector) so keyboard focus is visible when tabbing to a chip.

### Finding 4: `ResultPanel` and several inline result/status messages carry no live region — completion is silent to assistive technology
- **Route(s):** merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text (all five)
- **WCAG:** 4.1.3 Status Messages (Level AA)
- **Severity:** serious
- **Evidence:** Source inspection of `src/components/ui/ResultPanel.jsx` (used by MergePDFs, CompressPDF, De-identify Research Data, Strip Image Metadata) — the outer `<div className="result-panel">` (line 26) has no `role="status"`, `role="alert"`, or `aria-live` attribute anywhere in the component. By contrast `src/components/ui/ErrorCard.jsx` line 5 correctly declares `role="alert"` — errors are announced, but successful completions are not.
  This was confirmed live, not just in source: running Encrypt Text to completion on encrypt-decrypt-text (which uses its own custom output block, not `ResultPanel`) produced real ciphertext (`v2:OottfjRDstW...`) with:
  ```json
  {"outputRole":null,"outputAriaLive":null,"ancestorLive":false}
  ```
  and loading a real (metadata-free) PNG into Strip Image Metadata produced a status paragraph "No metadata detected. Nothing to strip." that also has `{"role":null,"ancestorLive":false}`.
  The only live region present on any of the five routes at any point in this audit is the global, `visually-hidden` route announcer (`role="status" aria-live="polite"`) that announces page navigation ("Merge PDFs, page loaded") — it is not wired to per-tool completion or error events beyond that.
- **Expected:** When a tool finishes processing (success or a "nothing to do" outcome) or encrypts/decrypts text, a screen reader user should hear an announcement without needing to move focus or explore the page, the same way `ErrorCard`'s `role="alert"` already announces failures.
- **Suggested fix:** Add `role="status"` (polite) to `ResultPanel`'s root `<div>` in `src/components/ui/ResultPanel.jsx`, and to the `.encrypt-output-section` block in `src/tools/privacy/EncryptDecryptText.jsx`, and to whatever wraps "No metadata detected..." in `src/tools/images/StripImageMetadata.jsx`. Because these components are shared, this single change propagates to every tool that uses `ResultPanel`, not just the five audited here.

### Finding 5: Compress PDF's three preset-download buttons all share the identical accessible name "Download"
- **Route(s):** compress-pdf
- **WCAG:** 2.4.6 Headings and Labels (Level AA), 4.1.2 Name, Role, Value (Level A)
- **Severity:** moderate
- **Evidence:** Source inspection, `src/tools/pdf/CompressPDF.jsx` lines 1005–1022 (and the parallel aggressive-preset block at lines ~1085 and the text-heavy fallback at ~1231): each of the Low/Medium/High preset cards renders
  ```jsx
  <button className="compress-preset-cta" onClick={() => handleDownloadSmartPreset(p)} ...>
    <Download size={18} />
    Download
  </button>
  ```
  The preset's distinguishing label ("Low"/"Medium"/"High", `<strong>{p.label}</strong>` at line 996) is a sibling of the button, not part of its accessible name and not referenced via `aria-labelledby`. With three such buttons visible at once, a screen reader user navigating by control name (e.g. a rotor/forms list) hears three identical "Download button" entries with no way to tell which produces which file size.
- **Expected:** Each button's accessible name should distinguish the preset, e.g. "Download Low compression, 340 KB".
- **Suggested fix:** Add `aria-label={`Download ${p.label} compression, ${formatFileSize(displayBytes)}`}` to each `.compress-preset-cta` button in `src/tools/pdf/CompressPDF.jsx`.

### Finding 6: Compress PDF's results heading structure independently skips `<h2>`
- **Route(s):** compress-pdf
- **WCAG:** 1.3.1 Info and Relationships (Level A)
- **Severity:** minor (compounds Finding 1 on this route specifically)
- **Evidence:** `src/tools/pdf/CompressPDF.jsx` line 934, `<h3 className="compress-results-title">Smart compression</h3>`, and line 1189 (fallback branch), both `<h3>` with no `<h2>` anywhere earlier in the tool body — the page's `<h1>` is "Compress PDF" from the shared tool header in `App.jsx`. This is a second, independent source of the same class of defect as Finding 1, specific to this tool's own markup rather than the shared `HowItWorks` component.
- **Expected:** No heading level skip.
- **Suggested fix:** Either use `<h2>` for "Smart compression" / the fallback results title, or restructure once Finding 1 is fixed so the numbering is consistent tool-wide.

### Finding 7: `De-identify Research Data`'s "Replacement strategy" `<select>` and several textareas use an unassociated `<label>`
- **Route(s):** data-anonymizer (both CSV and Text modes)
- **WCAG:** 3.3.2 Labels or Instructions (Level A), 1.3.1 Info and Relationships (Level A)
- **Severity:** serious
- **Evidence:** Live DOM confirmation after loading a CSV: the "Paste your text" textarea (Text mode) resolves to
  ```json
  {"found":true,"computedName":"Enter text containing names, emails, or phone numbers to anonymize...","hasId":"","precedingLabelText":"Paste your text:"}
  ```
  — the label text "Paste your text:" is never used as the accessible name. Source: `src/tools/research/DataAnonymizer.jsx` has the identical unassociated-`<label>`-then-sibling-control pattern at:
  - line 455–457 ("Select columns to de-identify:") before the checkbox-chip group
  - line 621–624 ("Replacement strategy:") before the CSV-mode `<select>`
  - line 905–908 ("Paste your text:") before the Text-mode `<textarea>`
  - line 1045–1048 ("Replacement strategy:") before the Text-mode `<select>`
  In each case the `<select>`'s fallback accessible name is its currently-selected `<option>` text (e.g. "Coded — reversible with a key file"), which is not the same as "Replacement strategy" and would not tell a screen reader user what the control is choosing between if landed on directly.
- **Expected:** Each control's accessible name should be the visible label.
- **Suggested fix:** Same pattern as Finding 2 — add `id`/`htmlFor` pairs at each of the four locations listed above in `src/tools/research/DataAnonymizer.jsx`.

## Not covered by this audit

- Screen-reader announcement behaviour (requires NVDA + a human)
- Whether announcements are timely and in a sensible order
- Whether the experience is genuinely usable, as opposed to technically valid
- Drag-and-drop page reordering with assistive technology (Merge PDFs' dnd-kit sortable file list)
- The Feedback modal and Welcome Tour dialogs (shared chrome, not part of the five tools' own bodies) — not audited for focus-trap correctness here
- A literal Tab-key-by-Tab-key traversal of each route: the automated browser pane's synthetic Tab key press did not reliably move focus in this environment (confirmed via `document.activeElement` checks that did not change as expected across a reload). Focus order was therefore assessed from DOM/reading order (which the accessibility tree confirms matches visual order: skip link → banner → navigation → main → tool header → caveats → drop zone/inputs → primary action → How this tool works → related tools) and from a global grep for non-default `tabIndex` values (`tabIndex={[1-9]`) across `src/`, which found none — i.e., nothing in the codebase manually reorders tab stops away from DOM order. This is marked PASS on the strength of that static evidence, but the live keystroke-by-keystroke walk itself is inconclusive due to the tooling limitation described.
- Two tabs (compress-pdf, strip-image-metadata) initially reported a `0x0` viewport to the `read_page` accessibility-tree tool while backgrounded, which made that specific tool return `(empty page)` for those two routes even though the DOM was fully loaded and screenshots rendered correctly. This was worked around by using direct DOM/JS queries (identical logic to what `read_page` would compute) for those two routes instead — noted here for transparency since it means the landmark/heading evidence for those two routes came from JS execution rather than the `read_page` tool specifically, though the underlying DOM being queried was identical.
- One tool-methodology caveat on landmarks: `read_page`'s accessibility-tree emulation reported the tool-page's inner `<header className="tool-header">` (nested inside `<main>`, from `App.jsx` line 505) as a second "banner" landmark. Per the HTML-AAM specification, a `<header>` element only maps to the `banner` role when it has no ancestor `article`/`aside`/`main`/`nav`/`section`; nested inside `<main>` as it is here, real browsers compute no landmark role for it (generic). This is a limitation of the `read_page` tool's simplified role mapping, not a defect in the app, so it is not counted as a landmark failure above — but it is flagged so a human reviewer can confirm with real browser DevTools' Accessibility pane if desired.
