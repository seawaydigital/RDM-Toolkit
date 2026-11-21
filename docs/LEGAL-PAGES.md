# Privacy statement and Terms of use: decisions

The pages are `#privacy`
([PrivacyStatement.jsx](../src/components/pages/PrivacyStatement.jsx)) and
`#terms` ([TermsOfUse.jsx](../src/components/pages/TermsOfUse.jsx)). Both are
linked from the site footer
([SiteFooter.jsx](../src/components/layout/SiteFooter.jsx)), together with the
accessibility statement.

**Status: published on 20 November 2026** (PR #145, commit `5cb02e8`), on the
maintainer's go-ahead. `LEGAL_UPDATED` in
[src/data/legal.js](../src/data/legal.js) is that date. The decisions that had
held publishing back were made the same day by Andrew Austin, who develops and
maintains the site and works in Lakehead University's Office of Research
Services. They are recorded below as he gave them. No lawyer has reviewed
either page, and no Lakehead office other than his own has been asked about
them.

---

## Decisions made (20 November 2026)

| # | Question | Decision | Where it shows |
|---|---|---|---|
| D1 | Who is named as running the site | Andrew Austin, Research Security and Data Management Specialist, as developer and maintainer. The contact for general questions and feedback is `rdm.research@lakeheadu.ca`. | Terms → "What the site is"; Privacy → "Who runs this site, and questions"; `PROJECT.maintainer` in [institutionConfig.js](../src/data/institutionConfig.js) |
| D2 | Use of Lakehead's name and colours | They may be used. The pages say who develops the site and where he works. They do not call the site an official Lakehead service, because that was not part of the decision. | Both pages |
| D3 | Warranty and liability wording | Keep the plain-language "No warranty" and "Limitation of liability" sections. The liability clause names the site's developer, Lakehead University and other contributors. That mirrors the code's MIT licence, which protects "the authors or copyright holders", and `LICENSE` names Lakehead University as the copyright holder. | Terms |
| D5 | Feedback email and Lakehead | The site must collect nothing and send nothing to Lakehead's servers. That is how it works, apart from email people choose to send. See "What reaches Lakehead" below. | Privacy → "The short version", "What the web host records", "When you contact us" |
| D7 | Whether the licences file should also list the helper code the build tools generate | Leave it as it is. The file covers the packages the site serves, not the build tools' generated helper code. See "Third-party licence texts" below. | `/third-party-licenses.txt`; `SERVED_BUILD_PACKAGES` in [scripts/third-party-licenses.mjs](../scripts/third-party-licenses.mjs) |

## Still open (none of these blocks publishing)

- **Whose law applies (part of D3).** The terms have no governing-law clause.
  A clause naming Ontario could be added to "Limitation of liability".
- **A licence for the guide text (D4).** The Terms say the source code is under
  the MIT licence and that quoted documents belong to their authors. They say
  nothing separate about the site's own guide text. Options: leave it, use
  Creative Commons Attribution 4.0, or reserve rights.
- **How long feedback emails are kept (part of D5).** The privacy statement
  does not say, because it is not known.
- **Footer copyright line (D6).** The footer has none. `LICENSE` reads
  "Copyright (c) 2026 Lakehead University"; a matching footer line needs the
  maintainer's confirmation.
- **Security report address.** `public/.well-known/security.txt` lists
  `rdm.research@lakeheadu.ca`. `SECURITY.md` lists a different email address.
  One of them should change so both name the same contact.

---

## What reaches Lakehead, and what does not

Checked on 20 November 2026.

**Nothing from the site itself.**

- **Hosting.** `rdmtoolkit.ca` resolves to GitHub Pages
  (185.199.108–111.153) and answers with `Server: GitHub.com`. It is not on a
  Lakehead server.
- **No cookies.** The live response sets none, and `document.cookie` is empty
  after using the site. The source cannot set one: `security:audit` bans
  `document.cookie`.
- **The page cannot connect elsewhere.** The content security policy allows
  connections, form posts, scripts, images and fonts from the site's own
  origin only. `security:audit` now fails if either copy of the policy (the
  meta tag in `index.html`, or `public/_headers`) names another origin, or if
  `default-src`, `connect-src` or `form-action` is anything but `'self'`.
  It was watched failing on three such edits.
- **No network code.** `security:audit` already bans `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` in `src/`.
  The source has no `<form>` that posts anywhere.
- **Measured.** The production build was served locally with its real headers.
  Strip Image Metadata was run on its sample photo and ten pages were opened.
  The browser recorded 33 requests, all to the site's own origin, plus
  in-memory `blob:` URLs. There were no console errors, and the "How This
  Works" live counter read 0 requests to other servers.
- **Lakehead in the source.** Every reference is either a link (to pages on
  `lakeheadu.ca`, the library guides and Knowledge Commons) or an email
  address. A link sends nothing until someone clicks it. Every outside link
  found in the source opens in a new tab marked `noreferrer`, so the other
  site is not told where the visitor came from.

**The one exception is email.** The Feedback button, "Tell us", "Report this
problem", "Contact" and the address shown on the pages all open the visitor's
own email program with a message to `rdm.research@lakeheadu.ca`. If the visitor
sends it, the message arrives in a Lakehead mailbox with their email address,
what they wrote, the technical details the draft adds, and their usage log if
they ticked the box. The privacy statement says this in plain words and asks
people to keep research data, and personal information about other people, out
of the message.

Whether FIPPA calls for a notice of collection on an ordinary contact mailbox
is a question for Lakehead's access and privacy office. It has not been asked.
The only way to have nothing at all arrive at Lakehead is to use a contact
address that is not a Lakehead one.

**Also true, and stated on the page.**

- GitHub logs each visitor's IP address for its own security purposes. Lakehead
  does not receive those logs. GitHub's documentation still says this in the
  words the page quotes.
- Someone browsing from campus is visible to Lakehead's network, like any
  other web traffic. The files they process are not.

**This depends on where the site is hosted.** `docs/hosting/`,
`docs/DEPLOYMENT.md` and `SECURITY.md` describe a copy that Lakehead could
host on its own subdomain. Such a copy would log every visit on a Lakehead
server. Before any host change, rewrite Privacy → "What the web host records"
and the two "not hosted by Lakehead" lines in "The short version".

---

## Keeping the pages true

- **Browser storage.** The list comes from `STORED_ITEMS` in
  `src/data/legal.js`. `tests/legal.test.mjs` fails if the code stores an
  `rdm_…` key that is not listed, or if a listed key is no longer used.
- **Open-source credits.** Terms → "Open-source software" is rendered from
  `OPEN_SOURCE` in `src/data/legal.js`. The same test file fails if a
  production dependency in `package.json` is not credited, if a credit names
  something that is no longer a dependency, or if a credited licence is not one
  the package itself offers.
- **Licence texts.** Terms → "Open-source software" links to
  `/third-party-licenses.txt`, which every production build writes. The build
  fails if a package that ships has no licence text. `tests/legal.test.mjs`
  fails if the page links to a different file, or credits a project under a
  licence the file does not list it under. See "Third-party licence texts"
  below.
- **No outside connections.** The `security:audit` check described above.
- **Hosting.** See "This depends on where the site is hosted". On Cloudflare,
  do not turn on Cloudflare Web Analytics: it adds a script, which the
  statement says the site does not have.
- **New features.** Anything that sends data, stores data or opens an email
  needs a matching line on the privacy page and a new `LEGAL_UPDATED` date.

The claims and their sources are also listed in
[CONTENT-REVIEW.md](CONTENT-REVIEW.md).

## Third-party licence texts

This was recorded here as a known gap on 20 November 2026 and closed in the
change that followed.

**What was wrong.** The minifier removes comments, so the built JavaScript
carried no third-party copyright or licence notices. Only the PDF.js worker
file kept its banner. The MIT, ISC, BSD and Apache licences ask for their
notice to travel with copies of the software.

**What ships now.** Every production build writes
`/third-party-licenses.txt`: the name, version, licence and full licence text
of 45 packages (about 153 KB). The Terms page links to it. It covers:

- every package a production install brings in (40 of them): the 18
  dependencies in `package.json` and the packages those depend on, the three
  font packages included. Optional packages are left out: they are
  pdfjs-dist's native canvas add-ons for Node and DOMPurify's type
  declarations, and none of them reaches a browser. The build checks this
  against what it actually bundled;
- the four Workbox packages that make up the service worker's runtime
  (`workbox-*.js`), and `@trickfilm400/rollup-plugin-off-main-thread`
  (Apache-2.0), whose module loader is the first statement of `sw.js`. These
  are build tools, but their code is served.

Two packages publish no licence file. `isarray` prints its licence in its
README. `@pdf-lib/fontkit` only names MIT in its `package.json`; the text used
is the LICENSE of foliojs/fontkit, the project it is a fork of. Both texts are
kept in `scripts/licence-fallbacks/`, each tied to one exact version, and the
file says where each came from.

For a package offered under more than one licence (DOMPurify, JSZip) the file
reproduces every licence text the package ships. Which one the site uses is
stated on the Terms page.

**What the file does not cover.** Small pieces of helper code that the build
tools write into every build: Vite's preload helper, Rolldown's module
runtime, the class-field helpers Rolldown inlines from `@oxc-project/runtime`
(its licence file is Babel's MIT licence), vite-plugin-pwa's `registerSW.js`,
and workbox-build's own lines in `sw.js`. All five tools are MIT-licensed.
They are left out as generated tool output, not a copy of a library. The
maintainer was asked on 20 November 2026 whether to list them too, and decided
to leave the file as it is (D7). The comment on `SERVED_BUILD_PACKAGES` in
`scripts/third-party-licenses.mjs` says how to list them, and what it would
cost, if that is ever revisited.

**The service worker used to hide plain files.** With the worker running, a
browser that opened `/robots.txt`, `/sitemap.xml` or
`/.well-known/security.txt` got the app, not the file, because the worker
answered every page navigation with `index.html`. On 20 November 2026 this was
observed in Chrome 158 (until then it had only been read from the built
`sw.js`). A link to the licences file would have done the same. The worker now
leaves alone anything under `/.well-known/` and any address that ends in a
file extension other than `.html` (`scripts/sw-navigation.mjs`), and it
precaches the licences file, so the link also works offline. Tools such as
`curl`, search crawlers and security scanners were never affected.

**How it stays true.** `npm run build` fails if a shipped package has no
licence text, if the bundle holds code from a package the file does not list,
or if the generated service worker does not precache the file or has lost its
navigation denylist. `security:audit` fails if either build step is taken out
of `vite.config.js`. After a dependency upgrade, a package that still
publishes no licence file fails the build until its fallback text is checked
and re-keyed to the new version.

**Checked in a browser.** Headless Chrome 158 with a real service worker,
against the production build served with its production headers, 20 November
2026: with the worker running, the licences file, `robots.txt`, `sitemap.xml`
and `security.txt` each opened as themselves, in the same tab and in a new one;
a mouse click on the Terms page link opened the licences file in a new tab;
with the server stopped, the app, a lazily loaded tool, the licences file and
that link all still opened; and replacing the current build with this one
reloaded an open tab onto the new build with its address kept.

## Noticed while drafting

- **The tester usage log has no off switch.** Users opt in during the welcome
  tour. The only way to opt out is "Clear all local data", which also wipes
  their other settings. The privacy statement describes this as it is.
- **Fixed: empty divider on undated pages.** Pages without a review date
  (Accessibility, Request a Tool, Privacy, Terms) drew an empty
  `content-reviewed-wrap` with a top border. `App.jsx` now renders it only when
  the page has a date.
- **Fixed: new pages opened scrolled down.** The router never reset the
  scroll position of `<main>`, so a link near the bottom of a page opened the
  next page at the same depth. `onHashChange` in `App.jsx` now scrolls `<main>`
  to the top. The glossary's `?term=` jump still lands on its entry.
- **Fixed: the accessibility statement's WCAG link.** axe-core 4.12.1 flagged
  it as `link-in-text-block` (serious). `.acc-lede a` is now underlined, like
  the new pages' links.
