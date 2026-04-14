# Session Handoff — RDM Toolkit

> Keep this file updated at the end of each session. The next Claude session should read this first.

---

## Last session: 2026-04-14

### What was built

**File to Markdown converter** (`#to-markdown`) — a new tool in the Text & Data Tools category that converts documents to Markdown for use with AI/LLM tools.

| Detail | Value |
|---|---|
| Slug | `to-markdown` |
| Route | `#to-markdown` |
| File | `src/tools/text/FileToMarkdown.jsx` |
| Category | Text & Data Tools (primary sidebar, visible by default) |
| PR | [#2 — open, not yet merged](https://github.com/seawaydigital/RDM-Toolkit/pull/2) |
| Branch | `feature/to-markdown` (pushed to origin) |

**Accepted formats:** DOCX, PDF, HTML, XLSX, CSV, TXT, MD, RTF, JSON

**Two output modes:**
- **AI-friendly** — tables flattened to plain text, images → `[image]`, 3+ blank lines collapsed
- **Preserve formatting** — full Markdown (headings, tables, bold/italic, code blocks)

**New dependencies added:**
| Package | Version | Purpose |
|---|---|---|
| `turndown` | ^7.2.4 | HTML → Markdown (backbone of all conversions) |
| `turndown-plugin-gfm` | ^1.0.2 | GFM tables + strikethrough for Turndown |
| `xlsx` (SheetJS) | ^0.18.5 | XLSX parsing (own Vite chunk) |

---

## Current state

### Open PR
- **PR #2:** "Add File to Markdown converter tool"
- URL: https://github.com/seawaydigital/RDM-Toolkit/pull/2
- Status: Open, awaiting review/merge
- CI will run: build + npm audit + CodeQL on merge

### Known issues in the PR
- `xlsx@0.18.5` has 2 high-severity CVEs (not critical, CI passes, no OSS fix available — documented in CLAUDE.md Known gaps #5)
- RTF stripping is best-effort (regex-based, may leave noise for deeply nested RTF groups) — acceptable for initial release
- XLSX only converts the first sheet (shows a blockquote note to the user if multi-sheet)

### Tool count
- Master branch: 61 tools (updated in CLAUDE.md)
- The tool count in `src/data/toolRegistry.js` and `src/App.jsx` only reflect the changes once PR #2 is merged

---

## What's next (suggested)

1. **Merge PR #2** — review the test plan in the PR description, verify each file type works, then merge to master
2. **DOCX → PDF converter** — `mammoth` and `pdf-lib` are both installed; a natural companion tool
3. **Batch export mode** — future enhancement for File to Markdown (zip of .md files from multiple inputs)
4. **Branch protection** — GitHub → Settings → Branches: require PR + CI pass before merging to master (listed in Known gaps #3 for a while)

---

## Architecture reminders

- **No test suite** — verification is `npx vite build` + manual browser testing
- **Worktree pattern** — use `git worktree add .worktrees/feature/name -b feature/name` for all feature work (`.worktrees/` is gitignored)
- **Chunk splitting** — large libs get their own entry in `vite.config.js` `manualChunks`; check build output for any new chunks > 500KB
- **Drag-and-drop routing** — `EXT_TO_TOOL` object in `App.jsx` (keys are extensions without dots: `pdf`, `docx`, etc.)
- **CSS conventions** — tool-specific prefix per tool (e.g. `ftm-` for File to Markdown), all colours via CSS variables

---

## Quick project context

| Field | Value |
|---|---|
| Repo | `seawaydigital/RDM-Toolkit` on GitHub |
| Deployed | GitHub Pages at `/RDM-Toolkit/` |
| Stack | React 18 + Vite 5 + plain CSS |
| CI | deploy.yml (build + audit), codeql.yml (static analysis) |
| Audience | Lakehead University researchers / grad students |
