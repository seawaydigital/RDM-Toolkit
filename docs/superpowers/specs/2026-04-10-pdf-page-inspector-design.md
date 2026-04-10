# PDF Page Inspector & Resizer — Design Spec
**Date:** 2026-04-10  
**Status:** Approved

---

## Context

Researchers and office staff frequently receive or produce PDFs with page sizes that are slightly off from required submission specifications (e.g. `8.40 × 11.04"` instead of `8.5 × 11"` Letter). There is no easy way in the current toolkit to inspect exact page dimensions or to reformat pages to a standard size. This tool provides both: a read-only inspector that shows each page's exact dimensions and closest standard format, and an optional resize step that produces a corrected PDF — all client-side with no data leaving the browser.

---

## Tool Identity

| Field | Value |
|---|---|
| **Name** | PDF Page Inspector |
| **ID** | `pdf-page-inspector` |
| **Route** | `#pdf-page-inspector` |
| **File** | `src/tools/pdf/PdfPageInspector.jsx` |
| **Slug** | `resized` (output: `original_resized.pdf`) |
| **Category** | PDF Tools (primary) |
| **Related tools** | `rotate-pages`, `reorder-pages`, `compress-pdf` |

---

## Architecture & Data Flow

### Inspection Pipeline (pdfjs-dist, already installed)

1. User drops PDF → `validatePDFHeader()` checks magic bytes
2. `loadPdfDocument()` loads into a sandboxed Web Worker (no main thread blocking)
3. For each page: `page.getViewport({ scale: 1 })` → `{ width, height }` in PDF points (1 pt = 1/72 inch)
4. Convert: inches = `pts ÷ 72`, mm = `pts ÷ 72 × 25.4`
5. Compare against standard sizes lookup table (±5 pt tolerance ≈ ±0.07") to assign a label
6. Thumbnails rendered lazily via `IntersectionObserver` using `renderPageThumbnail()` from `pdfThumbnails.js`

### Resize Pipeline (pdf-lib, already installed)

1. `loadPdfLibDocument(fileBytes, { PDFDocument })` reloads original bytes fresh (never mutates inspection copy). Requires importing `PDFDocument` from `@cantoo/pdf-lib` and passing it as the second argument.
2. Parse page range string into a Set of 1-indexed page numbers
3. For each page in range, apply selected method:
   - **Scale:** `page.scaleContent(xRatio, yRatio)` then `page.setSize(targetW, targetH)`. Note: `scaleContent()` is available in `@cantoo/pdf-lib ^1.17.1`. If unavailable at implementation time, fallback is to prepend `q {sx} 0 0 {sy} 0 0 cm` to the page content stream and then call `page.setSize()`.
   - **Crop:** `page.setSize(targetW, targetH)` — content outside new MediaBox bounds is clipped. Only valid when target is smaller or equal on both axes; if target is larger on any axis, silently fall back to Pad for that axis.
   - **Pad:** Enlarge the page. Compute `dx = (targetW - currentW) / 2`, `dy = (targetH - currentH) / 2`. Prepend `q 1 0 0 1 {dx} {dy} cm` to the content stream to center existing content, then call `page.setSize(targetW, targetH)`. Pad is only valid when target is larger or equal on both axes; if target is smaller on any axis, silently fall back to Crop for that axis.
4. `pdfDoc.save()` → `Blob` → `URL.createObjectURL()` → `ResultPanel` download

### Standard Sizes Lookup Table (points)

| Format | Width pt | Height pt | Inches | mm |
|---|---|---|---|---|
| Letter | 612 | 792 | 8.5 × 11" | 216 × 279 mm |
| A4 | 595 | 842 | 8.27 × 11.69" | 210 × 297 mm |
| Legal | 612 | 1008 | 8.5 × 14" | 216 × 356 mm |
| A3 | 842 | 1191 | 11.69 × 16.54" | 297 × 420 mm |
| A5 | 420 | 595 | 5.83 × 8.27" | 148 × 210 mm |
| Tabloid | 792 | 1224 | 11 × 17" | 279 × 432 mm |
| Executive | 522 | 756 | 7.25 × 10.5" | 184 × 267 mm |
| B5 | 499 | 709 | 6.93 × 9.84" | 176 × 250 mm |

Matching: compare both portrait and landscape orientations. Label pages that are within ±5 pt on both axes. Pages outside all tolerances labeled "Custom".

---

## State Shape

```js
// File
file            // File object
fileBytes       // Uint8Array (original bytes, never mutated)

// Inspection
pageInfo        // Array<{ pageNum, widthPt, heightPt, widthIn, heightIn, widthMm, heightMm, label, isPortrait, rotationDeg }>
                // rotationDeg: read from pdfjs page.rotate (total rotation in degrees, e.g. 0, 90, 180, 270)
                // thumbnails are NOT stored here — see thumbnailMap below
thumbnailMap    // Record<pageNum, dataUrl> — separate state, updated incrementally as thumbnails render lazily
summary         // { pageCount, distinctSizes, allSame, dominantLabel }
units           // 'in' | 'mm'
loading         // bool (inspection in progress)
error           // string | null

// Resize (collapsible panel)
resizeOpen      // bool
targetFormat    // 'letter' | 'a4' | 'legal' | 'a3' | 'a5' | 'tabloid' | 'executive' | 'b5' | 'custom'
customW         // number (in current units)
customH         // number (in current units)
resizeMethod    // 'scale' | 'crop' | 'pad'
pageRange       // 'all' | 'custom'
pageRangeInput  // string e.g. "1-3, 5"
pageRangeError  // string | null
resizing        // bool
resizeError     // string | null
result          // { filename, originalSize, resultSize, downloadUrl } | null
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│ InfoCard (description + privacy badges)             │
├─────────────────────────────────────────────────────┤
│ DropZone (.pdf, single file)                        │
├─────────────────────────────────────────────────────┤
│ [After file loads]                                  │
│                                                     │
│ File bar: filename.pdf          [× Remove]          │
│                                                     │
│ Summary: "5 pages · 2 sizes"    [in] [mm] toggle    │
│ e.g. "Mostly A4 · 1 page differs"                  │
│                                                     │
│ Per-page grid (.pi-page-grid):                      │
│  ┌──────┐  ┌──────┐  ┌──────┐                      │
│  │thumb │  │thumb │  │thumb │                       │
│  │  1   │  │  2   │  │  3   │                       │
│  │ A4   │  │Letter│  │ A4   │                       │
│  │8.27× │  │8.40× │  │8.27× │                       │
│  │11.69"│  │11.04"│  │11.69"│                       │
│  └──────┘  └──────┘  └──────┘                       │
│  [gold badge=exact match] [amber=off-spec] [muted]  │
│                                                     │
│ ▼ Resize Pages  [expand button]                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Target format: [A4 ▾]  W: [___] H: [___]     │  │
│  │ Method: ○ Scale  ○ Crop  ○ Pad                │  │
│  │ Pages:  ○ All   ○ Custom: [1-3, 5_______]    │  │
│  │                          [Resize PDF ▶]       │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ ResultPanel (after resize: download + start over)   │
└─────────────────────────────────────────────────────┘
```

### Badge Logic (per-page card)

| Condition | Badge colour | Label |
|---|---|---|
| Width & height within ±5 pt of standard | Gold (`--accent-primary`) | Format name e.g. "A4" |
| Within ±20 pt but not ±5 pt | Amber (`--accent-amber`) | "~A4" |
| No match within ±20 pt | Muted (`--text-muted`) | "Custom" |

---

## CSS Naming

Prefix: `.pi-` (PDF Inspector)

```css
.pi-summary          /* summary bar wrapper */
.pi-summary-text     /* "5 pages · 2 sizes" */
.pi-units-toggle     /* in/mm button group */
.pi-units-btn        /* individual toggle button */
.pi-units-btn--active

.pi-page-grid        /* CSS grid of page cards */
.pi-page-card        /* individual page card */
.pi-page-thumbnail   /* <img> or canvas placeholder */
.pi-page-number      /* "Page 3" label */
.pi-page-dims        /* dimension text */
.pi-page-badge       /* format label badge */
.pi-page-badge--exact
.pi-page-badge--close
.pi-page-badge--custom
.pi-page-rotation    /* "Rotated 90°" note */

.pi-resize-panel     /* collapsible wrapper */
.pi-resize-toggle    /* expand/collapse button */
.pi-resize-row       /* option row (label + control) */
.pi-resize-method    /* method radio group */
.pi-resize-range     /* page range section */
.pi-range-error      /* inline validation error */
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid PDF (bad magic bytes) | `ErrorCard` shown, file rejected |
| Encrypted PDF | `EncryptedPDFError` component (links to Remove PDF Password tool) |
| Corrupted / unreadable | `ErrorCard` with generic message |
| Page with stored rotation metadata | Dimensions reported as visually seen (rotation applied); "Rotated N°" note shown on card |
| Invalid page range input | Inline `.pi-range-error` below input; `ActionButton` stays disabled |
| Custom dimensions ≤ 0 | Inline validation; button stays disabled |
| Units toggle while custom dims entered | Custom W/H values auto-convert (in↔mm) |
| pdf-lib resize fails | `ErrorCard` in resize panel; original file untouched |
| Very large PDFs (100+ pages) | Thumbnails rendered lazily via `IntersectionObserver` |

---

## Files to Create / Modify

| Action | File |
|---|---|
| **Create** | `src/tools/pdf/PdfPageInspector.jsx` |
| **Edit** | `src/data/toolRegistry.js` — add entry to `pdf` category |
| **Edit** | `src/App.jsx` — add lazy import to `toolComponents` map AND add `'pdf-page-inspector'` to the `PDF_TOOLS` Set (controls drag-and-drop routing for PDF files) |
| **Edit** | `src/styles/global.css` — add `.pi-*` styles |

### Existing utilities to reuse

| Utility | Source | Use |
|---|---|---|
| `validatePDFHeader` | `src/utils/fileValidation.js` | Magic-byte check on drop |
| `loadPdfDocument` | `src/utils/pdfThumbnails.js` | pdfjs-dist load for inspection |
| `loadPdfLibDocument` | `src/utils/pdfThumbnails.js` | pdf-lib load for resize |
| `renderPageThumbnail` | `src/utils/pdfThumbnails.js` | Lazy thumbnail rendering |
| `buildOutputFilename` | `src/utils/filename.js` | Output filename (`_resized.pdf`) |
| `DropZone` | `src/components/ui/DropZone.jsx` | File drop target |
| `InfoCard` | `src/components/ui/InfoCard.jsx` | Description + privacy badges |
| `ErrorCard` | `src/components/ui/ErrorCard.jsx` | Error display |
| `EncryptedPDFError` | `src/components/ui/EncryptedPDFError.jsx` | Encrypted PDF handling |
| `ActionButton` | `src/components/ui/ActionButton.jsx` | Resize trigger |
| `ResultPanel` | `src/components/ui/ResultPanel.jsx` | Download after resize |

---

## Verification Checklist

1. `npm run dev` → navigate to `#pdf-page-inspector` — tool renders
2. Drop a single-size PDF — summary shows "All pages: Letter" (or correct format), per-page grid shows gold badges
3. Drop a mixed-size PDF — summary shows multiple sizes, per-page grid shows correct label per page
4. Toggle in/mm — all values convert correctly
5. Drop an off-spec PDF (e.g. 8.4 × 11.04") — amber badge shown, exact dimensions displayed
6. Expand resize panel → A4, Scale, All Pages → Resize → download and verify in PDF viewer
7. Test Crop: content outside new bounds is clipped
8. Test Pad: content is centered with whitespace margin
9. Test custom page range "1, 3-5" — only those pages resized
10. Enter invalid range "1-abc" — button stays disabled, inline error shown
11. Enter 0 for custom dimension — button stays disabled
12. Drop encrypted PDF — `EncryptedPDFError` shown
13. Toggle units while custom dims are entered — values convert automatically
14. Run `npx vite build` — no chunk size warnings
