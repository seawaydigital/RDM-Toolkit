# AGENTS.md — RDM Toolkit

> Instructions for any AI coding agent (Codex, Claude Code, Copilot, etc.) working in this repository.

**Read [CLAUDE.md](CLAUDE.md) first.** It is the single source of truth for architecture, the tool registry, the design system, the security model, and recent changes. This file only adds the operational rules agents most often get wrong.

## Hard rules

1. **Never push directly to `master`.** The "Protect master" repository ruleset requires a PR, green required checks on an up-to-date branch, and **linear history**. GitHub refuses merge commits, so PRs land by squash (or rebase). Agents must never approve PRs or use an admin bypass; leave merging to the human.
2. **Dependency changes require an allowlist edit in the same PR.** `scripts/security-audit.mjs` pins every dependency to an exact version in `allowedDependencies` / `allowedDevDependencies`. Any `package.json` change without a matching allowlist edit fails the `security` check. Never loosen a pin to a range.
3. **No new network code.** `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`eval` in `src/` fail CI. The whole product promise is that nothing leaves the browser.
4. **`dangerouslySetInnerHTML` and `localStorage` are allowlisted per-file** in `security-audit.mjs`. Don't add new call sites without updating the allowlist and having a genuine reason.
5. **GitHub Actions must be pinned to full 40-char commit SHAs**, workflows must use `npm ci --ignore-scripts`, and must not use `npx` — the security audit enforces all three.
6. **codeql-action `init` and `analyze` must always be bumped to the same SHA together** — skewed versions fail CodeQL with "configuration error". (They're subpaths of one repo, so one SHA covers all sub-actions.)
7. **Vite 8 (Rolldown) has been live since 2026-07-18.** Keep `manualChunks` in function form, because the object form is a hard error under Rolldown. The bundle-integrity guard fails on any new JS chunk, so put new shared code in an existing chunk instead of extending the `TRANSITION_ALLOWED_*` allowances in `scripts/bundle-integrity.mjs`.
8. **Accessibility is a maintained property**: axe-core scans are clean (0 violations) on the 10 representative routes as of 2026-07-07. Follow [docs/accessibility/patterns.md](docs/accessibility/patterns.md) for conventions (focus rings, live regions, contrast-safe colors on tinted surfaces, 24px targets, labels). New UI must not reintroduce violations.

## Before claiming done

```bash
npm run security:audit    # project guardrails — must pass
npm test                  # node --test suite
npm run build             # must be clean
npm run a11y:contrast     # token contrast audit (strict)
```

For UI changes, also run an axe scan against the affected route(s) (`npm run a11y:baseline` after a build, or inject `node_modules/axe-core/axe.min.js` into a browser session if chromedriver won't launch on this machine — see docs/accessibility/baseline-summary-2026-07-07.md for the workaround).

## Current state pointer

See [docs/HANDOFF.md](docs/HANDOFF.md) for what's done, what's open, and the next planned work.
