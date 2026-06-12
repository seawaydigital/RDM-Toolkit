# Security Policy

RDM Toolkit is a 100% client-side static site for researchers handling sensitive
and confidential data (PHIPA, PIPEDA, TCPS 2, OCAP®-governed). Security reports
are taken seriously and handled promptly.

## Reporting a vulnerability

**Preferred:** open a private report via GitHub's vulnerability reporting:
<https://github.com/seawaydigital/RDM-Toolkit/security/advisories/new>

**Email:** andrew@seawaydigital.ca

Please do **not** open a public issue for security vulnerabilities.

What to include: affected tool or page, steps to reproduce, browser/OS, and the
impact you believe it has. Proof-of-concept files are welcome — remember that
nothing you process on the site ever reaches us, so attach test files to the
report itself.

## Response targets

- Acknowledgement within **72 hours**
- Triage decision (accepted / declined / needs info) within **7 days**
- Fixes for accepted reports ship via the normal CI pipeline; the site deploys
  on every merge to `master`, so there is no release lag

## Scope

In scope:

- Any way data processed by a tool could leave the user's device
- XSS or HTML injection (the site renders sanitized Markdown in two tools)
- Flaws in the crypto utilities (AES-256-GCM / PBKDF2 in `src/utils/crypto.js`)
- Service-worker or cache poisoning
- Supply-chain issues in the pinned dependency set
- CSP or security-header regressions

Out of scope:

- Vulnerabilities requiring a compromised browser, malicious extension, or
  compromised device (documented as model limits on the How This Works page)
- Denial of service against a static site
- Issues in GitHub Pages / DNS infrastructure we don't operate

## Supported versions

The site deploys continuously from `master`; only the currently deployed
version at <https://rdmtoolkit.ca> is supported. There are no versioned
releases to backport to.

## Security model

The full security model — runtime defenses, supply-chain defenses, CI
guardrails, and known gaps — is documented in [CLAUDE.md](CLAUDE.md) under
"Security Model", and verified on every PR by `npm run security:audit`.

No bug bounty is offered; this is an institutional, grant-funded project.
Reporters are credited in commit messages and release notes unless they prefer
otherwise.
