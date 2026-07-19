# Session handoff — updated 2026-07-18

> State-of-the-repo snapshot for the next working session. Update this file at the end of any substantial session. Architecture/context lives in [CLAUDE.md](../CLAUDE.md); agent rules in [AGENTS.md](../AGENTS.md).

## Where things stand

- **Deployed:** rdmtoolkit.ca (GitHub Pages, auto-deploy on push to master). `npm audit` (full tree, dev included): **0 vulnerabilities** since the Vite 8 migration (2026-07-18). Dependabot alert dashboard: clean (adm-zip fixed via override in #91; the 4 dev-server-only vite/esbuild alerts dismissed as tolerable risk, then mooted by the migration).
- **Accessibility:** AODA plan Phases 0–1 complete (2026-07-07). axe-core 4.12.1 reports **0 violations** on all 10 representative routes (wcag2a/2aa/21aa/22aa). Docs in `docs/accessibility/`.
- **Branch protection:** live on `master` since 2026-07-12 (PR + 1 review + 4 required checks + up-to-date branches). Signed-commits requirement tried and **disabled** (no local signing configured).
- **Dependabot backlog:** **0 open dependency PRs.** Vite 8 migration completed 2026-07-18 (superseding the long-deferred #88, now closed). Cadence is monthly + grouped (one PR per ecosystem per month) since #91; security-fix PRs still arrive immediately.
- **Vite 8 / Rolldown notes:** `manualChunks` must be the function form (object form is a hard error); Rolldown always emits a `rolldown-runtime` chunk when manual chunking is used (no inlining option — a documented `TRANSITION_ALLOWED_NEW_CHUNKS` allowance in `scripts/bundle-integrity.mjs` covers it and can be removed once master's baseline is a Rolldown build); `react/jsx-runtime` + lucide's `createLucideIcon` are pinned to the entry chunk in `vite.config.js` to keep the chunk inventory stable.

## Next work, in rough priority order

1. **AODA Phase 2 — shared UI primitives** (next plan doc to draft per `docs/superpowers/plans/2026-05-03-aoda-compliance-plan.md` Phases 2–6 outline): `useModalAccessibility` hook from FeedbackModal → WelcomeTour; SearchBar combobox ARIA; ResultPanel live region; Tooltip WCAG 1.4.13; ActionButton aria-disabled/aria-busy.
2. **Accessibility statement page** (`#accessibility`, Phase 6 — can be pulled forward; mostly writing, it's the public artifact AODA reviewers ask for).
3. **SSH commit signing** — configure on the dev machine (SSH key registered on GitHub as a *signing* key; `git config gpg.format ssh`, `user.signingkey`, `commit.gpgsign true`), then re-enable "Require signed commits" in branch protection.
4. **Cloudflare Pages / Netlify fronting** — so `public/_headers` (HSTS, frame-ancestors, Trusted Types header CSP) actually reaches browsers; GitHub Pages ignores custom headers.
5. **Manual NVDA screen-reader pass** on the top 5 tools before formal user testing (automated axe covers ~30–40% of WCAG).

## Operational gotchas discovered this cycle

- **Dependabot npm PRs always fail the `security` check** until the exact-version allowlist in `scripts/security-audit.mjs` is patched in the same PR (checkout branch → edit → push). GitHub Actions PRs pass as-is (Dependabot pins SHAs).
- **codeql-action init/analyze must move together** (same SHA) or CodeQL fails with "configuration error". One repo, shared SHAs across subpaths.
- **Owner can't self-approve own PRs** — use the admin "Merge without waiting for requirements" checkbox for self-authored PRs.
- **Merge races:** after "Update branch", required checks restart — use "Enable auto-merge (squash)" rather than clicking merge immediately.
- **chromedriver can't launch headless Chrome on this dev machine** ("DevToolsActivePort" error). Workaround for axe scans: copy `node_modules/axe-core/axe.min.js` into `dist/`, serve with `vite preview`, inject `<script src="/axe.min.js">` in a real browser session and run `axe.run()` per route (CSP `script-src 'self'` permits it). `npm run a11y:baseline` works fine in CI/normal environments.
- Dependabot **won't auto-rebase branches with human/agent commits** — those need the manual "Update branch" button.
