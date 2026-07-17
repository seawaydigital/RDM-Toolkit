# Pre-Use Tool Caveats — Design

**Date:** 2026-07-17
**Status:** Approved by user (approach + scope confirmed via Q&A)
**Trigger:** A tester merged PDFs and lost the signature box they needed for a later
Adobe Acrobat signing workflow. The limitation was documented — but only inside the
collapsed "How this tool works" panel *below* the tool, where nobody sees it before use.

---

## Problem

Every high-stakes tool has honest `limitations` copy in `src/data/toolExplainers.js`,
but it renders inside `HowItWorks.jsx` — a collapsed accordion below the tool. Users
learn about destructive behaviours (form fields lost, signatures invalidated, pages
flattened to images) only *after* the damage is done, if ever.

Two concrete gaps for the reported case:

1. **Visibility** — nothing cautionary is visible on the Merge PDFs page before use.
2. **Copy** — the merge-pdfs limitations say forms "may open with a warning in Adobe
   Acrobat," which understates reality: `copyPages()` into a fresh `PDFDocument` does
   not carry the document-level `/AcroForm` registration, so form fields and signature
   boxes stop functioning. The workflow fix (get it signed **first**, then merge) is
   never stated.

## Goals

- Surface the 1–2 highest-impact caveats per tool **before** the user drops a file.
- Warn **specifically** when an uploaded PDF actually contains form fields or
  signature boxes on tools that will break them.
- Audit all 46 tools; promote only high-impact limitations (noise budget: if every
  tool shouts, users stop reading).
- Fix the merge-pdfs explainer copy to state the signature workflow plainly.

## Non-Goals

- No blocking/confirmation dialogs — warnings are informational, never modal.
- No rewrite of the HowItWorks explainer system; it stays as the deep-dive layer.
- No new dependencies. Detection reuses the pdfjs Widget-annotation scan already
  proven in PDF Page Inspector.

---

## Design

### 1. Data model — standalone `TOOL_CAVEATS` map

New named export in `src/data/toolExplainers.js`:

```js
export const TOOL_CAVEATS = {
  'merge-pdfs': [
    'Merging removes fillable form fields and signature boxes. If a document needs to be signed (e.g. through Adobe Acrobat), collect the signature first, then merge.',
    'Existing digital signatures are invalidated by any merge — that is how PDF signatures work, not a flaw in this tool.',
  ],
  // ...
};

export function getCaveats(toolId) {
  return TOOL_CAVEATS[toolId] || null;
}
```

- **Standalone map, not a field on explainer entries.** Reality check: this file
  currently holds 23 explainer entries (Tier 1+2 only — the Tier 4 entries listed in
  CLAUDE.md are not present in this branch). Several tools that need caveats
  (split-pdf, reorder-pages, rotate-pages, add-page-numbers, add-cover-page,
  pdf-watermark) have **no explainer entry**. A standalone map keyed by tool id
  decouples caveat coverage from explainer coverage.
- Values are arrays of **plain strings** (no HTML) — max 2 per tool. Rendered as
  text nodes, so no sanitization concerns and no new `security-audit.mjs` allowances.
- Tools without an entry render nothing.

### 2. Static callout — `ToolCaveats` component

New `src/components/ui/ToolCaveats.jsx`:

- Reads `getCaveats(toolId)`; returns `null` when no caveats exist.
- Always-visible (no collapse) amber strip: `AlertTriangle` icon, kicker-style
  heading "Before you use this tool", bullets beneath.
- Rendered **once, globally** in `App.jsx` between the `.tool-header` and
  `<ToolComponent>` — appears on every tool with zero edits to tool files.
- CSS: new `.tool-caveats`, `.tool-caveats-title`, `.tool-caveats-list` classes in
  `global.css`, amber accent (`--accent-amber`) consistent with `.hiw-list--amber`
  and `.compress-large-file-warning` visual language. Card surface + hairline border
  matching the editorial system; `role` stays default (it is static informational
  content present at page load — no live region needed).

### 3. Smart detection — form-field scan on upload

New util `src/utils/pdfFormDetect.js`:

```js
/** True if any page carries a Widget annotation (form field / signature box). */
export async function pdfHasFormFields(pdfJsDoc) { ... }
```

- Same technique as `PdfPageInspector.jsx` (`page.getAnnotations()`, check
  `subtype === 'Widget'`), iterating pages and **bailing on first hit**.
- Annotation parsing failures are swallowed (return false) — detection must never
  break a tool.
- Accepts an already-open pdfjs document where the tool has one (Merge PDFs opens
  one per file for thumbnails); alternatively a `bytes` overload that opens and
  destroys its own document for tools that only use pdf-lib.

New shared UI component `src/components/ui/FormFieldsNotice.jsx`:

- Props: `filenames` (array), `action` (verb phrase, e.g. "merging", "splitting").
- Renders an amber notice: *"report.pdf contains form fields or a signature box —
  these won't work after merging. Get the document signed first, or flatten it
  (File → Print → Save as PDF)."* Pluralizes for multiple files.
- Non-blocking. Appears between the file list and the action button.

**Wired into 9 structural pdf-lib tools** (all re-save or rebuild the document, and
pdf-lib's serializer is documented — CLAUDE.md Known Gap #4 — to break AcroForm
output): `merge-pdfs`, `split-pdf`, `reorder-pages`, `pdf-page-delete`,
`rotate-pages`, `add-page-numbers`, `add-cover-page`, `pdf-watermark`,
`compress-pdf`.

- Each tool runs detection at file-load time (async, non-blocking — result state
  updates when the scan finishes) and renders `<FormFieldsNotice>` when positive.
- **Merge PDFs additionally** badges each affected file card ("Form fields") so the
  user knows *which* source document carries them.
- Excluded: `sign-pdf`, `fillable-pdf-form`, `pdf-page-inspector` (already
  form-aware), `pdf-redaction` (strips widgets by design and says so),
  `password-protect-pdf` / `remove-pdf-password` / `extract-images-from-pdf` /
  `pdf-to-images` (do not claim to preserve interactive fidelity, or output is
  images by definition).

### 4. Copy fixes

- Rewrite merge-pdfs `limitations[2]` in `toolExplainers.js` to state: form fields
  and signature boxes do not survive the merge; if a signature is needed via Adobe
  Acrobat, sign first, then merge; or flatten (File → Print → Save as PDF) if the
  fields are no longer needed.
- While auditing, tighten any other limitation whose wording understates a
  destructive behaviour.

### 5. Caveat audit — all 46 tools

**Promotion criteria** (limitation → visible caveat):

1. **Feature/data loss** — the operation destroys something the user may need
   (form fields, signature boxes, bookmarks, animation frames, text layer).
2. **Workflow-order advice** — "do X first, then use this tool."
3. **Compliance-critical** — misunderstanding creates PHIPA / TCPS 2 / legal risk.

**Not promoted:** conditions the tool already handles interactively (encrypted-PDF
rejection, ZIP-bomb guard, existing-form refusal), viewer quirks, performance notes,
generic advice.

**Candidate list from the audit of existing limitations** (final copy at
implementation; 1–2 bullets each):

| Tool | Caveat theme |
|---|---|
| merge-pdfs | Form fields/signature boxes lost — sign first, then merge; digital signatures invalidated |
| split-pdf | Same form/signature loss family |
| reorder-pages | Same |
| pdf-page-delete | Same + keep a backup of the original |
| rotate-pages | Form fields may break on re-save |
| add-page-numbers | Same |
| add-cover-page | Same |
| pdf-watermark | Same |
| compress-pdf | Aggressive mode flattens text to images (no selection/search/screen reader) |
| pdf-redaction | Redacted pages become images; redact every page where PHI appears |
| pdf-to-images | Output is not text-searchable or screen-reader accessible |
| sign-pdf | Visual signature only — not cryptographic, not legally equivalent |
| password-protect-pdf | Standard PDF encryption — for health data, prefer container encryption (7-Zip/VeraCrypt) |
| encrypt-decrypt-text | Forgotten password = unrecoverable, by design |
| data-anonymizer | Automated detection is a first pass — manual review still required for TCPS 2 |
| strip-file-metadata | Edge-case metadata streams can survive in PDFs — verify sensitive files in Acrobat's Examine Document |
| strip-image-metadata | Burned-in (pixel) information is not metadata — crop it instead |
| compress-image | Animated GIF/APNG flattened to first frame |

(~18 tools; the remaining ~28 get no caveat — deliberately.)

### 6. Verification

1. `npm run security:audit` passes (caveats are plain strings; new files contain no
   flagged patterns).
2. `npx vite build` clean.
3. Dev-server end-to-end: create a PDF containing a signature field (the Fillable
   PDF Form tool can generate one), load it into Merge PDFs, confirm:
   - static "Before you use this tool" callout renders on page load;
   - "Form fields" badge appears on the file card;
   - `FormFieldsNotice` renders above the merge button;
   - merging still completes and downloads.
4. Spot-check one non-caveat tool (e.g. Word Counter) renders no callout.
5. Mobile viewport (375px) — callout wraps cleanly.
6. Update CLAUDE.md (component inventory, recent changes; correct the stale
   explainer-coverage claim).

## Error handling

- Detection failure (corrupt annotations, worker error) → silently treated as "no
  form fields." The static caveat still covers the general case, so a missed
  detection degrades to today's baseline-plus-callout, never worse.
- `getCaveats` on unknown id → `null` → no render.

## Testing

The project has no test runner; verification is the manual + CI-guardrail flow in
§6, consistent with every prior feature in this repo.
