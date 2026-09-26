# Launch checklist — rdmtoolkit.ca

Prepared 2026-09-24 after the full-site security audit and launch-readiness pass.
Everything a pull request could fix is in PRs #115–#118. What remains needs a
repository owner, the domain registrar, or a human with a desktop PDF reader.

Work top to bottom. Items in **Before announcing** block the launch. The rest
can follow in the weeks after.

---

## Before announcing

### 1. Merge the four security PRs

They are stacked: #115 → #116 → #117 → #118, each containing the one before it.

**Done 2026-09-25.** #118 was squash-merged as `83b3bc6`, which landed all
four, and #115–#117 were closed by hand.

This repo does not allow merge commits: the "Protect master" ruleset requires
linear history, so GitHub refuses them. Squash-merging only the top PR of a
stack is safe. Squashing the stacked PRs one at a time is what causes conflicts.

### 2. Confirm the deploy

The deploy workflow now ends with a smoke check that fails the run unless both
of these load. Confirm it passed, then check by hand:

```bash
curl -sI https://rdmtoolkit.ca/.well-known/security.txt
```

Expected: `HTTP/1.1 200`. Before #118 this URL returned 404 on the live site.

The site's service worker updates on the next visit. Anyone with the site open
should reload once.

### 3. Open one protected PDF in a desktop reader

Automated tests prove the Password Protect PDF output is AES-256 encrypted and
unlocks only with the password, using two independent readers (pdf-lib and
pdf.js). Chrome's built-in viewer is pdf.js, so it is already covered. Adobe
Reader and macOS Preview are not.

1. Protect any PDF on the live site with a test password.
2. Open the download in Adobe Acrobat Reader. It must ask for the password.
3. Enter it. The document must display normally.

### 4. Tell anyone who used Password Protect PDF

Before #115, **every file this tool produced was unencrypted**, although the
tool reported success. The library it used silently ignored the password. Anyone
who protected and shared a file with it should treat that file as unprotected,
re-protect it on the fixed site, and re-send it. The PR description of #115 has
wording you can reuse.

### 5. Stop the domain being used for phishing

`rdmtoolkit.ca` has no SPF or DMARC record, and its MX record points at GitHub
Pages, which accepts no mail. Anyone can send email that appears to come from
the domain — an easy lure against researchers who trust the site. The domain
sends no mail (the security contact is `rdm.research@lakeheadu.ca`), so lock it
down completely.

At the registrar (canspace.ca), for `rdmtoolkit.ca`:

| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | `@` | `v=spf1 -all` | No server may send mail for this domain |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | Receivers reject spoofed mail |
| MX | `@` | priority `0`, host `.` | "Null MX" (RFC 7505) — replaces the current `0 rdmtoolkit.ca` record |
| CAA | `@` | `0 issue "letsencrypt.org"` | Only Let's Encrypt may issue certificates |
| CAA | `@` | `0 issuewild ";"` | No wildcard certificates |

If the registrar's form will not accept `.` as a mail host, delete the MX record
instead; the SPF and DMARC records still do the important work.

Check the CAA record before adding it: GitHub Pages renews this site's
certificate through Let's Encrypt (current certificate expires 2026-11-17), so
`letsencrypt.org` must stay listed. If the site later moves behind Cloudflare,
add Cloudflare's certificate authorities to CAA first.

If canspace.ca offers **DNSSEC**, turn it on. It is currently off.

### 6. Require branches to be up to date before merging

Branch protection on `master` currently has this switched off (and 0 required
approvals, which suits a single maintainer). An automated attempt to change it
was correctly refused, so it needs the owner:

```bash
gh api -X PATCH repos/seawaydigital/RDM-Toolkit/branches/master/protection/required_status_checks -f strict=true
```

---

## Soon after launch

### 7. Put a header-capable host in front of the site

This is the largest remaining security gap. GitHub Pages cannot send HTTP
security headers, so the live site has **no** HSTS, `frame-ancestors`,
`X-Frame-Options`, `X-Content-Type-Options` or `Permissions-Policy`. The
`<meta>` CSP still enforces the important parts (no outbound connections, no
third-party scripts, Trusted Types), and a script refuses to render the app
inside another site's frame. But headers are the proper control, and HSTS in
particular cannot be set any other way.

Cloudflare Pages or Netlify (both have free tiers) serve `public/_headers` as-is.
`docs/DEPLOYMENT.md` and `docs/hosting/` cover other servers. After switching,
check with:

```bash
curl -sI https://rdmtoolkit.ca/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|permissions-policy"
```

All five should appear. Update the CAA record (step 5) before moving.

### 8. Tidy the security dashboards

| Item | Action |
|---|---|
| PR #111 | Close as superseded: its File to Markdown fix shipped in #112, its badge-race fix in #114, its drop-leak fix in #118 |
| PR #110 (Dependabot) | After the merge it will be rebased. Update the exact-version allowlist in `scripts/security-audit.mjs` on its branch, as for every Dependabot npm PR |
| Dependabot alerts (adm-zip, high + medium) | Close automatically once #117's override reaches `master` |
| CodeQL alerts #1, #3, #26 and the 19 unused-code notes | Close automatically on the first `master` scan after #118 |
| Scorecard #37, #38 (token permissions) | Close automatically after #117 |
| Scorecard #44 (known vulnerabilities) | Closes once the adm-zip alerts clear |
| Scorecard #36 (branch protection), #40 (code review) | Dismiss as "won't fix": single maintainer, owner cannot approve own PRs |
| Scorecard #43 (fuzzing), #42 (CII badge) | Dismiss as "won't fix", or register the project at bestpractices.dev for #42 |

### 9. Report the two pdf-lib defects upstream

Found during this work, worked around in `src/utils/pdfEncrypt.js`, and pinned by
canary tests that will fail when upstream fixes them:

1. `@cantoo/pdf-lib` 2.11.1 encrypts stream objects but not bare string objects,
   so a plain cross-reference save leaves Title, Author and form values in
   cleartext inside an "encrypted" file.
2. After loading with `{ password }`, a re-save still carries the original
   cross-reference stream and `/Encrypt` dictionary, and the library's own
   parser then treats the unlocked file as encrypted.

### 10. Manual screen-reader pass

axe-core reports 0 violations on all 57 routes after #118, but automated tools
catch roughly a third of WCAG issues. Before formal user testing, run NVDA
through the five most-used tools (Merge & Rotate, Compress PDF, De-identify,
Strip Image Metadata, Encrypt/Decrypt Text).

---

## Calendar reminders

| Date | What |
|---|---|
| 2026-11-17 | TLS certificate expiry. GitHub renews it automatically; check the site still loads over HTTPS after this date |
| After #118 is on `master` for one release | Remove `TRANSITION_ALLOWED_GROWTH_PCT` from `scripts/bundle-integrity.mjs` |
| 2027-08-01 | Renew `public/.well-known/security.txt` (`Expires: 2027-09-05`) |
