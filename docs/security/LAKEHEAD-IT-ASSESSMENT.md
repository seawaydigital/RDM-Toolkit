# RDM Toolkit — security assessment for Lakehead University IT

## Assessment record

| | |
|---|---|
| Application | RDM Toolkit, source at `github.com/seawaydigital/RDM-Toolkit` |
| Version this document describes | `master` once pull request #143 is merged (fixes for C8 and C9), 23 October 2026. Until that merge, the live site at rdmtoolkit.ca runs commit `36c136b`, where C8 and C9 are still open. Earlier reviews ran on earlier commits, listed in section 1. |
| Document date | 23 October 2026 |
| Prepared by | Andrew Austin, developer and maintainer of RDM Toolkit. He is responsible for this document. |
| Type of assessment | Developer self-assessment. The reviews listed below were carried out by AI coding agents (Anthropic's Claude Code) under Andrew Austin's direction. He decided which findings to fix and merged the fixes. |
| Independent review | **None.** No one outside the project has tested this application. No penetration test has been done. |
| Contact | `rdm.research@lakeheadu.ca`, or a private advisory on the GitHub repository (see `SECURITY.md`) |

Section 1 lists each review: what it covered, when, on which version, how it
was done and what it found. Section 2 lists what is still open. The rest of the
document describes the application and its controls for the team hosting it.
Deployment steps are in [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md).

---

## 1. Reviews performed

Every review below was a source-code review with local tests on made-up data.
None sent traffic to the live site except where stated.

| Date | Review | Version | Method | Result | Fixed in |
|---|---|---|---|---|---|
| 2026-09-18 | Full-site security review: script injection, network surface, and whether each privacy tool does what it claims | `02d5a1c` | Claude Code reading the source and reproducing defects in Node. The live site's HTTP headers were read with `curl`. | 4 defects. **Password Protect PDF produced unencrypted files** while reporting success. Strip File Metadata left the XMP author stream. De-identify's "pseudonymized" mode was a reversible unsalted hash. Password Generator had modulo bias. Also: the live host sends no security headers, so the site could be framed. | `83b3bc6` (25 Sep) |
| 2026-09-24 | Launch pass: accessibility scan and static analysis | branch later merged as `83b3bc6` | axe-core 4.12 on all 57 routes of the production build; CodeQL alerts; check of 71 external links | 6 accessibility violations, 1 high CodeQL alert (incomplete escaping in File to Markdown), 10 dead links | `83b3bc6` (25 Sep) |
| 2026-09-28 | Hosting-readiness review for a Lakehead subdomain | `4de6247` | Claude Code. The production build was served with the production headers and tested in headless Chrome with a real service worker. | 7 findings, listed in section 6. The most serious: offline mode stopped working on any server that sends the security headers. | `ecbda63` (28 Sep) |
| 2026-10-22 | Full automated security audit | `40ac3ac` | Cloudflare's open-source `security-audit` skill (commit `c1c8a8c`) run by Claude Code: 60 agent runs, each candidate checked by two further agents. Code ran only in an isolated sandbox with no network. No browser was available. | 11 confirmed (1 high, 8 medium, 2 low), 4 leads needing a browser to confirm, 48 hardening notes | C1, C3, C7 in `9b79071` (22 Oct). C5, C6 in `36c136b` (23 Oct). C8, C9 in pull request #143 (23 Oct). The rest are listed in section 2. |
| 2026-10-23 | Dependency advisories published after the October audit | `9b79071` | `npm audit` | DOMPurify 3.4.16 had three advisories (GHSA-cg2g-xh64-v4q7, GHSA-mrv2-3pqr-j5jr, GHSA-c6gr-qvv4-5v3f; npm rates them critical). Each needs a DOMPurify option or hook (`SAFE_FOR_TEMPLATES`, `IN_PLACE` with a hook, or `PARSER_MEDIA_TYPE` set to XHTML) that this code does not use, checked by searching the source. | Upgraded to 3.4.17 in `36c136b` (23 Oct) |
| 2026-10-23 | Recheck after the C5/C6 fixes | `36c136b` | Claude Code ran the test suite, the project guardrail script and `npm audit --omit=dev` | 127 of 127 tests pass, guardrails pass, 0 known vulnerabilities in production dependencies | — |
| 2026-10-23 | Fixes for C8 and C9, and recheck of the version this document describes | pull request #143 | Claude Code. Each fix started with a test built from the audit's reproduction, watched failing first. Both tools were then run in the dev server on the same inputs. | 136 of 136 tests pass, guardrails pass, production build unchanged (69 JS chunks). Password Protect PDF output on the C9 fixture: AES-256, none of the 10 test strings readable without the password; pdf.js reads them all back with it. De-identify on a CSV with a multi-line cell: every selected email replaced; a file with an unclosed quote or a misaligned row is refused. | — |

The skill's authors say one run of it finds roughly half of what repeated
runs find. The October audit was its first run on this code.

---

## 2. Open findings at this version

These are known and not yet fixed in the version this document describes.
Severities are the October audit's. Each was reproduced on made-up data.

| # | Severity | Tool | What happens | Status |
|---|---|---|---|---|
| C4 | Medium | PDF Redaction, Delete Pages, Split PDF | A deliberately crafted PDF can make the page shown in the preview differ from the page the tool processes. The page the user redacted or removed can then ship unchanged, and the tool's check still passes. It needs a PDF built for the purpose by whoever supplied it. | Open |
| C2 | Medium | Strip Image Metadata | Reports "No metadata detected" for WebP photos with GPS, and for photos whose names or location are only in XMP, IPTC or the Artist field. | Open |
| C10 | Low | Strip File Metadata | Author and title from earlier saved versions of the PDF stay in the output. | Open |
| C11 | Low | Drag and drop | A dropped `.json` or `.md` file can wait unseen and be picked up by the next tool opened. | Open |

Leads from the October audit that need a real browser to confirm or rule out.
None has a severity yet:

- **File to Markdown:** an uploaded `.md` file can produce a preview link with
  `rel="opener"`. If clicked, the linked page could redirect the site's tab.
  The `Cross-Origin-Opener-Policy` header in the hosting configs blocks this,
  so it matters only on a host that does not send the headers (such as the
  current GitHub Pages site).
- **PDF Redaction:** clicking between pages very quickly might attach a box to
  the wrong page.
- **CI:** whether a Dependabot pull request gets a write token in the
  bundle-size workflow, and whether the lockfile guard can be bypassed by
  editing `package.json` at the same time.

## 3. What the site is

A static single-page application: HTML, JavaScript, CSS, fonts and icons. There
is no server-side code, database, API, login, session, cookie or analytics.
The web server only returns files from `dist/`.

Every tool works on files inside the visitor's browser:

1. The researcher picks or drops a file. The browser reads it into memory.
2. JavaScript on the page (or a Web Worker from the same origin) processes it.
3. The result is offered as a download created from memory (`blob:` URL).

No file, file name or file content is sent over the network. The server's access
log sees the same static-file requests for every visitor, whatever they process.
The only query string the app ever creates is the Storage Calculator's shareable
`?config=` link, which holds numbers and fixed labels and is validated on load.

None of the open findings in section 2 sends data anywhere. They are cases
where a tool's output still contains something the user meant to remove or
protect.

## 4. Controls that enforce "data never leaves the browser"

| Layer | Control |
|---|---|
| Browser policy | CSP `connect-src 'self'` blocks `fetch`, XHR, WebSocket, EventSource and beacons to any other origin, even from a compromised library. `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'` (no `unsafe-eval`, no inline script), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. |
| Script injection | Trusted Types enforced (`require-trusted-types-for 'script'`). The only HTML sinks accept DOMPurify output (strict tag/attribute allowlists, no `style`, `javascript:`/`data:` URLs blocked). Raw-string HTML sinks throw. |
| Isolation | `X-Frame-Options: DENY` + `frame-ancestors 'none'` (clickjacking); `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`; the app also refuses to render inside a frame on hosts that send no headers. |
| Untrusted files | PDFs are parsed by pdf.js 6.3.289 in a Web Worker (the release that fixed GHSA-hq66-cqwq-w95j, script execution from a crafted PDF). ZIP extraction strips paths from entry names and refuses archives declaring more than 5 GB. |
| Transport | HSTS for this hostname; HTTPS is required anyway, because Web Crypto is only available in secure contexts. |
| Browser features | `Permissions-Policy` denies camera, microphone, geolocation, payment, USB, serial. |
| Offline cache | The service worker only serves files precached from the build (`runtimeCaching: []`); it never caches responses from elsewhere. |
| Local storage | `localStorage` holds recently used tool IDs, the sidebar view preference, the welcome-tour flag and an opt-in usage log of tool IDs and error classes (never file names or content). A button on *How This Works* wipes it for shared computers. |

The headers above must be sent by the hosting server (configs for Apache,
nginx and IIS are in `docs/hosting/`). A `<meta>` CSP in `index.html` is a
fallback only: browsers ignore `frame-ancestors` there, and Web Workers get no
policy from it at all. The current host, GitHub Pages, sends none of these
headers, so the live site at rdmtoolkit.ca runs on the fallback today.

## 5. Cryptography

- **Encrypt/Decrypt Text:** AES-256-GCM through the browser's Web Crypto API,
  key from PBKDF2-SHA-256 with 600,000 iterations, random salt and IV per
  message. No custom cryptographic primitives.
- **Password Protect PDF:** AES-256 (PDF 2.0, revision 6) through
  `@cantoo/pdf-lib` 2.11.1. Before the download is offered, the tool re-opens
  its own output and refuses to hand it over unless it is rejected without a
  password and opens with the chosen one. Owner password is random when left
  blank, so permission flags are not void. The library encrypts only stream
  contents, and it writes some objects (catalog, pages, signature and stream
  dictionaries) outside the encrypted object streams. The tool encrypts the
  strings in those objects itself, and refuses a PDF with an object the
  library could not parse (audit C9, fixed 23 October).
- **Password Generator:** `crypto.getRandomValues()` with rejection sampling
  (no modulo bias).
- **SHA-256 / checksums:** Web Crypto.

**Historical defect, disclosed:** until 25 September 2026, Password Protect PDF
produced files that were **not encrypted**, although it reported success (the
library version in use ignored the password option). This is fixed and covered
by tests that check the output with two independent PDF readers. Anyone at
Lakehead who used the tool on rdmtoolkit.ca before that date should treat those
files as unprotected.

## 6. Hosting-readiness review findings (2026-09-28)

Starting point: commit `4de6247`. All automated checks passed at the start
(0 known vulnerabilities in 474 packages, guardrails clean, 52/52 tests).

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **Offline mode silently disabled on any server that sends the security headers**, which is exactly the configuration in `docs/hosting/`. The Trusted Types CSP also governs the service worker, which blocked its `importScripts()` calls: the worker registered but cached nothing (0 of ~160 files, measured in Chrome). The same failure would have stopped deploy-time updates from reloading stale pages. | High (availability; no data exposure) | **Fixed.** The build now adds a same-origin-only Trusted Types policy to `sw.js`. Re-measured under the full production headers: 160 files cached, site and tools load with the network off, update reload works. |
| 2 | **Content injection through the Storage Calculator's shared link.** The `?config=` payload was loaded without validation, and two fields are copied verbatim into the Data Management Plan text researchers paste into grant applications. React escaped it (no script execution), but a crafted link could insert arbitrary sentences. | Low | **Fixed.** Every field is now checked against what the calculator can produce (known IDs, bounded numbers, existing labels); anything else is dropped. 5 tests. |
| 3 | No `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`. | Low (hardening) | **Added** to `_headers`, all three server configs and `vite preview`. |
| 4 | Header values in `docs/hosting/` could drift from `public/_headers` unnoticed. | Low (process) | **Fixed.** `npm run security:audit` now fails on any mismatch. |
| 5 | DOMPurify 3.4.14 behind 3.4.16 (sanitizer hardening releases; no published advisory at the time). | Informational | **Updated.** Sanitizer re-tested in the browser with script, `javascript:` and `onerror` payloads under the production CSP. |
| 6 | Handoff build left `rdmtoolkit.ca` in `robots.txt` and `sitemap.xml`; the framed-page notice named `rdmtoolkit.ca` on any host. | Informational | **Fixed.** |
| 7 | The Markdown Preview's "technical details for IT reviewers" described a DOMPurify configuration and version the code does not use. | Informational | **Corrected** to match the code. |

Areas reviewed with no issue found: all `dangerouslySetInnerHTML` sinks and
their DOMPurify configurations; hash routing (routes are looked up in a fixed
registry, never rendered); `blob:` URLs (used only for downloads and `<img>`
previews, never opened as documents); download file names; the Trusted Types
default policy; `localStorage` contents; the frame-busting fallback; ZIP path
handling; the service-worker update script; security.txt and the handoff build.
The October audit later found the File to Markdown preview lead listed in
section 2, which this review did not.

## 7. Supply chain and change control

- Every dependency is pinned to an exact version and must appear in an
  allowlist in `scripts/security-audit.mjs`; CI fails on anything else, on
  version drift, and on previously removed packages returning.
- Install scripts never run (`.npmrc` `ignore-scripts=true`; CI uses
  `npm ci --ignore-scripts`). `npm audit signatures` verifies registry
  signatures in CI.
- CI on every change: the project guardrail script (bans network APIs, `eval`,
  cookies, `innerHTML`-style sinks, unreviewed `dangerouslySetInnerHTML` or
  storage use, and header drift between `_headers` and the three server
  configs), `npm audit` at high severity, CodeQL, OpenSSF Scorecard, Lighthouse
  (fails on any CSP regression), a bundle-size and new-chunk gate, and the
  unit tests (136 at this version).
- `master` is protected: changes go through pull requests and must pass the
  required CI checks. There is a single maintainer, so no second person
  approves changes.
- Builds deployed from GitHub carry SLSA build-provenance attestations.
  If Lakehead builds from source instead (as `DEPLOYMENT.md` describes), build
  from a tagged or reviewed commit on `master`.

## 8. Risks that remain

No web application can be "100% safe" for every kind of data, and this one
states its limits publicly on *How This Works*. Besides the open findings in
section 2, Lakehead should know:

1. **The device is the boundary.** Data never leaves the browser, so the risk is
   the risk of the computer it runs on: malware, browser extensions (which can
   read any page), operating-system swap or hibernation files, and the
   unencrypted downloads the tools produce. For Confidential data (PHIPA,
   OCAP®-governed, REB-restricted), use a university-managed device with
   full-disk encryption and a minimal set of extensions, as for any other
   desktop software.
2. **Tool semantics, not security bugs, are the likeliest way to be hurt.**
   These are all stated in each tool's "Before you use this tool" notice:
   - *Sign PDF* places a picture of a signature; it is not a cryptographic
     digital signature.
   - *De-identify Research Data* replaces the columns you select. It does not
     find quasi-identifiers (postal code + birth date + sex, rare diagnoses) and
     does not by itself make a dataset anonymous. The coded mode's key file must
     be stored separately (TCPS 2 Art. 5.5).
   - *Strip File Metadata* removes document metadata, XMP, attachments and
     thumbnails. Names printed on the pages are content; use *PDF Redaction*,
     which rasterises redacted pages and verifies no text survives.
   - PDF tools that rebuild documents drop form fields and signature boxes.
3. **Malicious files can still crash a tab.** A ZIP that under-declares its
   size, or a hostile PDF, can exhaust memory. Parsing happens in the browser's
   sandbox (pdf.js in a worker), so the expected worst case is a crashed tab,
   not data exposure; browser updates matter.
4. **Updates reload open pages.** When a new build is published, the service
   worker reloads any open copy of the site so nobody keeps running superseded
   code (this was added after a stale copy kept producing unencrypted PDFs).
   A researcher mid-task in another tab at that moment loses that in-memory work
   and has to start the task again. Publish updates outside peak hours.
5. **Not done:** an independent security assessment or penetration test;
   testing of the October audit's browser-dependent leads; manual
   screen-reader testing (automated WCAG 2.2 AA scans reported 0 violations on
   all 57 routes on 24 September, but automated tools find roughly a third of
   accessibility issues; AODA responsibility follows the Lakehead domain).

## 9. What the hosting team needs to do

Summarised from [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md). No hostname has been
assigned; `rdmtoolkit.lakeheadu.ca` is used there as an example.

1. Serve from the **root of a dedicated subdomain**, over HTTPS.
2. Build with `npm ci --ignore-scripts && npm run build:handoff` (Node 24) and
   publish the contents of `dist/`, including `.well-known/`. No GitHub
   integration is needed on the server: the build output is a folder of
   static files.
3. Apply **one** of `docs/hosting/apache.conf`, `nginx.conf` or `web.config`
   unchanged. Do not loosen the CSP or remove the Trusted Types directives.
4. Do not inject anything into responses (analytics, banners, WAF challenges).
5. Run the checks in `DEPLOYMENT.md` step 7: eight headers on `/` and on
   `/sw.js`, no console errors, no outbound requests while using a tool, offline
   mode working, security.txt pointing at the Lakehead hostname.
6. Agree who applies updates. Security fixes land on `master` promptly;
   `public/.well-known/security.txt` expires 2027-09-05 and needs renewing.
   Vulnerability reports go to `rdm.research@lakeheadu.ca` and GitHub private
   advisories (see `SECURITY.md`).

## 10. Evidence

Reproducible from the repository once pull request #143 is merged:

```bash
npm ci --ignore-scripts
npm run security:audit     # guardrails + header drift check
npm test                   # 136 tests, incl. PDF encryption verified by pdf.js
npm audit --omit=dev       # 0 vulnerabilities on 23 October 2026
npm audit signatures
npm run build:handoff
```

The October audit's full report, with a reproduction for each finding, is kept
outside the public repository because it describes findings that are not yet
fixed. It is available to Lakehead IT on request.

Measured on 28 September in Chrome (headless, real service worker) against the
handoff build, served with the exact headers from `public/_headers`:

| Check | Before the 28 Sep review | After |
|---|---|---|
| Service worker controls page | no | yes |
| Files in offline cache | 0 | 160 |
| PDF Redaction loads with network off | no | yes |
| Stale page reloaded after an update | no | yes, ~3 s after load, route kept |

Also checked that day in the browser on the production build with production
headers: crafted Storage Calculator link (injected text dropped, valid values
kept); Markdown Preview with `javascript:` link, `onerror` image and raw `<img>`
payloads (nothing executed, all stripped); PDF Page Inspector parsing a PDF
through the pdf.js worker; console shows only the expected notice that
`frame-ancestors` is ignored in the `<meta>` fallback.
