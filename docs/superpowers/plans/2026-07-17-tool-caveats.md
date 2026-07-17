# Pre-Use Tool Caveats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface high-impact tool caveats (form-field/signature loss, workflow-order advice, compliance risks) *before* users drop a file — via an always-visible callout on 18 tools plus live form-field detection on 9 structural PDF tools.

**Architecture:** A standalone `TOOL_CAVEATS` map in `toolExplainers.js` feeds a new `ToolCaveats` component rendered globally by `App.jsx` (zero tool-file edits for the static layer). A new `pdfHasFormFields()` util (pdfjs Widget-annotation scan, same technique as PdfPageInspector) feeds a shared `FormFieldsNotice` component wired individually into the 9 pdf-lib tools that rebuild or re-save documents.

**Tech Stack:** React 18, plain CSS in `global.css`, `pdfjs-dist` (already a dep), lucide-react icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-17-tool-caveats-design.md`

**Testing note:** This project has no test runner (per CLAUDE.md — verification is `npm run security:audit`, `npx vite build`, and browser E2E). Tasks therefore use build/audit/browser verification instead of unit tests. All commands run from the repo root. On this Windows machine use PowerShell syntax; `npx vite build` and `npm run security:audit` work as-is.

---

### Task 1: `TOOL_CAVEATS` map + `getCaveats()` + merge-pdfs limitations copy fix

**Files:**
- Modify: `src/data/toolExplainers.js` (limitations fix ~line 432-437; new exports after `getExplainer` at end of file, ~line 736-741)

- [ ] **Step 1: Fix the merge-pdfs limitations copy**

In `src/data/toolExplainers.js`, inside the `'merge-pdfs'` entry, replace the third `limitations` bullet:

```js
// OLD (line ~435):
      'PDFs with fillable form fields may open with a warning in Adobe Acrobat after merging. If your source has forms, print it to PDF first (File → Print → Save as PDF) to "flatten" it, then merge.',

// NEW:
      'Fillable form fields and signature boxes do not survive the merge — the combined PDF loses its form layer, so a signature spot placed for Adobe Acrobat will stop working. If a document needs to be signed, collect the signature first, then merge. If the fields are no longer needed, flatten the source first (File → Print → Save as PDF).',
```

- [ ] **Step 2: Add the `TOOL_CAVEATS` map and `getCaveats()` export**

At the end of `src/data/toolExplainers.js`, after the existing `getExplainer` function and `EXPLAINER_TOOL_IDS` export, append:

```js
/**
 * Pre-use caveats — the 1-2 highest-impact things a user must know BEFORE
 * using a tool. Rendered always-visible by src/components/ui/ToolCaveats.jsx
 * above the tool UI (wired globally in App.jsx).
 *
 * Standalone map (not a field on EXPLAINERS entries) because caveat coverage
 * is independent of explainer coverage — several structural PDF tools have
 * caveats but no full explainer.
 *
 * Promotion criteria (see docs/superpowers/specs/2026-07-17-tool-caveats-design.md):
 *   1. Feature/data loss the user may need later
 *   2. Workflow-order advice ("do X first, then use this tool")
 *   3. Compliance-critical (PHIPA / TCPS 2 / legal risk if misunderstood)
 * Deliberately NOT every limitation — if every tool shouts, users stop reading.
 * Plain strings only (no HTML). Max 2 per tool.
 */
export const TOOL_CAVEATS = {
  'merge-pdfs': [
    'Merging removes fillable form fields and signature boxes — they will not work in the combined PDF. If a document needs to be signed (for example through Adobe Acrobat), collect the signature first, then merge.',
    'Existing digital signatures are invalidated by any merge — that’s how PDF signing works, not a flaw in this tool.',
  ],
  'split-pdf': [
    'Splitting rebuilds the document, so fillable form fields and signature boxes will not work in the output files. If the document needs to be signed, collect the signature first, then split.',
    'Existing digital signatures are invalidated — any change to a signed PDF breaks its signature.',
  ],
  'reorder-pages': [
    'Reordering rebuilds the document, so fillable form fields and signature boxes will not work in the output. If the document needs to be signed, collect the signature first.',
    'Existing digital signatures are invalidated — any change to a signed PDF breaks its signature.',
  ],
  'pdf-page-delete': [
    'Deleting pages rebuilds the document, so fillable form fields and signature boxes will not survive in the output.',
    'There is no undo — keep a copy of the original file.',
  ],
  'rotate-pages': [
    'Saving a rotated copy can break fillable form fields and signature boxes. If the document needs to be signed, collect the signature first.',
    'Existing digital signatures are invalidated by any edit, including rotation.',
  ],
  'add-page-numbers': [
    'Adding page numbers re-saves the document, which can break fillable form fields and signature boxes. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'add-cover-page': [
    'Adding a cover page rebuilds the document, so fillable form fields and signature boxes will not survive. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'pdf-watermark': [
    'Watermarking re-saves the document, which can break fillable form fields and signature boxes. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'compress-pdf': [
    'Aggressive compression flattens pages into images — text stops being selectable, searchable, and screen-reader accessible. Use the Smart presets unless you need the absolute smallest file.',
    'Form fields, signature boxes, and existing digital signatures do not survive compression. If a document needs to be signed, get it signed first.',
  ],
  'pdf-redaction': [
    'Only pages you draw a redaction on are scrubbed. If sensitive content also appears on other pages, that text remains fully extractable — mark every page where it appears.',
    'Redacted pages become images: no text selection, search, or screen-reader access on those pages.',
  ],
  'pdf-to-images': [
    'The output images are pixels, not text — they are not searchable and not screen-reader accessible. Keep the original PDF if you’ll need either.',
  ],
  'sign-pdf': [
    'This places a picture of a signature — it is not a cryptographic digital signature. There is no certificate, timestamp, or tamper protection, and anyone with a PDF editor can remove or move it.',
    'For legally binding signatures, use a certified e-signature service (Adobe Acrobat Sign, DocuSign, or your institution’s provider).',
  ],
  'password-protect-pdf': [
    'PDF password protection is older and weaker than modern container encryption. For genuinely sensitive data (health records, interview transcripts), put the file in an encrypted 7-Zip or VeraCrypt container instead — or as well.',
  ],
  'encrypt-decrypt-text': [
    'There is no password reset, backdoor, or recovery. If you lose the password, the text is gone permanently — that’s the point. Store the password in a password manager.',
  ],
  'data-anonymizer': [
    'Automated de-identification is a first pass, not a guarantee — it cannot catch context clues like “the only female PhD in the department.” TCPS 2 compliance still requires human review of the output.',
    'If you use the coded strategy, store the key file separately from the coded data (TCPS 2 Art. 5.5).',
  ],
  'strip-file-metadata': [
    'For PDFs, rare third-party metadata streams can survive. For sensitive documents, double-check afterwards with Adobe Acrobat’s Examine Document.',
  ],
  'strip-image-metadata': [
    'Information burned into the pixels — timestamp watermarks, GPS overlays — is not metadata and won’t be removed. Crop it out with the Image Cropper instead.',
  ],
  'compress-image': [
    'Animated GIFs and APNGs are flattened to their first frame — the animation is lost.',
  ],
};

export function getCaveats(toolId) {
  return TOOL_CAVEATS[toolId] || null;
}
```

- [ ] **Step 3: Smoke-check the module parses**

Run: `node -e "import('./src/data/toolExplainers.js').then(m => { const c = m.getCaveats('merge-pdfs'); if (!Array.isArray(c) || c.length !== 2) throw new Error('bad caveats'); if (m.getCaveats('word-counter') !== null) throw new Error('expected null'); console.log('OK', Object.keys(m.TOOL_CAVEATS).length, 'tools with caveats'); })"`

Expected: `OK 18 tools with caveats`

- [ ] **Step 4: Commit**

```powershell
git add src/data/toolExplainers.js
git commit -m "feat: TOOL_CAVEATS map + honest merge-pdfs form-field copy"
```

---

### Task 2: `ToolCaveats` component + global wiring + CSS

**Files:**
- Create: `src/components/ui/ToolCaveats.jsx`
- Modify: `src/App.jsx` (import block ~line 15-17; render at ~line 452, between `</header>` and `<ToolComponent`)
- Modify: `src/styles/global.css` (append)

- [ ] **Step 1: Create `src/components/ui/ToolCaveats.jsx`**

```jsx
import { AlertTriangle } from 'lucide-react';
import { getCaveats } from '../../data/toolExplainers';

/**
 * Always-visible pre-use caveats for tools with high-impact gotchas
 * (feature loss, workflow-order advice, compliance-critical caveats).
 * Renders nothing for tools without an entry in TOOL_CAVEATS.
 * Wired globally in App.jsx between the tool header and the tool body.
 */
export default function ToolCaveats({ toolId }) {
  const caveats = getCaveats(toolId);
  if (!caveats) return null;

  return (
    <aside className="tool-caveats" aria-label="Before you use this tool">
      <p className="tool-caveats-title">
        <AlertTriangle size={14} aria-hidden="true" />
        Before you use this tool
      </p>
      <ul className="tool-caveats-list">
        {caveats.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 2: Wire into `App.jsx`**

Add the import next to the existing UI imports (after `import HowItWorks from './components/ui/HowItWorks';` at line 16):

```jsx
import ToolCaveats from './components/ui/ToolCaveats';
```

In the tool render block (currently lines 448-456), insert `<ToolCaveats>` between `</header>` and `<ToolComponent`:

```jsx
                  </header>
                  <ToolCaveats toolId={currentToolId} />
                  <ToolComponent
                    tool={currentTool}
                    navigateTo={navigateTo}
                  />
```

- [ ] **Step 3: Append CSS to `src/styles/global.css`**

```css
/* ============================================================
   Pre-use tool caveats (ToolCaveats.jsx) + form-fields notice
   ============================================================ */

.tool-caveats {
  margin: 0 0 var(--space-md);
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: var(--radius-md);
}

.tool-caveats-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-amber);
}

.tool-caveats-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-caveats-list li {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-primary);
}

/* Shared notice for PDFs that contain form fields / signature boxes
   (FormFieldsNotice.jsx, used by the structural PDF tools) */
.form-fields-notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: var(--space-md) 0;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.form-fields-notice svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--accent-amber);
}

.form-fields-notice p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

/* Merge PDFs: per-file form-fields badge (mirrors .merge-file-encrypted) */
.merge-file-formfields {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--accent-amber);
}
```

- [ ] **Step 4: Build check**

Run: `npx vite build`
Expected: clean build, no new warnings (the pre-existing 818 KB zxcvbn chunk warning is fine).

- [ ] **Step 5: Commit**

```powershell
git add src/components/ui/ToolCaveats.jsx src/App.jsx src/styles/global.css
git commit -m "feat: always-visible pre-use caveats callout on tool pages"
```

---

### Task 3: `pdfFormDetect` util + `FormFieldsNotice` component

**Files:**
- Create: `src/utils/pdfFormDetect.js`
- Create: `src/components/ui/FormFieldsNotice.jsx`

- [ ] **Step 1: Create `src/utils/pdfFormDetect.js`**

```js
import { loadPdfDocument } from './pdfThumbnails';

/**
 * Returns true if any page of the PDF carries a Widget annotation
 * (an interactive form field or signature box). Bails on first hit.
 *
 * pdfjs is used instead of pdf-lib's catalog API because it handles
 * XFA forms, digital signatures, and malformed AcroForms more reliably
 * (same approach as PdfPageInspector).
 *
 * Never throws — detection is advisory and must not break the host tool;
 * any parse failure returns false. A defensive copy of the bytes is made
 * internally because pdfjs transfers the underlying buffer to its worker,
 * so callers may pass a Uint8Array they still need. Call this BEFORE any
 * other code transfers the same buffer.
 */
export async function pdfHasFormFields(bytes) {
  let doc = null;
  try {
    doc = await loadPdfDocument(bytes.slice());
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const annotations = await page.getAnnotations();
      if (annotations.some(a => a.subtype === 'Widget')) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (doc) {
      try { doc.destroy(); } catch { /* already destroyed */ }
    }
  }
}
```

- [ ] **Step 2: Create `src/components/ui/FormFieldsNotice.jsx`**

```jsx
import { AlertTriangle } from 'lucide-react';

/**
 * Amber informational notice shown when an uploaded PDF actually contains
 * form fields or signature boxes that the current tool's rebuild/re-save
 * will break. Non-blocking — the user can still proceed.
 *
 * Props:
 *   action    — gerund describing the operation ("merging", "splitting", …)
 *   filenames — optional array of affected file names (multi-file tools);
 *               omit for single-file tools ("This PDF contains …").
 */
export default function FormFieldsNotice({ action, filenames }) {
  const hasNames = Array.isArray(filenames) && filenames.length > 0;
  const plural = hasNames && filenames.length > 1;

  return (
    <div className="form-fields-notice" role="status">
      <AlertTriangle size={16} aria-hidden="true" />
      <p>
        {hasNames ? (
          <>
            <strong>{filenames.join(', ')}</strong> {plural ? 'contain' : 'contains'}
          </>
        ) : (
          <>This PDF contains</>
        )}{' '}
        form fields or a signature box &mdash; these won&apos;t work after {action}. If the
        document needs to be signed, get it signed first, then come back. If the fields are
        no longer needed, flatten it first (File &rarr; Print &rarr; Save as PDF).
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

Run: `npx vite build`
Expected: clean (the two new files aren't imported yet — Vite only bundles reachable modules, so this just proves nothing else broke).

- [ ] **Step 4: Commit**

```powershell
git add src/utils/pdfFormDetect.js src/components/ui/FormFieldsNotice.jsx
git commit -m "feat: shared PDF form-field detection util + notice component"
```

---

### Task 4: Wire detection into Merge PDFs (badge + notice)

**Files:**
- Modify: `src/tools/pdf/MergePDFs.jsx`

- [ ] **Step 1: Add imports**

After line 15 (`import { renderPageThumbnail, ... }`):

```jsx
import { pdfHasFormFields } from '../../utils/pdfFormDetect';
import FormFieldsNotice from '../../components/ui/FormFieldsNotice';
```

- [ ] **Step 2: Track `hasFormFields` per file**

In `handleFilesSelected` (line 96), the `item` object literal (lines 108-116) gains a field:

```js
      const item = {
        id,
        name: file.name,
        size: file.size,
        file,
        thumbnail: null,
        pageCount: null,
        encrypted: false,
        hasFormFields: false,
      };
```

Immediately after the `item.pageCount = pdfDoc.getPageCount();` line (line 125), inside the same `else` branch, kick off a fire-and-forget scan. IMPORTANT: this call must be placed BEFORE the thumbnail block (which transfers the shared buffer to the pdfjs worker via `new Uint8Array(bytes)`) — `pdfHasFormFields` copies the bytes synchronously at call time, so calling it first is safe:

```js
        } else {
          item.pageCount = pdfDoc.getPageCount();
          // Advisory scan — updates the card + notice when it completes.
          // Must be kicked off before the thumbnail render below transfers
          // this buffer to the pdfjs worker.
          pdfHasFormFields(uint8).then(has => {
            if (has) {
              setFiles(prev => prev.map(f => (f.id === id ? { ...f, hasFormFields: true } : f)));
            }
          });
        }
```

- [ ] **Step 3: Badge affected file cards**

In `SortableFileCard` (line 17), after the `item.encrypted` paragraph (lines 76-80), add:

```jsx
        {item.hasFormFields && (
          <p className="merge-file-formfields">
            <AlertTriangle size={12} /> Form fields
          </p>
        )}
```

(`AlertTriangle` is already imported at line 2.)

- [ ] **Step 4: Render the notice above the merge button**

In the main return, between the closing `</>` of the `files.length > 0` block (line 274) and `<ActionButton` (line 276), add:

```jsx
      {files.some(f => f.hasFormFields) && (
        <FormFieldsNotice
          action="merging"
          filenames={files.filter(f => f.hasFormFields).map(f => f.name)}
        />
      )}
```

- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected: clean.

- [ ] **Step 6: Commit**

```powershell
git add src/tools/pdf/MergePDFs.jsx
git commit -m "feat(merge-pdfs): detect and flag form fields / signature boxes"
```

---

### Task 5: Wire detection into SplitPDF, ReorderPages, PDFPageDelete, RotatePages

All four follow the same pattern; per-tool specifics are tabulated below. For each tool:

1. Add imports (same two lines as Task 4 Step 1).
2. Add state next to the tool's existing `useState` declarations:
   ```jsx
   const [hasFormFields, setHasFormFields] = useState(false);
   ```
3. At the top of the file-selected handler (with the other resets), add `setHasFormFields(false);`. Also add it to the tool's reset/start-over/remove-file handler if one exists.
4. Immediately after the pdf-lib load succeeds (i.e. after the encrypted check passes) and BEFORE any later `.slice()`/pdfjs call in the handler, add the fire-and-forget scan using that tool's bytes variable:
   ```jsx
   pdfHasFormFields(BYTES_VAR).then(setHasFormFields);
   ```
5. In the JSX, immediately BEFORE the `<ActionButton` listed below, add:
   ```jsx
   {hasFormFields && <FormFieldsNotice action="ACTION" />}
   ```

**Per-tool table (line numbers as of branch HEAD `c5ced29`):**

| File | Handler | BYTES_VAR (defined at) | ActionButton at | ACTION |
|---|---|---|---|---|
| `src/tools/pdf/SplitPDF.jsx` | `handleFileSelected` (91) | `bytesCopy` (used at 110) | 463 | `"splitting"` |
| `src/tools/pdf/ReorderPages.jsx` | `handleFilesSelected` (116) | `uint8` (used at 130) | 484 | `"reordering"` |
| `src/tools/pdf/PDFPageDelete.jsx` | `handleFileSelected` (29) | `bytesCopy` (used at 46) | 291 | `"deleting pages"` |
| `src/tools/pdf/RotatePages.jsx` | `handleFileSelected` (25) | `bytesCopy` (used at 40) | 243 | `"rotating"` |

- [ ] **Step 1: Wire SplitPDF.jsx** (imports, state, reset, scan call after the `loadPdfLibDocument` at line 110 + its encrypted check, notice before ActionButton at 463)
- [ ] **Step 2: Wire ReorderPages.jsx** (same pattern; scan after line 130's load + encrypted check)
- [ ] **Step 3: Wire PDFPageDelete.jsx** (same pattern; scan after line 46's load + encrypted check)
- [ ] **Step 4: Wire RotatePages.jsx** (same pattern; scan after line 40's load + encrypted check)
- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected: clean.

- [ ] **Step 6: Commit**

```powershell
git add src/tools/pdf/SplitPDF.jsx src/tools/pdf/ReorderPages.jsx src/tools/pdf/PDFPageDelete.jsx src/tools/pdf/RotatePages.jsx
git commit -m "feat(pdf): form-field detection notices on split/reorder/delete/rotate"
```

---

### Task 6: Wire detection into AddPageNumbers, AddCoverPage, PDFWatermark, CompressPDF

Same pattern as Task 5 steps 1-4. Render placement varies:

| File | Handler | BYTES_VAR | Notice placement | ACTION |
|---|---|---|---|---|
| `src/tools/pdf/AddPageNumbers.jsx` | `handleFilesSelected` (39) | `uint8` (52) | before `<ActionButton` at 251 | `"adding page numbers"` |
| `src/tools/pdf/AddCoverPage.jsx` | `handleFilesSelected` (222) | `uint8` (235) | before `<ActionButton` at 514 | `"adding a cover page"` |
| `src/tools/pdf/PDFWatermark.jsx` | `handleFileSelected` (42) | `bytesCopy` (57) | before `<ActionButton` at 339 | `"watermarking"` |
| `src/tools/pdf/CompressPDF.jsx` | `handleFileSelected` (560) | `bytes` (583) | see below | `"compression"` |

**CompressPDF specifics:** the scan call goes right after `setFileBytes(bytes);` (line 592) and before the `loadPdfDocument(bytes.slice())` at 595. Reset `setHasFormFields(false)` both at the top of `handleFileSelected` (with the other resets, lines 561-573) and in `handleRemoveFile` (line 652). The notice renders in the main return after the image-heavy `.compress-analysis` block (which ends at line 892), as a sibling:

```jsx
      {file && hasFormFields && <FormFieldsNotice action="compression" />}
```

(Note: for CompressPDF the sentence reads "…won't work after compression" — grammatical with the noun; the other tools use gerunds.)

- [ ] **Step 1: Wire AddPageNumbers.jsx**
- [ ] **Step 2: Wire AddCoverPage.jsx**
- [ ] **Step 3: Wire PDFWatermark.jsx**
- [ ] **Step 4: Wire CompressPDF.jsx**
- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected: clean.

- [ ] **Step 6: Commit**

```powershell
git add src/tools/pdf/AddPageNumbers.jsx src/tools/pdf/AddCoverPage.jsx src/tools/pdf/PDFWatermark.jsx src/tools/pdf/CompressPDF.jsx
git commit -m "feat(pdf): form-field detection on page-numbers/cover/watermark/compress"
```

---

### Task 7: Full verification (audit, build, browser E2E)

**Files:** none modified (verification only)

- [ ] **Step 1: Guardrails**

Run: `npm run security:audit`
Expected: PASS (caveat strings are plain text; new components contain no flagged patterns — no `dangerouslySetInnerHTML`, no storage, no network APIs).

Run: `npx vite build`
Expected: clean.

- [ ] **Step 2: Create a signature-field test PDF**

Start the dev server (use the Browser pane / `.claude/launch.json` config, port 5173). Open `#fillable-pdf-form`, drop in any flat PDF (generate one via `#add-cover-page` on a blank doc if needed, or use any local PDF), place one signature box + one text field, generate, and download the output. This is the test fixture.

- [ ] **Step 3: Merge PDFs E2E**

Open `#merge-pdfs` and verify, in order:
1. The static "Before you use this tool" amber callout renders below the tool header, with both merge caveats, before any file is added.
2. Add the fixture PDF + one plain PDF. The fixture's card shows the "Form fields" badge; the plain PDF's card does not.
3. The `FormFieldsNotice` appears above the merge button naming only the fixture file.
4. Merge completes and the result downloads (warnings are non-blocking).

- [ ] **Step 4: Negative + coverage spot-checks**

1. Open `#word-counter` — no caveats callout renders.
2. Open `#split-pdf` with the fixture — callout + notice both render.
3. Open `#compress-pdf` with the fixture — notice renders after analysis.
4. Console: no new errors on any of the above pages.

- [ ] **Step 5: Mobile viewport**

Resize to 375×812 — the caveats callout and notice wrap cleanly, no horizontal scroll.

- [ ] **Step 6: Screenshot proof**

Capture the Merge PDFs page showing callout + badge + notice for the session summary.

---

### Task 8: CLAUDE.md updates

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the directory-structure UI list**

Add to the `src/components/ui/` listing (alphabetical position):

```
│       ├── FormFieldsNotice.jsx   # Amber notice when an uploaded PDF has form fields/signature boxes
│       ├── ToolCaveats.jsx        # Always-visible pre-use caveats (reads TOOL_CAVEATS)
```

And to `src/utils/`:

```
    ├── pdfFormDetect.js           # pdfjs Widget-annotation scan — pdfHasFormFields(bytes)
```

- [ ] **Step 2: Correct the stale explainer-coverage claim**

The 2026-04-17 "Tier 4 extension" recent-changes row claims 40-tool explainer coverage; the file on this branch has 23 entries. Add a note in the new recent-changes row (Step 3) correcting this rather than rewriting history rows.

- [ ] **Step 3: Add a recent-changes row**

Add at the top of the Recent Changes table (adjust wording to match what actually shipped):

```
| 2026-07-17 | **Pre-use tool caveats + form-field detection** — tester lost a signature box after merging PDFs (fields documented only inside the collapsed HowItWorks panel). (1) New `TOOL_CAVEATS` map + `getCaveats()` in `toolExplainers.js` — 18 tools' highest-impact caveats (feature loss / workflow-order / compliance) as plain strings, max 2 each. (2) New `ToolCaveats.jsx` renders an always-visible amber "Before you use this tool" strip, wired globally in App.jsx between tool header and tool body — zero tool-file edits. (3) New `pdfFormDetect.js` (`pdfHasFormFields` — pdfjs Widget scan, bail on first hit, never throws) + `FormFieldsNotice.jsx`, wired into 9 structural pdf-lib tools (merge, split, reorder, delete, rotate, page-numbers, cover, watermark, compress); Merge PDFs also badges affected file cards. (4) merge-pdfs limitations copy rewritten: form fields/signature boxes do not survive the merge — sign first, then merge. (5) CSS: `.tool-caveats*`, `.form-fields-notice`, `.merge-file-formfields`. Note: explainer coverage on this branch is 23 tools (Tier 1+2), not the 38-40 previously claimed — TOOL_CAVEATS is standalone partly for this reason. Spec: docs/superpowers/specs/2026-07-17-tool-caveats-design.md. |
```

- [ ] **Step 4: Commit**

```powershell
git add CLAUDE.md
git commit -m "docs: CLAUDE.md for pre-use caveats + form-field detection"
```

---

## Self-review notes

- **Spec coverage:** §1 data model → Task 1; §2 static callout → Task 2; §3 detection → Tasks 3-6; §4 copy fix → Task 1 Step 1; §5 audit table (18 tools) → Task 1 Step 2 (all 18 present); §6 verification → Task 7; CLAUDE.md → Task 8. No gaps.
- **Buffer-transfer hazard** (pdfjs detaches ArrayBuffers passed to the worker) is handled by: util slices internally + explicit "call before any later transfer" placement instructions per tool.
- **Type consistency:** `pdfHasFormFields(bytes) → Promise<boolean>`; `FormFieldsNotice({ action, filenames? })`; `ToolCaveats({ toolId })`; `getCaveats(toolId) → string[] | null` — used consistently across tasks.
- Line numbers reference branch HEAD `c5ced29`; executors should treat them as anchors and re-locate if drifted.
