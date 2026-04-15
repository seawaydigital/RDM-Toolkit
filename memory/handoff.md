# Session Handoff — RDM Toolkit

> Keep this file updated at the end of each session. The next Claude session should read this first.

---

## Last session: 2026-04-14 (session 2)

### What was built / changed

#### 1. Adobe Acrobat Alternative page (`#acrobat-alternative`)
A new informational page making the case for Lakehead researchers to drop their Adobe Acrobat Pro subscription (~$240/yr) in favour of a free tool stack.

| Detail | Value |
|---|---|
| Route | `#acrobat-alternative` |
| File | `src/components/pages/AcrobatAlternative.jsx` |
| CSS prefix | `.aa-*` in `src/styles/global.css` |
| Sidebar | First link in special pages section — `CircleDollarSign` icon |
| Commits | `c29fa70`, `cc07505`, `60564e0` |

**Page sections:**
- **Hero** — "Ditch Adobe Acrobat Pro" with `$0 vs ~$240/year` cost badge
- **The Free Stack** — 4 colour-coded cards: RDM Toolkit (gold), Free Acrobat Reader (red), Google Docs via Lakehead Workspace (blue), LibreOffice (green)
- **Task Coverage table** — Acrobat Pro tasks only (no padding), each RDM Toolkit row links directly to that tool via `#tool-id`; badges for Free Acrobat, Google Docs, LibreOffice, Coming Soon, and Skip
- **When Acrobat Pro Is Still Worth It** — honest section: (1) very high-volume PDF→Word, (2) enterprise PKI-certificate signatures
- **Beyond Acrobat callout** — gold-bordered section showing 12 research-specific tools RDM has that Acrobat doesn't; chips link to each tool; "Explore all 61 tools" goes home
- **Privacy note** — green callout: for OCAP®/PHIPA data, only RDM Toolkit + LibreOffice are appropriate (no cloud upload)

**Design decisions / lessons learned:**
- Table accuracy matters — the initial version included SHA-256, BibTeX, CSV/JSON, text encryption in the Acrobat comparison table incorrectly. These were removed and moved to the "Beyond Acrobat" callout instead.
- Lakehead has an institutional Google Workspace for Education tenant — this resolves the PDF→Word gap for most researchers.
- Free Adobe Acrobat Reader covers AcroForm filling and e-signatures — these are legitimate Acrobat features covered by the free tier.

#### 2. PWA service worker fix
Added `skipWaiting: true` + `clientsClaim: true` to the Workbox config in `vite.config.js`.

| Detail | Value |
|---|---|
| File | `vite.config.js` |
| Commit | `23d6e5f` |

**Why:** After any deployment, users with the old service worker active were getting "Failed to fetch dynamically imported module" errors because chunk hashes changed. The old SW was still serving stale references. With `skipWaiting` + `clientsClaim`, the new SW activates immediately and takes control of all open tabs without requiring a manual hard refresh.

#### 3. Missing dependency install
`turndown`, `turndown-plugin-gfm`, and `xlsx` were declared in `package.json` (added with the File to Markdown tool in the previous session) but were not present in `node_modules`. Installed them so the build succeeds.

---

## Current state

### All commits this session (on master)
| Commit | Description |
|---|---|
| `c29fa70` | Add Adobe Acrobat Alternative page |
| `cc07505` | Link task coverage table rows to their RDM Toolkit tools |
| `60564e0` | Fix task table accuracy + add Beyond Acrobat callout |
| `23d6e5f` | Add skipWaiting + clientsClaim to service worker config |

### Live site
https://seawaydigital.github.io/RDM-Toolkit/ — deployed from master via GitHub Actions (deploy.yml)

### Tool & page counts
- **Tools:** 61 (unchanged this session)
- **Pages:** 7 (added `#acrobat-alternative`)

### Known issues / open items
- `xlsx@0.18.5` has 2 high-severity CVEs (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) — not critical, CI audit passes, no OSS fix available — documented in CLAUDE.md Known gaps #5
- PHIPA/PIPEDA-compliant redaction is listed as "Planned improvement" in the Acrobat Alternative page — the implementation approach is documented: rasterize pages with PDF.js to canvas, draw redaction boxes, reconstruct PDF with pdf-lib. All required libraries are already in the project.
- RTF stripping in File to Markdown is best-effort (regex-based)

---

## What's next (suggested)

1. **PHIPA-compliant redaction** — highest value remaining gap. Rasterization approach using existing pdfjs-dist + pdf-lib. Replaces visual-overlay redaction with permanent image-based redaction. Would make the "Planned improvement" badge in the Acrobat Alternative page go live.
2. **DOCX → PDF converter** — mammoth and pdf-lib both installed; natural companion to File to Markdown
3. **Branch protection** — GitHub → Settings → Branches: require PR + CI pass before merging to master (listed in Known gaps #3 for a while)
4. **Update CLAUDE.md** — keep `Recent Changes` table current after any session

---

## Architecture reminders

- **No test suite** — verification is `npx vite build` + manual browser testing
- **PWA cache** — `skipWaiting` + `clientsClaim` now active; new SW takes over immediately on deploy. Users no longer need hard refresh after deployments.
- **Worktree pattern** — use `git worktree add .worktrees/feature/name -b feature/name` for all feature work (`.worktrees/` is gitignored)
- **Chunk splitting** — large libs get their own entry in `vite.config.js` `manualChunks`; check build output for any new chunks > 500KB
- **Drag-and-drop routing** — `EXT_TO_TOOL` object in `App.jsx` (keys are extensions without dots: `pdf`, `docx`, etc.)
- **CSS conventions** — tool-specific prefix per tool/page (e.g. `aa-` for Acrobat Alternative, `ftm-` for File to Markdown), all colours via CSS variables in `global.css`
- **Pages vs Tools** — pages are in `src/components/pages/`, registered in the `PAGES` Set in `App.jsx`, and linked from `Sidebar.jsx`. Tools are lazy-loaded from `src/tools/` via the `toolComponents` map in `App.jsx`.

---

## Quick project context

| Field | Value |
|---|---|
| Repo | `seawaydigital/RDM-Toolkit` on GitHub |
| Deployed | GitHub Pages at `/RDM-Toolkit/` |
| Stack | React 18 + Vite 5 + plain CSS |
| CI | deploy.yml (build + npm audit), codeql.yml (static analysis) |
| Audience | Lakehead University researchers / grad students / research admins |
| Google Workspace | Lakehead has institutional Google Workspace for Education — relevant for PDF→Word guidance on Acrobat Alternative page |
