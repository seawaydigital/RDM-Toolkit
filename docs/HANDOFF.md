# Session handoff — updated 2026-07-18 (end of session)

> State-of-the-repo snapshot for the next working session. Update this file at the end of any substantial session. Architecture/context lives in [CLAUDE.md](../CLAUDE.md); agent rules in [AGENTS.md](../AGENTS.md).

## Where things stand

- **Deployed:** rdmtoolkit.ca (GitHub Pages, auto-deploy on push to master). `npm audit` (full tree, dev included): **0 vulnerabilities** since the Vite 8 migration (2026-07-18). Dependabot alert dashboard: clean (adm-zip fixed via override in #91; the 4 dev-server-only vite/esbuild alerts dismissed as tolerable risk, then mooted by the migration).
- **Accessibility:** AODA plan Phases 0–1 complete (2026-07-07). axe-core 4.12.1 reports **0 violations** on all 10 representative routes (wcag2a/2aa/21aa/22aa). Docs in `docs/accessibility/`.
- **Branch protection:** live on `master` since 2026-07-12 (PR + 1 review + 4 required checks + up-to-date branches). Signed-commits requirement tried and **disabled** (no local signing configured).
- **Dependabot backlog:** **0 open dependency PRs.** Vite 8 migration completed 2026-07-18 (superseding the long-deferred #88, now closed). Cadence is monthly + grouped (one PR per ecosystem per month) since #91; security-fix PRs still arrive immediately.
- **Vite 8 / Rolldown notes:** `manualChunks` must be the function form (object form is a hard error); Rolldown always emits a `rolldown-runtime` chunk when manual chunking is used (no inlining option); `react/jsx-runtime` + lucide's `createLucideIcon` are pinned to the entry chunk in `vite.config.js` to keep the chunk inventory stable. The `TRANSITION_ALLOWED_NEW_CHUNKS` allowance in `scripts/bundle-integrity.mjs` is **now inert** (master's baseline is a Rolldown build) — remove it in any future PR touching that script.
- **Tester-facing education shipped (PR #90, 2026-07-17):** 18 tools show always-visible pre-use caveats (`TOOL_CAVEATS` in `toolExplainers.js` + `ToolCaveats.jsx`); the 9 structural PDF tools live-detect form fields/signature boxes on upload (`pdfFormDetect.js` + `FormFieldsNotice`, a named export of `ToolCaveats.jsx` to avoid a new chunk). Born from a real tester losing a signature box in a merge.

## The monthly check-in routine (owner)

The repo is configured for ~monthly maintenance. On each check-in:

1. **GitHub → Security → Dependabot alerts.** If a *production* alert appeared, deal with it now (Dependabot opens a security PR automatically regardless of the monthly cadence). Dev-only alerts can usually wait for the monthly PR.
2. **Merge the monthly grouped Dependabot PRs** (one per ecosystem). npm PRs will show a red `security` check until the exact-version allowlist in `scripts/security-audit.mjs` is patched on that branch — that's the designed friction, not a bug.
3. **Glance at Actions** — the weekly `security` and `CodeQL` scheduled runs should be green.
4. **Load rdmtoolkit.ca once** — hard refresh, open one PDF tool, drop in a file.

If nothing is red, done — the site does not otherwise rot: pinned exact deps, no server, no runtime dependencies on third parties.

## Next work, in rough priority order

1. **AODA Phase 2 — shared UI primitives** (next plan doc to draft per `docs/superpowers/plans/2026-05-03-aoda-compliance-plan.md` Phases 2–6 outline): `useModalAccessibility` hook from FeedbackModal → WelcomeTour; SearchBar combobox ARIA; ResultPanel live region; Tooltip WCAG 1.4.13; ActionButton aria-disabled/aria-busy.
2. **Accessibility statement page** (`#accessibility`, Phase 6 — can be pulled forward; mostly writing, it's the public artifact AODA reviewers ask for).
3. **Two small hardening chores** (bundle into any convenient PR): (a) add `mjs` to the Workbox `globPatterns` in `vite.config.js` so the pdfjs worker is precached and PDF tools work on a cold offline cache (CLAUDE.md known gap #6); (b) delete the now-inert `TRANSITION_ALLOWED_NEW_CHUNKS` allowance from `scripts/bundle-integrity.mjs` (known gap #7).
4. **GitHub account hardening (owner, ~10 min, no repo change):** phishing-resistant 2FA (passkey/hardware key) on the GitHub account, since branch protection + admin bypass make the account the root of trust for the whole supply chain.
5. **SSH commit signing** — configure on the dev machine (SSH key registered on GitHub as a *signing* key; `git config gpg.format ssh`, `user.signingkey`, `commit.gpgsign true`), then re-enable "Require signed commits" in branch protection.
6. **Cloudflare Pages / Netlify fronting** — so `public/_headers` (HSTS, frame-ancestors, Trusted Types header CSP) actually reaches browsers; GitHub Pages ignores custom headers.
7. **Manual NVDA screen-reader pass** on the top 5 tools before formal user testing (automated axe covers ~30–40% of WCAG).

## Operational gotchas discovered this cycle

- **Dependabot npm PRs always fail the `security` check** until the exact-version allowlist in `scripts/security-audit.mjs` is patched in the same PR (checkout branch → edit → push). GitHub Actions PRs pass as-is (Dependabot pins SHAs).
- **codeql-action init/analyze must move together** (same SHA) or CodeQL fails with "configuration error". One repo, shared SHAs across subpaths.
- **Owner can't self-approve own PRs** — use the admin "Merge without waiting for requirements" checkbox for self-authored PRs.
- **Merge races:** after "Update branch", required checks restart — use "Enable auto-merge (squash)" rather than clicking merge immediately.
- **chromedriver can't launch headless Chrome on this dev machine** ("DevToolsActivePort" error). Workaround for axe scans: copy `node_modules/axe-core/axe.min.js` into `dist/`, serve with `vite preview`, inject `<script src="/axe.min.js">` in a real browser session and run `axe.run()` per route (CSP `script-src 'self'` permits it). `npm run a11y:baseline` works fine in CI/normal environments.
- Dependabot **won't auto-rebase branches with human/agent commits** — those need the manual "Update branch" button.
- **`npm install` of @vitejs/plugin-react 6 hits an ERESOLVE** on its optional `@babel/core@8-rc` peer chain. Fix: adopt the lockfile resolution from Dependabot's branch (`git checkout origin/<dependabot-branch> -- package-lock.json` + `npm ci --ignore-scripts`) rather than `--legacy-peer-deps`.
- **Vite 8 dev server SPA-fallbacks raw `/src/*.js` URL fetches to index.html** — console-driven `import('/src/...')` debugging no longer works in dev; the app's own module graph is unaffected. Use the built preview or import via `/node_modules/.vite/deps/` URLs instead.
- **Agent browser environments can't reliably drive file uploads** into the React DropZone (synthetic Files stall on blob reads). Working verification pattern: `fetch()` a fixture served same-origin, call the component's `onFilesSelected` prop via the React fiber, and pre-resolve `arrayBuffer()` — or verify the pipeline pieces (utils, components) individually in-page.
