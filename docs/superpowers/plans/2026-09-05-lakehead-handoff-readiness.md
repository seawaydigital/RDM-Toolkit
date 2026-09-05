# Lakehead Handoff Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring RDM Toolkit to a state where the repository and a built `dist/` can be handed to the Lakehead University Web Development team to host at `rdmtoolkit.lakeheadu.ca` without follow-up questions.

**Architecture:** Twelve independent tasks in four groups — legal/metadata, the one broken tool, host portability (domain artifacts + server configs + a deployment doc written for humans), and pre-handoff polish (accessibility statement, screen-reader pass, SEO/social, hygiene). Nothing here changes the app's architecture: it stays a 100% client-side static SPA with hash routing, served from a domain root with `base: '/'` unchanged.

**Tech Stack:** React 18, Vite 8 (Rolldown), Node 24, DOMPurify, Turndown, `node --test`, axe-core, NVDA.

---

## Decisions already made

These were settled before planning. Do not re-litigate them mid-execution.

| Decision | Value | Consequence |
|---|---|---|
| **License** | MIT, © 2026 Lakehead University | Task 1 writes the MIT text with Lakehead as copyright holder. |
| **Hosting target** | `rdmtoolkit.lakeheadu.ca` — dedicated subdomain, served from the **domain root** | `base: '/'`, PWA `scope`/`start_url` stay `'/'`. **No Vite path changes anywhere in this plan.** |
| **AODA scope** | Accessibility statement page + manual NVDA pass on the top 5 tools | Tasks 7–8. AODA Phases 2–5 stay documented follow-up work, explicitly scoped out. |

**Critical constraint:** `rdmtoolkit.ca` (GitHub Pages) stays live throughout. The default `npm run build` must keep producing a working rdmtoolkit.ca deploy. Everything host-specific is applied by a separate post-build script (Task 4), never by editing the default build.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `LICENSE` | MIT license text, © Lakehead University. |
| `scripts/build-handoff.mjs` | Post-build rewriter. Takes `--domain`, drops the GitHub Pages `CNAME`, repoints `security.txt` `Canonical:`, rewrites absolute `og:url`/`og:image`. Never runs during a normal build. |
| `docs/DEPLOYMENT.md` | The single document the Lakehead team reads. Build, publish, headers, MIME types, SW caveats. |
| `docs/hosting/apache.conf` | Header block for Apache (`.htaccess`-compatible). |
| `docs/hosting/nginx.conf` | Header block for nginx `server`/`location`. |
| `docs/hosting/web.config` | Header block for IIS. |
| `src/components/pages/AccessibilityStatement.jsx` | Public AODA accessibility statement at `#accessibility`. |
| `docs/accessibility/nvda-manual-pass-2026-09-05.md` | Findings from the manual screen-reader pass. |
| `public/robots.txt` | Crawler directives + sitemap pointer. |
| `public/sitemap.xml` | Single-URL sitemap (hash routes are not separate URLs — see Task 9). |

**Modified:**

| Path | Change |
|---|---|
| `package.json` | Real `name`/`description`/`license`/`author`/`repository`; new `build:handoff` script. |
| `src/tools/text/FileToMarkdown.jsx` | Route HTML through DOMPurify to a DOM node before Turndown (the production TrustedHTML bug). |
| `scripts/security-audit.mjs` | New guardrail banning raw-string HTML parser sinks in `src/`. |
| `public/.well-known/security.txt` | Lakehead security contact. |
| `src/data/institutionConfig.js` | New `PROJECT` export holding repo, source and sister-site URLs. |
| `src/components/ui/HowItWorks.jsx` | `GITHUB_BASE` moved to `institutionConfig.js`. |
| `src/components/home/HomePage.jsx` | Use `PROJECT.repoUrl` instead of a hardcoded GitHub URL. |
| `src/components/pages/HowThisWorks.jsx` | Use `PROJECT.rsCybersecurityGuideUrl`. |
| `src/App.jsx` | Register the `accessibility` page (PAGES, PAGE_TITLES, import, render). |
| `src/components/layout/Sidebar.jsx` | Use `PROJECT.rsToolkitUrl`; add the accessibility statement link. |
| `src/styles/global.css` | `.acc-*` styles for the statement page. |
| `index.html` | Open Graph + Twitter card + canonical meta. |
| `src/tools/pdf/MergePDFs.jsx` | Fix the form-field badge race. |
| `CLAUDE.md`, `docs/HANDOFF.md` | Correct two stale audit claims. |

---

## Group 1 — Legal and metadata

### Task 1: LICENSE and package.json identity

The single most likely thing to stall the handoff. `package.json` currently reads `"name": "scrubbed"` with no `license`, `author`, `description`, or `repository`.

**Files:**
- Create: `LICENSE`
- Modify: `package.json`

- [ ] **Step 1: Create the LICENSE file**

Create `LICENSE` with exactly this content:

```
MIT License

Copyright (c) 2026 Lakehead University

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Fix the package.json identity fields**

In `package.json`, replace the opening fields. The current top of the file is:

```json
{
  "name": "scrubbed",
  "private": true,
  "version": "1.0.0",
  "type": "module",
```

Replace with:

```json
{
  "name": "rdm-toolkit",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "A privacy-first toolkit of 46 browser-based research data management utilities. All processing happens locally in the browser; no file is ever uploaded.",
  "license": "MIT",
  "author": "Andrew Austin",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/seawaydigital/RDM-Toolkit.git"
  },
  "homepage": "https://rdmtoolkit.ca/",
```

Leave every other field (`scripts`, `dependencies`, `devDependencies`, `overrides`) exactly as it is.

- [ ] **Step 3: Verify nothing depended on the old package name**

```bash
npm run security:audit
```

Expected: `Security audit passed for 46 registered tools.`

```bash
npm test
```

Expected: `# pass 16` and `# fail 0`.

- [ ] **Step 4: Commit**

```bash
git add LICENSE package.json
git commit -m "chore: add MIT license and real package metadata

Copyright assigned to Lakehead University per handoff decision. Replaces
the placeholder package name 'scrubbed' and fills in description, license,
author, repository and homepage so the manifest is meaningful to a
receiving institution.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Group 2 — The broken tool

### Task 2: Fix File to Markdown under Trusted Types

**The bug, precisely.** In the production build the CSP enforces `require-trusted-types-for 'script'`, and the default policy in `src/main.jsx` deliberately exposes only `createScriptURL` — no `createHTML`. Turndown, given a **string**, first feature-tests `new DOMParser().parseFromString('', 'text/html')` (`node_modules/turndown/lib/turndown.cjs.js:451`), and on failure falls back to `document.write` — both are TrustedHTML sinks, so both throw. That is exactly the two console errors observed on `#to-markdown` in `vite preview`.

**The fix.** `RootNode` at `turndown.cjs.js:477` only invokes the parser when `typeof input === 'string'`; anything else takes `input.cloneNode(true)`. DOMPurify maintains its own `dompurify` Trusted Types policy (already allowlisted by `trusted-types dompurify default` in the CSP), so sanitizing with `RETURN_DOM: true` produces a node through a legitimate policy. Hand Turndown the node and no sink is ever touched.

This also hardens the tool: `.html` files are arbitrary untrusted input, and until now the conversion path never sanitized them.

**Files:**
- Modify: `src/tools/text/FileToMarkdown.jsx:18` (add helper below the Turndown instance) and the four `td.turndown(...)` call sites at lines 222, 226, 273, 283

- [ ] **Step 1: Reproduce the failure first**

```bash
npm run build
npm run preview
```

In a browser, open `http://localhost:4173/#to-markdown` and open DevTools → Console.

Expected (this is the red state — confirm it before fixing):
```
This document requires 'TrustedHTML' assignment and no 'default' policy for 'TrustedHTML' has been defined. The action has been blocked.
This document requires 'TrustedHTML' assignment and no 'default' policy for 'TrustedHTML' has been defined. The action has been blocked.
```

Leave `vite preview` running for Step 4.

- [ ] **Step 2: Add the sanitizing helper**

In `src/tools/text/FileToMarkdown.jsx`, find this block near the top of the file:

```js
// Turndown instance — created once outside component
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
td.use(gfm);
```

Insert immediately after it:

```js
// Turndown must never be handed a raw HTML string. Given a string it parses
// via DOMParser.parseFromString and then document.write — both TrustedHTML
// sinks — and the production CSP enforces require-trusted-types-for 'script'
// with a default policy that deliberately has no createHTML, so both throw and
// conversion dies. Given a *node* (turndown.cjs.js:477) it just clones and
// walks it, touching no sink at all.
//
// DOMPurify owns a 'dompurify' Trusted Types policy that the CSP allowlists, so
// routing the string through it with RETURN_DOM gives us that node legitimately
// — and sanitizes the untrusted .html files this tool accepts on the way.
// Block-level containers matter as much as the semantic tags. DOMPurify strips
// a disallowed tag but keeps its children inline, whereas Turndown treats
// div/section/article as block-level and separates them. Omit them and a
// Word or Google Docs HTML export — div-per-paragraph, the most common .html
// a researcher will feed this tool — converts to one concatenated wall of text.
const TURNDOWN_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
  'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'b', 'i', 'u', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li', 'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'div', 'span', 'section', 'article', 'header', 'footer', 'aside',
  'figure', 'figcaption', 'main', 'nav',
];

function htmlToMarkdown(html) {
  const node = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TURNDOWN_ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: true,
    // Block javascript: and data: URIs — matches MarkdownPreview.jsx:192.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
  return td.turndown(node);
}
```

- [ ] **Step 3: Replace all four call sites**

There are exactly four `td.turndown(` calls in `convertFile()`. Replace each with `htmlToMarkdown(`:

In the `txt` branch:
```js
    const html = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    md = htmlToMarkdown(html);
```

In the `html`/`htm` branch:
```js
    const text = await readFileAs(file, 'text');
    md = htmlToMarkdown(text);
```

In the `pdf` branch (the line after the page loop, following `if (i < pdfDoc.numPages) html += '<hr>';`):
```js
    md = htmlToMarkdown(html);
```

In the `rtf` branch:
```js
    const html = plain.split('\n\n').map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    md = htmlToMarkdown(html);
```

Confirm none remain:

```bash
grep -n "td.turndown(" src/tools/text/FileToMarkdown.jsx
```

Expected: only the single call inside `htmlToMarkdown`.

- [ ] **Step 4: Verify green in the production build**

```bash
npm run build
npm run preview
```

Create a test file first:

```bash
printf '<h1>Interview notes</h1><p>Participant <strong>A-01</strong> said:</p><blockquote>It went well.</blockquote><table><tr><th>Code</th><th>Count</th></tr><tr><td>trust</td><td>4</td></tr></table>' > /tmp/ftm-test.html
```

In a browser at `http://localhost:4173/#to-markdown`:
1. Console must show **zero** TrustedHTML errors on load.
2. Upload `/tmp/ftm-test.html`.
3. Expected Markdown output contains `# Interview notes`, `**A-01**`, `> It went well.`, and a GFM table with `| Code | Count |`.
4. Console still shows zero TrustedHTML errors after conversion.

Also convert a `.txt` and a `.pdf` file and confirm both produce Markdown with no console errors.

- [ ] **Step 5: Record the known residual**

Two `TrustedHTML` console errors remain on route load after this fix, and that is expected. They are **not** the bug being fixed here and no correct implementation of this task removes them.

Cause, traced during implementation: Turndown runs `canParseHTMLNatively()` at module-evaluation time (`turndown.cjs.js:451`), which calls `new DOMParser().parseFromString('', 'text/html')` the moment the lazy chunk imports the module — before any of the four call sites run, and regardless of whether Turndown is ever handed a string. It is wrapped in `try/catch`, so it does not throw; the browser logs the blocked action anyway. It is reported twice because `vite preview` delivers `require-trusted-types-for 'script'` through both the real HTTP header and the `<meta>` CSP, and each enforcing delivery mechanism logs the violation separately.

This is non-functional noise: caught internally, never surfaced to the user, and it no longer leads anywhere near `document.write` because Turndown is never handed a string at runtime.

**Judge this fix by:** conversion succeeding with no error card, and the console error count being *unchanged* after converting a file. Not by the count being zero. Removing the residual would require patching or deferring the Turndown import, or resolving the header/meta CSP duplication site-wide — both outside this task, and neither worth doing for a caught, invisible log line.

Task 12 records this in `CLAUDE.md` so it is not rediscovered and misread as "File to Markdown is still broken."

- [ ] **Step 6: Commit**

```bash
git add src/tools/text/FileToMarkdown.jsx
git commit -m "fix(to-markdown): stop Turndown hitting TrustedHTML sinks

File to Markdown has been broken in every production build since the
2026-06-11 Trusted Types hardening. Turndown given a string parses via
DOMParser.parseFromString and falls back to document.write; both are
TrustedHTML sinks and the default policy has no createHTML by design, so
conversion threw on load and on every file.

Route the HTML through DOMPurify with RETURN_DOM first — DOMPurify's own
'dompurify' TT policy is already allowlisted in the CSP — and hand Turndown
the node, which it clones and walks without touching a sink. Also sanitizes
the untrusted .html input this tool accepts, which the conversion path
never did.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Guardrail against reintroducing raw HTML parser sinks

Task 2 fixed one instance. This stops the next one shipping. Follows the existing `scripts/security-audit.mjs` pattern (which already bans `.innerHTML`, `eval`, `document.cookie`, and friends in `src/`).

**Files:**
- Modify: `scripts/security-audit.mjs`

- [ ] **Step 1: Find the existing source-scan rules**

```bash
grep -n "innerHTML\|outerHTML\|insertAdjacentHTML" scripts/security-audit.mjs
```

Note the surrounding structure — the new rule must match it (same `fail()` helper, same per-file scan loop).

- [ ] **Step 2: Add the rule**

The script scans source with a `lineReports(file, pattern, label, allowFile?)` helper (defined at `scripts/security-audit.mjs:33`) called from a `for (const file of sourceFiles)` loop. Match that style exactly.

Add these two calls immediately after the existing `'raw HTML mutation'` line in that loop:

```js
  // Both are TrustedHTML sinks. Under the production CSP
  // (require-trusted-types-for 'script') they throw, and the default policy in
  // main.jsx has no createHTML by design — so they work in dev and fail only in
  // the production build, which is exactly how the File to Markdown breakage
  // shipped. Turning an HTML string into nodes must go through DOMPurify with
  // RETURN_DOM, whose 'dompurify' policy the CSP allowlists. See
  // htmlToMarkdown in src/tools/text/FileToMarkdown.jsx.
  lineReports(file, /\bnew\s+DOMParser\s*\(/, 'TrustedHTML sink (new DOMParser — use DOMPurify RETURN_DOM instead)');
  lineReports(file, /\bdocument\s*\.\s*write\s*\(/, 'TrustedHTML sink (document.write — use DOMPurify RETURN_DOM instead)');
```

Note the scan covers `src/components`, `src/hooks`, `src/tools` and `src/utils` (see the `sourceFiles` definition around line 208) — not `src/main.jsx`. That is fine: the rule targets tool and component code, and `main.jsx` legitimately handles Trusted Types policy setup.

- [ ] **Step 3: Verify the rule passes on the fixed tree (green)**

```bash
npm run security:audit
```

Expected: `Security audit passed for 46 registered tools.`

- [ ] **Step 4: Verify the rule actually fires (red)**

Temporarily add this line to the top of `src/tools/text/FileToMarkdown.jsx`:

```js
const __guardrail_probe = new DOMParser();
```

```bash
npm run security:audit
```

Expected: **exit code 1**, with the message `new DOMParser() is a TrustedHTML sink...` naming `FileToMarkdown.jsx`.

Now remove that probe line and re-run:

```bash
npm run security:audit
```

Expected: `Security audit passed for 46 registered tools.`

- [ ] **Step 5: Commit**

```bash
git add scripts/security-audit.mjs
git commit -m "test(security-audit): ban raw HTML parser sinks in src/

Guards the class of bug fixed in the previous commit. new DOMParser() and
document.write are TrustedHTML sinks that throw under the production CSP but
work fine in dev, so they ship silently. Verified the rule fires by
reintroducing a probe and confirming a non-zero exit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Group 3 — Host portability

### Task 4: Domain artifacts and the handoff build script

Three things are pinned to `rdmtoolkit.ca` and would be wrong at `rdmtoolkit.lakeheadu.ca`: `public/CNAME` (a GitHub Pages binding — inert on their server, but it hijacks the domain if they ever deploy via Pages), `security.txt`'s `Canonical:` (RFC 9116 invalidates the file on mismatch) and its contacts, and the `og:` URLs added in Task 9.

`rdmtoolkit.ca` must keep working, so the default build stays untouched and a post-build script rewrites a copy for the new host.

**Files:**
- Create: `scripts/build-handoff.mjs`
- Modify: `package.json` (one new script), `public/.well-known/security.txt`

- [ ] **Step 1: Update the security contact**

Replace the whole of `public/.well-known/security.txt` with:

```
Contact: mailto:rdm.research@lakeheadu.ca
Contact: https://github.com/seawaydigital/RDM-Toolkit/security/advisories/new
Expires: 2027-09-05T00:00:00.000Z
Preferred-Languages: en, fr
Canonical: https://rdmtoolkit.ca/.well-known/security.txt
Policy: https://github.com/seawaydigital/RDM-Toolkit/blob/master/SECURITY.md
```

The Lakehead RDM mailbox leads because after handoff they own triage. The `Canonical:` still names rdmtoolkit.ca because that is where the default build is served — Step 2's script rewrites it for the Lakehead build.

- [ ] **Step 2: Write the handoff build script**

Create `scripts/build-handoff.mjs`:

```js
#!/usr/bin/env node
// Rewrites an existing dist/ for a host other than rdmtoolkit.ca.
//
// `npm run build` always produces a dist/ for the current GitHub Pages deploy.
// This script adapts a copy of that output for a different domain:
//   1. deletes CNAME  — a GitHub Pages domain binding. Inert on a normal web
//      server, but it would hijack the domain if the receiving team ever
//      deployed the folder to GitHub Pages.
//   2. rewrites security.txt's Canonical: — RFC 9116 says a security.txt whose
//      Canonical does not match its own URL should not be trusted.
//   3. rewrites the absolute og:url / og:image meta URLs in index.html.
//
// Usage: node scripts/build-handoff.mjs --domain rdmtoolkit.lakeheadu.ca

import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const domainFlag = args.indexOf('--domain');
if (domainFlag === -1 || !args[domainFlag + 1]) {
  console.error('Usage: node scripts/build-handoff.mjs --domain <hostname>');
  process.exit(1);
}

const domain = args[domainFlag + 1];
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
  console.error(`Not a valid hostname: ${domain}`);
  process.exit(1);
}

const distDir = resolve(process.cwd(), 'dist');
if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const origin = `https://${domain}`;
const changes = [];

// 1. Drop the GitHub Pages CNAME.
const cnamePath = resolve(distDir, 'CNAME');
if (existsSync(cnamePath)) {
  rmSync(cnamePath);
  changes.push('removed CNAME');
}

// 2. Repoint security.txt Canonical.
const securityPath = resolve(distDir, '.well-known', 'security.txt');
if (existsSync(securityPath)) {
  const before = readFileSync(securityPath, 'utf8');
  const after = before.replace(
    /^Canonical: https:\/\/[^/]+\/\.well-known\/security\.txt$/m,
    `Canonical: ${origin}/.well-known/security.txt`,
  );
  if (before !== after) {
    writeFileSync(securityPath, after);
    changes.push('rewrote security.txt Canonical');
  }
}

// 3. Repoint absolute social-meta URLs.
const indexPath = resolve(distDir, 'index.html');
if (existsSync(indexPath)) {
  const before = readFileSync(indexPath, 'utf8');
  const after = before.replace(/https:\/\/rdmtoolkit\.ca/g, origin);
  if (before !== after) {
    writeFileSync(indexPath, after);
    changes.push('rewrote absolute meta URLs in index.html');
  }
}

if (changes.length === 0) {
  console.log(`No changes needed for ${domain}.`);
} else {
  console.log(`dist/ prepared for ${origin}:`);
  for (const change of changes) console.log(`  - ${change}`);
}
```

- [ ] **Step 3: Add the npm script**

In `package.json`, add to `"scripts"` immediately after the `"build"` entry:

```json
    "build:handoff": "vite build && node scripts/build-handoff.mjs --domain rdmtoolkit.lakeheadu.ca",
```

- [ ] **Step 4: Verify both builds**

```bash
npm run build
ls dist/CNAME && grep Canonical dist/.well-known/security.txt
```

Expected: `dist/CNAME` exists; `Canonical: https://rdmtoolkit.ca/.well-known/security.txt`.

```bash
npm run build:handoff
```

Expected output includes `removed CNAME` and `rewrote security.txt Canonical`.

```bash
ls dist/CNAME 2>&1; grep Canonical dist/.well-known/security.txt
```

Expected: `ls: cannot access 'dist/CNAME': No such file or directory`, and `Canonical: https://rdmtoolkit.lakeheadu.ca/.well-known/security.txt`.

Restore the normal build so nothing downstream sees a handoff dist:

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build-handoff.mjs package.json public/.well-known/security.txt
git commit -m "build: add build:handoff for a non-rdmtoolkit.ca host

The default build stays pinned to rdmtoolkit.ca so GitHub Pages keeps
working. build:handoff adapts the output for the Lakehead subdomain:
drops the Pages CNAME, repoints security.txt Canonical (RFC 9116 requires
it to match the serving URL), and rewrites absolute social-meta URLs.
security.txt contacts now lead with the Lakehead RDM mailbox.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Server header configurations

`public/_headers` is Cloudflare/Netlify syntax. Nothing else reads it. It carries the CSP that actually matters — `frame-ancestors 'none'` and Trusted Types enforcement **cannot** be delivered by `<meta>` (the browser says so out loud in the console), so on a server with no equivalent config the site silently loses its strongest protections.

Source of truth for the directive values: `public/_headers`. Copy them exactly; do not retype from memory.

**Files:**
- Create: `docs/hosting/apache.conf`, `docs/hosting/nginx.conf`, `docs/hosting/web.config`

- [ ] **Step 1: Re-read the canonical header values**

```bash
cat public/_headers
```

Every config below must reproduce these six headers byte-for-byte in their values.

- [ ] **Step 2: Create the Apache config**

Create `docs/hosting/apache.conf`:

```apache
# RDM Toolkit — security headers for Apache 2.4+
#
# Drop into the site's <VirtualHost>, or rename to .htaccess in the document
# root if AllowOverride FileInfo is enabled.
#
# Requires: a2enmod headers
#
# These are not optional hardening. The app enforces Trusted Types and blocks
# framing through this CSP; the <meta> fallback in index.html cannot deliver
# frame-ancestors or Trusted Types at all.

<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; trusted-types dompurify default; require-trusted-types-for 'script'; upgrade-insecure-requests"
    Header always set Strict-Transport-Security "max-age=31536000"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()"
    Header always set X-Frame-Options "DENY"
</IfModule>

# The service worker must never be served stale, or users get pinned to an old
# build. Hashed assets under /assets/ are immutable and safe to cache forever.
<IfModule mod_headers.c>
    <FilesMatch "^(sw\.js|registerSW\.js)$">
        Header always set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>
    <FilesMatch "\.(js|mjs|css|woff2)$">
        <If "%{REQUEST_URI} =~ m#^/assets/#">
            Header always set Cache-Control "public, max-age=31536000, immutable"
        </If>
    </FilesMatch>
</IfModule>

# .mjs and .webmanifest are commonly missing from default MIME maps. A .mjs
# served as text/plain breaks the pdfjs worker and every lazy-loaded tool.
<IfModule mod_mime.c>
    AddType application/javascript .mjs
    AddType application/manifest+json .webmanifest
</IfModule>
```

- [ ] **Step 3: Create the nginx config**

Create `docs/hosting/nginx.conf`:

```nginx
# RDM Toolkit — security headers for nginx
#
# Include inside the site's server { } block.
#
# These are not optional hardening. The app enforces Trusted Types and blocks
# framing through this CSP; the <meta> fallback in index.html cannot deliver
# frame-ancestors or Trusted Types at all.
#
# Note: add_header directives do not inherit into a location { } block that
# declares its own add_header. If you add headers in a location, repeat all
# six there.

add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; trusted-types dompurify default; require-trusted-types-for 'script'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()" always;
add_header X-Frame-Options "DENY" always;

# .mjs is missing from nginx's default mime.types on most builds. Served as
# the wrong type it breaks the pdfjs worker and every lazy-loaded tool.
types {
    application/javascript    mjs;
    application/manifest+json webmanifest;
}

# Never serve a stale service worker — it pins users to an old build.
location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

# Hashed asset filenames are immutable.
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

- [ ] **Step 4: Create the IIS config**

Create `docs/hosting/web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  RDM Toolkit - security headers for IIS 7+

  Place in the site root. If the site already has a web.config, merge the
  <customHeaders> and <staticContent> entries into it rather than replacing it.

  These are not optional hardening. The app enforces Trusted Types and blocks
  framing through this CSP; the <meta> fallback in index.html cannot deliver
  frame-ancestors or Trusted Types at all.
-->
<configuration>
  <system.webServer>
    <httpProtocol>
      <customHeaders>
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; trusted-types dompurify default; require-trusted-types-for 'script'; upgrade-insecure-requests" />
        <add name="Strict-Transport-Security" value="max-age=31536000" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
        <add name="Permissions-Policy" value="camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()" />
        <add name="X-Frame-Options" value="DENY" />
      </customHeaders>
    </httpProtocol>

    <!-- IIS returns 404 for unmapped extensions. Without these, every lazy
         tool chunk and the PWA manifest fail to load. -->
    <staticContent>
      <remove fileExtension=".mjs" />
      <mimeMap fileExtension=".mjs" mimeType="application/javascript" />
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

Verify it is well-formed XML:

```bash
node -e "
const {readFileSync}=require('fs');
const s=readFileSync('docs/hosting/web.config','utf8');
const open=(s.match(/<[a-zA-Z]/g)||[]).length;
const close=(s.match(/<\//g)||[]).length + (s.match(/\/>/g)||[]).length;
if (open !== close) { console.error('unbalanced tags: '+open+' open vs '+close+' closed'); process.exit(1); }
console.log('web.config well-formed');
"
```

Expected: `web.config well-formed`

- [ ] **Step 5: Verify the CSP values match the source of truth**

```bash
node -e "
const {readFileSync}=require('fs');
const headers=readFileSync('public/_headers','utf8');
const csp=headers.match(/Content-Security-Policy: (.+)/)[1].trim();
for (const f of ['docs/hosting/apache.conf','docs/hosting/nginx.conf','docs/hosting/web.config']) {
  const body=readFileSync(f,'utf8');
  if (!body.includes(csp)) { console.error('CSP MISMATCH in '+f); process.exit(1); }
}
console.log('CSP identical across all three host configs');
"
```

Expected: `CSP identical across all three host configs`

- [ ] **Step 6: Commit**

```bash
git add docs/hosting/
git commit -m "docs(hosting): add Apache, nginx and IIS header configs

public/_headers is Cloudflare/Netlify-only syntax, so on any other server
the site loses frame-ancestors and Trusted Types enforcement silently --
neither can be delivered via <meta>. Ship the equivalent for the three
servers an institutional web team is likely to run, plus the .mjs and
.webmanifest MIME mappings that are missing from common defaults and the
service-worker cache rules.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: DEPLOYMENT.md for the receiving team

`docs/HANDOFF.md` is written for the next AI session. This is the document a human web team actually reads.

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Write the deployment guide**

Create `docs/DEPLOYMENT.md`:

````markdown
# Deploying RDM Toolkit

For the team hosting this site. It is a **static site** — no server runtime, no
database, no API, no environment secrets. Build it once and serve the output
folder.

## What you are serving

A single-page app that does all its work in the visitor's browser. No file a
researcher opens is ever transmitted anywhere; that guarantee is the product,
and the CSP in step 4 is part of how it is enforced.

## 1. Build

Requires **Node 24** (see `.nvmrc`).

```bash
npm ci --ignore-scripts
npm run build:handoff
```

`--ignore-scripts` is deliberate — `.npmrc` blocks install hooks as a
supply-chain precaution. Do not remove it.

Output lands in `dist/`. That folder is the entire website.

`build:handoff` is `build` plus a rewrite for the `rdmtoolkit.lakeheadu.ca`
domain. To target a different hostname:

```bash
npm run build
node scripts/build-handoff.mjs --domain your-hostname.lakeheadu.ca
```

## 2. Publish

Copy the **contents** of `dist/` to the document root. Include the dotfile
directory `.well-known/` — some copy tools skip dotfiles by default.

```bash
rsync -av --delete dist/ user@server:/var/www/rdmtoolkit/
```

## 3. Routing — nothing to configure

Routing is hash-based (`/#merge-pdfs`, `/#how-this-works`). The server only
ever sees a request for `/`. **You do not need an SPA rewrite or try_files
fallback.** Any path other than `/` and the real asset files is a 404, and
that is correct.

## 4. Headers — required

Ready-made configs are in `docs/hosting/`:

| Server | File |
|---|---|
| Apache 2.4+ | `docs/hosting/apache.conf` |
| nginx | `docs/hosting/nginx.conf` |
| IIS 7+ | `docs/hosting/web.config` |

These are not cosmetic. The Content-Security-Policy enforces Trusted Types and
blocks the site being framed. There is a fallback `<meta>` CSP in the HTML, but
browsers **ignore** `frame-ancestors` and Trusted Types in meta tags — without
a real header the site loses both.

`public/_headers` in the repo is Cloudflare/Netlify syntax and is ignored by
every other server. It is the source of truth for the values, not a config you
can use directly.

### MIME types

The configs set these because they are missing from common defaults:

| Extension | Type | Breaks if wrong |
|---|---|---|
| `.mjs` | `application/javascript` | The PDF worker and every lazily-loaded tool |
| `.webmanifest` | `application/manifest+json` | Install-as-app support |
| `.woff2` | `font/woff2` | Typography falls back to system fonts |

## 5. HTTPS

Required. The app uses the Web Crypto API (`crypto.subtle`), which browsers
expose only in secure contexts. Over plain HTTP the encryption, hashing and
password-generator tools fail outright.

## 6. Service worker and caching

The site registers a service worker that pre-caches ~162 assets so all 46 tools
work offline after the first visit.

Two caching rules matter, and the provided configs already set them:

- **`/sw.js` must never be cached** (`no-cache, no-store, must-revalidate`).
  A cached service worker pins visitors to an old build indefinitely.
- **`/assets/*` can be cached forever** (`max-age=31536000, immutable`) — those
  filenames contain a content hash and change whenever the content does.

After deploying an update, visitors get the new version on their next page
load; the worker is configured with `skipWaiting` and `clientsClaim`.

## 7. Verifying the deploy

```bash
curl -sI https://rdmtoolkit.lakeheadu.ca/ | grep -i -E 'content-security-policy|strict-transport|x-frame-options|x-content-type|referrer-policy|permissions-policy'
```

Expected: all six headers present.

Then in a browser:

1. Open the site. DevTools → Console must show **no errors**.
2. DevTools → Network, then use any tool with a file. The request list must
   show **no outbound request carrying file data**. This is the core privacy
   claim and it is worth confirming yourself.
3. Turn off Wi-Fi, reload, and confirm the site still loads and tools work.
4. `https://rdmtoolkit.lakeheadu.ca/.well-known/security.txt` resolves and its
   `Canonical:` line matches that URL.

## 8. Updating later

```bash
git pull
npm ci --ignore-scripts
npm run build:handoff
# republish dist/
```

The repository runs its own checks on every change — a security guardrail
script covering all 46 tools, dependency audits, CodeQL, Lighthouse and a
bundle-size gate. `npm run security:audit` and `npm test` can be run locally
at any time.

## Known limitations at handoff

- **Accessibility:** automated axe-core testing reports zero WCAG 2.2 AA
  violations across 10 representative routes, and a manual NVDA pass covers the
  five most-used tools. Phases 2–5 of the internal AODA plan (shared ARIA
  primitives, a sweep across all 46 tools) are documented but not complete. See
  `docs/accessibility/` and the public statement at `/#accessibility`.
- **Browser support:** see `docs/BROWSER-SUPPORT.md`.
````

- [ ] **Step 2: Verify every referenced path exists**

```bash
for f in docs/hosting/apache.conf docs/hosting/nginx.conf docs/hosting/web.config scripts/build-handoff.mjs .nvmrc docs/BROWSER-SUPPORT.md public/_headers; do
  test -e "$f" && echo "OK   $f" || echo "MISS $f"
done
```

Expected: `OK` for all seven.

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: add DEPLOYMENT.md written for the receiving web team

docs/HANDOFF.md is an internal session snapshot. This is the document the
Lakehead web team reads: build, publish, headers, MIME types, HTTPS
requirement, service-worker cache rules, verification steps, and an honest
statement of known limitations. Includes the point most likely to be
guessed wrong -- hash routing means no SPA rewrite rule is needed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Parameterize the project, source and sister-site URLs

Four links point at infrastructure the handing-over party owns, scattered across four files:

| URL | Location | Why it matters after handoff |
|---|---|---|
| `github.com/seawaydigital/RDM-Toolkit` | `HomePage.jsx:201` ("Don't trust us. Check.") | The verifiability pitch fails if it stops resolving |
| `github.com/seawaydigital/RDM-Toolkit/blob/master/` | `HowItWorks.jsx:6` | Every per-tool "view source" link |
| `rs.rdmtoolkit.ca` | `Sidebar.jsx:180` | Sister site on a domain Lakehead will not control |
| `seawaydigital.github.io/RSToolkit` | `HowThisWorks.jsx:474` | Cybersecurity guide, same problem |

Collecting them into one export makes a repo transfer, a mirror, or a sister-site move a one-line change instead of a hunt. It also makes the dependency **visible** to whoever inherits this — which is the actual point.

**Files:**
- Modify: `src/data/institutionConfig.js`, `src/components/ui/HowItWorks.jsx:6`, `src/components/home/HomePage.jsx:201`, `src/components/layout/Sidebar.jsx:180`, `src/components/pages/HowThisWorks.jsx:474`

- [ ] **Step 1: Add a PROJECT export**

Append to `src/data/institutionConfig.js`:

```js
// Single source of truth for project, source-code and sister-site URLs.
//
// Two separate concerns live here, both of which outlive any one maintainer:
//   - repoUrl / sourceBaseUrl back the site's trust claim ("don't take our word
//     for it — read the source"). If the repository is transferred or mirrored,
//     change it here and every link in the app follows.
//   - rsToolkitUrl / rsCybersecurityGuideUrl point at the sister Research
//     Security site, which is hosted separately. Whoever hosts RDM Toolkit does
//     not necessarily control those domains — keeping them here makes that
//     dependency obvious rather than buried in a component.
export const PROJECT = {
  repoUrl: 'https://github.com/seawaydigital/RDM-Toolkit',
  sourceBaseUrl: 'https://github.com/seawaydigital/RDM-Toolkit/blob/master/',
  rsToolkitUrl: 'https://rs.rdmtoolkit.ca',
  rsCybersecurityGuideUrl: 'https://seawaydigital.github.io/RSToolkit/#cybersecurity-guide',
};
```

- [ ] **Step 2: Use it in HowItWorks**

In `src/components/ui/HowItWorks.jsx`, replace line 6:

```js
const GITHUB_BASE = 'https://github.com/seawaydigital/RDM-Toolkit/blob/master/';
```

with:

```js
import { PROJECT } from '../../data/institutionConfig';

const GITHUB_BASE = PROJECT.sourceBaseUrl;
```

Place the `import` with the other imports at the top of the file, not inline.

- [ ] **Step 3: Use it in HomePage**

In `src/components/home/HomePage.jsx` around line 201, replace:

```jsx
<a href="https://github.com/seawaydigital/RDM-Toolkit" target="_blank" rel="noopener noreferrer">public on GitHub</a>
```

with:

```jsx
<a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">public on GitHub</a>
```

Add `PROJECT` to the existing `institutionConfig` import at the top of the file, or add a new import if there is none.

- [ ] **Step 4: Use it in the Sidebar sister-site link**

In `src/components/layout/Sidebar.jsx` around line 180, replace:

```jsx
            href="https://rs.rdmtoolkit.ca"
```

with:

```jsx
            href={PROJECT.rsToolkitUrl}
```

Add the import at the top of the file:

```js
import { PROJECT } from '../../data/institutionConfig';
```

- [ ] **Step 5: Use it in the HowThisWorks cybersecurity bridge**

In `src/components/pages/HowThisWorks.jsx` around line 474, replace:

```jsx
                href="https://seawaydigital.github.io/RSToolkit/#cybersecurity-guide"
```

with:

```jsx
                href={PROJECT.rsCybersecurityGuideUrl}
```

Add `PROJECT` to the existing `institutionConfig` import at the top of the file, or add a new import if there is none.

- [ ] **Step 6: Verify no hardcoded external URLs remain in components**

```bash
grep -rn "github.com/seawaydigital\|rs\.rdmtoolkit\.ca\|seawaydigital\.github\.io" src/ | grep -v institutionConfig.js
```

Expected: **no output**.

- [ ] **Step 7: Verify the links still render**

```bash
npm run security:audit && npm run build
```

Expected: audit passes, build clean. (The audit checks that every `target="_blank"` still has a neighbouring `rel="noopener noreferrer"` — swapping a literal href for an expression must not disturb that.)

```bash
npm run preview
```

At `http://localhost:4173/`:
1. The "Don't trust us. Check." tile's GitHub link points at the repo.
2. `#merge-pdfs` → expand "How this tool works" → "Technical details" → the source-file link resolves to a `blob/master/` URL.
3. The sidebar "RS Toolkit" card links to `rs.rdmtoolkit.ca`.
4. `#how-this-works` → the cybersecurity bridge callout links to the RS Toolkit guide.

- [ ] **Step 8: Commit**

```bash
git add src/data/institutionConfig.js src/components/ui/HowItWorks.jsx src/components/home/HomePage.jsx src/components/layout/Sidebar.jsx src/components/pages/HowThisWorks.jsx
git commit -m "refactor: centralize project, source and sister-site URLs

Four links pointed at infrastructure the handing-over party owns, spread
across four components: the GitHub repo behind the site's verifiability
claim, every per-tool source link, and two links to the separately-hosted
RS Toolkit. A repo transfer, mirror or sister-site move is now a one-line
change -- and, more usefully, the external dependency is visible in one
place to whoever inherits this.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Group 4 — Pre-handoff polish

### Task 8: Accessibility statement page

Lakehead is a designated public-sector organization under AODA. This is the artifact reviewers ask for by name, and it is the one place where the existing axe evidence becomes publicly legible.

**Files:**
- Create: `src/components/pages/AccessibilityStatement.jsx`
- Modify: `src/App.jsx` (lines 6–14 imports, 102 PAGES, 107–118 PAGE_TITLES, ~487 render), `src/components/layout/Sidebar.jsx`, `src/styles/global.css`

- [ ] **Step 1: Create the page component**

Create `src/components/pages/AccessibilityStatement.jsx`:

```jsx
import { Accessibility, CheckCircle, AlertCircle, Mail, FileText } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';

const CONFORMANCE = [
  {
    icon: CheckCircle,
    title: 'Automated testing',
    body: 'Every release is scanned with axe-core against WCAG 2.0 A, 2.0 AA, 2.1 AA and 2.2 AA rule sets across ten representative routes — the home page, the eight research-resource pages, and a cross-section of tools. The current build reports zero violations.',
  },
  {
    icon: CheckCircle,
    title: 'Colour contrast',
    body: 'Every text and background colour pair in the design system has been audited against the WCAG AA 4.5:1 threshold for body text. The audit runs as an automated check, so a future colour change that fails is caught before release.',
  },
  {
    icon: CheckCircle,
    title: 'Screen reader testing',
    body: 'The five most-used tools have been tested manually with NVDA on Windows. Page changes are announced, headings follow a single logical hierarchy per route, and form controls carry accessible names.',
  },
  {
    icon: CheckCircle,
    title: 'Keyboard access',
    body: 'All functionality is reachable without a mouse. Focus indicators are visible throughout, dialogs trap focus while open and close on Escape, and the sidebar can be dismissed from the keyboard.',
  },
  {
    icon: CheckCircle,
    title: 'Reduced motion',
    body: 'Animation respects the operating system "reduce motion" setting. With it enabled, decorative animation is disabled and smooth scrolling becomes instant.',
  },
];

const LIMITATIONS = [
  {
    title: 'Complex tool interfaces',
    body: 'A few tools use drag-and-drop to reorder PDF pages. Keyboard alternatives exist for every one of these actions, but the drag interaction itself is not exposed to assistive technology in a way we consider finished.',
  },
  {
    title: 'Visual document previews',
    body: 'PDF page thumbnails and the fillable-form editor are inherently visual. Page counts, dimensions and field names are available as text, but a rendered page image cannot be conveyed to a screen reader.',
  },
  {
    title: 'Generated files',
    body: 'This site does not alter the accessibility of the files you process. A PDF that was inaccessible before you merged or compressed it will still be inaccessible afterwards.',
  },
  {
    title: 'Ongoing work',
    body: 'Automated testing catches roughly a third of WCAG success criteria. Manual review beyond the five tools named above is in progress, and shared interface components are being revised to improve consistency for assistive technology.',
  },
];

export default function AccessibilityStatement() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Accessibility</div>
        <h1>Accessibility statement</h1>
        <p className="htw-hero-subtitle">
          RDM Toolkit is committed to providing an accessible experience for all
          researchers, students and staff at {INSTITUTION.name}, in keeping with
          the Accessibility for Ontarians with Disabilities Act.
        </p>
      </div>

      <section className="acc-section">
        <h2 className="htw-section-title">Conformance status</h2>
        <p className="acc-lede">
          This site aims to conform to the{' '}
          <a
            href="https://www.w3.org/TR/WCAG21/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1
          </a>{' '}
          at Level AA, the standard referenced by the AODA Information and
          Communications Standard. We test against WCAG 2.2 AA as well, and
          consider the site <strong>partially conformant</strong>: most of the
          standard is met, and the exceptions are listed below rather than
          left for you to discover.
        </p>

        <div className="acc-grid">
          {CONFORMANCE.map(({ icon: Icon, title, body }) => (
            <div className="acc-card" key={title}>
              <Icon size={18} className="acc-card-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Known limitations</h2>
        <p className="acc-lede">
          We would rather tell you where the gaps are than let you find them.
        </p>
        <ul className="acc-limitations">
          {LIMITATIONS.map(({ title, body }) => (
            <li key={title}>
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Alternate formats</h2>
        <p className="acc-lede">
          If any content on this site is not accessible to you, we will provide
          it in another format on request, at no cost. Contact the{' '}
          {INSTITUTION.researchOffice} using the details below and tell us what
          format works for you.
        </p>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Feedback</h2>
        <p className="acc-lede">
          If you encounter a barrier, we want to hear about it. Feedback is
          reviewed by the {INSTITUTION.researchOffice}, and we aim to respond
          within five business days.
        </p>
        <p className="acc-lede">
          It helps if you can tell us the page or tool, what you were trying to
          do, and any assistive technology you were using — but please get in
          touch even if you cannot.
        </p>
        <div className="acc-contact">
          <a className="acc-contact-cta" href={MAILTO.rdm}>
            <Mail size={16} aria-hidden="true" />
            {INSTITUTION.rdmEmail}
          </a>
          <a
            className="acc-contact-secondary"
            href="https://www.lakeheadu.ca/faculty-and-staff/departments/services/human-rights-and-equity/accessibility"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText size={16} aria-hidden="true" />
            Lakehead University accessibility services
          </a>
        </div>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Technical notes</h2>
        <p className="acc-lede">
          Accessibility here depends on HTML, CSS, JavaScript and WAI-ARIA. The
          site is tested in current versions of Chrome, Edge, Firefox and Safari,
          with NVDA on Windows. It runs entirely in your browser, so it also
          works with the operating system accessibility settings you already
          use — including offline.
        </p>
        <p className="acc-meta">
          <Accessibility size={14} aria-hidden="true" /> This statement was last
          reviewed on 5 September 2026.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Register the route in App.jsx**

Four edits in `src/App.jsx`.

Add the import after line 14 (`import GrantsAndIdentifiers ...`):

```js
import AccessibilityStatement from './components/pages/AccessibilityStatement';
```

Line 102 — add `'accessibility'` to the `PAGES` set:

```js
const PAGES = new Set(['how-this-works', 'request-a-tool', 'data-classification', 'storage-calculator', 'tri-agency-policy', 'drac-services', 'acrobat-alternative', 'lakehead-dataverse', 'grants-identifiers', 'accessibility']);
```

In `PAGE_TITLES`, add after the `'grants-identifiers'` entry:

```js
  'accessibility': 'Accessibility Statement',
```

In the render block, add after the `grants-identifiers` line:

```jsx
          {currentPage === 'accessibility' && <AccessibilityStatement />}
```

- [ ] **Step 3: Add the sidebar link**

In `src/components/layout/Sidebar.jsx`, add `Accessibility` to the existing lucide-react import on line 2, then add this link after the `#acrobat-alternative` block (the last link before the closing `</div>`):

```jsx
          <a
            href="#accessibility"
            className={`sidebar-htw-link ${currentPage === 'accessibility' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <Accessibility size={16} />
            Accessibility
          </a>
```

- [ ] **Step 4: Add the styles**

Append to `src/styles/global.css`:

```css
/* ---- Accessibility statement page ---- */
.acc-section {
  margin-bottom: var(--space-2xl);
}

.acc-lede {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.7;
  max-width: 680px;
  margin-bottom: var(--space-md);
}

.acc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.acc-card {
  background: var(--bg-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}

.acc-card-icon {
  color: var(--accent-green);
  margin-bottom: var(--space-sm);
}

.acc-card h3 {
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--text-parchment);
  margin: 0 0 var(--space-sm);
}

.acc-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
}

.acc-limitations {
  list-style: none;
  padding: 0;
  margin: var(--space-lg) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.acc-limitations li {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
  background: var(--bg-secondary);
  border: 1px solid var(--border-hairline);
  border-left: 2px solid var(--accent-amber);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
}

.acc-limitations li svg {
  color: var(--accent-amber);
  flex-shrink: 0;
  margin-top: 3px;
}

.acc-limitations strong {
  display: block;
  color: var(--text-primary);
  font-size: 14.5px;
  margin-bottom: 4px;
}

.acc-limitations p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
}

.acc-contact {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.acc-contact-cta,
.acc-contact-secondary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14.5px;
  font-weight: 500;
  text-decoration: none;
  min-height: 44px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.acc-contact-cta {
  background: var(--accent-primary);
  color: #0A1628;
}

.acc-contact-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.acc-contact-cta:hover,
.acc-contact-secondary:hover {
  transform: translateY(-1px);
}

.acc-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  margin-top: var(--space-lg);
}

@media (prefers-reduced-motion: reduce) {
  .acc-contact-cta,
  .acc-contact-secondary {
    transition: none;
  }
  .acc-contact-cta:hover,
  .acc-contact-secondary:hover {
    transform: none;
  }
}

@media (max-width: 767px) {
  .acc-contact-cta,
  .acc-contact-secondary {
    width: 100%;
    justify-content: center;
  }
}
```

- [ ] **Step 5: Verify**

```bash
npm run security:audit && npm run build
```

Expected: audit passes, build clean.

```bash
npm run preview
```

At `http://localhost:4173/#accessibility`:
1. The page renders with a single `<h1>` and no console errors.
2. The sidebar "Accessibility" link is highlighted as active.
3. The browser tab title reads `Accessibility Statement — RDM Toolkit`.
4. Tab through the page — every link shows a visible focus ring, and the two contact buttons are at least 44px tall.
5. Resize to 375px wide — no horizontal scrolling.

Then run the automated scan:

```bash
npm run a11y:contrast
```

Expected: exit 0, no AA failures.

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/AccessibilityStatement.jsx src/App.jsx src/components/layout/Sidebar.jsx src/styles/global.css
git commit -m "feat(a11y): add public accessibility statement at #accessibility

Lakehead is a designated public-sector organization under AODA, and a
published statement is the artifact reviewers ask for by name. Covers
conformance status, the testing actually performed, honestly-stated known
limitations, alternate-format and feedback routes with a named response
target, and technical notes.

Executes Phase 6 of docs/superpowers/plans/2026-05-03-aoda-compliance-plan.md
ahead of Phases 2-5.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Manual NVDA pass on the top five tools

Automated axe covers roughly a third of WCAG. This is the evidence behind the "screen reader testing" claim made in Task 8 — do not skip it, or that claim becomes false.

**Scope:** `#merge-pdfs`, `#compress-pdf`, `#data-anonymizer`, `#strip-image-metadata`, `#encrypt-decrypt-text`.

**Files:**
- Create: `docs/accessibility/nvda-manual-pass-2026-09-05.md`

- [ ] **Step 1: Set up**

Install NVDA (free, nvaccess.org) on Windows. Build and serve the production build so testing happens against real headers:

```bash
npm run build
npm run preview
```

Learn these NVDA keys before starting: `Insert+Down` read all, `H` next heading, `D` next landmark, `F` next form field, `B` next button, `Insert+F7` elements list.

- [ ] **Step 2: Run the same script against each of the five tools**

For each route, record the result of every check:

1. **Route announcement** — navigate from the home page via the sidebar. Does NVDA announce the new page title?
2. **Heading structure** — press `H` repeatedly. Is there exactly one `<h1>`, and do levels descend without skipping?
3. **Landmarks** — press `D`. Are banner, navigation and main present and distinct?
4. **Drop zone** — reach it by keyboard alone. Is it announced with a usable name and role, and can a file be chosen with Enter or Space?
5. **Buttons** — does every button announce a meaningful name? Flag any that announce only an icon name or nothing.
6. **Status changes** — after processing a file, is the result announced without moving focus? Flag anything that changes silently.
7. **Errors** — trigger a failure (upload a `.txt` renamed to `.pdf`). Is the error announced?
8. **Focus order** — Tab through the whole page. Does focus follow visual order and never get trapped?

- [ ] **Step 3: Write the findings report**

Create `docs/accessibility/nvda-manual-pass-2026-09-05.md`:

```markdown
# Manual NVDA pass — top 5 tools

**Date:** 2026-09-05
**Tester:** <name>
**Environment:** NVDA <version>, <browser + version>, Windows 11
**Build:** production (`npm run build` + `npm run preview`) — real headers, enforced CSP and Trusted Types
**Scope:** merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text

Automated axe-core testing reports zero violations on these routes. Automated
tools cover roughly a third of WCAG success criteria, so this pass exists to
check the rest: announcements, focus order, and whether the experience is
actually usable rather than merely valid.

## Summary

| Tool | Route announced | Headings | Drop zone | Buttons named | Status announced | Errors announced | Focus order |
|---|---|---|---|---|---|---|---|
| Merge PDFs | | | | | | | |
| Compress PDF | | | | | | | |
| De-identify Research Data | | | | | | | |
| Strip Image Metadata | | | | | | | |
| Encrypt / Decrypt Text | | | | | | | |

Use PASS / FAIL / N/A. Every FAIL needs a numbered finding below.

## Findings

### Finding 1: <short title>

- **Tool:** <route>
- **WCAG:** <e.g. 4.1.3 Status Messages (AA)>
- **Severity:** blocker | serious | moderate | minor
- **What happens:** <what NVDA did or did not say>
- **Expected:** <what should happen>
- **Steps:** <numbered reproduction>
- **Suggested fix:** <file and approach, if known>

## Fixed in this pass

<Findings fixed immediately, with commit SHAs. Anything not fixed goes below.>

## Deferred

<Findings left open, each with a reason. These belong in AODA Phases 2-5.>
```

Fill in the table and write up every FAIL.

- [ ] **Step 4: Fix blockers and serious findings**

Fix anything rated blocker or serious now — those contradict the published statement from Task 8. Common shapes and where they live:

- Unnamed icon-only button → add `aria-label` in the tool's JSX.
- Result appears silently → add `role="status"` to the container in `src/components/ui/ResultPanel.jsx`.
- Error appears silently → add `role="alert"` in `src/components/ui/ErrorCard.jsx`.

After each fix, re-test that specific check with NVDA and record the outcome.

Move moderate and minor findings to **Deferred**, each with a reason.

- [ ] **Step 5: Re-verify nothing regressed**

```bash
npm run security:audit && npm test && npm run build
```

Expected: audit passes, 16/16 tests pass, build clean.

- [ ] **Step 6: Reconcile the statement page with reality**

If any blocker or serious finding was deferred rather than fixed, add it to the `LIMITATIONS` array in `src/components/pages/AccessibilityStatement.jsx`. The published statement must not overclaim.

- [ ] **Step 7: Commit**

```bash
git add docs/accessibility/nvda-manual-pass-2026-09-05.md src/
git commit -m "test(a11y): manual NVDA pass on the top 5 tools

Evidence behind the screen-reader claim in the accessibility statement.
Automated axe covers about a third of WCAG; this checks announcements,
focus order and actual usability. Blocker and serious findings fixed;
deferred items recorded in the report and reflected in the public
statement's known-limitations list.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Search and social metadata

Zero `og:` or `twitter:` tags today, so a link shared in email or Teams renders bare. No `robots.txt`, no canonical.

**Honest note on the sitemap:** routing is hash-based, and a URL fragment is never sent to the server or indexed as a separate page. A sitemap can therefore only ever list one URL. It is included because crawlers and institutional SEO checklists expect the file to exist, not because it will surface 46 tool pages. Do not add fragment URLs to it — they would be invalid entries.

**Files:**
- Create: `public/robots.txt`, `public/sitemap.xml`
- Modify: `index.html`

- [ ] **Step 1: Create robots.txt**

Create `public/robots.txt`:

```
# RDM Toolkit — https://rdmtoolkit.ca/
User-agent: *
Allow: /

Sitemap: https://rdmtoolkit.ca/sitemap.xml
```

- [ ] **Step 2: Create sitemap.xml**

Create `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  Routing is hash-based (/#merge-pdfs). A fragment is never sent to the server
  and is not a separately indexable URL, so this sitemap correctly contains a
  single entry. Do not add fragment URLs here.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rdmtoolkit.ca/</loc>
    <lastmod>2026-09-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

- [ ] **Step 3: Add the meta tags**

In `index.html`, insert immediately after the existing `<meta name="description" ...>` line:

```html
    <link rel="canonical" href="https://rdmtoolkit.ca/" />

    <!-- Open Graph / Twitter. Absolute URLs are required by both specs;
         scripts/build-handoff.mjs rewrites them for a different host. -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://rdmtoolkit.ca/" />
    <meta property="og:site_name" content="RDM Toolkit" />
    <meta property="og:title" content="RDM Toolkit — Research Data Management Tools" />
    <meta property="og:description" content="46 browser-based tools for research data. Every tool runs entirely in your browser — no upload, no server, no account, no tracking." />
    <meta property="og:image" content="https://rdmtoolkit.ca/android-chrome-512x512.png" />
    <meta property="og:image:alt" content="RDM Toolkit logo" />
    <meta property="og:locale" content="en_CA" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="RDM Toolkit — Research Data Management Tools" />
    <meta name="twitter:description" content="46 browser-based tools for research data. Every tool runs entirely in your browser — no upload, no server, no account, no tracking." />
    <meta name="twitter:image" content="https://rdmtoolkit.ca/android-chrome-512x512.png" />
```

`twitter:card` is `summary`, not `summary_large_image`, because the only available image is a 512×512 square. A proper 1200×630 banner would allow the larger card — worth doing later, not a handoff blocker.

- [ ] **Step 4: Verify the build ships them and the rewrite works**

```bash
npm run build
test -f dist/robots.txt && test -f dist/sitemap.xml && echo "static files OK"
grep -c "og:" dist/index.html
```

Expected: `static files OK` and a count of `8`.

```bash
npm run security:audit
```

Expected: audit passes — confirms the meta CSP check still finds what it needs after editing `index.html`.

```bash
npm run build:handoff
grep -o 'og:url" content="[^"]*"' dist/index.html
```

Expected: `og:url" content="https://rdmtoolkit.lakeheadu.ca/"`

Restore the default build:

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt public/sitemap.xml index.html
git commit -m "feat(seo): add canonical, Open Graph, Twitter card, robots and sitemap

Links shared in email or Teams rendered with no title, description or
image. Adds social metadata plus the crawler files an institutional web
team expects to find. The sitemap deliberately contains one URL -- hash
fragments are not separately indexable, and listing them would be invalid.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Fix the Merge PDFs form-field badge race

Documented in CLAUDE.md and reproduced with a 40-page form fixture badging correctly where a 1-page one does not.

**Root cause** (`src/tools/pdf/MergePDFs.jsx:137-141`): `pdfHasFormFields(uint8).then(...)` calls `setFiles(prev => prev.map(f => f.id === id ? ... : f))`, but the new items are not in state until `setFiles(prev => [...prev, ...newItems])` runs after the whole loop (line 164). On a small PDF the scan resolves first, the `.map` finds no matching id, and the update is silently dropped. The blocking notice at line 292 reads the same `hasFormFields` flag, so it is lost too.

**Fix:** await the scan and set the flag on `item` before pushing. The loop already awaits `loadPdfLibDocument` and `renderPageThumbnail` per file, and `pdfHasFormFields` bails on the first Widget annotation found, so the added latency is negligible against work already being awaited.

**Files:**
- Modify: `src/tools/pdf/MergePDFs.jsx:130-141`

- [ ] **Step 1: Reproduce**

```bash
npm run build && npm run preview
```

At `http://localhost:4173/#merge-pdfs`, add a small (1–2 page) PDF containing a form field or signature box. Expected bug: no "Form fields" badge on the card and no amber notice, despite the file having fields.

- [ ] **Step 2: Apply the fix**

Replace the block at lines 130–141:

```js
        } else {
          item.pageCount = pdfDoc.getPageCount();
          // Advisory form-field scan — updates the card + notice when it
          // completes. Must be kicked off before the thumbnail render below
          // transfers this buffer to the pdfjs worker (pdfHasFormFields
          // copies the bytes synchronously at call time).
          pdfHasFormFields(uint8).then(has => {
            if (has) {
              setFiles(prev => prev.map(f => (f.id === id ? { ...f, hasFormFields: true } : f)));
            }
          });
        }
```

with:

```js
        } else {
          item.pageCount = pdfDoc.getPageCount();
          // Advisory form-field scan. Must run before the thumbnail render
          // below, which transfers this buffer to the pdfjs worker
          // (pdfHasFormFields copies the bytes synchronously at call time).
          //
          // Awaited rather than fired-and-forgotten: the previous version
          // resolved into a setFiles(prev.map(...)) that could run before
          // these items were ever added to state, so on small PDFs the badge
          // and the notice were silently dropped. The loop already awaits the
          // pdf-lib load and the thumbnail render, and this scan bails on the
          // first Widget annotation, so awaiting costs effectively nothing.
          item.hasFormFields = await pdfHasFormFields(uint8);
        }
```

The enclosing callback is already `async` (it uses `await file.arrayBuffer()`), so no signature change is needed.

- [ ] **Step 3: Verify the `id` variable is still used**

Removing the `.then` may leave `id` referenced only by `item`. That is fine — line 113 assigns it and line 115 uses it. Confirm no lint error:

```bash
npm run build
```

Expected: clean build, no unused-variable warning.

- [ ] **Step 4: Verify the fix**

```bash
npm run preview
```

At `#merge-pdfs`:
1. Add the **small** form PDF from Step 1 → the card now shows the "Form fields" badge and the amber notice appears.
2. Add a **large** (40-page) form PDF → still badges correctly (no regression on the slow path).
3. Add a plain PDF with no fields → no badge, no notice.
4. Add all three at once → exactly the two form PDFs are badged, and the notice lists exactly those two filenames.
5. Merge them and confirm the output opens correctly.

- [ ] **Step 5: Commit**

```bash
git add src/tools/pdf/MergePDFs.jsx
git commit -m "fix(merge-pdfs): stop dropping the form-field badge on small PDFs

The scan resolved into setFiles(prev.map(...)) before the new items were
added to state, so the map matched nothing and the update was silently
lost -- reliably on small PDFs, where the scan finishes first. The amber
notice reads the same flag, so users lost the warning that form fields and
signature boxes do not survive a merge.

Await the scan and set the flag before the item is pushed. The loop already
awaits the pdf-lib load and thumbnail render, and the scan bails on the
first Widget annotation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Hygiene, documentation corrections, and final package verification

**Files:**
- Modify: `package.json` + `package-lock.json` (audit fix), `CLAUDE.md`, `docs/HANDOFF.md`

- [ ] **Step 1: Clear the dev-toolchain advisories**

Seven advisories (5 high, 2 moderate) exist in dev dependencies only. Production is clean and both CI gates use `--omit=dev`, so nothing is currently blocked — this is tidiness, not a fix for a live problem.

```bash
npm audit --omit=dev --audit-level=high
```

Expected before and after: `found 0 vulnerabilities`.

```bash
npm audit fix
npm audit
```

Expected: `found 0 vulnerabilities`.

If `npm audit fix` changed any version in `package.json`, the exact-version allowlist in `scripts/security-audit.mjs` must be updated in the same commit or CI fails:

```bash
npm run security:audit
```

If it reports version drift, patch `allowedDevDependencies` in `scripts/security-audit.mjs` to the new exact versions and re-run until it passes.

- [ ] **Step 2: Refresh browserslist data**

The build warns that `caniuse-lite` is six months old.

```bash
npx update-browserslist-db@latest
npm run build
```

Expected: build completes with no browserslist warning.

- [ ] **Step 3: Correct two stale claims in the docs**

In `CLAUDE.md`, find the CI audit strategy paragraph ending:

```
Since the Vite 8 migration (2026-07-18) the **full** tree — dev deps included — audits at 0 vulnerabilities.
```

Replace with:

```
Both audit gates use `--omit=dev`, so the deploy blocks only on production CVEs. The full tree drifts as new advisories are published against the build toolchain; that is expected and does not block CI.
```

Also in `CLAUDE.md`, the `security.yml` row of the workflows table describes the final step as `npm audit --audit-level=high`. The workflow actually runs `npm audit --omit=dev --audit-level=high` (`.github/workflows/security.yml:41`). Correct the row.

In `docs/HANDOFF.md`, the "Where things stand" bullet claims `npm audit` (full tree, dev included): **0 vulnerabilities**. Replace that clause with:

```
`npm audit --omit=dev` (the CI gate): **0 vulnerabilities**. Full-tree audit drifts with new build-toolchain advisories; neither CI gate reads it.
```

Finally, add a new entry to the **Known gaps / deployment notes** list in `CLAUDE.md`, so the Task 2 residual is not rediscovered and misread as the tool still being broken:

```markdown
6. **Two benign `TrustedHTML` console errors on `#to-markdown`** — Turndown runs `canParseHTMLNatively()` at module-evaluation time (`turndown.cjs.js:451`), calling `new DOMParser().parseFromString('', 'text/html')` as soon as the lazy chunk loads. It is `try/catch`-wrapped so nothing throws, but the browser logs the blocked action; it is logged twice because the production CSP is delivered via both a real header and the `<meta>` tag, and each enforcing mechanism reports separately. **This is not a bug and File to Markdown works.** The conversion path was fixed in 2026-09-05 to hand Turndown a DOM node (via DOMPurify `RETURN_DOM`) instead of a string, so the `document.write` fallback is never reached. Judge that tool by whether conversion succeeds and whether the error count *changes* after converting — not by it being zero.
```

- [ ] **Step 4: Verify the whole package end to end**

```bash
npm ci --ignore-scripts
npm run security:audit
npm test
npm run build
node scripts/bundle-integrity.mjs > /dev/null && echo "bundle integrity OK"
```

Expected: audit passes for 46 tools, 16/16 tests pass, build clean, `bundle integrity OK`.

Then verify the handoff build specifically:

```bash
npm run build:handoff
```

Expected: reports `removed CNAME` and `rewrote security.txt Canonical`.

```bash
test ! -f dist/CNAME && echo "no CNAME OK"
grep Canonical dist/.well-known/security.txt
grep -o 'og:url" content="[^"]*"' dist/index.html
test -f dist/robots.txt && test -f dist/sitemap.xml && echo "crawler files OK"
```

Expected: `no CNAME OK`; Canonical and og:url both on `rdmtoolkit.lakeheadu.ca`; `crawler files OK`.

- [ ] **Step 5: Final browser verification of the handoff build**

```bash
npm run preview
```

Check each of these:
1. `/` — no console errors.
2. `/#to-markdown` — a `.html` file **converts successfully with no error card**, and conversion adds **no new** console errors (Task 2). Note: exactly two `TrustedHTML` errors appear on route load and are expected — see the Task 2 known-residual note. Judge the fix by whether conversion works and whether the count changes after converting, not by the count being zero.
3. `/#accessibility` — statement page renders (Task 8).
4. `/#merge-pdfs` — small form PDF badges correctly (Task 11).
5. DevTools → Network — no outbound request carries file data.

- [ ] **Step 6: Decide on the agent-workflow files**

`CLAUDE.md`, `AGENTS.md`, `.claude/`, `memory/handoff.md` and `docs/superpowers/` are tracked and would ship. They are harmless but confusing in an institutional repo.

Recommended: keep them (they are genuine maintenance documentation and removing them loses history), and add one line to `README.md` explaining what they are:

```markdown
> **Note on repository layout:** `CLAUDE.md`, `AGENTS.md` and `docs/superpowers/`
> are working notes and implementation plans used during development. They are
> not required to build, deploy, or maintain the site — start with
> [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
```

- [ ] **Step 7: Point the README at the deployment guide**

Add to `README.md`, immediately after the "Live site" line:

```markdown
**Hosting this yourself?** See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json scripts/security-audit.mjs CLAUDE.md docs/HANDOFF.md README.md
git commit -m "chore: clear dev advisories, refresh browserslist, correct audit docs

npm audit fix on the dev toolchain (production was already clean and both
CI gates use --omit=dev, so nothing was blocked). Refreshes caniuse-lite.

Corrects two stale claims: CLAUDE.md said security.yml audits the full tree
when it uses --omit=dev, and both CLAUDE.md and docs/HANDOFF.md claimed a
full-tree 0-vulnerability state that no longer holds and that no CI gate
actually checks.

README now points at DEPLOYMENT.md and explains the agent-workflow files.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Completion checklist

Before sending anything to the Lakehead Web Development team:

- [ ] `LICENSE` exists; `package.json` has real identity fields (Task 1)
- [ ] File to Markdown converts with zero TrustedHTML errors in the **production** build (Task 2)
- [ ] `npm run security:audit` rejects a reintroduced `new DOMParser()` (Task 3)
- [ ] `npm run build:handoff` drops CNAME and repoints security.txt (Task 4)
- [ ] `docs/hosting/` has all three configs with byte-identical CSP values (Task 5)
- [ ] `docs/DEPLOYMENT.md` exists and every path it references resolves (Task 6)
- [ ] No hardcoded GitHub or sister-site URLs outside `institutionConfig.js` (Task 7)
- [ ] `/#accessibility` renders and is linked from the sidebar (Task 8)
- [ ] NVDA report exists; blockers fixed; deferred items reflected in the public statement (Task 9)
- [ ] `robots.txt`, `sitemap.xml`, canonical and 8 `og:` tags ship in `dist/` (Task 10)
- [ ] Small form PDFs badge correctly in Merge PDFs (Task 11)
- [ ] `npm audit --omit=dev` clean; docs corrected; README points at DEPLOYMENT.md (Task 12)

**Explicitly out of scope** — tell Lakehead these are known and documented, do not let them be discovered:

- AODA Phases 2–5 (shared ARIA primitives, global shell, 9 info pages, all 46 tools). Outlined in `docs/superpowers/plans/2026-05-03-aoda-compliance-plan.md`.
- A purpose-built 1200×630 social share image (currently a 512×512 square, so link previews use the small card).
- SSH commit signing and re-enabling the signed-commits branch protection rule.
- The documented drag-and-drop gap where a tool that unmounts its DropZone after loading a file ignores a drop outside the zone.
