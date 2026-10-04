# Session handoff — updated 2026-10-04

> **Launching?** Start with [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md). Items 1–2 are done; the remaining owner steps start at item 3.

> State-of-the-repo snapshot for the next working session. Update this file at the end of any substantial session. Architecture/context lives in [CLAUDE.md](../CLAUDE.md); agent rules in [AGENTS.md](../AGENTS.md).

## Where things stand

- **Deployed:** rdmtoolkit.ca (GitHub Pages, auto-deploy on push to master). Master is at `d2157ec` (#134).
- **Site-content plan: complete.** Brainstormed and approved 2026-10-03; spec `docs/superpowers/specs/2026-10-03-site-content-improvements-design.md`, plan `docs/superpowers/plans/2026-10-03-site-content-improvements.md`. Shipped as five squash-merged PRs:
  - **#130 Task-based navigation:**
    - 9 common tasks (`src/data/workflows.js`) and a `#tasks` page;
    - a step-by-step `WorkflowBar` (state lives in `?task=&step=` in the hash);
    - a sidebar **By file type / By task** switch, remembered by `usePreferences`;
    - a homepage "Start from a task" section;
    - site search across tools, tasks, pages and glossary terms.
  - **#131 Pages and guidance:**
    - AI-tool guidance on How This Works and File to Markdown;
    - a new `#thesis` page (FGS requires PDF/A, unlocked and unsigned; no tool here makes PDF/A);
    - a `#glossary` page (33 terms);
    - a "Content last checked" line under every research page, plus the claims register in [CONTENT-REVIEW.md](CONTENT-REVIEW.md);
    - the homepage lists all nine guides;
    - How This Works gets an "On this page" contents list;
    - the Tri-Agency page gets a DMP crosswalk.
  - **#132 Tool pages:** "Use this one when…" pointers for 6 confusable pairs; explainers grew from 23 to 38 tools; search synonyms.
  - **#133 "Try a sample file"** on De-identify, PDF Redaction and Strip Image Metadata (`src/utils/sampleFiles.js`).
  - **#134 Bug fixes:** Convert Image Format now writes a real BMP (`src/utils/bmpEncoder.js`) and gives a clear message for TIFF; CSV Encoding Fixer decodes UTF-16 (`src/utils/csvEncoding.js`) and has an opt-in byte-order mark for Excel.
- **Tests:** `npm test` → 101 passing. `npm run security:audit` clean (46 tools).
- **Security:** `npm audit --omit=dev` (the CI gate): **0 vulnerabilities**. The Dependabot dashboard has **12 open alerts, all `scope=development`**: 9 axios, 1 ip-address, 2 brace-expansion. Open PRs #128 and #127 fix the first two; brace-expansion likely comes with the #124 group.
- **Scorecard alerts:** 5 open, all posture items, not code: BranchProtection, CodeReview, Fuzzing, CII-BestPractices and Vulnerabilities. The last one clears when the Dependabot PRs merge.
- **Accessibility:** axe-core (wcag2a/2aa/21aa/22aa) reports 0 violations on every route touched this cycle, plus the July baseline routes. The `#accessibility` statement page exists. AODA Phases 2–6 are still outstanding (see below).
- **Branch protection:** unchanged since the 2026-09-18 read-back. PRs are required, 4 required checks, 0 approvals, "require up to date" off, and history must be linear, so merge by squash.
- **Bundle:** the entry chunk grew about 16% across #130–#134 (516.7 KB → ~599 KB), because informational pages are imported statically. Each PR passed the gate against its own base. See "Next work" item 6 before adding more pages.

## Open PRs (as of 2026-10-04)

| PR | What | Notes |
|---|---|---|
| #129 | Acrobat Alternative: Acrobat Standard, registry-driven chips, editorial styling (owner, opened 2026-10-03) | Touches `CLAUDE.md`, `global.css` and `AcrobatAlternative.jsx`. All three changed on master since it was opened (#131 added a content-review line and AI copy; #130–#134 appended CSS and Recent Changes rows), so expect conflicts. Update the branch first, and keep master's `CONTENT_REVIEW['acrobat-alternative']` date only if the page was fully re-checked. |
| #128 | axios 1.18.1 → 1.20.0 (dev, lockfile only) | Clears 9 dev-only alerts |
| #127 | ip-address 10.7.0 → 10.7.3 (dev, lockfile only) | Clears 1 dev-only alert |
| #124 | npm-monthly group (8 updates, touches `package.json`) | Will fail `security` until the exact-version allowlist in `scripts/security-audit.mjs` is patched on the branch |
| #121 | actions-monthly group (7 updates) | Actions PRs pass as-is; check codeql-action init/analyze move together |

## Next work, in rough priority order

1. **Lakehead reviews of the new content** (owner sends; agent applies changes):
   - **FGS:** the Thesis & Dissertation page. Ask in particular whether they recommend a specific PDF/A route, since their own link points to a US government guide.
   - **Dr. Philips Ayeni:** the Glossary and the "Prepare a dataset for deposit" task.
   - **Office of Research Services:** is Lakehead's Microsoft 365 Copilot approved for any data classification? If yes, name it on the How This Works AI card and FAQ. [CONTENT-REVIEW.md](CONTENT-REVIEW.md) flags this row.
2. **Merge the open PRs** in the table above: #129 after updating its branch, then the Dependabot PRs.
3. **Triage the Scorecard alerts** (LAUNCH-CHECKLIST item 8).
   - Dismiss with a reason: BranchProtection and CodeReview (single maintainer); Fuzzing and CII-BestPractices (not applicable to a static site, or a deliberate choice).
   - VulnerabilitiesID clears itself after step 2.
4. **AODA Phase 2: shared UI primitives** (outline in `docs/superpowers/plans/2026-05-03-aoda-compliance-plan.md`):
   - a `useModalAccessibility` hook, extracted from FeedbackModal and reused in WelcomeTour;
   - SearchBar combobox ARIA (now more important, since search returns four kinds of result);
   - a ResultPanel live region;
   - Tooltip WCAG 1.4.13;
   - ActionButton `aria-disabled` / `aria-busy`.
5. **Header-capable host** (Cloudflare Pages / Netlify) so `public/_headers` reaches browsers. This is the largest remaining security gap (LAUNCH-CHECKLIST item 7).
6. **Before adding more pages, make them lazy.** New pages currently land in the entry chunk. Lazy-loading them creates new chunks, which the bundle guard rejects, so add a named exception in `scripts/bundle-integrity.mjs` the same way the Vite 8 migration handled `rolldown-runtime`.
7. **Content follow-ups:**
   - Fill the empty "Collect" stage. A natural task is "Make a fillable consent or intake form": Fillable PDF Form, then Password Protect PDF.
   - Have testers try "By task" mode ([TESTER-RECRUITMENT.md](TESTER-RECRUITMENT.md)).
   - PDF Redaction's registry description still says "Suitable for PHIPA, PIPEDA, and TCPS 2 disclosure". That's the kind of compliance claim the September accuracy passes softened elsewhere, so reword it.
8. **Yearly content review each September**, before grant season: work through [CONTENT-REVIEW.md](CONTENT-REVIEW.md) and update `src/data/contentReview.js`. This is a good candidate for a scheduled reminder.
9. **SSH commit signing**, then re-enable "Require signed commits"; and a **manual NVDA pass** on the top 5 tools before formal user testing.

## Operational gotchas

- **Squash-merging stacked PRs.** After the base PR is squash-merged, the next PR still carries the base's original commits. To fix it:
  1. Check that `origin/master` matches the old base branch's content: `git diff --quiet origin/master <old-base>`.
  2. Rebase: `git rebase --onto origin/master <old base tip> <branch>`.
  3. `git push --force-with-lease`, then `gh pr edit <n> --base master`.
  4. **Retargeting does not start CI.** Close and reopen the PR (or push a commit) so the `pull_request` workflows run.
  5. Merging stacked PRs one at a time also keeps each under the 10% bundle gate. Combined, #130 + #131 were 10.3%.
- **The bundle gate** fails a chunk only if it grows by **more than 10% and more than 10 KB**, so small chunks such as `rolldown-runtime` can grow freely. A module shared by several lazy tools becomes a new chunk, which fails. Pin it in `vite.config.js` `manualChunks` instead: `sampleFiles.js` goes into `index`; `pdfEncrypt` and `pdfMetadata` go into `pdf-lib`.
- **`security:audit` scans comments too.** Writing `fetch(` in a comment fails the "runtime network API" check, so reword it.
- **Node vs browser `TextDecoder('windows-1252')`.** Node returns control characters for bytes 0x80–0x9F; browsers return curly quotes, €, dashes and so on. `csvEncoding.js` maps that range by hand so the tests match what users see.
- **Port 4173 may belong to another local project.** On 2026-10-04 it was serving a different app ("Homeward | Thunder Bay Home Buyer's Guide"). A stale RDM Toolkit service worker made it *look* like this app until it was cleared. Check the page title before clearing service workers or caches on that origin. To preview on a free port: `npm run preview -- --port 4180 --strictPort`.
- **Agent-driven built-in browser:**
  - While the pane is hidden, smooth `scrollIntoView` and `requestAnimationFrame` never run, screenshots time out, and lazy PDF thumbnails don't render.
  - Use timers and instant scrolls in test scripts. The Glossary's `?term=` deep link already uses an instant scroll for this reason.
  - Run long axe scans asynchronously and poll a `window.__results` object, because `javascript_tool` times out after 45 s.
- **Shell escaping in agent sessions:** `\\` inside a Bash heredoc reaches Python as `\`. For edits involving backslashes (regexes, `\n` in JS strings), write the script to a file first.
- **Dependabot npm PRs that change `package.json` always fail the `security` check** until the exact-version allowlist in `scripts/security-audit.mjs` is patched in the same PR (check out the branch, edit, push). Lockfile-only bumps of transitive dependencies (e.g. #127, #128) are not affected. GitHub Actions PRs pass as-is.
- **codeql-action init/analyze must move together** (same SHA), or CodeQL fails with "configuration error".
- **The owner can't self-approve their own PRs.** Use the admin "Merge without waiting for requirements" checkbox for self-authored PRs. Agents never merge or bypass.
- **Merge races:** after "Update branch", required checks restart, so use "Enable auto-merge (squash)" rather than clicking merge immediately.
- **chromedriver can't launch headless Chrome on this dev machine**, so `npx axe` and `npm run a11y:baseline` fail locally (they work in CI). Workaround:
  1. Copy `node_modules/axe-core/axe.min.js` into `dist/` and serve it with `vite preview`.
  2. Inject `<script src="/axe.min.js">` in the built-in browser and run `axe.run()` per route.
  3. Delete `dist/axe.min.js` afterwards.
- **Dependabot won't auto-rebase branches with human or agent commits.** Those need the manual "Update branch" button.
