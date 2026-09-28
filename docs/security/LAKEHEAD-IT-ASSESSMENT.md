# RDM Toolkit — security assessment for Lakehead University IT

Prepared 2026-09-28 for hosting RDM Toolkit on a Lakehead subdomain
(`rdmtoolkit.lakeheadu.ca` is assumed throughout). Deployment steps are in
[`docs/DEPLOYMENT.md`](../DEPLOYMENT.md); this document explains what the site
does with data, which controls enforce that, what this review found and fixed,
and the risks that remain.

This is a review by the project's maintainers and their tooling, not an
independent penetration test. If Lakehead policy requires one for
Highly Confidential data, it has not been done.

---

## 1. What the site is

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
`?config=` link, which holds numbers and fixed labels (validated on load since
this review).

## 2. Controls that enforce "data never leaves the browser"

| Layer | Control |
|---|---|
| Browser policy | CSP `connect-src 'self'` blocks `fetch`, XHR, WebSocket, EventSource and beacons to any other origin, even from a compromised library. `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'` (no `unsafe-eval`, no inline script), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. |
| Script injection | Trusted Types enforced (`require-trusted-types-for 'script'`). The only HTML sinks accept DOMPurify output (v3.4.16, strict tag/attribute allowlists, no `style`, `javascript:`/`data:` URLs blocked). Raw-string HTML sinks throw. |
| Isolation | `X-Frame-Options: DENY` + `frame-ancestors 'none'` (clickjacking); `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`; the app also refuses to render inside a frame on hosts that send no headers. |
| Untrusted files | PDFs are parsed by pdf.js 6.3.289 in a Web Worker (the release that fixed GHSA-hq66-cqwq-w95j, script execution from a crafted PDF). ZIP extraction strips paths from entry names and refuses archives declaring more than 5 GB. |
| Transport | HSTS for this hostname; HTTPS is required anyway, because Web Crypto is only available in secure contexts. |
| Browser features | `Permissions-Policy` denies camera, microphone, geolocation, payment, USB, serial. |
| Offline cache | The service worker only serves files precached from the build (`runtimeCaching: []`); it never caches responses from elsewhere. |
| Local storage | `localStorage` holds recently used tool IDs, the welcome-tour flag and an opt-in usage log of tool IDs and error classes (never file names or content). A button on *How This Works* wipes it for shared computers. |

The headers above must be sent by the Lakehead server (configs for Apache,
nginx and IIS are in `docs/hosting/`). A `<meta>` CSP in `index.html` is a
fallback only: browsers ignore `frame-ancestors` there, and Web Workers get no
policy from it at all.

## 3. Cryptography

- **Encrypt/Decrypt Text:** AES-256-GCM through the browser's Web Crypto API,
  key from PBKDF2-SHA-256 with 600,000 iterations, random salt and IV per
  message. No custom cryptographic primitives.
- **Password Protect PDF:** AES-256 (PDF 2.0, revision 6) through
  `@cantoo/pdf-lib` 2.11.1. Before the download is offered, the tool re-opens
  its own output and refuses to hand it over unless it is rejected without a
  password and opens with the chosen one. Owner password is random when left
  blank, so permission flags are not void.
- **Password Generator:** `crypto.getRandomValues()` with rejection sampling
  (no modulo bias).
- **SHA-256 / checksums:** Web Crypto.

**Historical defect, disclosed:** until 2026-09-25, Password Protect PDF produced
files that were **not encrypted**, although it reported success (the library
version in use ignored the password option). This is fixed and covered by tests
that check the output with two independent PDF readers. Anyone at Lakehead who
used the tool on rdmtoolkit.ca before that date should treat those files as
unprotected.

## 4. Supply chain and change control

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
  (fails on any CSP regression), a bundle-size and new-chunk gate, and 57 unit
  tests.
- Builds deployed from GitHub carry SLSA build-provenance attestations.
  If Lakehead builds from source instead (as `DEPLOYMENT.md` describes), build
  from a tagged or reviewed commit on `master`.

## 5. What this review found (2026-09-28)

Starting point: commit `4de6247` on `master`. All automated checks passed at the
start (0 known vulnerabilities in 474 packages, guardrails clean, 52/52 tests).

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **Offline mode silently disabled on any server that sends the security headers**, which is exactly the Lakehead configuration. The Trusted Types CSP also governs the service worker, which blocked its `importScripts()` calls: the worker registered but cached nothing (0 of ~160 files, measured in Chrome). The same failure would have stopped deploy-time updates from reloading stale pages. | High (availability; no data exposure) | **Fixed.** The build now adds a same-origin-only Trusted Types policy to `sw.js`. Re-measured under the full production headers: 160 files cached, site and tools load with the network off, update reload works. |
| 2 | **Content injection through the Storage Calculator's shared link.** The `?config=` payload was loaded without validation, and two fields are copied verbatim into the Data Management Plan text researchers paste into grant applications. React escaped it (no script execution), but a crafted link could insert arbitrary sentences. | Low | **Fixed.** Every field is now checked against what the calculator can produce (known IDs, bounded numbers, existing labels); anything else is dropped. 5 tests. Also: the shared link now opens the calculator instead of the home page, and restores the backup-strategy selection. |
| 3 | No `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`. | Low (hardening) | **Added** to `_headers`, all three server configs and `vite preview`. |
| 4 | Header values in `docs/hosting/` could drift from `public/_headers` unnoticed. | Low (process) | **Fixed.** `npm run security:audit` now fails on any mismatch. |
| 5 | DOMPurify 3.4.14 behind 3.4.16 (sanitizer hardening releases; no published advisory). | Informational | **Updated.** Sanitizer re-tested in the browser with script, `javascript:` and `onerror` payloads under the production CSP. |
| 6 | Handoff build left `rdmtoolkit.ca` in `robots.txt` and `sitemap.xml`; the framed-page notice named `rdmtoolkit.ca` on any host. | Informational | **Fixed.** |
| 7 | The Markdown Preview's "technical details for IT reviewers" described a DOMPurify configuration and version the code does not use. | Informational | **Corrected** to match the code. |

Areas reviewed with no issue found: all `dangerouslySetInnerHTML` sinks and
their DOMPurify configurations; hash routing (routes are looked up in a fixed
registry, never rendered); `blob:` URLs (used only for downloads and `<img>`
previews, never opened as documents); download file names; the Trusted Types
default policy; `localStorage` contents; the frame-busting fallback; ZIP path
handling; the service-worker update script; security.txt and the handoff build.

## 6. Risks that remain

No web application can be "100% safe" for every kind of data, and this one
states its limits publicly on *How This Works*. What Lakehead should know:

1. **The device is the boundary.** Data never leaves the browser, so the risk is
   the risk of the computer it runs on: malware, browser extensions (which can
   read any page), operating-system swap or hibernation files, and the
   unencrypted downloads the tools produce. For Highly Confidential data
   (PHIPA, OCAP®-governed, REB-restricted), use a university-managed device with
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
5. **Not yet done:** an independent penetration test; manual screen-reader
   testing (automated WCAG 2.2 AA scans report 0 violations on all 57 routes,
   but automated tools find roughly a third of accessibility issues; AODA
   responsibility follows the Lakehead domain).

## 7. What Lakehead IT needs to do

Summarised from [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md):

1. Serve from the **root of a dedicated subdomain**, over HTTPS.
2. Build with `npm ci --ignore-scripts && npm run build:handoff` (Node 24) and
   publish the contents of `dist/`, including `.well-known/`.
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

## 8. Evidence

Reproducible from the repository:

```bash
npm ci --ignore-scripts
npm run security:audit     # guardrails + header drift check
npm test                   # 57 tests, incl. PDF encryption verified by pdf.js
npm audit --omit=dev       # 0 vulnerabilities at time of writing
npm audit signatures
npm run build:handoff
```

Measured in Chrome (headless, real service worker) against the handoff build,
served with the exact headers from `public/_headers`:

| Check | Before this review | After |
|---|---|---|
| Service worker controls page | no | yes |
| Files in offline cache | 0 | 160 |
| PDF Redaction loads with network off | no | yes |
| Stale page reloaded after an update | no | yes, ~3 s after load, route kept |

Also checked in the browser on the production build with production headers:
crafted Storage Calculator link (injected text dropped, valid values kept);
Markdown Preview with `javascript:` link, `onerror` image and raw `<img>`
payloads (nothing executed, all stripped); PDF Page Inspector parsing a PDF
through the pdf.js worker; console shows only the expected notice that
`frame-ancestors` is ignored in the `<meta>` fallback.
