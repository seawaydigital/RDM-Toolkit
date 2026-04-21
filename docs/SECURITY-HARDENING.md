# Repository Hardening Checklist

Manual settings you need to enable in the GitHub UI — I cannot automate these from code. Links assume you're logged in as the repo owner (`seawaydigital`).

---

## Critical (do these first)

### 1. Branch protection on `master`

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/settings/branches>

Click **Add rule** (or edit the existing one), branch name pattern: `master`.

- [ ] **Require a pull request before merging**
  - Required approvals: `0` (you're solo; CI is the guard)
  - ☑ Dismiss stale pull request approvals when new commits are pushed
- [ ] **Require status checks to pass before merging**
  - ☑ Require branches to be up to date before merging
  - Select status checks (after their first run, they'll appear in the picker):
    - `analyze` (CodeQL)
    - `bundle-size`
    - `lighthouse`
- [ ] **Require conversation resolution before merging**
- [ ] **Require signed commits** _(optional, medium friction — needs GPG/SSH signing set up locally)_
- [ ] **Do not allow bypassing the above settings**
- [ ] ☑ **Include administrators** — critical. Without this, you can `git push master` yourself and skip all guards.
- [ ] ☑ Restrict who can push to matching branches → only `@seawaydigital`
- [ ] Allow force pushes: **Nobody**
- [ ] Allow deletions: **Off**

### 2. Secret scanning + push protection

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/settings/security_analysis>

- [ ] ☑ **Secret scanning** — detects committed secrets
- [ ] ☑ **Push protection** — **blocks** a push that contains a detected secret before it lands. Enable this.
- [ ] ☑ **Dependency graph**
- [ ] ☑ **Dependabot alerts**
- [ ] ☑ **Dependabot security updates** — auto-opens PRs for vulnerable deps (different from the weekly Dependabot you already have)
- [ ] ☑ **Code scanning** (CodeQL is already wired up)

### 3. GitHub Actions permissions

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/settings/actions>

Under **Workflow permissions**:
- [ ] Select **Read repository contents and packages permissions** (the restrictive default)
- [ ] ☑ Allow GitHub Actions to create and approve pull requests — **leave unchecked**

Under **Fork pull request workflows from outside collaborators**:
- [ ] Select **Require approval for first-time contributors** (default) — prevents a drive-by PR from running your CI without your eyes on it

### 4. Account-level: 2FA with a passkey

**Where:** <https://github.com/settings/security>

- [ ] Two-factor authentication enabled
- [ ] Method: passkey or authenticator app (**not SMS** — SIM-swap risk)
- [ ] If you use a hardware key (YubiKey), register **two** (primary + backup)
- [ ] Save recovery codes somewhere you can actually find them (password manager, not email)

---

## Important (do soon)

### 5. Require code-owner review on protected paths

Once the CODEOWNERS file is live (see this PR), go back to the branch protection rule:

- [ ] ☑ **Require review from Code Owners**

This means any PR touching `/src/utils/crypto.js`, `/src/tools/privacy/`, `/.github/`, etc. requires explicit sign-off. Mostly ceremony while you're solo; immediately matters the moment you add a collaborator.

### 6. Review Dependabot PRs promptly

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/pulls?q=is%3Apr+label%3Adependencies>

The new `github-actions` ecosystem (added in this PR) will open PRs when action releases come out — they rewrite the pinned SHA and bump the trailing `# vX.Y.Z` comment. Merge promptly; a stale pinned SHA is a known-CVE SHA.

### 7. Enable private vulnerability reporting

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/settings/security_analysis>

- [ ] ☑ **Private vulnerability reporting** — gives researchers a structured way to disclose a finding privately instead of opening a public issue

---

## Nice to have (defense in depth)

### 8. Tag-gated deploys (architectural change)

Currently every push to `master` deploys to `rdmtoolkit.ca`. Consider:

- Change `deploy.yml` trigger from `push: branches: [master]` to `push: tags: ['v*']`
- Deploy only when you explicitly tag a release
- Use GitHub Releases UI to cut tags

Tradeoff: slower iteration, but a bad merge into master can't reach users until you choose to ship it.

### 9. Build provenance attestation

Add to the `build` job in `deploy.yml`:
```yaml
- uses: actions/attest-build-provenance@<SHA>
  with:
    subject-path: 'dist/**'
```

Produces a signed attestation that says "this `dist/` was built from commit `X` by workflow `Y`." Verifiable via `gh attestation verify`. Overkill for a static SPA but cheap.

### 10. Review SBOM

**Where:** <https://github.com/seawaydigital/RDM-Toolkit/network/dependencies>

Click **Export SBOM** → download the JSON. Stash a copy with each release so you can answer "which version of `pdfjs-dist` did we ship in v1.0?" in a year.

### 11. Disable anonymous GitHub Actions on forks

Already covered in step 3, but worth re-stating: forks can trigger workflow runs via PR. Your `bundle-size.yml` runs `npm ci` and `npx vite build` — if someone forks and PRs a malicious `package.json`, that runs in your CI. The "Require approval for first-time contributors" setting gates this.

### 12. npm audit baseline

You already run `npm audit --omit=dev --audit-level=critical` in `deploy.yml`. Consider also:

- [ ] Add the same step to `bundle-size.yml` and `lighthouse.yml` so PRs can't introduce a critical CVE without the maintainer noticing during review
- [ ] Track known ignored CVEs (e.g. `xlsx@0.18.5` — documented in CLAUDE.md) in a `.npmrc` or `audit-ci.json` so future audits don't keep re-reporting them

---

## What's already done (for reference)

Inherited from prior work — no action needed:

- ✅ CodeQL static analysis on every push/PR + weekly
- ✅ Dependabot weekly npm scans (this PR adds `github-actions` ecosystem too)
- ✅ `npm audit --omit=dev --audit-level=critical` in deploy workflow
- ✅ CSP meta tags + X-Content-Type-Options + Referrer-Policy (see `index.html`)
- ✅ DOMPurify strict allowlist (Markdown Preview)
- ✅ ZIP bomb guard (ExtractZIP)
- ✅ PDF.js v5 (patched CVE GHSA-wgrm-67xf-hhpq)
- ✅ All third-party Actions pinned to commit SHAs (this PR)
- ✅ CODEOWNERS file (this PR)

---

## Verification

After enabling the critical items, try this:

1. On your local clone, attempt: `git push origin master` directly (from a dirty working tree with a test commit). It should fail with "Protected branch update failed."
2. Open a test PR. Confirm:
   - [ ] `bundle-size`, `lighthouse`, `CodeQL` checks appear as required
   - [ ] Merge button is disabled until checks pass
   - [ ] A PR touching `/src/utils/crypto.js` requests review from `@seawaydigital` automatically
3. Try committing a fake AWS key (`AKIA` + 16 random chars) and pushing — push protection should block it.

If any of those don't behave as expected, the setting didn't stick. Re-check in the UI.
