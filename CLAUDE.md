# RDM Toolkit — CLAUDE.md

> **Self-updating project context.** Keep this file current whenever tools are added/removed, pages are changed, dependencies are updated, or the architecture evolves. This is the single source of truth for any AI assistant working in this codebase.

---

## Project Identity

| Field | Value |
|---|---|
| **Name** | RDM Toolkit — Research Data Management Tools |
| **Owner** | Lakehead University / Seaway Digital |
| **Repo** | `seawaydigital/RDM-Toolkit` on GitHub |
| **Deployed** | GitHub Pages at [rdmtoolkit.ca](https://rdmtoolkit.ca/) (apex custom domain, Vite `base: '/'`) |
| **Stack** | React 18, Vite 5, plain CSS (no Tailwind, no CSS-in-JS) |
| **Primary audience** | Lakehead University researchers, grad students, office staff |

---

## Core Architecture

This is a **100% client-side static SPA**. There is no server, no database, no API, no authentication, and no backend.

- **Routing:** Hash-based (`window.location.hash`). No router library. Two route types: tools (e.g. `#merge-pdfs`) and pages (e.g. `#how-this-works`).
- **Tools:** 46 components, all loaded with `React.lazy()` for code splitting. Each tool is a standalone JSX file.
- **Pages:** 6 informational pages (not tools) rendered separately from the tool area.
- **Data flow:** File → browser memory → process in JS → download result. Nothing is ever sent over the network.
- **Offline:** Workbox service worker (via `vite-plugin-pwa`) pre-caches all static assets on first load. All 46 tools work without internet after first visit.
- **PWA:** Installable as a standalone app. Manifest at `/manifest.webmanifest` (served from the apex custom domain).

---

## Directory Structure

```
src/
├── App.jsx                        # Main component, router, error boundary, drag-and-drop
├── main.jsx                       # React entry point
├── components/
│   ├── home/
│   │   ├── HomePage.jsx           # Home screen — manifesto hero + diagram, stat strip, bento, how-it-works, guides, accordion
│   │   └── HeroDiagram.jsx        # Animated privacy-flow SVG for the hero (reduced-motion aware)
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
│   │   ├── GrantsAndIdentifiers.jsx # ORCID, CCV, DOI, REB/DMP setup guide
│   │   ├── LakeheadDataverse.jsx  # LU Dataverse deposit guide
│   │   ├── AcrobatAlternative.jsx # Free replacements for Adobe Acrobat Pro
│   │   └── DRACServices.jsx       # DRAC computing services reference (ARC, Cloud, RDM, etc.)
│   └── ui/                        # Shared UI primitives
│       ├── ActionButton.jsx
│       ├── ClearLocalData.jsx     # Wipe-all-local-data button (HowThisWorks limits section)
│       ├── DropZone.jsx
│       ├── EncryptedPDFError.jsx
│       ├── ErrorCard.jsx
│       ├── FeedbackModal.jsx      # In-app feedback dialog (mailto + prefilled GitHub issue)
│       ├── InfoCard.jsx
│       ├── NetworkSilence.jsx     # Live outbound-request counter (HowThisWorks verify section)
│       ├── RelatedTools.jsx
│       ├── ResultPanel.jsx
│       ├── SearchBar.jsx
│       ├── ToolSkeleton.jsx
│       ├── Tooltip.jsx
│       └── WelcomeTour.jsx        # First-visit 3-step onboarding modal
├── data/
│   ├── toolRegistry.js            # Single source of truth for all tools and categories
│   └── institutionConfig.js       # Single source of truth for Lakehead strings (emails, URLs, office names)
├── hooks/
│   ├── useRecentTools.js          # localStorage-backed recent tools (last 5)
│   └── useUsageLog.js             # Opt-in local-only usage log for tester feedback (500-entry cap)
├── styles/
│   └── global.css                 # All styles — CSS variables, layout, component styles
├── tools/                         # 46 tool components grouped by category
│   ├── archives/                  # 3 tools
│   ├── images/                    # 6 tools
│   ├── pdf/                       # 17 tools
│   ├── privacy/                   # 7 tools (4 privacy + 3 more-security)
│   ├── research/                  # 1 tool (de-identify)
│   └── text/                      # 12 tools (7 text + 5 more-text)
└── utils/
    ├── crypto.js                  # AES-256 encryption/decryption helpers
    ├── droppedFile.js             # Drag-and-drop file reading
    ├── fileValidation.js          # File type/size validation
    ├── filename.js                # Output filename helpers
    ├── imageUtils.js              # Canvas-based image processing
    ├── networkActivity.js         # Outbound-request classifier (network-silence indicator)
    └── pdfThumbnails.js           # PDF page thumbnail rendering
```

---

## Tool Registry

**File:** `src/data/toolRegistry.js`

Every tool is defined here. Adding or removing a tool means updating this file **and** adding/removing the corresponding JSX file in `src/tools/` **and** updating the lazy import map in `App.jsx`.

### Tool count: 46 tools across 7 categories

All tools map directly to the RDM mandate (research data lifecycle + Tri-Agency / TCPS 2 / PHIPA / OCAP® compliance). General-purpose utilities (calculators, QR codes, regex/UUID/Base64/YAML-XML developer tooling) were removed 2026-04-18 to keep the scope focused.

#### Primary Categories (always visible in sidebar)

| Category | ID | Tools | Count |
|---|---|---|---|
| PDF Tools | `pdf` | merge-pdfs, split-pdf, reorder-pages, pdf-page-delete, rotate-pages, compress-pdf, pdf-page-inspector, add-cover-page, add-page-numbers, pdf-watermark, sign-pdf, fillable-pdf-form, pdf-redaction, password-protect-pdf, remove-pdf-password, extract-images-from-pdf, pdf-to-images | 17 |
| Image Tools | `images` | compress-image, resize-image, image-cropper, convert-image-format, strip-image-metadata, image-to-pdf | 6 |
| Text & Data Tools | `text` | word-counter, find-replace, text-diff, json-formatter, csv-json-converter, to-markdown, bibtex-formatter, data-anonymizer | 8 |
| Privacy & Security | `privacy` | strip-file-metadata, encrypt-decrypt-text, password-generator, sha256-hasher | 4 |

#### More Tools (collapsed by default, shown under "More Tools" toggle)

| Category | ID | Tools | Count |
|---|---|---|---|
| File & Archive Tools | `archives` | create-zip, extract-zip, file-size-analyser | 3 |
| More Text Tools | `text-more` | whitespace-cleaner, remove-duplicate-lines, csv-diff, csv-encoding-fixer, markdown-preview | 5 |
| More Security Tools | `privacy-more` | magic-byte-checker, checksum-verifier, encoding-detector | 3 |

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
| `#how-this-works` | `HowThisWorks.jsx` | Privacy model, compliance (PIPEDA/PHIPA/GDPR/Tri-Agency), verification steps (incl. live `NetworkSilence` outbound-request counter), "Where This Model Ends" honest-limits section (extensions, OS swap, downloads, shared computers + `ClearLocalData` wipe button), FAQ — plus a bridge callout to RS Toolkit for cybersecurity practices, and 4 linked cards for RDM security tools (Password Protect PDF, Strip Metadata, SHA-256 Hasher, Encrypt Text) |
| `#request-a-tool` | `RequestATool.jsx` | Tool request info |
| `#data-classification` | `DataClassification.jsx` | Guided wizard for classifying research data (Public → Internal → Confidential → Highly Confidential). Shows control requirements, LUFA retention rules |
| `#storage-calculator` | `StorageCalculator.jsx` | 14 file categories, backup strategy multipliers, canvas doughnut chart, DMP text export, OCAP® flag, LUFA 7-year minimum, URL-based config save/load |
| `#tri-agency-policy` | `TriAgencyPolicy.jsx` | Tri-Agency RDM Policy explainer, data deposit flowchart (SVG), repository cards (Borealis/ICPSR/Zenodo/FRDR), FAQ, three-pillar × three-agency status matrix (CIHR/NSERC/SSHRC), expanded Indigenous governance section (OCAP, CARE, ITK NISR, USAI, Métis Research Protocols, TCPS 2 Ch 9), EDI in research planning section |
| `#grants-identifiers` | `GrantsAndIdentifiers.jsx` | ORCID / Canadian Common CV / DOI / REB & DMP setup guide — 3 identifier cards with CTAs, 6-step recommended setup order, TCPS 2 + DMP Assistant + LU REB resource cards, contact CTA for LU RDM support and Dr. Ayeni |
| `#drac-services` | `DRACServices.jsx` | DRAC services tabs: ARC (clusters), Cloud, RDM (Borealis/FRDR/Globus/Nextcloud), Sensitive Data Toolkit, Explora |
| `#acrobat-alternative` | `AcrobatAlternative.jsx` | Adobe Acrobat Pro comparison guide for Lakehead researchers — The Free Stack (RDM Toolkit + Free Acrobat Reader + Google Docs via Lakehead Workspace + LibreOffice), task-by-task coverage table with links to RDM tools, honest "when Acrobat is still worth it" section, privacy note for OCAP®/PHIPA data, bonus callout for research tools beyond Acrobat's scope. PDF→Word primary: Microsoft Word (File → Open); complex formatting: LibreOffice (free) or Tungsten Power PDF (paid) |
| `#lakehead-dataverse` | `LakeheadDataverse.jsx` | Dedicated guide for depositing data to the Lakehead University Dataverse on Borealis — persuasive intro, 6-card benefits grid, repo picker (LU Dataverse vs FRDR vs Zenodo), 8-step deposit guide, FAQ, contact CTA for Dr. Ayeni |

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
--bg-secondary:   #0E2743   /* card/panel backgrounds (subtly warmed 2026-04-17) */
--bg-tertiary:    #163A5E   /* hover/raised surfaces */
--bg-card:        #102F52   /* card surface — slightly lifted from secondary */
--bg-inset:       #081121   /* deepest well — sidebar base */
--border:         #1E5A8A   /* borders and dividers */
--border-soft:    rgba(255,255,255,0.06)
--border-hairline:rgba(255,255,255,0.08)  /* preferred for editorial rules/separators */

/* Text */
--text-primary:   #F1F5F9   /* near-white — body text */
--text-secondary: #94A3B8   /* subdued text, meta info, source links */
--text-muted:     #7C9BBF   /* placeholder, timestamps */
--text-parchment: #EEE6D3   /* warm off-white for display/hero headings */

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
--font-display: 'Fraunces', 'Iowan Old Style', Palatino, Georgia, serif  /* editorial serif — wordmark, hero titles, section titles, resource/category labels */
--font-sans:  'IBM Plex Sans', system-ui, sans-serif                     /* body text */
--font-mono:  'IBM Plex Mono', Consolas, monospace                       /* serials, metadata counts, code */

/* Shadows (editorial — soft) */
--shadow-card: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -18px rgba(0,0,0,0.6)
--shadow-lift: 0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 40px -20px rgba(0,0,0,0.7)

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
- Shared UI components: `.tool-page` (960px editorial wrapper for every tool route), `.tool-header` + `.tool-header-kicker` + `.tool-title` + `.tool-header-lede` (emitted by `App.jsx` above every tool), `.tool-page-meta`, `.error-card`, `.info-card`, `.action-button`, `.drop-zone`, `.result-panel`
- Editorial kicker pattern: `.htw-kicker` (and `.tool-header-kicker`) — gold uppercase 10px, 0.24em letter-spacing, hairline `::before` (and sometimes `::after`) rules. Reused across every non-tool hero.
- Section-title flex-rule pattern: Fraunces 20–22px + `flex: 1` hairline gradient via `::after`, optional mono count span. Used for `.homepage-section-title`, `.htw-section-title`, `.tap-section-title`, `.drac-subsection-title`, `.lud-section-title`, `.dc-section-title`, `.related-tools-title`.
- Source/meta links: `.tool-page-meta a` — styled `color: var(--text-secondary)` with underline, hover goes to `--text-primary`

---

## Dependencies

> **All versions are pinned exactly** (no `^`/`~`) since 2026-05-02. The allowlist in [scripts/security-audit.mjs](scripts/security-audit.mjs) enforces both the package set and the exact version. Adding/updating a dep requires editing the allowlist in the same PR — CI fails otherwise.

### Production

| Package | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | 18.3.1 | UI framework |
| `@cantoo/pdf-lib` | 1.21.1 | PDF manipulation (merge, split, protect, sign, watermark) |
| `pdfjs-dist` | 5.6.205 | PDF rendering and thumbnail extraction (CVE GHSA-wgrm-67xf-hhpq patched in v4+) |
| `@pdf-lib/fontkit` | 1.1.1 | Font embedding in PDFs |
| `jszip` | 3.10.1 | ZIP archive creation and extraction |
| `dompurify` | 3.4.0 | HTML sanitization (Markdown Preview, FileToMarkdown) |
| `zxcvbn` | 4.4.2 | Realistic password strength estimation (Encrypt/Decrypt tool) |
| `exifr` | 7.1.3 | EXIF/XMP metadata extraction from images |
| `turndown` | 7.2.4 | HTML → Markdown conversion (FileToMarkdown) |
| `turndown-plugin-gfm` | 1.0.2 | GFM table/strikethrough support for Turndown |
| `@dnd-kit/core` / `sortable` / `utilities` | 6.3.1 / 8.0.0 / 3.2.2 | Drag-and-drop page reordering (PDF tools) |
| `lucide-react` | 0.577.0 | Icons throughout the UI |
| `@fontsource/ibm-plex-sans` / `mono` | 5.2.8 / 5.2.7 | Self-hosted body + mono fonts |
| `@fontsource/fraunces` | 5.2.9 | Self-hosted display serif for headings, wordmark, hero titles |

### Dev

| Package | Version | Purpose |
|---|---|---|
| `vite` | 5.4.21 | Build tool and dev server |
| `@vitejs/plugin-react` | 4.7.0 | React HMR and JSX transform |
| `vite-plugin-pwa` | 1.2.0 | PWA / service worker generation (Workbox) |

### Removed deps (banned via `bannedPackages` in `security-audit.mjs`)

These were removed in the 2026-05-02 hardening pass and are now blocked by the audit script. CI fails if any reappears in `package.json` or `package-lock.json`:

| Package | Reason removed |
|---|---|
| `mammoth` | DOCX→HTML — large surface, transitive deps; FileToMarkdown no longer accepts `.docx` |
| `xlsx` (SheetJS) | Unpatched high-severity CVEs (no OSS fix available); FileToMarkdown no longer accepts `.xlsx` |
| `docx` | DOCX generation — only used by removed RemoveBackground tool |
| `@imgly/background-removal` | ML background removal — large WASM/ONNX bundle, removed RemoveBackground tool |
| `onnxruntime-web` | Transitive dep of @imgly |
| `protobufjs` | Transitive dep of @imgly |
| `@xmldom/xmldom` | Transitive parser, no longer needed |
| `vite-plugin-static-copy` | Was used to copy @imgly WASM to dist — no longer needed |

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
npm install              # `.npmrc` forces --ignore-scripts; no postinstall hooks ever run
npm run dev              # Vite dev server (HMR), port 5173
npm run build            # Production build → dist/
npm run preview          # Serve dist/ on port 4173 with full production HTTP headers
npm run security:audit   # Run all project guardrails (see scripts/security-audit.mjs)
```

- Build target: ES2020
- Worker format: ES modules (`worker: { format: 'es' }`)
- Deployed via GitHub Pages from `master` branch (custom domain `rdmtoolkit.ca`)
- Service worker pre-caches ~162 assets on first load (includes all JS chunks, fonts, icons)
- PWA app name: "RDM Toolkit", theme: `#0D1B35`, display: `standalone`
- `vite preview` ships the same security headers production gets via the `previewSecurityHeaders()` plugin in [vite.config.js](vite.config.js) — Lighthouse and local testing see what users actually see

---

## Security Model

### What this app does NOT have
- No server, no API, no database, no auth, no sessions
- No `fetch()` to a backend, no `XMLHttpRequest`, no WebSocket, no `sendBeacon`
- No tracking, no analytics, no third-party scripts, no CDN

### Runtime defenses (browser-side)

- **CSP `connect-src 'self'`** — blocks any library from making outbound network calls, even if compromised. This is the strongest single defense in the stack.
- **CSP `script-src 'self' 'wasm-unsafe-eval'`** — no external scripts can load; `'wasm-unsafe-eval'` is the only relaxation, required by pdfjs worker
- **CSP `object-src 'none'`** — explicit (added 2026-05-02) so Lighthouse `csp-xss` audit passes; closes embed/object/applet vectors
- **CSP `frame-ancestors 'none'`** — clickjacking protection (works in `_headers`; ignored in meta tag, but X-Frame-Options DENY covers meta-only deployments)
- **Trusted Types enforced in production** (added 2026-06-11) — `require-trusted-types-for 'script'` + `trusted-types dompurify default` injected into the meta CSP by the `buildCspTighten()` plugin in [vite.config.js](vite.config.js) (build only — dev keeps the relaxed CSP for HMR) and present in `_headers` + preview headers. All 3 `dangerouslySetInnerHTML` sinks receive only DOMPurify `RETURN_TRUSTED_TYPE` TrustedHTML. A `default` policy in [main.jsx](src/main.jsx) vouches for **same-origin script URLs only** (Chromium gates the `Worker()` constructor — pdfjs needs this); it deliberately has no `createHTML`, so raw-string HTML sinks throw.
- **CSP `style-src 'self'` in production** (no `'unsafe-inline'`, added 2026-06-11) — injected `<style>` elements and `setAttribute('style', …)` are blocked. React `style={{}}` props are unaffected (applied via CSSOM, which CSP does not govern). The markdown renderers' generated HTML no longer carries `style=` attributes — rendered-markdown styling lives in `global.css` (`.md-rendered` / `.ftm-preview` rules).
- **DOMPurify** sanitizes all Markdown-rendered HTML before it touches the DOM (`MarkdownPreview`, `FileToMarkdown`, and `HowItWorks` explainer flow steps); strict allowlist — no `style` attr, no `script`/`iframe`/`object`/`embed`, blocks `javascript:`/`data:` URIs via custom `ALLOWED_URI_REGEXP`; `RETURN_TRUSTED_TYPE: true` everywhere
- **PDF.js v5** runs PDF parsing in a sandboxed Web Worker (not main thread); upgraded from v3 to patch CVE GHSA-wgrm-67xf-hhpq
- **PDF Redaction post-save verification** — output re-parsed with pdfjs to confirm zero text on redacted pages; download blocked if any text survives
- **ZIP bomb guard** — ExtractZIP checks declared decompressed sizes before extraction; blocks > 5 GB total
- **ZIP slip guard** — `relativePath.split('/').pop()` strips path components from extracted entries
- **Filename sanitizer** ([utils/filename.js](src/utils/filename.js)) — strips everything except `[a-zA-Z0-9_\-\s]` from output filenames; path separators, dots, control chars cannot survive
- **AES-256-GCM via Web Crypto** — no DIY crypto; PBKDF2-SHA256 (600k iter, OWASP-current) for key derivation; random per-message salt + IV. Output is `v2:`-prefixed; legacy unprefixed blobs (100k iter) still decrypt via `decryptText()`'s fallback. The `.pdf.enc` PDFCRYPT decoder in RemovePDFPassword stays at 100k — decrypt-only legacy support, nothing produces that format anymore.
- **`crypto.getRandomValues()`** for password generation; never `Math.random()` — uniform via rejection sampling (`secureRandomIndices()`), no modulo bias
- **Service worker, no runtime caching** — `runtimeCaching: []` so the SW only ever serves precached assets; no opportunity for cache poisoning
- **HTTP headers** in [public/_headers](public/_headers) (Cloudflare/Netlify) and via `previewSecurityHeaders()` plugin in `vite preview`: HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denying camera/mic/geo/payment/usb/serial

### Supply-chain defenses (install-time, Tier 1 — added 2026-05-02)

- **Pinned exact versions** — every dep in `package.json` is an exact version (no `^`/`~`). Dependabot still proposes updates as PRs you review.
- **`.npmrc` with `ignore-scripts=true`** — no postinstall hooks ever execute, neutralizing the most common supply-chain RCE vector
- **`npm ci --ignore-scripts`** in both `deploy.yml` and `security.yml`
- **`npm audit signatures`** in CI — verifies every dep was actually published by its registered maintainer (Sigstore/SLSA via npm registry signing); catches account takeovers
- **Dependency allowlist** in [scripts/security-audit.mjs](scripts/security-audit.mjs) — `allowedDependencies` and `allowedDevDependencies` Maps with exact pinned versions. CI fails on (a) unreviewed deps, (b) version drift, (c) non-exact semver, (d) missing expected deps
- **Dependency blocklist** — `bannedPackages` array prevents reintroduction of removed deps (mammoth, xlsx, docx, @imgly/background-removal, onnxruntime-web, protobufjs, @xmldom/xmldom, vite-plugin-static-copy)
- **Lockfile diff guard** ([scripts/lockfile-diff-guard.mjs](scripts/lockfile-diff-guard.mjs)) — fails PR if `package-lock.json` changed without a matching `package.json` change, catching lockfile tampering / undisclosed transitive bumps
- **SLSA build provenance** (added 2026-06-11) — `actions/attest-build-provenance` in `deploy.yml` signs an attestation for every deployed JS/CSS/HTML file + `bundle-integrity.json`, cryptographically linking the served assets to the exact commit and workflow run that built them (verifiable via `gh attestation verify`)

### CI / process defenses

- **`npm run security:audit`** — runs every PR and push; blocks on:
  - Banned package imports anywhere in `src/`
  - `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`sendBeacon` calls in source
  - `eval`/`new Function` calls
  - `document.cookie`/`indexedDB` access
  - `.innerHTML`/`.outerHTML`/`insertAdjacentHTML`
  - `dangerouslySetInnerHTML` outside the 3 allowlisted files (HowItWorks, MarkdownPreview, FileToMarkdown)
  - `localStorage`/`sessionStorage` outside the 5 allowlisted hooks/components (incl. wipe-only `ClearLocalData.jsx`)
  - `style` attribute in any DOMPurify `ALLOWED_ATTR`
  - `target="_blank"` without nearby `rel="noopener noreferrer"`
  - `<script>` / `on*=` / `javascript:` / `data:text/html` in `toolExplainers.js`
  - Tools registered without a lazy import, or files in `src/tools/` without registration
  - Missing `_headers` file or missing required directives (CSP with `frame-ancestors 'none'` + `object-src 'none'`)
  - Missing fallback meta CSP in `index.html` or `'unsafe-eval'` present
- **`npm audit --omit=dev --audit-level=high`** — blocks deploys on any high-severity production CVE
- **Lighthouse CI** with explicit `csp-xss` audit at `minScore: 1` — blocks merge if CSP regresses
- **CodeQL** — static analysis on every push to master, every PR, and weekly (`.github/workflows/codeql.yml`); results in GitHub → Security → Code scanning alerts
- **Dependabot** — weekly npm scans, PRs auto-opened for dependency updates (`.github/dependabot.yml`)

### Known gaps / deployment notes

1. **HTTP security headers on GitHub Pages** — GitHub Pages does not apply custom headers. `<meta http-equiv>` CSP is a stopgap; notably `frame-ancestors 'none'` is **ignored** in meta tags. The site should be fronted by Cloudflare Pages or Netlify in production so `public/_headers` takes effect. `vite preview` already sends real headers locally for parity.
2. **URL-exposed config** — Storage Calculator saves state to URL `?config=` query string. Only contains numeric inputs, predefined labels, and booleans (no free-text). `Referrer-Policy: strict-origin-when-cross-origin` prevents cross-origin leak.
3. **Branch protection** — enable in GitHub → Settings → Branches (require PR + review + CI pass + signed commits before merging to master). This is the largest gap not in code.
4. **pdf-lib + AcroForm PDFs** — pdf-lib's serializer produces structurally broken output for PDFs with form fields, digital signatures, or XFA forms. PDF Page Inspector detects form fields via pdfjs Widget annotations and advises users to flatten via File → Print → Save as PDF before resizing.
5. ~~**PBKDF2 iteration count**~~ — **resolved 2026-06-11.** `encryptText()` now uses 600k iterations (OWASP-current) and prefixes output with `v2:`; `decryptText()` falls back to 100k for legacy unprefixed blobs (pure base64 can never contain `:`, so the prefix is unambiguous). Covered by `tests/crypto.test.mjs`.

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
| 2026-06-12 | **Homepage redesign — "Manifesto Split + Bento"** (PR [#70](https://github.com/seawaydigital/RDM-Toolkit/pull/70), merged) — trust-first, education-forward rebuild of `HomePage.jsx`. (1) New split hero: manifesto headline ("Your research data *never leaves* this device"), lede with registry-derived tool count, gold "Browse the tools" CTA + "How is that possible? ↓" secondary (both smooth-scroll via `scrollToSection()` with `prefers-reduced-motion` guard and programmatic focus to `tabIndex={-1}` sections); right column is new `src/components/home/HeroDiagram.jsx` — inline-SVG privacy-flow diagram (Your file → This browser → Your download + crossed-out cloud), CSS `stroke-dashoffset` draw-in animation frozen under reduced motion, `role="img"` + descriptive aria-label. (2) Stat strip `<ul>`: 46 research tools (computed from registry) / 0 bytes uploaded / $0 forever / 100% works offline. (3) Bento grid replacing the old Popular Tools section: 6 tool tiles (merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text, pdf-redaction) interleaved with 3 wide education tiles — "The airplane-mode test" (gold tint), "Don't trust us. Check." proof tile (DevTools/GitHub/PIPEDA·PHIPA·GDPR links, inset surface), "Built for research compliance" (OCAP®/PHIPA/REB, links to #data-classification). (4) "How it works — 30-second version": 3 numbered step cards + dashed airplane-mode challenge callout linking #how-this-works. (5) Adaptive returning-user layout: when `recentTools` non-empty, hero gets `--compact` modifier (no diagram, single CTA, smaller title) and Recently Used row lifts above the bento. (6) Footer hint with platform-aware ⌘K/Ctrl+K kbd. CSS: new `.homepage-hero--split/--compact`, `.homepage-diagram*`, `.homepage-stats`, `.homepage-bento`, `.homepage-tile*`, `.homepage-steps`, `.homepage-challenge*`, `.homepage-foot` classes + `@keyframes homepage-wire-draw`, tablet 2-col/mobile 1-col bento rules, stats 2×2 mobile wrap; removed orphaned `.homepage-trust*`, `.homepage-compliance*`, `.homepage-popular-*`. AODA: AA contrast verified (edu-tile blurb bumped to `--text-primary` after review found 4.35:1), reduced-motion block, focus-visible outlines, semantic headings/lists. Mobile overflow fix: `min-width: 0` on hero grid children + diagram wires. Verified: dev-server preview both layouts + 375px mobile, `npm run security:audit` pass, build clean (161 precache entries). |
| 2026-06-11 | **Defense-in-depth: Trusted Types + strict style-src, SLSA provenance, network-silence indicator, clear-local-data, honest-limits section, SECURITY.md** — six hardening items from the June audit's recommendation list (#4–6, 8–10), PR `security/defense-in-depth`. **(1) Production CSP tightening (#10)** — new `buildCspTighten()` plugin in [vite.config.js](vite.config.js) (build-only `transformIndexHtml`) drops `'unsafe-inline'` from `style-src` and injects `trusted-types dompurify default; require-trusted-types-for 'script'`; same directives in `public/_headers` + preview headers. Dev CSP unchanged (Vite HMR injects `<style>`). All 3 `dangerouslySetInnerHTML` sinks now pass DOMPurify `RETURN_TRUSTED_TYPE: true` TrustedHTML (MarkdownPreview, FileToMarkdown, and HowItWorks flow steps via new `renderInlineMarkup()` — allowlist `code/strong/em/kbd/br`, no attrs). [main.jsx](src/main.jsx) registers a `default` TT policy with `createScriptURL` only (same-origin check) because Chromium gates `new Worker(url)` — pdfjs worker boots through it; no `createHTML`, so raw-string HTML sinks throw. **Found + fixed in transit:** both markdown renderers generated `style="…"` attributes on every element — DOMPurify had stripped them since 2026-04-08 (so previews rendered unstyled!) and under the strict CSP they spammed ~34 `style-src-attr` violations per render from DOMPurify's inert parsing document. Removed all 26 generated style attrs; rendered-markdown styling now lives in `global.css` (`.md-rendered`/`.ftm-preview` element rules — preview styling is actually restored/improved). React `style={{}}` props unaffected (CSSOM, verified allowed). **(2) SLSA build provenance (#4)** — `actions/attest-build-provenance@a2bbfa2` (v4.1.0, SHA-pinned) in deploy.yml attests `dist/**` JS/MJS/CSS + index.html + bundle-integrity.json; `attestations: write` permission added. **(3) Live network-silence indicator (#5)** — new [NetworkSilence.jsx](src/components/ui/NetworkSilence.jsx) on HowThisWorks verify section: PerformanceObserver counts requests to other origins since load (same-origin assets + blob:/data: excluded); classification logic in [networkActivity.js](src/utils/networkActivity.js) (unit-tested). Green shield at 0, amber if >0. **(4) Clear-local-data button (#8)** — new [ClearLocalData.jsx](src/components/ui/ClearLocalData.jsx) (two-step confirm → `localStorage.clear()` + `sessionStorage.clear()` + reload) for shared lab/library computers; added to security-audit localStorage allowlist (wipe-only). **(5) "Where This Model Ends" section (#9)** — honest-limits cards on HowThisWorks: browser extensions can read pages, OS swap/hibernation (→ full-disk encryption), downloads land unprotected, shared computers (hosts the wipe button). **(6) SECURITY.md + RFC 9116 security.txt (#6)** — disclosure policy (GitHub private advisories + email, 72h ack target, scope incl. out-of-scope items) + `public/.well-known/security.txt` (Expires 2027-06-11). **Verified:** 11/11 unit tests, security:audit passes, build clean (162 entries), and in `vite preview` (production build, enforced headers): zero CSP violations across markdown render/explainer/PDF inspection/encrypt; pdfjs worker boots under TT; clear-data wipes storage + reload; network counter reads 0; markdown preview properly styled. CSS: `.htw-netsilence*`, `.htw-cleardata-*`, `.md-rendered`/`.ftm-preview` element rules. |
| 2026-06-11 | **Crypto hardening: PBKDF2 600k + unbiased password sampling + dead meta-tag cleanup** — closes the three low-priority observations from the June structural security audit (which found zero high/medium issues). **(1) PBKDF2 100k → 600k with `v2:` versioning** — [crypto.js](src/utils/crypto.js) `encryptText()` now derives at 600,000 iterations (OWASP-current for PBKDF2-SHA-256) and prefixes output with `v2:`; `decryptText()` detects the prefix and falls back to 100k for legacy unprefixed blobs. Unambiguous because legacy output is pure base64, which can never contain `:`. Resolves known gap #5. The `.pdf.enc` PDFCRYPT decoder in RemovePDFPassword intentionally stays at 100k — decrypt-only legacy support, nothing produces that format. Tool explainer copy updated (600k + legacy note + `v2:` prefix). EncryptDecryptText needed no UI change — its existing `loading` state covers the ~0.5s derive. **(2) Modulo-bias fix** — `generatePassword()` now maps random values to charset indices via new exported `secureRandomIndices()` (rejection sampling below the largest multiple of the range under 2³²) instead of `v % charset.length`. **(3) Removed dead meta tags** — `X-Content-Type-Options` and `Permissions-Policy` are header-only directives browsers ignore in `<meta>`; deleted from [index.html](index.html) with a comment pointing at `public/_headers` + the vite preview middleware (the real enforcement). Meta CSP + Referrer-Policy kept (those work as meta). security-audit.mjs only asserts the meta CSP, so no script change needed. **(4) First unit tests in repo** — `tests/crypto.test.mjs` (7 tests, Node built-in `node --test`, written TDD red→green): v2 prefix presence, independent 600k decrypt of `encryptText` output, v2 round-trip, legacy v1 blob compat, wrong-passphrase rejection, rejection-sampling range/count, password length/charset. New `npm test` script (`node --test tests/*.test.mjs`). **Verified:** all 7 tests pass, `npm run security:audit` passes, production build clean. |
| 2026-05-02 | **Pre-launch security hardening — full sweep + Tier 1 supply-chain defense** — comprehensive security audit (4 parallel sub-agents covering all 46 tools + infrastructure) found no exploitable vulnerabilities meeting confidence ≥8 threshold. Audit then identified hardening opportunities, all landed in this pass. **(1) Dead-file cleanup** — deleted three unregistered tool files (`RemoveBackground.jsx`, `DOCXPDFConverter.jsx`, `RotateReorderPages.jsx`) that were referenced by removed deps but never wired into the registry. **(2) Removed 8 unneeded/vulnerable deps** — `@imgly/background-removal` (huge WASM/ONNX bundle, removed RemoveBackground tool), `onnxruntime-web` + `protobufjs` (transitive @imgly), `mammoth` (DOCX→HTML, big surface), `xlsx` (unpatched high-CVE SheetJS, no OSS fix), `docx` (only used by removed tool), `@xmldom/xmldom` (no longer needed), `vite-plugin-static-copy` (was copying @imgly WASM). **(3) FileToMarkdown** narrowed to `.pdf,.html,.htm,.csv,.txt,.md,.rtf,.json` — no DOCX/XLSX. **(4) SignPDF** removed last `fetch()` calls (replaced data: URL decoding with pure JS `dataUrlToBytes()`). **(5) `scripts/security-audit.mjs`** added — single guardrail script that fails CI on banned package imports, runtime network APIs, eval, dangerouslySetInnerHTML outside 3 allowlisted files, localStorage outside 4 allowlisted hooks, missing `rel="noopener noreferrer"`, missing CSP directives, etc. Verifies all 46 registered tools wire through the lazy-import map. **(6) Allowlist + blocklist for deps** — `allowedDependencies`/`allowedDevDependencies` Maps in security-audit.mjs require exact pinned versions and explicit code review for any new dep. `bannedPackages` array prevents reintroduction. **(7) `package.json` exact-pin** — every version is `1.2.3` not `^1.2.3`; Dependabot still proposes updates as PRs you explicitly merge. **(8) `.npmrc`** — `ignore-scripts=true` neuters all postinstall hooks (the most common supply-chain RCE vector). **(9) CI uses `npm ci --ignore-scripts`** + adds `npm audit signatures` (Sigstore verification — catches maintainer account takeovers). Audit-level raised from `critical` to `high`. **(10) Lockfile diff guard** — `scripts/lockfile-diff-guard.mjs` fails PR if `package-lock.json` changed without `package.json` (catches lockfile tampering / undisclosed transitive bumps). **(11) `.github/workflows/security.yml`** added — standalone PR/push/weekly guardrail run independent of the deploy pipeline. **(12) `public/_headers`** added — full CSP + HSTS + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + X-Frame-Options DENY for Cloudflare/Netlify deployments. **(13) `object-src 'none'`** added to both meta CSP and `_headers` — closes Lighthouse `csp-xss` HIGH severity finding. **(14) Vite preview headers middleware** — new `previewSecurityHeaders()` plugin in `vite.config.js` makes `vite preview` send the same 6 production headers via `configurePreviewServer`, so Lighthouse CI tests reality (not just meta-tag CSP). **(15) Lighthouse `csp-xss` assertion** — explicit `["error", { "minScore": 1 }]` in `lighthouserc.json` makes CI fail (not warn) on any CSP regression. **(16) README + CLAUDE.md** updated to reflect the 46-tool, hardened-dep posture. **Verified:** `npm run security:audit` passes for all 46 registered tools; `curl -sI` confirms all 6 production headers send during `vite preview`; build clean (17.20s, 162 precache entries, no console errors). |
| 2026-04-21 | **UI polish pass + analytics decision (PRs #26–#30)** — five small launch-ready tweaks and one deliberate non-decision. **(1) Feedback modal: email only (PR #26, `50e5754`)** — dropped the "Open GitHub issue" secondary CTA from [FeedbackModal.jsx](src/components/ui/FeedbackModal.jsx); removed the `Github` lucide import, the `GITHUB_ISSUE_URL` constant, and the `buildGithubHref()` function. Footer now has just the primary `mailto:` button + the optional "Copy log only" ghost button. Privacy copy updated from "opens your email client or GitHub in a new tab" to "opens your email client in a new tab". Rationale: testers reporting via two different channels fragments the bug log; email funnels everything into one inbox at the RDM address. **(2) Topbar subtitle removal (PR #27, `fbd385d`)** — dropped the "— Research Data Management" caption next to the wordmark in [Topbar.jsx:34](src/components/layout/Topbar.jsx:34) and deleted the now-orphaned `.topbar-subtitle` CSS block (base styles, gold hairline `::before` rule, mobile hide). The wordmark alone was enough; the dashed uppercase caption was visual noise at the top of every page. **(3) TriAgencyPolicy governance card acronym fix (PR #28, `3c4f6f6`)** — single-character CSS bug fix. `.tap-indigenous-card strong { display: block }` was a descendant selector, so it hit every nested `<strong>` inside each card — including the inline `<strong>O</strong>`, `<strong>C</strong>`, `<strong>A</strong>`, `<strong>P</strong>` letters used for the OCAP / CARE / USAI acronym expansions. Each letter was wrapping onto its own line (see original issue report). Fix: switched to the child combinator (`.tap-indigenous-card > strong`) so only the direct-child heading `<strong>` becomes a block. Also added `.tap-indigenous-card p strong { color: var(--text-primary) }` so the acronym letters visually stand out against the secondary body copy. Affects all 12 cards in the Governance Frameworks + General Guidance grids. **(4) RS Toolkit sister-site link (PR #29, `d644d3d`)** — added a pinned sister-site link in the sidebar footer, above the gold "Request a Tool" CTA. Opens https://rs.rdmtoolkit.ca (Research Security companion site) in a new tab. Wordmark matches the RS Toolkit logo: "RS" in Fraunces italic red (`#D53A3A`) + "Toolkit" in parchment weight 500, with a small uppercase caption below. Subtle dark card surface (`rgba(255,255,255,0.02)` over sidebar inset) with a hairline border; hover state shifts border + external-link icon to red and lifts the card 1px. Hidden on mobile alongside `.sidebar-cta` via the existing `@media (max-width: 767px)` block. New CSS classes: `.sidebar-sister`, `.sidebar-sister-link`, `.sidebar-sister-wordmark`, `.sidebar-sister-rs`, `.sidebar-sister-toolkit`, `.sidebar-sister-sub`, `.sidebar-sister-icon`. **(5) RS Toolkit caption shortening (PR #30, open)** — follow-up tweak: caption changed from "Research Security companion" → "Research Security". The position + external-link icon make the "companion" framing redundant; shorter reads cleaner in the sidebar width. One-line JSX edit. **(6) Analytics/page counter — deliberately declined** — user asked whether a privacy-respecting page counter was feasible with a public data page. Three options surfaced and weighed: (a) custom Cloudflare Worker counter (cleanest fit, zero 3rd-party script), (b) hosted GoatCounter (free, public dashboards built-in), (c) Plausible/Simple Analytics (paid, polished). All three would have required updating the HowThisWorks + HomePage "no tracking, no analytics, no third-party scripts" claim. User decided against — keeping the privacy claim as-is is simpler to defend, verify, and maintain. If rough usage ever needs surfacing, GitHub → Insights → Traffic (14-day retention, aggregated by GitHub, no script added to the site) and Cloudflare server-side logs (if we ever proxy the domain) stay outside the app itself. **Build status:** all 5 PRs pass CI (bundle-size, CodeQL, Lighthouse). Precache stable at 163 entries. Master HEAD after #29: `d644d3d`. PR #30 still open. |
| 2026-04-21 | **Pre-launch tester readiness: Phase 1 (in-app feedback + error copy + usage log + welcome tour)** — four coordinated UX additions to make the site ready for formal user testing. **(1) In-app feedback capture** — new `FeedbackModal.jsx` opens from a new `MessageSquare` "Feedback" button in the topbar (mobile: icon-only, 40×40px tap target), or from any error fallback. Auto-populates tool/page, URL, user agent, viewport, online status, and (if triggered from an error) error message + stack. Two CTAs: primary "Email us ({rdmEmail})" → `mailto:` with prefilled subject/body; secondary "Open GitHub issue" → prefilled title + body at `github.com/seawaydigital/RDM-Toolkit/issues/new`. Optional "Include my session log" checkbox + "Copy log only" button for testers who prefer to paste context themselves. Nothing is uploaded; all CTAs open the user's own email client / GitHub in a new tab where they review before sending. **(2) Enhanced error copy** — [App.jsx:130-217](src/App.jsx:130) `ToolErrorFallback` now classifies errors (`offline` / `chunk-load` / `storage-full` / `out-of-memory` / `unknown`) and shows a plain-English headline + explanation per category instead of the generic "Something went wrong." Chunk-load adds a "Hard refresh" button that reloads. Stack trace remains available behind a "Show technical details" toggle. "Report this problem" button on every error opens the Feedback modal pre-filled with error context. **(3) Opt-in usage log** — new [useUsageLog.js](src/hooks/useUsageLog.js) hook stores events to `localStorage` key `rdm_usage_log_v1` (capped at 500 entries). Consent key `rdm_usage_log_consent` ('granted' / 'denied'); events only logged after consent. Event types: `session_start` (ua, viewport, online), `tool_open` (toolId), `page_open` (page), `tool_error` (name, message truncated to 200 chars). Explicitly **never** logs file names, file contents, input text, form values — only tool IDs, page hashes, error classes, timestamps. `exportLog()` is surfaced in the Feedback modal so testers can attach it to their bug report. **(4) First-visit welcome tour** — new `WelcomeTour.jsx` renders on first load (dismissal stored at `rdm_tour_dismissed_v1`). Three steps: "Your files never leave your browser" (privacy framing with OCAP/PHIPA/TCPS 2 hook), "46 tools, one workflow" (Ctrl/⌘+K + drag-drop hint), "Help us make this better" (Feedback button + usage-log opt-in checkbox). Keyboard nav (Arrow keys + Esc), dot indicators, body scroll lock while open. Opt-in checkbox on step 3 calls `grantConsent()` on tour close. ErrorBoundary gained `componentDidCatch` that logs `tool_error` events. Dev-server verified end-to-end: tour step nav works, consent + dismissal persist across reloads, feedback modal auto-populates tool context, mailto href correctly encodes body with `## What I was trying to do` / `## Context` / `## Error` Markdown structure. CSS additions (+445 lines): `.topbar-feedback-btn`, `.error-card--tool`, `.error-card-detail-*`, `.error-card-actions`, `.error-card-report-btn`, `.action-button--secondary`, `.feedback-modal-*` (14 classes), `.welcome-tour-*` (14 classes), mobile overrides. Production build: 14.89s, 161 precache entries, no new warnings beyond pre-existing `zxcvbn` 818 KB (lazy-loaded). |
| 2026-04-21 | **Custom-domain cutover to `rdmtoolkit.ca` (PR [#21](https://github.com/seawaydigital/RDM-Toolkit/pull/21))** — moved the site off `seawaydigital.github.io/RDM-Toolkit/` onto the apex custom domain. Three coordinated changes: (1) [vite.config.js:7](vite.config.js:7) `base: '/RDM-Toolkit/'` → `'/'` plus PWA `scope`/`start_url` flipped to `/` so emitted asset URLs and the service-worker scope live at root. (2) New [public/CNAME](public/CNAME) with the single line `rdmtoolkit.ca` — Vite copies `public/` into `dist/`, so every Pages deploy ships the CNAME and GitHub doesn't drop the domain binding. (3) DNS at canspace.ca: 4 apex A records to GitHub's Pages IPs (185.199.108–111.153), `www.rdmtoolkit.ca` CNAME → `seawaydigital.github.io` (GitHub auto-301s www → apex), no CAA records (Let's Encrypt unblocked). Cert issuance via GitHub's Let's Encrypt flow took ~1 hour after re-saving the custom domain — standard. Enforce HTTPS is on. Old `seawaydigital.github.io/RDM-Toolkit/` URL 301s to the custom domain. Repo URLs (`github.com/seawaydigital/RDM-Toolkit/...`) in [App.jsx:163](src/App.jsx:163) issue link + [HowItWorks.jsx:5](src/components/ui/HowItWorks.jsx:5) `GITHUB_BASE` are unchanged — those point at the git repo, not the deployed site. README live-site URL + CLAUDE.md project-identity and PWA-manifest lines updated in this pass. |
| 2026-04-20 | **Content accuracy audit (PR [#20](https://github.com/seawaydigital/RDM-Toolkit/pull/20), commit `4000180`)** — spring-2026 fact-check of the research-resources pages turned up 7 stale claims + 1 dead link; all fixed in a single 9-line PR across 4 files. **Pricing:** `AcrobatAlternative.jsx:157` Adobe Acrobat Pro annual plan `~$240/year` → `~$312/year` (current C$25.99/mo × 12). **Dead link:** `TriAgencyPolicy.jsx:822` Dimensions charter URL `science.gc.ca/eic/site/063.nsf/eng/h_F3B6A1D5.html` (404) → `nserc-crsng.gc.ca/InterAgency-Interorganismes/EDI-EDI/Dimensions_Dimensions_eng.asp` (active). **Dataset count:** `DRACServices.jsx:72` Lunaris `105,000+` → `108,000+` (lunaris.ca landing counter showed 108,305). **Tri-Agency status refresh (4 edits in `TriAgencyPolicy.jsx`):** Timeline Pillar 2 body now notes the 2024–2025 expansion across Alliance / Insight / Discovery / CIHR calls; CIHR Pillar 2 copy rewritten for April 2026 state — CIHR no longer publishes a consolidated DMP-required opportunity list, applicants check ResearchNet per call; NSERC Pillar 3 + SSHRC Pillar 3 both now reference the **Jan 1, 2026 target grant date** from the Tri-Agency's 2025 *What We Heard* engagement report, with a hedge that specific implementation dates are still being confirmed on the authoritative policy page. **Identifier transition:** `GrantsAndIdentifiers.jsx:35` CCV card bullet now names **TARP (Tri-Agency Researcher Profile)** and its narrative-CV approach instead of the generic "new Researcher CV platform" placeholder. Bonus (not an audit finding but caught in transit): `TriAgencyPolicy.jsx:811` stale inline reference "Data Anonymizer" → "De-identify Research Data tool" (consistent with the 2026-04-17 tool rename). Live-verified across all 9 research-resources pages; build clean in ~10s with 161 precache entries. |
| 2026-04-20 | **Dependabot: dompurify 3.3.3 → 3.4.0 (PR [#19](https://github.com/seawaydigital/RDM-Toolkit/pull/19), commit `f501ce0`)** — routine security bump, merged after review confirmed no API surface change for our usage (strict-allowlist sanitization in Markdown Preview unaffected). Shipped together with the content audit on master HEAD `c0c3160`. |
| 2026-04-20 | **Fillable PDF Form: signature boxes invisible in Chrome/Firefox/Preview (commit `3550e23`)** — signature widgets were built by hand (pdf-lib has no high-level signature API) without an `/AP` appearance stream. Adobe Reader falls back to rendering from `/BS` + `/MK`, but Chrome/Firefox/macOS Preview render nothing when `/AP` is absent — so users downloaded a PDF that looked like the signature field was missing. Fix in [FillablePDFForm.jsx:395-443](src/tools/pdf/FillablePDFForm.jsx:395): construct a Form XObject via `ctx.stream()` with `Type: 'XObject'`, `Subtype: 'Form'`, `FormType: 1`, `BBox: [0, 0, w, h]`, `Matrix: [1, 0, 0, 1, 0, 0]`, `Resources: { ProcSet: ['PDF'] }`. Content stream paints a 0.95-gray panel (`rg` + `re` + `f`) and a 0.4-gray 1pt border (`RG` + `w` + `re` + `S`), wrapped in `q`/`Q`. Registered and referenced via `AP: { N: apRef }` on the widget dict. Also added `BG: [0.95, 0.95, 0.95]` to `MK` for viewers that render from characteristics. No changes to field registration (`acroForm.addField(widgetRef)` + `page.node.addAnnot(widgetRef)` + `SigFlags: 3`) — Adobe Fill & Sign / digital-signature workflow still recognizes the widget. |
| 2026-04-20 | **Sidebar: remove unused `MessageSquarePlus` import (commit `bc8c592`)** — CodeQL "Unused variable, import, function or class" alert flagged by GitHub Advanced Security on PR #14's diff. `MessageSquarePlus` was carried over from an earlier sidebar layout that used it for the Request a Tool pinned CTA; the CTA was later restyled without the icon. Dropped from the lucide-react import in [Sidebar.jsx:2](src/components/layout/Sidebar.jsx:2). |
| 2026-04-19 | **Favicon set corrected (PR #18)** — replacement pack using the `android-icon-*` / `apple-icon-*` filename convention; overwrote 5 PNGs + the .ico, deleted `public/android-chrome-512x512.png` (new pack doesn't include a 512). `vite.config.js` manifest `icons` array trimmed to the 192 (`android-chrome-192x192.png`) + 180 (`apple-touch-icon.png`) entries — 192 meets the PWA minimum; 512 is recommended but not required. No `index.html` changes needed. User had reported "S" fallback letter in tab after PR #17 — root cause was stale service worker serving cached HTML that still referenced `/favicon.svg`; resolved by the deploy completing + a hard reload. Browserconfig.xml / manifest.json from the supplied pack not copied in (Vite PWA plugin generates its own `manifest.webmanifest` from config; browserconfig.xml is IE/Edge-legacy and not needed). |
| 2026-04-19 | **Favicon art refresh (PR #17)** — same filenames, new logo art generated from favicon_io. Overwrote all 6 public/ icon files; no markup or manifest changes. |
| 2026-04-19 | **Favicon set + PWA icons (PR #16)** — replaced the placeholder `public/favicon.svg` with a full pack: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180), `android-chrome-192x192.png`, `android-chrome-512x512.png`. `index.html` `<link>` tags rewritten to point at the .ico + 16/32 PNGs + apple-touch-icon; `favicon.svg` reference removed. `vite.config.js` `manifest.icons` populated with the 192 + 512 + 180 entries (relative filenames — Vite auto-resolves against `base`). All paths in index.html use a leading `/` so Vite's base-path rewriter adds `/RDM-Toolkit/` automatically (do NOT prefix manually — double-base bug). |
| 2026-04-18 | **FillablePDFForm: split-pane editor + fullscreen (PR #15)** — users had to scroll past the full page preview to reach the field-properties panel; refactored into an orientation-aware two-pane layout. **Portrait PDFs**: page left, sticky 320px rail right (`grid-template-columns: minmax(0, 1fr) 320px`). Rail stays visible via `position: sticky; top: calc(var(--topbar-height) + var(--space-md))`. **Landscape PDFs**: rail stacks above the page (single-column grid, `.ff-side-rail { order: -1 }`). **Viewports <900px** collapse to single column with rail below. **Fullscreen toggle** (`Maximize2` / `Minimize2` icons): fixed inset overlay at `z-index: 9000`, body scroll locked via `document.body.style.overflow = 'hidden'` effect, inline Generate button appears on the rail (`.ff-rail-actions`), Esc exits. **Fit-to-width default zoom** via `ResizeObserver` on `pageColumnRef.current`: computes `(clientWidth - 48) / pdfWidth` and clamps to 0.4–2.5; dragging the zoom slider sets `autoFit = false` so user intent wins. **Empty-state card** (`.ff-rail-empty*`) shown on rail when no field selected. `.ff-props-grid` changed from `repeat(auto-fit, minmax(220px, 1fr))` → `1fr` (rail is narrow enough that 2-col cramps). Props panel unchanged — same rename/defaults/options/multi-line editing. CSS additions: `.ff-editor`, `.ff-editor--portrait`, `.ff-editor--landscape`, `.ff-editor--fullscreen`, `.ff-page-column`, `.ff-side-rail`, `.ff-side-rail-inner`, `.ff-rail-empty*`, `.ff-rail-actions`. |
| 2026-04-18 | **PDF Redaction: true PHIPA/PIPEDA compliance via page rasterization (PR #14)** — **Before:** `page.drawRectangle()` painted opaque rectangles over existing text; the underlying text stream was untouched, so copy/paste, text-search, and any extraction tool could recover the "redacted" PHI. IPC Ontario has flagged this exact pattern as a PHIPA §12 breach — the tool was a liability the moment anyone trusted it with patient data. **Now:** redacted pages are rasterized at 200 DPI — pdfjs renders to canvas → black `fillRect()` paints each redaction → canvas encoded as JPEG (quality 0.88) → embedded into a **fresh** `PDFDocument` via `embedJpg()`/`drawImage()`. Original text stream never reaches the output. Non-redacted pages copied intact via `copyPages()` so their text stays selectable/searchable/screen-reader accessible. Catalog is reset by building a fresh document: source `/Metadata`, `/Outlines`, `/AcroForm`, `/OpenAction`, `/AA`, `/PieceInfo`, `/Names/EmbeddedFiles`, `/Names/JavaScript` never reach the output. Per-page `/Thumb`, `/PieceInfo`, `/AA`, and `/Annots` (form widgets, links, file-attachment annotations) stripped on redacted pages. Post-write verification: output re-parsed with pdfjs to confirm no text objects survive on redacted pages — if any do, the download is blocked and an error surfaces. Tool explainer + LIMITATIONS updated to describe the new flow. |
| 2026-04-18 | **Mobile: center topbar wordmark (PR #12)** — at `<=767px`, absolute-position `.topbar-logo` at 50/50 with transform centering so "RDM Toolkit" sits dead-center of the topbar while the hamburger stays left-aligned. Font size bumped 17 → 24px for legibility. Desktop unchanged. |
| 2026-04-18 | **Mobile polish round 2 (PR #11)** — follow-up to PR #10. **Topbar:** hide search pill (Ctrl/Cmd+K shortcut not useful on touch), "How This Works" link, "100% Browser-Based" badge. **Sidebar:** removed redundant X close button (overlapped chevrons; hamburger + Esc + backdrop-click all still close), enlarged tool items 27px → ~40px tap targets, hid the pinned Request-a-Tool CTA to reclaim ~80px of drawer vertical space. **Body scroll lock** when sidebar drawer open (prevents background scroll under overlay). **DropZone:** swaps "Drop your file here / click to browse" → "Tap to choose a file" on mobile; browse link hidden (whole zone tappable). **Tool header title:** 30px → 26px; padding tightened. **Homepage + research pages:** recent-tool pills min-height 40px / 13.5px type; meta fonts bumped 9–11px → 11px; wide tables (LU Dataverse picker, Acrobat task coverage, Data Classification controls, Tri-Agency matrix) get a right-edge gradient fade signalling horizontal scroll. Inline prose links on research pages get padded hit areas without visible layout shift. |
| 2026-04-18 | **Mobile layout overflow fix (PR #10)** — root cause: `.app-layout` had no `grid-template-columns` constraint, so the non-wrapping topbar content (How This Works link + "100% Browser-Based" badge) forced the intrinsic width of the whole app beyond viewport width on mobile — every page was cut off with horizontal scroll. Fix: constrain `.app-layout` to `100vw` with `grid-template-columns: 100%`; `minmax(0, 1fr)` + `min-width: 0` on `.app-body` and `.main-content` so grid/flex children can shrink below content intrinsic width; cap `.tool-page` at `max-width: 100%` on `<=767px`; hide `.topbar-htw-link` and `.topbar-badge` on mobile (inside the existing `@media (max-width: 767px)` block at end of global.css so cascade beats base rules). Verified: home + all 8 research pages + representative tools render at viewport width with no horizontal scroll on 320/375/768px. Desktop unchanged. |
| 2026-04-18 | **Scope-to-RDM-mandate removal — 62 → 51 tools, 9 → 7 categories** — audited every tool against the RDM mandate (research data lifecycle + Tri-Agency/TCPS 2/PHIPA/OCAP® compliance) and removed 11 general-purpose utilities that drifted from scope. **Removed tools (11):** `qr-code-generator` (Privacy), `text-case-converter` / `line-number-adder` / `xml-yaml-formatter` / `base64-tool` (More Text), `unit-converter` / `date-difference` / `timestamp-converter` / `file-size-converter` (entire Calculators & Converters category), `regex-tester` / `uuid-generator` (entire Developer Tools category). Also deleted two orphan files that were never registered: `ColourConverter.jsx`, `JWTDecoder.jsx`. **Edits:** `toolRegistry.js` entries + two whole category objects removed; `App.jsx` lazy imports + EXT_TO_TOOL drag-drop map cleaned of `xml`/`yaml`/`yml` entries; `toolExplainers.js` entries for `qr-code-generator` and `uuid-generator` removed; `AcrobatAlternative.jsx` Beyond-Acrobat chips list dropped the QR chip and updated copy ("Explore all 61 tools" → "51"); `related:` cross-refs in `json-formatter`, `encrypt-decrypt-text`, `file-size-analyser`, `whitespace-cleaner` cleaned of IDs that no longer exist; `package.json` removed unused `qrcode` dep. **Stale bookmark routes** (e.g. `#qr-code-generator`) degrade gracefully — `getRouteFromHash()` doesn't find them in `ALL_TOOLS` so the app falls through to home. Orphan CSS rules in `global.css` (`.qr-*`, `.unit-converter-*`, `.regex-tester-*`, etc.) left in place — harmless unused selectors, cleanup deferred. Verified: build clean in 10.53s, precache 167 → 155 entries, sidebar renders 7 categories, no console errors. |
| 2026-04-18 | **HowThisWorks: vertical timeline for browser-capability history** — replaced the 5-card `.htw-compliance-grid` in the "What the browser can now do on its own" subsection with a single vertical timeline (`<ol className="htw-timeline">`) running top-to-bottom with a gold gradient rail, circular icon nodes (40px), and card-surface entries with a rotated-square arrow pointing to the rail. 7 stops: **Before ~2012** (display-window era, muted node to anchor the "bad old days"), **2014** (Web Crypto API / AES-256), **~2015** (Canvas API + Typed Arrays / image processing), **~2017** (WebAssembly / PDF editing), **~2018** (Service Workers / offline), **2020+** (64-bit browsers + 8 GB+ RAM / research-scale memory), and **Today** (RDM Toolkit — solid-gold filled node as the payoff). Each stop has a gold mono year badge, Fraunces title, body copy, and a dashed-underline `.htw-timeline-tech` line naming the underlying standard for verifiability. Hover states: node scales 1.08 with stronger gold glow, card translates 2px right, arrow + border shift to gold. `prefers-reduced-motion` kills all transforms. Mobile breakpoint (<640px) narrows the rail, shrinks nodes to 32px, and drops title/body font sizes. No JS logic — pure CSS. |
| 2026-04-18 | **HowThisWorks: "Why This Wasn't Possible Ten Years Ago" section** — added a historical-context section to `src/components/pages/HowThisWorks.jsx`, placed between "What 'Runs in Your Browser' Actually Means" and "You Don't Have to Take Our Word for It." Addresses a trust problem: a cautious researcher over ~40 has an accurate memory that "online file tool" used to mean "upload to stranger's server," and that instinct pattern-matches onto RDM Toolkit even though the technology underneath is fundamentally different now. Section validates that skepticism ("you're not wrong — you're just remembering how the internet used to work") then grounds the new claim in 5 verifiable browser-capability milestones: built-in AES-256 encryption (Web Crypto API, since 2014), PDF editing via WebAssembly (~2017), Canvas-based image processing (mature ~2015), large-file memory (8+ GB RAM on 2020+ laptops), and offline support (Service Workers, ~2018). Each anchor is something a curious user can Google to verify independently. Structure: two `.htw-promise` intro/outro blocks bookending a 5-card `.htw-compliance-grid` — reuses existing CSS, no new styles needed. Added `Clock`, `FileText`, `Image as ImageIcon`, `Cpu` imports from lucide-react. |
| 2026-04-18 | **Sidebar tool ordering refresh** — reordered `tools: [...]` arrays in `src/data/toolRegistry.js` across 5 of 9 categories to group related operations and move workflow-logical neighbours adjacent. No tool moved categories, no IDs changed (hash routes preserved), no `related:` arrays touched (they reference IDs, not positions). Per-category changes: **PDF Tools (17)** — regrouped into 6 clusters (Structure: merge/split/reorder/delete/rotate → Size & inspect: compress/page-inspector → Content additions: cover/page-numbers/watermark → Forms & signatures: sign/fillable → Security: redaction/password-protect/remove-password → Extract/convert: extract-images/pdf-to-images). Key moves: `fillable-pdf-form` from end to next-to sign-pdf, `add-cover-page` from slot 15 to 8 near other content additions, `pdf-redaction` promoted to lead the security cluster, `pdf-page-delete` moved into structural cluster. **Image Tools (6)** — dimensional ops grouped (compress/resize/crop) then format (convert) then privacy (strip) then export (to-pdf). **Text & Data Tools (8)** — grouped into analyze/edit/compare (word-counter/find-replace/text-diff) → structured data (json/csv-json/to-markdown) → research (bibtex/data-anonymizer at end). **Privacy & Security (5)** — `encrypt-decrypt-text` and `password-generator` now adjacent (previously split by SHA-256). `qr-code-generator` kept in category (its "zero network request" framing fits privacy posture), moved to end as the utility outlier. **More Text Tools (9)** — 4-cluster regroup (cleanup: whitespace/dedupe/case/line-numbers → CSV: csv-diff/csv-encoding-fixer → format/preview: xml-yaml/markdown → encoding: base64). **Unchanged:** Archives (3), More Security (3), Calculators (4), Developer (2) — small categories, existing order already logical. CLAUDE.md per-category tool lists updated to match. Verified `npx vite build` clean — no logic changes, just array reordering. |
| 2026-04-17 | **DropZone sublabel redundancy cleanup** (PR #6, commit `e5877e4`) — `DropZone.jsx` auto-derives a "Supports {TYPES} files" line from its `accept` prop via `formatAcceptLabel()`. 13 tools were also passing a manual `sublabel` that just restated the same accepted-types list, producing two redundant lines in the drop target (e.g. "Supports JPG, JPEG, PNG, WEBP, BMP, GIF, TIFF, TIF, ICO files" + "Accepts JPG, PNG, WebP, BMP, GIF, TIFF, ICO"). Removed the redundant `sublabel=` prop from: `ConvertImageFormat`, `CompressImage`, `ImageCropper`, `ResizeImage`, `StripImageMetadata`, `ImageToPDF`, `RemoveBackground`, `ExtractZIP`, `RemovePDFPassword`, `CSVEncodingFixer`, `StripFileMetadata`, `DataAnonymizer`, `FileToMarkdown`. Tools with *informative* sublabels (file counts, size limits, behavior hints) were left alone: EncodingDetector, ChecksumVerifier, AddPageNumbers, AddCoverPage, ExtractImagesFromPDF, CreateZIP, FileSizeAnalyser, FillablePDFForm, MergePDFs, PasswordProtectPDF, SHA256Hasher, PdfPageInspector, MagicByteChecker, ReorderPages, SignPDF. |
| 2026-04-17 | **"How this tool works" trust explainers — Tier 4 extension** (PR #5, commit `e5877e4`) — extended the `HowItWorks` pattern to 15 Tier 4 "borderline" file-processing tools, bringing total coverage to **40 / 62 tools**. New `toolExplainers.js` entries: `split-pdf`, `rotate-pages`, `reorder-pages`, `add-page-numbers`, `pdf-watermark`, `add-cover-page`, `pdf-page-inspector`, `convert-image-format`, `resize-image`, `image-cropper`, `create-zip`, `csv-json-converter`, `csv-encoding-fixer`, `csv-diff`, `encoding-detector`. Each follows the same 5-section structure (whatItDoes / howItWorks + optional technicalDetails accordion with library + flow + sourceFile / privacy / limitations / verify.quick via `DEFAULT_QUICK_VERIFY`). Tier 3 (word counter, case converter, etc. — pure-compute, no file I/O) still intentionally skipped. Library facts captured per tool: `@cantoo/pdf-lib` for PDF manipulation, `pdfjs-dist` for rendering/inspection, Canvas API for images, `jszip` for archives, pure JS / `TextDecoder`/`TextEncoder` for text-mode tools. |
| 2026-04-17 | **"How this tool works" trust explainers for 25 Tier 1 + Tier 2 tools** — new shared UI primitive `src/components/ui/HowItWorks.jsx` renders a collapsible editorial explainer below every high-stakes tool. Content lives in `src/data/toolExplainers.js` keyed by tool id, so copy is centralized and auditable. Auto-rendered from `App.jsx` between `<ToolComponent>` and `<RelatedTools>` — renders nothing for tools without an entry. Five-section structure: (1) What it does (plain English), (2) How it works (plain + optional "Technical details for IT reviewers" `<details>` with library + flow + GitHub source link), (3) What stays on your device (concrete privacy bullets), (4) What to know before you use it (honest disclosure — e.g. "Sign PDF is a visual signature, not cryptographic", "Redaction rectangles may not scrub underlying bytes"), (5) Check for yourself (30-sec Wi-Fi-off test + full DevTools Network-tab walkthrough). Tier 1 (12 tools — the trust claim IS the product): Encrypt/Decrypt Text, Password Generator, Password Protect PDF, Remove PDF Password, SHA-256 Hasher, PDF Redaction, Strip File Metadata, Strip Image Metadata, De-identify Research Data, Sign PDF, Markdown Preview, Compress PDF. Tier 2 (13 tools — touches sensitive data or has non-obvious privacy property): Merge PDFs, Extract Images from PDF, PDF Page Delete, PDF to Images, Fillable PDF Form, Compress Image, Image to PDF, QR Code Generator, Extract ZIP, Magic Byte Checker, Checksum Verifier, File to Markdown, UUID Generator. CSS prefix `.hiw-*` — card surface with gold top-edge shimmer when open, editorial Fraunces section titles with icons, nested `<details>` for technical depth, kbd-styled keyboard shortcuts, mobile breakpoint. Tier 3 (18 trivial tools — word counter, case converter, etc.) intentionally skipped to keep the pattern meaningful where it exists. |
| 2026-04-17 | **Compress PDF: split-tool recommendation for large / poorly-compressing files** — added `SplitPdfRecommendation` component with two surfacing modes: (a) "large" when `file.size > 50 MB` (SPLIT_RECOMMEND_BYTES, picked because most email providers cap attachments at 25 MB), and (b) "poor-compression" when the best estimated preset won't reduce the file by ≥20% (POOR_COMPRESSION_THRESHOLD); the poor-compression reason takes precedence when both fire because it's the more actionable framing. Surfaced in 4 places: the >100 MB large-file warning (now a `.compress-large-file-warning` block with an inline `Split this PDF instead` CTA replacing the prior plain `ErrorCard`), and conditionally before each of the 3 `AdvisoryCallout` sites (smart-mode results, no-gains empty state, raster-only block). The CTA calls `navigateTo('split-pdf')` to cross-link into the existing Split PDF tool. Added `Scissors` icon import from lucide-react, LIMITATIONS bullet about splitting, CSS `.compress-split-rec`, `.compress-split-rec-cta`, `.compress-split-rec-cta--compact`, `.compress-large-file`, `.compress-large-file-warning` (gold-accent bordered callout matching `.compress-advisory` visual language, amber for the >100 MB warning). |
| 2026-04-17 | **De-identify Research Data — key file ordering + per-group count UI** — follow-up to the column-groups work. With Sunshine-List-scale data, the key file had thousands of `Person` entries followed by a handful of `Employer` entries at the very bottom — users scrolled past the top, didn't see the second group, and reported it as "missing". Fixes: (1) `handleAnonymize` now sorts `groupState` entries by `map.size` ascending before writing to the key CSV — so the smallest group (e.g. 4 Employer entries) appears at rows 2–5, with the larger group (100s–1000s of Persons) filling below. Users see the rare entries first without scrolling. (2) `keyFile` object now carries a `groupSummary: [{ prefix, count }, ...]` array; `KeyFileCard` renders this inline in the meta line when there's more than one group — e.g. `Re-identification key — 104 entries (4 Employer + 100 Person)`. Verified with a 100-row synthetic CSV (Last Name + First Name → Person, Employer → Employer): key file rows 2–5 are the 4 Employer entries; UI meta line reads "104 entries (4 Employer + 100 Person)". |
| 2026-04-17 | **De-identify Research Data — column groups + row-aware coding** — follow-up to the rename below. CSV mode replaces per-cell coding (which gave unrelated IDs to `First Name` / `Last Name` columns of the same person and collided on shared surnames) with **entity-aware column groups**. New state in `DataAnonymizer.jsx`: `colGroup` (map of `colIdx → groupIdx`), `groupPrefixes` (per-group prefix string, default `['Person']`), `collapseColumns` (bool). `selectedCols` is now derived via `useMemo` from `colGroup` keys. Core loop in `handleAnonymize` groups columns into entities per row: composite key = joined selected-column values separated by `|`, mapped once per unique composite to `{prefix}-{counter}` (coded), `sha256(composite).slice(0,8)` (pseudonymized), or `[REDACTED]` (anonymized). Fills all columns in the group with the same pseudonym by default to preserve CSV shape for downstream joins; `collapseColumns` checkbox (shown only when any group has >1 column) puts the pseudonym in the first column and blanks the rest. Key file now emits `group,original_columns,original_values,pseudonym` with pipe-joined originals so the map is re-identifiable. UI: group panel sits between column selection and strategy selector — each group is one row with `Group N` label + inline prefix input + column chips; clicking a chip cycles it to the next group (auto-creates a new group when cycled past the last one), X button removes non-default groups and shifts higher-indexed groups down; `+ Add group` dashed-border button; `DEFAULT_GROUP_PREFIXES = ['Person', 'Org', 'Site', 'Entity']` seed new group prefixes. Preview table header shows `G{n}` badge next to each selected column name. Verified end-to-end with a 5-row Sunshine-List-style CSV: (`Last Name`+`First Name`→Person, `Employer`→Org, collapse on) → Smith/John rows 1&5 both `Person-1` / `Org-1`; Smith/Jane, Doe/Jane, Lee/Alice get distinct Person IDs (no surname collision); First Name column blanked in collapse mode; key file shows 4 Person entries + 2 Org entries with original values intact. |
| 2026-04-17 | **Data Anonymizer \u2192 De-identify Research Data** \u2014 renamed the tool and reframed its three strategies in TCPS 2 / PHIPA language: `coded` (consistent pseudonyms + a downloadable re-identification **key file** mapping originals \u2192 pseudonyms), `pseudonymized` (SHA-256 one-way hash, no key retained), `anonymized` (irreversible `[REDACTED]`). Added a `KeyFileCard` sub-component shared by CSV + Text modes that renders only when `strategy === 'coded'`: amber warning strip citing TCPS 2 Art. 5.5 ("coded data and the re-identification key must be held separately"), plus a secondary download button for `{filename}-keyfile.csv` with `original,pseudonym` rows. CSV mode tracks `result.keyFile` alongside the main result; Text mode tracks `resultKeyFile` and revokes both blob URLs on reset. Output filename slug reflects strategy (`-coded.csv`, `-pseudonymized.csv`, `-anonymized.csv`). Registry (`toolRegistry.js:55`) updated: `name` \u2192 "De-identify Research Data", `slug` \u2192 `deidentified`, description rewritten, tags add `de-identification` / `tcps2` / `phipa`. **Tool `id` kept as `data-anonymizer`** so all `related` references, drag-drop mappings, and the `App.jsx` lazy loader stay valid. Display-label references updated in `AcrobatAlternative.jsx:344` and `TriAgencyPolicy.jsx:814`. Verified in preview: sidebar + tool header show new name, all three strategy options render with per-strategy blurb, Text-mode coded flow produces 4 pseudonyms + keyfile card ("text-input-keyfile.csv, 4 entries") + amber warning; no new console errors. |
| 2026-04-17 | **Carried-over cleanup & verification pass** — (1) `AcrobatAlternative.jsx` Task Coverage table React "key" warning fixed: `<>` fragments carrying `key` props replaced with `<Fragment key={group.group}>` (imported `Fragment` from `react`); inner `<tr key={group.group}>` dropped since the Fragment now owns the key. 23 rows across 5 group headers verified rendering. (2) CompressPDF dev-mode React error from prior HANDOFF — no longer reproducible after the Phase 1–6 work; tool renders cleanly on fresh load (header + container + related-tools). Earlier errors were stale HMR buffer entries from before the tool-pages modernization. (3) `npx vite build` clean: 12.28s, 167 precache entries, only the pre-existing `zxcvbn` 818 KB chunk warning (lazy-loaded only by Encrypt/Decrypt) — no new warnings. (4) Mobile viewport (375×812) verified: longest tool-header-kickers ("Privacy & Security" 204px, "Calculators & Converters" 250px) render on a single line without wrap. (5) `.info-card-badge` WCAG contrast computed: parchment `rgb(238,230,211)` on effective background `rgb(26,55,89)` (rgba(255,255,255,0.04) over `--bg-card`) = **9.74:1** — passes AA (4.5) and AAA (7). |
| 2026-04-17 | **Canadian researcher audit — Phase 5–6** — (Phase 5 / Item 9 · Accessibility) Added two cards to the `GrantsAndIdentifiers` ETHICS_RESOURCES grid: "Accessible Research Outputs (AODA / WCAG 2.1 AA)" linking to the W3C WCAG 2.1 quick reference, and "AODA overview (Ontario)" linking to Ontario's AODA business requirements page. Framing: Tri-Agency reviews increasingly ask about accessible outputs; AODA applies to Lakehead as a designated public-sector organization. Grid auto-expands from 4 → 6 cards. (Phase 6 / Item 11 · Homepage framing) Reframed `.homepage-hero-kicker` from editorial-magazine flourish "A Scholarly Perspective № 01 · EST. 2026" to the grounded "Lakehead Research Data Toolkit · EST. 2026"; tagline simplified from "A curated suite of browser-native instruments…" to "A browser-native toolkit for Lakehead researchers — secure, analyze, and preserve your data without a single byte leaving your device." Retains the editorial serif + serial treatment but sets clear institutional identity for STEM/francophone audiences. No CSS changes needed — existing `.homepage-hero-kicker` and `.homepage-hero-serial` styles cascade. |
| 2026-04-17 | **Canadian researcher audit — Phase 1–3** — (1) Added `src/data/institutionConfig.js` as single source of truth for Lakehead strings (name, short name, RDM/storage/librarian emails, `researchOffice`, `dataLibrarian`, `dataverseUrl`, `libraryDataGuideUrl`, `indigenousResearchOffice`, `rebContactUrl`) with a `MAILTO` helper map; swapped hardcoded emails/URLs in RequestATool, DataClassification, StorageCalculator, DRACServices, LakeheadDataverse, TriAgencyPolicy for config references (Lakehead Data Classification content itself preserved verbatim at user's request). (2) TriAgencyPolicy expanded: relabeled three pillars ("Pillar 1 · Institutions", "Pillar 2 · Researchers", "Pillar 3 · Publication"); added 3×3 agency matrix (`.tap-matrix`) showing per-pillar status (CheckCircle done / AlertCircle active / Clock pending) for CIHR, NSERC, SSHRC with per-agency accent borders via `--matrix-accent`; restructured Indigenous section into Governance Frameworks (6 cards: OCAP, CARE, ITK NISR, USAI, Métis Research Protocols, TCPS 2 Ch 9) + general guidance (3 cards); added EDI in Research Planning section (`.tap-edi`, teal rgba(20,184,166,0.06) tint) with 4 cards covering grant apps, DMPs, collecting EDI data responsibly, and the Dimensions Program. (3) New page `#grants-identifiers` → `GrantsAndIdentifiers.jsx`: hero + "Why this matters" promise + 3 identifier cards (ORCID #A6CE39, CCV #00427A, DOI #FFC20E) with per-card border-top via `--gai-accent`, 6-step setup order (`.gai-steps`), 4-card ethics/DMP grid (TCPS 2 Core, TCPS 2 full, LU REB, DMP Assistant), Dr. Ayeni contact CTA; registered in App.jsx PAGES Set + page switch; added sidebar link with `BadgeCheck` icon between Tri-Agency and Classify Your Data. CSS additions: `.tap-indigenous-subtitle`, `.tap-matrix*`, `.tap-edi*`, `.gai-cards`, `.gai-card*`, `.gai-steps`, `.gai-step-num`, `.gai-ethics-grid`, `.gai-ethics-card`. Pages total → 9. |
| 2026-04-17 | **Resource pages editorial rollout** (commit `36b6cf1`) — applied the editorial shell language to every non-tool page: HowThisWorks, RequestATool, DataClassification, StorageCalculator, TriAgencyPolicy, DRACServices, LakeheadDataverse. New `.htw-kicker` class (gold uppercase 10px, 0.24em letter-spacing, bracketed by hairline `::before` + `::after` rules) added above each hero h1. Hero titles converted to Fraunces 40–44px parchment (`--text-parchment`, `opsz` 72, `-0.02em` letter-spacing); subtitles Plex Sans 15–16px `--text-secondary`, max-width 640–680px. Section titles (`.htw-section-title`, `.tap-section-title`, `.drac-subsection-title`, `.lud-section-title`, `.dc-section-title`) rebuilt on the flex-rule pattern: Fraunces 20–22px + `flex: 1` hairline gradient via `::after`. DRAC `.drac-hero-logo` restyled as a kicker (gold caps with `::before` tick). StorageCalculator inline h1 switched from mono cyan to Fraunces parchment with gold `HardDrive` icon. Mobile `@media (max-width: 767px)` rules drop hero sizes to 30–32px. Page wrappers unchanged — DataClassification and StorageCalculator share the `.htw` wrapper so the kicker/title changes cascade automatically. |
| 2026-04-17 | **Acrobat Alternative tone reframe** (commit `1a28db5`) — softened the "Ditch Adobe Acrobat Pro" framing into a measured pre-renewal review. New hero h1: "Do you still need Adobe Acrobat Pro?"; subtitle frames the page as a way to "reclaim a few hundred dollars a year from a subscription that may be quietly auto-renewing". Section titles: "The Free Stack" → "The equivalent toolkit"; "Task Coverage" → "Task coverage"; "When Acrobat Pro Is Still Worth It" → "When Acrobat Pro still earns its keep". Cost badge label "for Adobe Acrobat Pro" → "Acrobat Pro subscription". Beyond-Acrobat card retitled "Research-specific tools Acrobat doesn't cover". `.aa-hero-subtitle` max-width bumped 560 → 640px. No logic/structure changes — copy + one CSS tweak. |
| 2026-04-17 | **Tool pages modernization** (commit `7ddb143`) — every tool now renders inside a shared `.tool-page` editorial wrapper (max-width 960px, `margin: 0 auto`, matching HomePage). `App.jsx` emits a new `.tool-header` above every `<ToolComponent>`: `.tool-header-kicker` (category emoji + label in gold caps with hairline `::before`), `.tool-title` (Fraunces 40px parchment, `opsz` 72), `.tool-header-lede` (15px secondary, max-width 680px), with a hairline bottom divider. The `description` `<p>` was removed from `InfoCard.jsx` to avoid duplication (description now lives only in the new header) — trust-badges row + limitations expander preserved; no changes needed to any of the 62 tool files. `RelatedTools.jsx` title upgraded from `<p>` to `<h2>` using the homepage flex-rule section pattern with a mono `count · suggested` meta; cards moved to `--bg-card` surface with top-edge gold shimmer `::before` and `translateY(-1px)` hover lift, matching Popular Tools. InfoCard itself got the same editorial treatment (card surface, hairline border, shadow, gold shimmer); `.info-card-badge` restyled as a pill with parchment text. Placeholder `!ToolComponent` branch also wrapped in `.tool-page`. |
| 2026-04-17 | **Editorial shell redesign** (commits `bfaf05b` → `c4d71f7`) — added Fraunces display serif (`@fontsource/fraunces`, weights 400/500/600/700) as `--font-display`; new tokens `--bg-card` (`#102F52`), `--bg-inset` (`#081121`), `--text-parchment` (`#EEE6D3`), `--border-hairline` (`rgba(255,255,255,0.08)`), `--accent-primary-soft`, `--shadow-card`, `--shadow-lift`; Topbar wordmark split so full "RDM" renders in gold via `.topbar-logo-mark` span (initially tried `::first-letter` — user wanted all three letters), Fraunces type, gold tick under the bar via `.topbar::after` linear-gradient; Sidebar base darkened to `--bg-inset`, hairline borders, gold-tick active indicator via `::before`, new "Research Resources" section label, **pinned gold `.sidebar-cta` CTA card at bottom** ("Request a Tool" moved here from the inline list), flex-column layout so CTA sticks to bottom; HomePage hero became an editorial gradient card (`.homepage-hero`) with grid-mask overlay + kicker/serial + serif title with italic gold `<em>` + trust pills + compliance rule-separator; Popular Tools and Research Resources cards got `--bg-card` surface, hover lift + top-edge shimmer, gold left-rail on resource card hover; all section titles use Fraunces with flex rule and a mono metadata count (`.homepage-section-title-count`); topbar search became a pill-style button; added `margin: 0 auto` to `.tap` and `.drac` — they were left-aligning while the other Research Resources pages centered; sidebar brand header (L-in-a-box + "Lakehead Research / Data Toolkit") was tried and then removed at user's request — redundant with topbar |
| 2026-04-17 | Compress PDF: added smart image-XObject replacement tier — `compressViaImageReplacement()` walks `pdfDoc.context.enumerateIndirectObjects()`, filters `PDFRawStream` image XObjects to plain `/DCTDecode` JPEGs with RGB color spaces (`/DeviceRGB` or `/ICCBased` N=3) and no masks/decode arrays, re-encodes each via `createImageBitmap()` → `OffscreenCanvas` → `toBlob('image/jpeg')` at the preset's quality + maxDimension, then swaps via `PDFRawStream.of(newDict, bytes)` + `context.assign(ref, newStream)` only when the new image is ≥10% smaller; text objects, vector graphics, and outlines are preserved — selectable text stays selectable; smart mode is the primary path for image-heavy PDFs; whole-page raster is now demoted to a "Need more reduction? → aggressive compression" reveal under the smart presets (orange-bordered cards, warns flattens text to images); if no JPEG candidates exist (JBIG2/CCITTFax/Flate images) smart mode is skipped and raster becomes primary with a note; added `.compress-advisory` InfoCard under every image-heavy result set pointing to PDFGear (https://www.pdfgear.com) and Ghostscript (https://ghostscript.com) for cases where browser compression can't match desktop tools; sample-based estimation uses the 3 largest images to project total savings; commit `eee9868` |
| 2026-04-16 | Compress PDF Quick Wins pass for text-heavy mode — `stripDeadweight()` now removes XMP metadata, `/Names /EmbeddedFiles` attachments, `/Names /JavaScript`, `/OpenAction`, document + page `/AA` triggers, `/PieceInfo`, and per-page `/Thumb` entries before `pdfDoc.save({ useObjectStreams: true })`; preserves title/author/subject/keywords, outlines, page labels, and named destinations (so outline links still work); defensive per-entry try/catch so any failure skips that entry rather than blocking the save; ResultPanel shows a green-bar note listing exactly what was stripped |
| 2026-04-16 | Redesigned Compress PDF UX — auto-analyzes + estimates 3 presets immediately on upload via per-page JPEG sampling (1–3 representative pages extrapolated by page count, ±15% accuracy), hides presets projected to reduce <5% (`compress-preset-card--unhelpful`), compresses only the preset the user clicks to download, replaced the screen-wide "Generate 3 versions" button with prominent per-card `.compress-preset-cta` pills (16px bold, 14×22 padding, gold shadow, hover lift, `min-width: 180px`), demoted text-only fallback to a small text link |
| 2026-04-16 | Added Fillable PDF Form tool (`#fillable-pdf-form`) — turns a flat PDF into a fillable form with text fields, checkboxes, radio groups, dropdowns, and signature boxes placed by clicking on a page preview; field properties panel for renaming/defaults/options/multi-line; signature boxes are real `/Sig` AcroForm widgets registered via low-level pdf-lib dict API + `SigFlags = 3` so Adobe Reader's Fill & Sign and digital-signature flows recognize them; pre-flight detects existing AcroForm fields and refuses (avoids the documented `@cantoo/pdf-lib` serializer issue); generates with `useObjectStreams: false` for broad viewer compatibility; CSS prefix `.ff-*`; PDF Tools count → 17 |
| 2026-04-16 | Rewrote Compress PDF (`#compress-pdf`) with smart detection + 3-preset workflow — analyzes embedded image content via pdfjs `OPS.paintImageXObject` and routes image-heavy PDFs (≥30% of pages with ≥200×200px images) to a per-page rasterization pipeline that produces Low (150 DPI / 0.90 JPEG), Medium (110 DPI / 0.75) and High (80 DPI / 0.55) versions in parallel and shows their sizes side-by-side for the user to pick; text-heavy PDFs fall back to the existing single-pass structural `pdfDoc.save()`; both modes accessible from either branch via secondary CTA; uses Canvas API + `pdfDoc.embedJpg()` — fully offline, no new deps; added CSS for `.compress-analysis-*`, `.compress-preset-*` |
| 2026-04-16 | Updated AcrobatAlternative PDF→Word table rows: primary recommendation changed from Google Docs to Microsoft Word (File → Open); removed OCAP®/sensitive row (Word is secure for all cases); added "PDF → Word (complex formatting)" row recommending LibreOffice (free) or Tungsten Power PDF (paid); added `word` badge style (Microsoft blue #2B579A) |
| 2026-04-16 | Moved cybersecurity guide out of HowThisWorks — full content (7 essential actions, device encryption, passwords/2FA, file encryption, AI warning, controlled data) relocated to RS Toolkit at `https://seawaydigital.github.io/RSToolkit/#cybersecurity-guide`; replaced with a bridge callout card + 4 linked security tool cards (Password Protect PDF, Strip Metadata, SHA-256, Encrypt Text); removed 9 unused lucide icon imports |
| 2026-04-16 | Reordered sidebar special pages to follow researcher workflow: How This Works → Tri-Agency RDM Policy → Classify Your Data → Research Storage Calculator → Lakehead Dataverse → DRAC Services → Adobe Acrobat Alternative → Request a Tool |
| 2026-04-16 | Fixed `.lud` page wrapper centering — added `margin: 0 auto` and `padding` to match `.aa` pattern; content was left-aligned |
| 2026-04-16 | Added Lakehead Dataverse page (`#lakehead-dataverse`) — persuasive + practical guide for LU researchers to deposit data to the institutional Borealis collection; 6 benefit cards, repository picker table (LU Dataverse vs FRDR vs Zenodo), 8-step deposit walkthrough, FAQ accordion, contact CTA for Dr. Philips Ayeni; sidebar link (Database icon, second in special pages group); CSS prefix `.lud-*` |
| 2026-04-16 | Option A integrations: updated Borealis links in TriAgencyPolicy (repo card URL → LU-specific, added "Recommended for Lakehead" gold badge) and DRACServices (url, tagline, description updated to highlight LU institutional collection) |
| 2026-04-14 | Added Adobe Acrobat Alternative page (`#acrobat-alternative`) — persuasive cost-saving guide for Lakehead researchers showing how RDM Toolkit + Free Acrobat Reader + Google Docs (Lakehead institutional) + LibreOffice replaces ~$240/yr Acrobat Pro subscription; task coverage table links directly to relevant RDM tools; sidebar link (CircleDollarSign icon, first in special pages); CSS prefix `.aa-*` |
| 2026-04-14 | Fixed PWA service worker cache-staleness bug — added `skipWaiting: true` + `clientsClaim: true` to `vite.config.js` Workbox config; new SW now activates immediately on deploy instead of waiting for all tabs to close, preventing "Failed to fetch dynamically imported module" errors after deployments |
| 2026-04-14 | Installed missing runtime deps (`turndown`, `turndown-plugin-gfm`, `xlsx`) — were declared in package.json but absent from node_modules, causing build failures |
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
| `.github/workflows/deploy.yml` | Push to master | `npm ci --ignore-scripts` → `npm run security:audit` → `npm audit signatures` → `npm audit --omit=dev --audit-level=high` → `npm run build` → bundle-integrity record → SLSA provenance attestation → deploy to GitHub Pages |
| `.github/workflows/security.yml` | PR, push to master, weekly Monday | Standalone guardrail run: `npm ci --ignore-scripts` → lockfile-diff-guard (PR only) → `security:audit` → `npm audit signatures` → `npm audit --audit-level=high` |
| `.github/workflows/lighthouse.yml` | PR | Build + preview + Lighthouse CI with explicit `csp-xss` audit assertion at `minScore: 1`; uploads report as artifact |
| `.github/workflows/codeql.yml` | Push, PR, weekly Monday | CodeQL JS static analysis; results in GitHub → Security → Code scanning alerts |
| `.github/workflows/bundle-size.yml` | PR | Tracks bundle size deltas |
| `.github/dependabot.yml` | Weekly Monday | Opens PRs for npm dependency updates (major versions excluded) |

**CI audit strategy:** `--omit=dev` excludes esbuild/Vite CVEs (dev server only, not served to users). `--audit-level=high` blocks any high or critical production CVE (raised from `critical` on 2026-05-02 — current dep set has zero high+ findings).

### Local scripts

| Script | Purpose |
|---|---|
| `scripts/security-audit.mjs` | Single-file project guardrail — see Security Model § for full list of checks |
| `scripts/lockfile-diff-guard.mjs` | Fails if `package-lock.json` changed without `package.json` (used by security.yml on PR) |
| `scripts/bundle-stats.mjs` | Bundle size analyzer |
| `npm test` → `tests/*.test.mjs` | Node built-in `node --test` suite — covers `src/utils/crypto.js` (v2 PBKDF2 format, legacy v1 decrypt compat, rejection-sampling uniformity) and `src/utils/networkActivity.js` (outbound-request classification for the network-silence indicator) |
