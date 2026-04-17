# RDM Toolkit — Research Data Management Tools

> A free, privacy-first toolkit of **62 browser-based utilities** for Lakehead University researchers, grad students, and office staff. Everything runs locally in your browser — your files never leave your device.

🌐 **Live site:** [seawaydigital.github.io/RDM-Toolkit](https://seawaydigital.github.io/RDM-Toolkit/)

---

## Why this exists

Researchers handle sensitive data — interview transcripts, health records, Indigenous community data under OCAP®, draft grant applications. The web is full of "free" online tools that quietly upload your files to a server you don't control. That's a privacy problem and, in many cases, a compliance violation under PIPEDA, PHIPA, the Tri-Agency RDM Policy, and GDPR.

RDM Toolkit is the alternative: every tool runs **entirely in your browser**. No server, no API, no database, no analytics. Your files are processed in JavaScript memory and never sent anywhere.

---

## What's included (62 tools across 9 categories)

### PDF Tools (17)
Merge, split, compress, rotate, reorder, sign, password-protect, watermark, redact, delete pages, extract images, add page numbers, add a cover page, convert to images, inspect/resize page dimensions, **turn a flat PDF into a fillable form**, remove passwords.

### Image Tools (6)
Compress, convert format, resize, crop, strip metadata (EXIF/GPS), convert to PDF.

### Text & Data Tools (8)
Word counter, find/replace, text diff, JSON formatter, CSV ↔ JSON converter, data anonymiser (PII detection), BibTeX formatter, file → Markdown (for AI consumption).

### Privacy & Security (5)
Strip file metadata, SHA-256 hasher, AES-256 encrypt/decrypt text, password generator (with zxcvbn strength), QR code generator.

### File & Archive Tools (3)
Create ZIP, extract ZIP (with bomb guard), file-size analyser.

### More Text Tools (9)
Remove duplicate lines, CSV diff, Base64, CSV encoding fixer, XML/YAML formatter, Markdown preview (DOMPurify-sanitised), case converter, line-number adder, whitespace cleaner.

### More Security Tools (3)
Magic-byte file-type checker, checksum verifier, encoding detector.

### Calculators & Converters (4)
Unit converter, date difference, timestamp converter, file-size converter.

### Developer Tools (2)
Regex tester, UUID generator.

---

## Highlight: smart PDF compression

Compress PDF auto-detects whether your file is text-heavy or image-heavy on upload, then offers the right strategy:

- **Smart compression** (image-heavy PDFs with embedded JPEGs): re-encodes embedded image XObjects in place. **Text stays selectable.** Vectors and outlines are preserved.
- **Aggressive compression** (revealed on demand): rasterises every page to a single image. Maximum reduction, but flattens text.
- **Text-only cleanup** (text-heavy PDFs): strips XMP metadata, embedded file attachments, JavaScript, and per-page thumbnails — preserves title, author, outlines, and named destinations.

Sizes are estimated *before* you commit to a download (sample-based, accurate to ±15%), and presets that wouldn't shrink your file are hidden. For heavily scanned documents that browser compression can't match, the tool transparently points you at desktop alternatives like PDFGear and Ghostscript.

---

## Privacy & security

| What we do | What we don't do |
|---|---|
| Run all processing in your browser | Upload your files anywhere |
| Pre-cache assets via service worker for offline use | Use cookies, analytics, or trackers |
| Sanitise rendered HTML with DOMPurify | Load any third-party scripts |
| Use zxcvbn for realistic password strength | Run a backend, API, or database |
| Run pdfjs in a sandboxed Web Worker (CVE-patched v5+) | Have any auth or sessions |
| Block ZIP bombs (5 GB extracted-size cap) | Persist your data anywhere except `localStorage` (recent-tools list only) |

**Compliance signals:** PIPEDA · PHIPA · Tri-Agency RDM Policy · GDPR · OCAP®. The "How This Works" page in the app explains each guarantee with verification steps you can run yourself (open DevTools → Network tab → confirm zero requests).

**Hardening:** weekly Dependabot scans, CodeQL static analysis on every push, CI `npm audit` blocks deploys on CVSS 9.0+ issues, CSP meta tags, no CDN scripts.

---

## Built-in informational pages

Beyond the tools, the site includes guided pages on:

- **How This Works** — the privacy model and how to verify it
- **Tri-Agency RDM Policy** — flowchart for deciding what to deposit and where
- **Data Classification** — wizard for classifying research data (Public → Highly Confidential)
- **Research Storage Calculator** — 14 file categories, backup multipliers, DMP-export
- **Lakehead Dataverse** — institutional Borealis collection deposit guide
- **DRAC Services** — Digital Research Alliance of Canada reference (ARC, Cloud, RDM)
- **Adobe Acrobat Alternative** — how RDM Toolkit + free tools replace ~$240/yr Acrobat Pro
- **Request a Tool** — submit ideas

---

## Tech stack

- **React 18** + **Vite 5** (ES2020, code-split per tool via `React.lazy`)
- **Plain CSS** — single global stylesheet, CSS variables, no Tailwind, no CSS-in-JS
- **PWA** via `vite-plugin-pwa` (Workbox) — installable, fully offline after first load
- **Hash-based routing** — no router library, no server-side routing needed
- Key libraries: `@cantoo/pdf-lib`, `pdfjs-dist` (v5+, CVE-patched), `jszip`, `dompurify`, `zxcvbn`, `exifr`, `mammoth`, `docx`, `@imgly/background-removal` (WASM), `qrcode`, `@dnd-kit`, `lucide-react`

---

## Local development

```bash
npm install
npm run dev          # Vite dev server with HMR
npx vite build       # Production build → dist/
npx vite preview     # Serve the production build locally
```

No environment variables. No API keys. No setup beyond `npm install`.

---

## Project structure

```
src/
├── App.jsx                 # Router, error boundary, drag-and-drop
├── components/
│   ├── home/               # Home page
│   ├── layout/             # Topbar, Sidebar, MainContent
│   ├── pages/              # 8 informational pages (non-tools)
│   └── ui/                 # Shared primitives (DropZone, ResultPanel, etc.)
├── data/toolRegistry.js    # Single source of truth for tools + categories
├── hooks/                  # useRecentTools (localStorage)
├── styles/global.css       # All styling
├── tools/                  # 62 tool components grouped by category
└── utils/                  # crypto, file validation, PDF thumbnails, etc.
```

For deeper architectural context (CSS variables, security model, dependency rationale, naming conventions, build details), see [`CLAUDE.md`](./CLAUDE.md).

---

## Adding a tool

1. Create `src/tools/{category}/{ToolName}.jsx`
2. Add a registry entry to `src/data/toolRegistry.js`
3. Add a `React.lazy()` import to `App.jsx`'s `toolComponents` map
4. Optionally add the file extension → tool ID mapping for drag-and-drop routing
5. `npx vite build` and verify no chunk size warnings

---

## Deployment

Deployed automatically to GitHub Pages from `master` via `.github/workflows/deploy.yml`. The CI step also runs `npm audit --omit=dev --audit-level=critical` to block deploys on critical CVEs, and CodeQL runs on every push and weekly.

---

## Owner

Built and maintained by **Lakehead University / Seaway Digital**. Contact: `andrew@seawaydigital.ca`.

If you're a Lakehead researcher and want a tool that doesn't exist yet, use the **Request a Tool** page on the live site or open an issue on this repo.
