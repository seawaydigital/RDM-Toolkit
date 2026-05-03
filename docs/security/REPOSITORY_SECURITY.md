# Repository Security Operations

This project is intended to run as a browser-only research tool. Treat every file parser, dependency, and CI change as security-sensitive.

## Required GitHub Settings

These controls are not enforceable from the repository files alone and must be configured in GitHub.

1. Protect `master`.
   - Require pull requests before merging.
   - Require at least 1 approving review.
   - Dismiss stale approvals when new commits are pushed.
   - Require conversation resolution.
   - Require status checks before merging.
   - Require branches to be up to date before merging.
   - Block force pushes and branch deletion.

2. Require these status checks for `master`.
   - `Security Guardrails`
   - `CodeQL Security Analysis`
   - `OpenSSF Scorecard`
   - `Bundle size and integrity check`
   - `Lighthouse CI`
   - `Deploy to GitHub Pages / build`

3. Require signed commits.
   - Enable "Require signed commits" for `master`.
   - Prefer vigilant mode for maintainers.

4. Restrict deployment.
   - Keep GitHub Pages deployment behind the `github-pages` environment.
   - Require the build job to pass before deployment.

## Dependency Approval Rules

Every new production dependency requires explicit review before it is added to the allowlist in `scripts/security-audit.mjs`.

Review checklist:

- The package is required for a shipped tool.
- The package does not add runtime network calls.
- The package has no install scripts or native build requirement.
- The package has active maintenance and more than one maintainer when possible.
- The package has no high or critical production advisories.
- The package license is compatible with project distribution.
- The import path is lazy-loaded if the package is large or tool-specific.

After approval:

- Pin the exact version in `package.json`.
- Add the exact version to the dependency allowlist in `scripts/security-audit.mjs`.
- Run `npm install --package-lock-only --ignore-scripts`.
- Run `npm run security:audit`.
- Run `npm audit --omit=dev --audit-level=high`.

## Quarterly Maintainer And License Audit

Run this review once per quarter and before any public launch announcement.

For each direct dependency:

- Confirm the latest release date and changelog.
- Confirm maintainer count and repository activity.
- Confirm weekly downloads or project adoption are still healthy.
- Confirm the license is unchanged.
- Confirm no new install scripts were introduced.
- Confirm no new runtime network, file system, or code-generation behavior was introduced.

Record the review date and any exceptions in the issue tracker.

## Optional Socket.dev Setup

Socket.dev cannot be fully enabled from repository files because it requires an app/account installation. Install it for pull requests if available for the repository.

Use it to flag:

- New transitive dependencies.
- Install scripts.
- Network behavior added by dependencies.
- Suspicious package behavior or maintainer changes.

Socket alerts should block launch-facing changes until reviewed.

## Current Automated Controls

- Exact dependency pins in `package.json`.
- `ignore-scripts=true` in `.npmrc`.
- Production audit threshold set to high and critical advisories.
- npm registry signature verification in CI.
- Direct dependency allowlist in `scripts/security-audit.mjs`.
- Lockfile diff guard for pull requests.
- Full SHA pins for GitHub Actions.
- Dependabot updates for npm and GitHub Actions.
- OpenSSF Scorecard weekly scan.
- Bundle size and JS integrity comparison on pull requests.
- SRI injection for built `index.html` script and stylesheet tags.
- Security headers for supporting hosts and Vite preview.
