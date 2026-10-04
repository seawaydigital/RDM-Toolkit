# Site Content Improvements — Design

**Date:** 2026-10-03
**Status:** Approved by owner 2026-10-03 (brainstorm in session; "Request a Tool: built from requests" dropped — nobody tracked requests)

## Goal

Make the site easier to use for researchers who start from a goal rather than a file type, close the content gaps found in the brainstorm, and make the time-sensitive claims easier to keep accurate.

## Facts this design depends on (checked 2026-10-03)

- **FGS thesis requirements** ([Thesis Process (Masters)](https://www.lakeheadu.ca/programs/graduate/academic-information/degree-completion/thesis)): the final thesis PDF "should not be locked, password protected or include any signatures (written or digital) and should be PDF/A compliant." Students submit a Licence to the University form; an embargo is optional (form + procedure linked from the same page). Knowledge Commons (`knowledgecommons.lakeheadu.ca`) holds Lakehead theses from 2009 on; students submit through FGS, not the Knowledge Commons form.
- **No RDM Toolkit tool produces PDF/A.** pdf-lib output is not PDF/A. The thesis page must say so and point to Word / LibreOffice "Save as PDF/A" from the source document, with OCRmyPDF (`--output-type pdfa`, already vetted on Acrobat Alternative) for an existing PDF.
- **Lakehead AI guidance:** the only published pages cover academic integrity (`/students/.../chatgpt-ai-tools`, teaching-commons syllabus statements). Nothing published on research data in AI tools. Copy must not name a Lakehead-approved AI tool.
- **Create ZIP has no encryption.** The "share participant data" task must not imply it does.
- **DMP Assistant** default template sections: Data Collection; Documentation and Metadata; Storage and Backup; Preservation; Sharing and Reuse; Responsibilities and Resources; Ethics and Legal Compliance. Some funder templates differ — the crosswalk says so.
- **Explainers:** 23 of 46 tools have one. The 15 file-processing tools without one are in scope; the 8 trivial text tools (word-counter, find-replace, text-diff, json-formatter, whitespace-cleaner, remove-duplicate-lines, file-size-analyser, bibtex-formatter) stay without, per the April "keep the pattern meaningful" decision.

## Delivery: three PRs

### PR 1 — Task-based navigation

**Data — `src/data/workflows.js`**

```js
export const STAGES = [ { id: 'plan', label: 'Plan' }, { id: 'collect', label: 'Collect' },
  { id: 'analyse', label: 'Analyse' }, { id: 'share', label: 'Share' }, { id: 'preserve', label: 'Preserve' } ];

export const WORKFLOWS = [
  { id, title, stage, summary, steps: [ { tool?: toolId, page?: pageHash, why: string, caveat?: string } ], note?: string },
];
export function getWorkflow(id); export function getWorkflowStep(id, index);
```

Initial tasks (each step's tool must exist; a test enforces it):

| id | Stage | Steps |
|---|---|---|
| `plan-storage-dmp` | Plan | data-classification (page) → storage-calculator (page) → tri-agency-policy (page) |
| `share-participant-data` | Share | data-anonymizer → strip-file-metadata → sha256-hasher; note: send CSVs via Lakehead OneDrive sharing or a 7-Zip AES archive (Create ZIP does not encrypt); PDFs can use password-protect-pdf |
| `share-fieldwork-photos` | Share | strip-image-metadata → image-cropper → compress-image |
| `reb-package` | Plan | merge-pdfs → add-cover-page → add-page-numbers → compress-pdf; caveat: collect signatures before merging |
| `redacted-document` | Share | pdf-redaction → pdf-watermark → strip-file-metadata |
| `clean-csv-export` | Analyse | csv-encoding-fixer → csv-diff (confirm nothing else changed) → csv-json-converter (optional) |
| `verify-transfer` | Preserve | sha256-hasher → checksum-verifier |
| `deposit-dataset` | Preserve | csv-encoding-fixer → sha256-hasher → create-zip → lakehead-dataverse (page) |
| `thesis-pdf` | Preserve | pdf-page-inspector → merge-pdfs → compress-pdf → thesis (page); note: final copy must be PDF/A, unlocked, unsigned — export PDF/A outside the toolkit |

**Routing.** A tool route may carry `?task=<id>&step=<n>` inside the hash (`#strip-file-metadata?task=share-participant-data&step=2`). `getRouteFromHash()` splits on `?`, matches the path as today, and returns `{ page, toolId, task: { id, step } | null }`. An unknown task id or out-of-range step is ignored (`task: null`). Page steps use the same form (`#lakehead-dataverse?task=…&step=…`). Pure parsing lives in `src/utils/route.js` so it is unit-tested.

**UI.**
- `src/components/pages/Tasks.jsx` at `#tasks`: hero, tasks grouped by stage, each card lists its steps and has a "Start" button (navigates to step 1).
- `src/components/ui/WorkflowBar.jsx`: rendered by App above tool and page content when `route.task` is set. "Task · Step 2 of 3 — <title>", the current step's `why` and `caveat`, Previous / Next (Next on the last step → "Finish", returns to `#tasks`), "Exit task" (drops the query). `nav` landmark, `aria-label="Task progress"`.
- Sidebar: segmented control **By file type | By task** above the categories. Task mode lists tasks grouped by stage (clicking starts the task) plus a link to `#tasks`. Choice persisted via new `src/hooks/usePreferences.js` (`localStorage` key `rdm_prefs_v1`, try/catch, defaults to file type); add the hook to `allowedLocalStorage` in `scripts/security-audit.mjs`.
- HomePage: "Start from a task" section (4 featured tasks + link to `#tasks`).
- SearchBar: results include tasks and pages (title + summary + keywords match), each labelled by kind.

### PR 2 — Pages and guidance

- **AI guidance.** New "Using AI tools with research data" card/section in How This Works' "Where This Model Ends" plus an FAQ entry. File to Markdown: registry description drops "ideal for pasting into AI tools" in favour of neutral wording; new `TOOL_CAVEATS['to-markdown']` entry (check classification before pasting output into any AI tool; Confidential/personal data only into a tool your REB approval and the RDM office allow). Explainer text updated to match.
- **Thesis page** `#thesis` (`ThesisAndDissertation.jsx`): FGS file requirements (PDF/A, unlocked, unsigned — so not Password Protect / Sign PDF on the final copy); assembly order and which toolkit tools help (Page Inspector, Merge, Compress) vs. what must happen in Word/LibreOffice (PDF/A export); forms (licence, optional embargo) with links; Knowledge Commons; the data behind the thesis (consent limits sharing, deposit data in the LU Dataverse, supervisor's DMP); contact FGS. Links come from `institutionConfig.js` (new `graduateStudies` block).
- **Glossary page** `#glossary` (`Glossary.jsx`, data in `src/data/glossary.js`): ~25 terms (TCPS 2, REB, OCAP®, CARE, PHIPA, FIPPA, PIPEDA, DMP, PID, DOI, ORCID, de-identification, coded data, anonymized data, pseudonym, re-identification key, metadata, EXIF, checksum/hash, PDF/A, encryption, AES-256, data deposit, embargo, Borealis/Dataverse, FRDR, Tri-Agency). Each term has an `id` and is rendered with a scroll-to button index (hash anchors would collide with routing). Glossary terms are searchable via SearchBar. Linked from How This Works, Tri-Agency, Thesis.
- **Content review dates.** `src/data/contentReview.js` maps page hash → `{ checked: 'YYYY-MM-DD' }`. `src/components/ui/ContentReviewed.jsx` renders "Content last checked 2 October 2026 · Spot something out of date? Tell us" (opens feedback via a window event `rdm:open-feedback` handled in App). Added to the foot of every research page. `docs/CONTENT-REVIEW.md` lists each time-sensitive claim per page with its source URL and the date checked.
- **Homepage resources** show all research pages (Classify, Storage, Tri-Agency, Grants & Identifiers, Lakehead Dataverse, Thesis, DRAC, Acrobat Alternative, Glossary).
- **How This Works "On this page"** contents: buttons that `scrollIntoView` + focus the section heading (reduced-motion aware).
- **DMP crosswalk** on the Tri-Agency page: table of DMP Assistant sections → what to write → where on this site (Storage Calculator, Data Classification, Dataverse picker, De-identify, SHA-256 etc.), with the template-varies note.
- Sidebar + PAGES + PAGE_TITLES for `tasks`, `thesis`, `glossary`.

### PR 3 — Tool pages

- **"Use this one when…"** — `TOOL_DISAMBIGUATION` in `toolExplainers.js`: for strip-file-metadata/strip-image-metadata, split-pdf/pdf-page-delete, extract-images-from-pdf/pdf-to-images, sha256-hasher/checksum-verifier, encrypt-decrypt-text/password-protect-pdf, pdf-redaction/data-anonymizer — one line each direction with a link to the other tool. Rendered by a named export `ToolDisambiguation` in `ToolCaveats.jsx` (same module, so no new chunk), placed under the tool header.
- **15 explainers** in `toolExplainers.js`, each checked against the tool source: split-pdf, reorder-pages, rotate-pages, pdf-page-inspector, add-cover-page, add-page-numbers, pdf-watermark, resize-image, image-cropper, convert-image-format, create-zip, csv-json-converter, csv-encoding-fixer, csv-diff, encoding-detector.
- **Search synonyms** — extend `tags` in `toolRegistry.js` (e.g. compress → shrink, smaller; merge → combine, join; strip metadata → remove gps, location, exif; data-anonymizer → anonymise, anonymize, pseudonymise; redaction → black out, hide text).
- **Try a sample file** — `DropZone` gains an optional `sample` prop `{ label, create: () => Promise<File> }` that renders a "No file handy? Try a sample" button and passes the generated file to `onFiles`. Generators in `src/utils/sampleFiles.js` (fictional participants CSV; a 2-page PDF with fake names built with pdf-lib via dynamic import; a canvas JPEG with an injected EXIF APP1 segment carrying fake GPS + camera model). Wired into data-anonymizer, pdf-redaction, strip-image-metadata. `sampleFiles.js` must not create a new chunk — pin it in `vite.config.js` manualChunks if Rolldown splits it out. Unit tests for the CSV and EXIF builders.

## Constraints (all PRs)

- No new runtime dependencies; no `fetch`; no new JS chunk (bundle guard); entry-chunk growth stays under the bundle gate.
- Every new external link uses `target="_blank" rel="noopener noreferrer"` and is checked to return 200.
- One `h1` per route; new pages get `PAGE_TITLES` entries; AA contrast using existing tokens; mobile 375 px without horizontal scroll.
- CLAUDE.md updated (pages table, directory structure, recent changes, test list) in each PR.

## Testing

- Unit (`node --test`): `route.js` parsing; `workflows.js` integrity (every tool/page id exists, ids unique, stages valid); `glossary.js` ids unique; `contentReview.js` covers every research page; sample-file builders (CSV columns, EXIF segment present and parseable by `exifr`).
- `npm run security:audit`, `npm test`, `npm run build`, bundle-integrity compare against master.
- Browser on `vite preview`: each new page renders with one `h1` and no console errors; a full task run (start → next → finish → exit); sidebar toggle persists across reload; search finds a task, a page and a glossary term; sample files load into the three tools; 375 px check.
