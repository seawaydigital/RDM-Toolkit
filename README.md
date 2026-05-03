# RDM Toolkit - Research Data Management Tools

> A free, privacy-first toolkit of **46 browser-based utilities** for Lakehead University researchers, grad students, and office staff. Everything runs locally in your browser; your files never leave your device.

**Live site:** [rdmtoolkit.ca](https://rdmtoolkit.ca/)

---

## Why This Exists

Researchers handle sensitive data: interview transcripts, health records, Indigenous community data under OCAP, draft grant applications, and other materials that should not be uploaded to random online utilities.

RDM Toolkit is the alternative: every tool runs entirely in the browser. There is no server, API, database, account system, analytics, or third-party script. Files are processed in JavaScript memory and never sent anywhere.

---

## What's Included

### PDF Tools (17)
Merge, split, compress, rotate, reorder, sign, password-protect, watermark, redact, delete pages, extract images, add page numbers, add a cover page, convert to images, inspect/resize page dimensions, create fillable forms, and remove passwords.

### Image Tools (6)
Compress, convert format, resize, crop, strip metadata, and convert images to PDF.

### Text & Data Tools (8)
Word counter, find/replace, text diff, JSON formatter, CSV/JSON converter, BibTeX formatter, file to Markdown, and research-data de-identification.

### Privacy & Security (4)
Strip file metadata, SHA-256 hasher, AES-256 encrypt/decrypt text, and password generator.

### File & Archive Tools (3)
Create ZIP, extract ZIP with a decompression-size guard, and file-size analyser.

### More Text Tools (5)
Remove duplicate lines, CSV diff, CSV encoding fixer, Markdown preview with DOMPurify sanitization, and whitespace cleaner.

### More Security Tools (3)
Magic-byte file-type checker, checksum verifier, and encoding detector.

---

## Privacy And Security

| What we do | What we do not do |
|---|---|
| Run all processing in your browser | Upload your files anywhere |
| Pre-cache assets via service worker for offline use | Use analytics, trackers, or third-party scripts |
| Sanitize rendered HTML with DOMPurify | Run a backend, API, or database |
| Use native WebCrypto for hashing/encryption/randomness | Have accounts, auth, sessions, or cookies |
| Run pdfjs in a sandboxed Web Worker | Persist file contents in localStorage or IndexedDB |
| Block ZIP bombs with a 5 GB extracted-size cap | Silently add new tools outside the registry |

Compliance signals: PIPEDA, PHIPA, Tri-Agency RDM Policy, GDPR, and OCAP. The in-app "How This Works" page explains the privacy model and gives users verification steps.

Hardening now includes:

- `npm run security:audit` for project-specific guardrails across all 46 registered tools.
- Exact production and development dependency pins.
- `.npmrc` install-script blocking.
- CI `npm audit signatures` and `npm audit --omit=dev --audit-level=high`.
- CodeQL security analysis.
- Dependabot dependency and GitHub Actions PRs.
- GitHub Actions pinned to full commit SHAs.
- OpenSSF Scorecard weekly scanning.
- Bundle size and JavaScript integrity comparison on pull requests.
- Build-time SRI attributes for emitted `index.html` scripts and stylesheets.
- Fallback meta CSP in `index.html`.
- Deployable HTTP security headers in `public/_headers`.
- No CDN scripts.

Repository-level launch controls are documented in [docs/security/REPOSITORY_SECURITY.md](./docs/security/REPOSITORY_SECURITY.md).

---

## Tool Safety Guardrails

`npm run security:audit` fails if a change:

- Adds a tool file under `src/tools` without registering and lazy-loading it.
- Registers a tool without a matching lazy import.
- Reintroduces banned parser/ML dependencies with unresolved advisories.
- Adds runtime network APIs such as `fetch`, `XMLHttpRequest`, WebSocket, EventSource, or sendBeacon.
- Adds new raw HTML sinks outside the audited sanitizer components.
- Allows inline `style` attributes through DOMPurify.
- Adds local/session storage outside the known recent-tools, search, welcome-tour, and opt-in usage-log hooks.
- Adds unpinned GitHub Actions or CI-time package downloads through `npx`.
- Ships without deployable HTTP security headers.

---

## Built-In Informational Pages

- How This Works - privacy model and verification steps
- Tri-Agency RDM Policy - deposit guidance and repository choices
- Data Classification - research-data classification wizard
- Research Storage Calculator - storage estimates, backup multipliers, DMP export
- Lakehead Dataverse - Borealis deposit guide
- DRAC Services - Digital Research Alliance of Canada reference
- Adobe Acrobat Alternative - free replacements for Acrobat workflows
- Grants & Identifiers - ORCID, CCV, DOI, REB, and DMP setup guide
- Request a Tool - submit ideas

---

## Tech Stack

- React 18 + Vite 5
- Plain CSS; no Tailwind and no CSS-in-JS
- PWA via `vite-plugin-pwa`
- Hash-based routing; no router library
- Key libraries: `@cantoo/pdf-lib`, `pdfjs-dist`, `jszip`, `dompurify`, `zxcvbn`, `exifr`, `turndown`, `@dnd-kit`, `lucide-react`

---

## Local Development

```bash
npm install
npm run dev
npm run security:audit
npm run build
npm run bundle:integrity
npm run preview
```

No environment variables. No API keys. No setup beyond `npm install`. The checked-in `.npmrc` blocks dependency install scripts by default.

---

## Project Structure

```text
src/
+-- App.jsx
+-- components/
|   +-- home/
|   +-- layout/
|   +-- pages/
|   +-- ui/
+-- data/toolRegistry.js
+-- hooks/
+-- styles/global.css
+-- tools/
+-- utils/
```

For deeper architectural context, see [CLAUDE.md](./CLAUDE.md).

---

## Adding A Tool

1. Create `src/tools/{category}/{ToolName}.jsx`.
2. Add a registry entry to `src/data/toolRegistry.js`.
3. Add a `React.lazy()` import to `App.jsx`.
4. Add extension-to-tool drag/drop routing in `App.jsx` only if needed.
5. Run `npm run security:audit`.
6. Run `npm run build`.

---

## Deployment

The current workflow deploys to GitHub Pages from `master` via `.github/workflows/deploy.yml`. CI runs the project safety guardrail, npm registry signature verification, production dependency audit, and bundle-integrity recording before upload.

`public/_headers` contains the production HTTP security headers for hosts that support custom headers, such as Cloudflare Pages or Netlify. GitHub Pages does not apply custom headers, so use GitHub Pages only for public/low-risk hosting unless the site is fronted by a platform that enforces those headers.

---

## Owner

Built and maintained by Lakehead University / Seaway Digital. Contact: `andrew@seawaydigital.ca`.

Lakehead researchers can request a tool from the live site's Request a Tool page or by opening an issue on this repo.
