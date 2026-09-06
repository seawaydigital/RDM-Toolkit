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

`--ignore-scripts` is deliberate — `.npmrc` sets `ignore-scripts=true` to block
install hooks as a supply-chain precaution. Do not remove it.

Output lands in `dist/`. That folder is the entire website (162 precache
entries at last build, ~4.6 MB before gzip — this includes every lazily
loaded tool chunk, fonts, and icons, all pre-cached by the service worker).

`build:handoff` runs `vite build` and then
`node scripts/build-handoff.mjs --domain rdmtoolkit.lakeheadu.ca` against the
result. That second step:

- deletes `dist/CNAME` (a GitHub Pages domain binding — harmless on a normal
  server, but it would hijack the domain if this folder were ever deployed to
  GitHub Pages instead);
- rewrites `dist/.well-known/security.txt`'s `Canonical:` line to point at
  `rdmtoolkit.lakeheadu.ca` (RFC 9116 says a security.txt whose `Canonical`
  doesn't match its own URL should not be trusted);
- rewrites every `https://rdmtoolkit.ca` occurrence in `dist/index.html`
  (social-meta `og:` tags and the canonical link) to the new origin.

It refuses to run if `dist/` is missing, or if `dist/index.html` or
`dist/.well-known/security.txt` weren't produced by the build — that's a
build failure, not something to work around.

To target a different hostname than `rdmtoolkit.lakeheadu.ca`:

```bash
npm run build
node scripts/build-handoff.mjs --domain your-hostname.example.org
```

## 2. Publish

Copy the **contents** of `dist/` to the document root. Include the dotfile
directory `.well-known/` — some copy tools skip dotfiles by default.

```bash
rsync -av --delete dist/ user@server:/var/www/rdmtoolkit/
```

## 3. Routing — nothing to configure

Routing is hash-based (`/#merge-pdfs`, `/#how-this-works`) — confirmed in
`src/App.jsx`'s `getRouteFromHash()`, which reads `window.location.hash` and
resolves it entirely client-side against the tool registry and a fixed set of
page routes. The fragment after `#` is never sent to the server, so the
server only ever sees a request for `/`. **You do not need an SPA rewrite or
`try_files` fallback.** Any path other than `/` and the real asset files is a
404, and that is correct.

## 4. Headers — required

Ready-made configs are in `docs/hosting/`:

| Server | File |
|---|---|
| Apache 2.4+ | `docs/hosting/apache.conf` |
| nginx | `docs/hosting/nginx.conf` |
| IIS 7+ | `docs/hosting/web.config` |

These are not cosmetic. `index.html` carries a fallback `<meta>` CSP that does
cover most directives — including Trusted Types enforcement — but a meta tag
cannot deliver everything:

- **`frame-ancestors 'none'`** is ignored in a `<meta>` tag per the CSP spec.
  Without the header, the site can be framed and is open to clickjacking.
- **`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Permissions-Policy` and `Referrer-Policy`** are HTTP headers that browsers
  do not honour from meta tags at all.

So the meta CSP is a genuine fallback, not a substitute. Serve these headers
and the site keeps the security posture it was built with.

The nginx config carries an extra warning worth reading before you add any
further `location` blocks: `add_header` does not inherit into a block that
sets its own `add_header` (e.g. the `/sw.js` and `/assets/` cache-control
blocks), so each of those blocks repeats the full six-header set rather than
relying on inheritance. Follow the same pattern for any new block you add.

`public/_headers` in the repo is Cloudflare/Netlify syntax and is ignored by
Apache, nginx, and IIS. It is the source of truth for the header *values*
(all three `docs/hosting/` configs were generated from it), not a config file
you can drop in directly on those servers.

### MIME types

`.mjs` and `.webmanifest` are commonly absent from default server MIME maps;
`.woff2` is additionally missing on IIS. The provided configs add whichever
of these each server needs:

| Extension | Type | Breaks if wrong |
|---|---|---|
| `.mjs` | `text/javascript` | The PDF worker and every lazily-loaded tool chunk |
| `.webmanifest` | `application/manifest+json` | Install-as-app (PWA) support |
| `.woff2` | `font/woff2` | Typography falls back to system fonts (IIS only — Apache/nginx normally already know this type) |

## 5. HTTPS

Required. Several tools call the Web Crypto API (`crypto.subtle` — used for
AES-256-GCM encrypt/decrypt, PBKDF2 key derivation, and SHA-256 hashing),
which browsers only expose in secure contexts. Over plain HTTP, Encrypt/
Decrypt Text, Password Protect PDF/Remove PDF Password, and SHA-256 Hasher
fail outright.

## 6. Service worker and caching

The build emits `dist/sw.js` (Workbox-generated, via `vite-plugin-pwa`) which
pre-caches static assets so all 46 tools work offline after the first visit.
It's configured with `skipWaiting: true` and `clientsClaim: true`
(`vite.config.js`), so a new deploy takes over open tabs immediately rather
than waiting for every tab to close.

Two caching rules matter, and the provided `docs/hosting/` configs already
set them:

- **`/sw.js` must never be cached** (`no-cache, no-store, must-revalidate`).
  A cached service worker pins visitors to an old build indefinitely.
- **`/assets/*` can be cached forever** (`max-age=31536000, immutable`) —
  those filenames contain a content hash (e.g.
  `pdfjs-C8vfZffL.js`) and change whenever the content does.

After deploying an update, visitors get the new version on their next page
load, no manual cache-busting needed.

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
4. `https://rdmtoolkit.lakeheadu.ca/.well-known/security.txt` resolves and
   its `Canonical:` line reads `https://rdmtoolkit.lakeheadu.ca/.well-known/security.txt`
   (this is what `build:handoff` rewrote — if it still says
   `rdmtoolkit.ca`, the wrong build artifact was published).

## 8. Updating later

```bash
git pull
npm ci --ignore-scripts
npm run build:handoff
# republish dist/
```

The repository runs its own checks on every change — a security guardrail
script covering all 46 tools, dependency audits, CodeQL, Lighthouse, and a
bundle-size gate. `npm run security:audit` and `npm test` can be run locally
at any time; both are part of CI and should pass before you publish a new
build.

## Known limitations at handoff

- **Accessibility:** automated axe-core testing reports zero WCAG 2.2 AA
  violations across 10 representative routes, and an accessibility-tree audit
  of the five most-used tools found and fixed a set of defects axe-core does
  not detect — including a keyboard-unreachable control. See
  `docs/accessibility/a11y-tree-audit-2026-09-05.md`.

  **No screen-reader testing has been done.** Both methods above are
  automated. A person using NVDA, JAWS or VoiceOver has not yet tested this
  site, and that is the single most valuable accessibility work outstanding —
  automated tooling covers roughly a third of WCAG. A broader ARIA-pattern
  pass across all 46 tools, and a known heading-level defect in the tool
  explainer panels, are also outstanding. All of this is stated publicly at
  `/#accessibility`; if you publish under a Lakehead domain, AODA
  responsibility for it follows.
- **Browser support:** see `docs/BROWSER-SUPPORT.md`.
