# RDM Toolkit — CLAUDE.md

> **Self-updating project context.** Keep this file current whenever tools are added/removed, pages are changed, dependencies are updated, or the architecture evolves. This is the single source of truth for any AI assistant working in this codebase.

---

## Project Identity

| Field | Value |
|---|---|
| **Name** | RDM Toolkit — Research Data Management Tools |
| **Owner** | Lakehead University / Seaway Digital |
| **Repo** | `seawaydigital/RDM-Toolkit` on GitHub |
| **Deployed** | GitHub Pages at `/RDM-Toolkit/` base path |
| **Stack** | React 18, Vite 5, plain CSS (no Tailwind, no CSS-in-JS) |
| **Primary audience** | Lakehead University researchers, grad students, office staff |

---

## Core Architecture

This is a **100% client-side static SPA**. There is no server, no database, no API, no authentication, and no backend.

- **Routing:** Hash-based (`window.location.hash`). No router library. Two route types: tools (e.g. `#merge-pdfs`) and pages (e.g. `#how-this-works`).
- **Tools:** 61 components, all loaded with `React.lazy()` for code splitting. Each tool is a standalone JSX file.
- **Pages:** 6 informational pages (not tools) rendered separately from the tool area.
- **Data flow:** File → browser memory → process in JS → download result. Nothing is ever sent over the network.
- **Offline:** Workbox service worker (via `vite-plugin-pwa`) pre-caches all static assets on first load. All 61 tools work without internet after first visit.
- **PWA:** Installable as a standalone app. Manifest at `/RDM-Toolkit/manifest.webmanifest`.

---

## Directory Structure

```
src/
├── App.jsx                        # Main component, router, error boundary, drag-and-drop
├── main.jsx                       # React entry point
├── components/
│   ├── home/
│   │   └── HomePage.jsx           # Home screen with category tiles and recent tools
│   ├── layout/
│   │   ├── Topbar.jsx             # Header bar — branding, search (Ctrl/Cmd+K), nav links
│   │   ├── Sidebar.jsx            # Left nav — tool categories, page links, mobile close/Escape
│   │   └── MainContent.jsx        # Right content area wrapper
│   ├── pages/                     # Informational pages (not tools)
│   │   ├── HowThisWorks.jsx       # Privacy model, compliance explanation, encryption guide
│   │   ├── RequestATool.jsx       # Tool request form/info
│   │   ├── DataClassification.jsx # Data classification levels + control matrix
│   │   ├── StorageCalculator.jsx  # Research storage estimator (canvas chart, DMP export)
│   │   ├── TriAgencyPolicy.jsx    # Tri-Agency RDM Policy explainer + flowchart + FAQ
│   │   └── DRACServices.jsx       # DRAC computing services reference (ARC, Cloud, RDM, etc.)
│   └── ui/                        # Shared UI primitives
│       ├── ActionButton.jsx
│       ├── DropZone.jsx
│       ├── EncryptedPDFError.jsx
│       ├── ErrorCard.jsx
│       ├── InfoCard.jsx
│       ├── RelatedTools.jsx
│       ├── ResultPanel.jsx
│       ├── SearchBar.jsx
│       ├── ToolSkeleton.jsx
│       └── Tooltip.jsx
├── data/
│   └── toolRegistry.js            # Single source of truth for all tools and categories
├── hooks/
│   └── useRecentTools.js          # localStorage-backed recent tools (last 5)
├── styles/
│   └── global.css                 # All styles — CSS variables, layout, component styles
├── tools/                         # 61 tool components grouped by category
│   ├── archives/                  # 3 tools
│   ├── calculators/               # 4 tools
│   ├── developer/                 # 2 tools
│   ├── images/                    # 6 tools
│   ├── pdf/                       # 15 tools
│   ├── privacy/                   # 8 tools
│   ├── research/                  # 1 tool
│   └── text/                      # 20 tools
└── utils/
    ├── crypto.js                  # AES-256 encryption/decryption helpers
    ├── droppedFile.js             # Drag-and-drop file reading
    ├── fileValidation.js          # File type/size validation
    ├── filename.js                # Output filename helpers
    ├── imageUtils.js              # Canvas-based image processing
    └── pdfThumbnails.js           # PDF page thumbnail rendering
```

---

## Tool Registry

**File:** `src/data/toolRegistry.js`

Every tool is defined here. Adding or removing a tool means updating this file **and** adding/removing the corresponding JSX file in `src/tools/` **and** updating the lazy import map in `App.jsx`.

### Tool count: 61 tools across 9 categories

#### Primary Categories (always visible in sidebar)

| Category | ID | Tools | Count |
|---|---|---|---|
| PDF Tools | `pdf` | merge-pdfs, split-pdf, compress-pdf, rotate-pages, reorder-pages, add-page-numbers, sign-pdf, password-protect-pdf, remove-pdf-password, extract-images-from-pdf, pdf-watermark, pdf-redaction, pdf-page-delete, pdf-to-images, add-cover-page, pdf-page-inspector | 16 |
| Image Tools | `images` | compress-image, convert-image-format, resize-image, image-cropper, strip-image-metadata, image-to-pdf | 6 |
| Text & Data Tools | `text` | word-counter, find-replace, text-diff, json-formatter, csv-json-converter, data-anonymizer, bibtex-formatter, to-markdown | 8 |
| Privacy & Security | `privacy` | strip-file-metadata, sha256-hasher, encrypt-decrypt-text, password-generator, qr-code-generator | 5 |

#### More Tools (collapsed by default, shown under "More Tools" toggle)

| Category | ID | Tools | Count |
|---|---|---|---|
| File & Archive Tools | `archives` | create-zip, extract-zip, file-size-analyser | 3 |
| More Text Tools | `text-more` | remove-duplicate-lines, csv-diff, base64-tool, csv-encoding-fixer, xml-yaml-formatter, markdown-preview, text-case-converter, line-number-adder, whitespace-cleaner | 9 |
| More Security Tools | `privacy-more` | magic-byte-checker, checksum-verifier, encoding-detector | 3 |
| Calculators & Converters | `calculators` | unit-converter, date-difference, timestamp-converter, file-size-converter | 4 |
| Developer Tools | `developer` | regex-tester, uuid-generator | 2 |

#### Registry object shape

```js
// Category
{ id, label, emoji, primary: bool, description, tools: [...] }

// Tool
{ id, name, slug, description, tags: [...], related: [...] }
```

---

## Pages (Non-Tool Routes)

| Hash | Component | Purpose |
|---|---|---|
| `#how-this-works` | `HowThisWorks.jsx` | Privacy model, compliance (PIPEDA/PHIPA/GDPR/Tri-Agency), encryption guide, password guidance — all external sources hyperlinked |
| `#request-a-tool` | `RequestATool.jsx` | Tool request info |
| `#data-classification` | `DataClassification.jsx` | Guided wizard for classifying research data (Public → Internal → Confidential → Highly Confidential). Shows control requirements, LUFA retention rules |
| `#storage-calculator` | `StorageCalculator.jsx` | 14 file categories, backup strategy multipliers, canvas doughnut chart, DMP text export, OCAP® flag, LUFA 7-year minimum, URL-based config save/load |
| `#tri-agency-policy` | `TriAgencyPolicy.jsx` | Tri-Agency RDM Policy explainer, data deposit flowchart (SVG), repository cards (Borealis/ICPSR/Zenodo/FRDR), FAQ, Indigenous data sovereignty section |
| `#drac-services` | `DRACServices.jsx` | DRAC services tabs: ARC (clusters), Cloud, RDM (Borealis/FRDR/Globus/Nextcloud), Sensitive Data Toolkit, Explora |

---

## App.jsx — Key Behaviours

- **Error boundary:** `ErrorBoundary` class component wraps all tool rendering. On error, shows `ToolErrorFallback` with: offline detection message, collapsible error stack trace, "Try Again" button, GitHub issue link.
- **Smart drag-and-drop:** Drop a file anywhere on the page → extension auto-routes to default tool (`.pdf` → compress-pdf, `.jpg`/`.png` → compress-image, `.csv` → csv-encoding-fixer, etc.). If already on a PDF tool and drop a PDF, stays on current tool.
- **Search:** Ctrl+K (Cmd+K on Mac) opens `SearchBar`. Topbar displays platform-aware shortcut.
- **Mobile:** Sidebar auto-closes on screens <768px. `Sidebar.jsx` has Escape key listener and an X close button (hidden on desktop).
- **Recent tools:** Last 5 used tools stored in `localStorage` via `useRecentTools()`. Displayed on HomePage.
- **Suspense:** `ToolSkeleton` shown while lazy tool chunk loads.

---

## Design System

**File:** `src/styles/global.css` (single global CSS file — no modules, no Tailwind)

### CSS Variables

```css
/* Backgrounds */
--bg-primary:     #0A1628   /* dark navy — main background */
--bg-secondary:   #0D2847   /* card/panel backgrounds */
--bg-tertiary:    #163A5E   /* hover/raised surfaces */
--border:         #1E5A8A   /* borders and dividers */

/* Text */
--text-primary:   #F1F5F9   /* near-white — body text */
--text-secondary: #94A3B8   /* subdued text, meta info, source links */
--text-muted:     #7C9BBF   /* placeholder, timestamps */

/* Accent colours */
--accent-primary: #FFC20E   /* Lakehead gold — primary CTA, highlights */
--accent-amber:   #F59E0B   /* warnings */
--accent-green:   #10B981   /* success states */
--accent-red:     #EF4444   /* errors, destructive actions */
--accent-cyan:    #FFC20E   /* alias for primary */

/* Lakehead brand */
--lh-cobalt:      #00427A
--lh-blaze:       #FFC20E

/* Typography */
--font-sans:  'IBM Plex Sans', system-ui, sans-serif
--font-mono:  'IBM Plex Mono', Consolas, monospace

/* Spacing (8px base grid) */
--space-xs: 4px  --space-sm: 8px  --space-md: 16px
--space-lg: 24px --space-xl: 32px --space-2xl: 48px

/* Border radius */
--radius-sm: 4px  --radius-md: 8px  --radius-lg: 12px

/* Layout */
--topbar-height: 56px
--sidebar-width: 260px
```

### CSS Naming Conventions

- Layout: `.topbar-*`, `.sidebar-*`, `.main-content-*`
- Tool pages: use tool-specific prefixes (e.g. `.mp-*` for Markdown Preview, `.sc-*` for Storage Calculator, `.tap-*` for Tri-Agency Policy, `.dc-*` for Data Classification)
- Shared UI components: `.tool-page`, `.tool-page-header`, `.tool-page-meta`, `.error-card`, `.info-card`, `.action-button`, `.drop-zone`, `.result-panel`
- Source/meta links: `.tool-page-meta a` — styled `color: var(--text-secondary)` with underline, hover goes to `--text-primary`

---

## Dependencies

### Production

| Package | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | ^18.2.0 | UI framework |
| `@cantoo/pdf-lib` | ^1.17.1 | PDF manipulation (merge, split, protect, sign, watermark) |
| `pdfjs-dist` | ^5.6.205 | PDF rendering and thumbnail extraction (CVE GHSA-wgrm-67xf-hhpq patched in v4+) |
| `@pdf-lib/fontkit` | ^1.1.1 | Font embedding in PDFs |
| `jszip` | ^3.10.1 | ZIP archive creation and extraction |
| `dompurify` | ^3.3.3 | HTML sanitization (used in Markdown Preview) |
| `zxcvbn` | ^4.4.2 | Realistic password strength estimation (Encrypt/Decrypt tool) |
| `exifr` | ^7.1.3 | EXIF/XMP metadata extraction from images |
| `mammoth` | ^1.7.1 | DOCX → HTML conversion |
| `docx` | ^8.5.0 | DOCX file generation |
| `@imgly/background-removal` | ^1.4.5 | ML background removal (WASM/ONNX, runs in-browser) |
| `qrcode` | ^1.5.3 | QR code generation |
| `@dnd-kit/core` / `sortable` / `utilities` | ^6/8/3 | Drag-and-drop page reordering (PDF tools) |
| `lucide-react` | ^0.344.0 | Icons throughout the UI |
| `@fontsource/ibm-plex-sans` / `mono` | ^5.0.0 | Self-hosted fonts |

### Dev

| Package | Purpose |
|---|---|
| `vite` ^5.1.0 | Build tool and dev server |
| `@vitejs/plugin-react` ^4.2.0 | React HMR and JSX transform |
| `vite-plugin-pwa` ^1.2.0 | PWA / service worker generation (Workbox) |
| `vite-plugin-static-copy` ^1.0.0 | Copies `@imgly` WASM assets to dist |

### Manual Chunks (vite.config.js)

Large libraries are split into their own chunks to keep tool chunks small:
- `pdf-lib` chunk: `@cantoo/pdf-lib`
- `pdfjs` chunk: `pdfjs-dist`
- `jszip` chunk: `jszip`
- `zxcvbn` chunk: `zxcvbn` (~818KB — only loads when Encrypt/Decrypt tool is opened)
- `dompurify` chunk: `dompurify`

---

## Build & Deploy

```bash
npm run dev        # Vite dev server (HMR)
npx vite build     # Production build → dist/
npx vite preview   # Serve production build locally (port 4173)
```

- Build target: ES2020
- Worker format: ES modules (`worker: { format: 'es' }`)
- Deployed via GitHub Pages from `master` branch
- Service worker pre-caches 140 assets on first load (includes all JS chunks, fonts, icons)
- PWA app name: "RDM Toolkit", theme: `#0D1B35`, display: `standalone`

---

## Security Model

### What this app does NOT have
- No server, no API, no database, no auth, no sessions
- No `fetch()` to a backend, no `XMLHttpRequest`, no WebSocket
- No tracking, no analytics, no third-party scripts

### Key security measures in place
- **DOMPurify** sanitizes all Markdown-rendered HTML before it touches the DOM (Markdown Preview tool); strict allowlist — no `style` attr, no `div`/`span`, blocks `javascript:` and `data:` URIs
- **zxcvbn** for realistic password strength (not character-class counting)
- **PDF.js v5** runs PDF parsing in a sandboxed Web Worker (not main thread); upgraded from v3 to patch CVE GHSA-wgrm-67xf-hhpq (arbitrary JS from malicious PDFs)
- **No CDN scripts** — all JS self-hosted; no third-party script injection surface
- **Source links** are hyperlinked with `rel="noopener noreferrer"` throughout
- **ZIP bomb guard** — ExtractZIP checks declared decompressed sizes before extraction; blocks > 5 GB total
- **CSP meta tag** — `default-src 'self'`, blocks `javascript:`/`data:` URIs, `frame-ancestors 'none'`; also sets X-Content-Type-Options, Referrer-Policy, Permissions-Policy via meta tags
- **Dependabot** — weekly npm scans, PRs auto-opened for dependency updates (`.github/dependabot.yml`)
- **CodeQL** — static analysis on every push to master, every PR, and weekly (`.github/workflows/codeql.yml`); results in GitHub → Security → Code scanning alerts
- **CI security audit** — `npm audit --omit=dev --audit-level=critical` blocks deploys on CVSS 9.0+ issues

### Known gaps / deployment notes
1. **HTTP security headers** — GitHub Pages does not support custom headers. `<meta http-equiv>` CSP is a stopgap; notably `frame-ancestors 'none'` is **ignored** in meta tags (only works as HTTP header). When moving off GitHub Pages, configure real headers — Cloudflare Pages `_headers` file or Netlify `netlify.toml`.
2. **URL-exposed config** — Storage Calculator saves state to URL hash. Hash doesn't go to server logs, but appears in browser history and shared links.
3. **Branch protection** — enable in GitHub → Settings → Branches (require PR + review + CI pass before merging to master).
4. **pdf-lib + AcroForm PDFs** — pdf-lib's serializer produces structurally broken output for PDFs with form fields, digital signatures, or XFA forms (Adobe Acrobat shows "error processing a page"). Tested approaches: `scaleContent()`, `embedPage()`/`drawPage()`, and canvas rasterization — all fail. PDF Page Inspector detects form fields via pdfjs Widget annotations and advises users to flatten via File → Print → Save as PDF before resizing.
5. **xlsx CVEs** — `xlsx@0.18.5` (SheetJS) has 2 high-severity CVEs: GHSA-4r6h-8v6p-xvw6 (prototype pollution) and GHSA-5pgg-2g8v-p4x9 (ReDoS). Not critical-level (CVSS <9.0), so CI audit passes. No OSS patch available — SheetJS moved patched versions to a commercial license. Risk is low: users only process their own uploaded files.

---

## External Sources Referenced in the App

All external sources are hyperlinked (`target="_blank" rel="noopener noreferrer"`):

| Source | URL | Where used |
|---|---|---|
| PIPEDA | priv.gc.ca | HowThisWorks, HomePage |
| PHIPA | ontario.ca/laws/statute/04p03 | HowThisWorks, HomePage |
| GDPR | gdpr.eu | HowThisWorks, HomePage |
| Tri-Agency RDM Policy | science.gc.ca | HowThisWorks |
| 7-Zip | 7-zip.org | HowThisWorks |
| VeraCrypt | veracrypt.fr | HowThisWorks (x2) |
| Canadian Centre for Cyber Security | cyber.gc.ca | HowThisWorks |
| Have I Been Pwned | haveibeenpwned.com | HowThisWorks |
| Bitwarden | bitwarden.com | HowThisWorks |
| 1Password | 1password.com | HowThisWorks |
| DMP Assistant | dmp-pgd.ca | TriAgencyPolicy |
| Borealis | borealisdata.ca | TriAgencyPolicy |
| ICPSR | icpsr.umich.edu | TriAgencyPolicy |
| Zenodo | zenodo.org | TriAgencyPolicy |
| FRDR | frdr-dfdr.ca | TriAgencyPolicy |
| FNIGC OCAP® | fnigc.ca/ocap-training | TriAgencyPolicy, StorageCalculator |
| LUFA | lufa.ca | StorageCalculator |

---

## How to Add a New Tool

1. Create `src/tools/{category}/{ToolName}.jsx`
2. Add entry to `src/data/toolRegistry.js` in the correct category's `tools` array
3. Add a `React.lazy()` import in `App.jsx`'s `toolComponents` map
4. Add the file extension → tool ID mapping in App.jsx's drag-and-drop handler (if file-based)
5. Run `npx vite build` and verify no chunk size warnings

## How to Add a New Page

1. Create `src/components/pages/{PageName}.jsx`
2. Add the hash string to the `PAGES` Set in `App.jsx`
3. Add a render case in `App.jsx`'s page-rendering switch/conditional
4. Add a sidebar link in `Sidebar.jsx` with the appropriate Lucide icon

---

## Recent Changes (keep updated)

| Date | Change |
|---|---|
| 2026-04-14 | Added File to Markdown tool (`#to-markdown`) — converts DOCX, PDF, HTML, XLSX, CSV, TXT, MD, RTF, JSON to Markdown for AI consumption; two modes: AI-friendly (tables flattened, images → `[image]`, whitespace normalised) and Preserve formatting (full Markdown structure); uses Turndown.js as HTML→MD backbone, mammoth for DOCX, pdfjs for PDF text extraction, SheetJS for XLSX; drag-and-drop routing: `.docx` files auto-route here; new deps: `turndown`, `turndown-plugin-gfm`, `xlsx` |
| 2026-04-10 | Added PDF Page Inspector tool (`#pdf-page-inspector`) — inspect exact page dimensions for every page (standard format detection with ±5pt/±20pt tolerances, in/mm toggle, lazy thumbnails), plus optional resize to Letter, A4, Legal, A3, A5, Tabloid, Executive, B5, or custom dimensions with Scale, Crop, or Pad methods; resize uses `embedPage()`/`drawPage()` (XObject embedding) with `useObjectStreams: false` for broad viewer compatibility; detects AcroForm fields via pdfjs Widget annotations and shows warning with Print-to-PDF flatten guidance; built with pdfjs-dist + pdf-lib, fully offline |
| 2026-04-08 | Upgraded pdfjs-dist v3 → v5.6.205 — patches CVE GHSA-wgrm-67xf-hhpq; updated worker import path to `.mjs`; replaced callback-based `page.objs.get()` with synchronous API in ExtractImagesFromPDF |
| 2026-04-08 | Added CodeQL security scanning — runs on every push/PR + weekly; results in GitHub Security tab |
| 2026-04-08 | Added Cover Page PDF tool (`#add-cover-page`) — prepend a custom cover page (title, subtitle, author, department, institution, date) with two layouts (centred/left-ruled), colour picker, live preview; built with pdf-lib, fully offline |
| 2026-04-08 | Redesigned homepage — trust badges, Popular Tools grid, Research Resources cards, All Tools accordion with expandable category chips |
| 2026-04-08 | 5 security hardening measures: DOMPurify tightened (removed style attr, added URI allowlist), ZIP bomb guard (5 GB limit), CSP/security meta tags in index.html, Dependabot weekly scans, CI audit step (--audit-level=critical) |
| 2026-04-07 | Hyperlinked all unlinked source citations across HowThisWorks, HomePage, TriAgencyPolicy, StorageCalculator |
| 2026-04-07 | 10 security/UX improvements: DOMPurify in Markdown Preview, Download HTML button, zxcvbn password strength, lazy PDF thumbnails (IntersectionObserver), expanded PII detection patterns, improved error boundary with offline detection, "Edit Answers" in DataClassification, Mac-aware ⌘K shortcut, sidebar Escape key + mobile close button |
| 2026-04-07 | Added PWA service worker (vite-plugin-pwa) for full offline support |
| 2026-04-06 | Fixed YES/NO label visibility on deposit flowchart SVG in TriAgencyPolicy |
| 2026-04-06 | Updated DMP Assistant URL from portagenetwork.ca to dmp-pgd.ca |
| 2026-04-05 | Rebuilt deposit flowchart as proper SVG with real diamond shapes and arrowheads |
| 2026-04-04 | Added DRAC ARC "How clusters work" section from wiki research |

---

## CI / GitHub Workflows

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/deploy.yml` | Push to master | Build + deploy to GitHub Pages; runs `npm audit --omit=dev --audit-level=critical` |
| `.github/workflows/codeql.yml` | Push, PR, weekly Monday | CodeQL JS static analysis; results in GitHub → Security → Code scanning alerts |
| `.github/dependabot.yml` | Weekly Monday | Opens PRs for npm dependency updates (major versions excluded) |

**CI audit strategy:** `--omit=dev` excludes esbuild/Vite CVEs (dev server only, not served to users). `--audit-level=critical` blocks only CVSS 9.0+ issues. Tracked non-critical: none currently.
