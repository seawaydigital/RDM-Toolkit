# Privacy statement and Terms of use: decisions

The pages are `#privacy`
([PrivacyStatement.jsx](../src/components/pages/PrivacyStatement.jsx)) and
`#terms` ([TermsOfUse.jsx](../src/components/pages/TermsOfUse.jsx)). Both are
linked from the site footer
([SiteFooter.jsx](../src/components/layout/SiteFooter.jsx)), together with the
accessibility statement.

**Status, 20 November 2026: ready to publish when the maintainer says so.**
The decisions that held publishing back were made that day by Andrew Austin,
who develops and maintains the site and works in Lakehead University's Office
of Research Services. They are recorded below as he gave them. No lawyer has
reviewed either page, and no Lakehead office other than his own has been asked
about them.

---

## Decisions made (20 November 2026)

| # | Question | Decision | Where it shows |
|---|---|---|---|
| D1 | Who is named as running the site | Andrew Austin, Research Security and Data Management Specialist, as developer and maintainer. The contact for general questions and feedback is `rdm.research@lakeheadu.ca`. | Terms → "What the site is"; Privacy → "Who runs this site, and questions"; `PROJECT.maintainer` in [institutionConfig.js](../src/data/institutionConfig.js) |
| D2 | Use of Lakehead's name and colours | They may be used. The pages say who develops the site and where he works. They do not call the site an official Lakehead service, because that was not part of the decision. | Both pages |
| D3 | Warranty and liability wording | Keep the plain-language "No warranty" and "Limitation of liability" sections. The liability clause names the site's developer, Lakehead University and other contributors. That mirrors the code's MIT licence, which protects "the authors or copyright holders", and `LICENSE` names Lakehead University as the copyright holder. | Terms |
| D5 | Feedback email and Lakehead | The site must collect nothing and send nothing to Lakehead's servers. That is how it works, apart from email people choose to send. See "What reaches Lakehead" below. | Privacy → "The short version", "What the web host records", "When you contact us" |

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

## Before publishing

1. The maintainer says to publish.
2. If that is on a later day, set `LEGAL_UPDATED` in
   [src/data/legal.js](../src/data/legal.js) to the publication date.

## Keeping the pages true

- **Browser storage.** The list comes from `STORED_ITEMS` in
  `src/data/legal.js`. `tests/legal.test.mjs` fails if the code stores an
  `rdm_…` key that is not listed, or if a listed key is no longer used.
- **Open-source credits.** Terms → "Open-source software" is rendered from
  `OPEN_SOURCE` in `src/data/legal.js`. The same test file fails if a
  production dependency in `package.json` is not credited, if a credit names
  something that is no longer a dependency, or if a credited licence is not one
  the package itself offers.
- **No outside connections.** The `security:audit` check described above.
- **Hosting.** See "This depends on where the site is hosted". On Cloudflare,
  do not turn on Cloudflare Web Analytics: it adds a script, which the
  statement says the site does not have.
- **New features.** Anything that sends data, stores data or opens an email
  needs a matching line on the privacy page and a new `LEGAL_UPDATED` date.

The claims and their sources are also listed in
[CONTENT-REVIEW.md](CONTENT-REVIEW.md).

## Known gap: third-party licence texts are not shipped

Checked on the 20 November 2026 build. The minifier removes comments, so the
built JavaScript carries no third-party copyright or licence notices. Only the
PDF.js worker file keeps its banner. The MIT, ISC and Apache licences ask for
their notice to travel with copies of the software.

The Terms page now credits each project and names its licence, and it links to
`package.json`. It does not ship the licence texts. Doing that is a separate
change, for two reasons:

- It needs a build step that collects the licence text of every package that
  ships and writes them to one file.
- The service worker answers every page navigation with the app
  (`NavigationRoute` bound to `index.html`, with no denylist, as read from the
  built `sw.js`). A link to a plain file that is not in the precache would
  therefore open the app, not the file, for anyone whose browser has the
  service worker running. The same applies today to `/robots.txt`,
  `/sitemap.xml` and `/.well-known/security.txt`. Tools such as `curl`, search
  crawlers and security scanners are not affected. This was read from the
  code, not observed in a browser.

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
