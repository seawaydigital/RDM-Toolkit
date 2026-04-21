# PDF Preflight Expansion — Design Proposal

**Status:** DRAFT — needs your sign-off on thresholds before I implement.

## The Problem

Three PDF tools have known edge cases that produce silently broken output:

1. **Compress PDF** — rasterizing a PDF with form fields flattens the fields; the user ships an uneditable PDF. Already has smart-detection that routes image-heavy PDFs through a different pipeline, but doesn't warn about AcroForm fields.
2. **PDF Redaction** — already rasterizes now (2026-04-18 fix), but doesn't preflight for digital signatures. Rasterizing a signed PDF invalidates the signature.
3. **Sign PDF** — visual-only signature (not cryptographic). Already has a "this is a visual signature, not a digital signature" note in HowItWorks, but the tool page itself doesn't warn before the download.

Today these failure modes surface only after the user downloads the output and realizes something is wrong. A preflight check at upload time would catch them and route the user elsewhere.

## Reference Pattern: Fillable PDF Form

The existing precedent is [FillablePDFForm.jsx](src/tools/pdf/FillablePDFForm.jsx)'s preflight: on upload, pdfjs detects `acroForm` / `widgets`, and if any are found, the tool refuses to proceed and shows:

> **This PDF already has form fields.**
> `@cantoo/pdf-lib`'s serializer produces broken output for existing AcroForm fields. Flatten via File → Print → Save as PDF before trying again.

This is the pattern to extend.

## Proposal

### Tool: Compress PDF

**Detect:** AcroForm fields, digital signatures, XFA forms.

**Default behaviour (my recommendation — "warn"):**
- Run the preflight after upload.
- If any of the above is found, show a `.compress-advisory` block *before* the smart-estimate step with:
  - "This PDF has fillable form fields / digital signatures. Rasterizing it will flatten the form and invalidate any signatures. Text-only compression (structural save) is safe."
  - Two CTAs: "Use text-only compression" (safe path) and "Compress anyway (flatten fields)" (current raster path, with the warning acknowledged).

**Alternative (stricter — "block"):**
- Refuse raster compression entirely if fields/signatures present. Only text-only path available.

**My recommendation:** warn, not block. Researchers sometimes *want* to flatten a form before emailing it.

### Tool: PDF Redaction

**Detect:** digital signatures (`/Type /Sig` fields).

**Default behaviour (my recommendation — "block"):**
- If any digital signature is present, refuse to proceed.
- Message: "This PDF is digitally signed. Any redaction will invalidate the signature — the recipient can no longer verify the document came from the original signer. Re-sign the redacted output before sending."

**Alternative (warn):**
- Allow but warn loudly.

**My recommendation:** block. Redaction is a privacy-critical tool; a broken signature on a redacted document is a legitimate workflow hazard (IPC Ontario and TCPS 2 Art. 5.2 both treat signed-then-redacted documents as a chain-of-custody problem).

### Tool: Sign PDF

**Detect:** existing digital signatures on the input PDF.

**Default behaviour (my recommendation — "warn"):**
- If the PDF is already digitally signed, show:
  - "This PDF has a digital signature. The Sign PDF tool adds a **visual** signature only — it won't invalidate the existing digital signature, but a reviewer may wonder why there's a handwritten mark next to a cryptographic seal. For a second cryptographic signature, use Adobe Acrobat Reader's Fill & Sign."
- Allow the user to proceed.

## Thresholds I need you to confirm

| Decision | My default | Alternative |
|---|---|---|
| Compress PDF + fields | Warn | Block |
| Compress PDF + digital signatures | Warn | Block |
| PDF Redaction + digital signatures | **Block** | Warn |
| Sign PDF + existing digital signatures | Warn | Allow silently |

## Detection implementation sketch

```js
// In each tool, after file upload:
import * as pdfjsLib from 'pdfjs-dist';

async function preflight(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const findings = { hasForm: false, hasSig: false, hasXfa: false };

  // Document-level check
  try {
    const acroForm = (await pdf.getMetadata())?.info?.IsAcroFormPresent;
    const xfa = (await pdf.getMetadata())?.info?.IsXFAPresent;
    findings.hasForm = !!acroForm;
    findings.hasXfa = !!xfa;
  } catch { /* ignore */ }

  // Page-level widget + signature scan
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annots = await page.getAnnotations();
    for (const a of annots) {
      if (a.subtype === 'Widget') findings.hasForm = true;
      if (a.fieldType === 'Sig') findings.hasSig = true;
    }
  }

  return findings;
}
```

This runs in ~500 ms on a 50-page PDF, non-blocking. Cache the result on the upload state.

## Scope estimate

- Shared preflight helper in `src/utils/pdfPreflight.js` (new) — ~40 lines.
- Compress PDF: ~20 line diff (call preflight, render advisory, wire "Compress anyway" opt-in).
- PDF Redaction: ~15 line diff (refuse on signature).
- Sign PDF: ~12 line diff (advisory only).
- Existing `FillablePDFForm` preflight refactored to use the shared helper (optional).
- One pass through `HowItWorks` entries for these 3 tools to mention the preflight behaviour.

Total: ~100 lines of code, no new dependencies, no new chunks.

## Open questions for you

1. Confirm the threshold table above (block vs warn per tool × per issue).
2. Should "Compress anyway" require typing the word "flatten" to confirm, or is a single-click ack enough? (My take: single-click ack. Requiring a typed word is friction a researcher will work around by opening a different tab.)
3. Do you want the preflight results surfaced in the Feedback modal's auto-collected context? (Nice for us to see "this user had a form-field PDF and chose to flatten" in bug reports.) I'd lean yes.

Once you answer those, I'll implement in one PR.
