# Privacy statement and Terms of use: open decisions

Drafted 25 October 2026. The pages are `#privacy`
([PrivacyStatement.jsx](../src/components/pages/PrivacyStatement.jsx)) and
`#terms` ([TermsOfUse.jsx](../src/components/pages/TermsOfUse.jsx)). Both are
linked from the new site footer
([SiteFooter.jsx](../src/components/layout/SiteFooter.jsx)), together with the
accessibility statement.

**Status: draft. Do not publish until D1–D3 and D5 are settled.** D4 and D6
can follow.

The drafts avoid guessing. Where a sentence depends on a decision below, it
uses wording that is true either way, and the source has a
`DECISION Dn` comment beside it. Nothing on either page is a fill-in prompt.

---

## Decisions

### D1. Who provides the site

**Decided by:** Andrew Austin and Lakehead University.

Terms of use need a named provider: the party making the promises and
disclaiming liability. The repository points two ways:

- `LICENSE` names **Lakehead University** as the copyright holder.
- `SECURITY.md` sends security reports to `andrew@seawaydigital.ca`.
- Every contact on the site is Lakehead's Office of Research Services mailbox,
  `rdm.research@lakeheadu.ca`.
- Lakehead's web team declined to host the site (October 2026), and it runs
  on GitHub Pages under the `seawaydigital` GitHub account.

Who registered `rdmtoolkit.ca` was not checked for this draft.

**The draft now says:** the site "was built for researchers, students and staff
at Lakehead University". The liability clause refers to "the people and
organisations that provide RDM Toolkit". Neither page says who they are.

**To do once decided:** name the provider in Terms → "What the site is" and
"Limitation of liability", in Privacy → "Questions and changes", and in the
footer (D6). If Lakehead is not the provider, fix the copyright line in
`LICENSE` to match.

### D2. Use of Lakehead's name, and whether the site is a Lakehead service

**Decided by:** Lakehead University (Office of Research Services; likely also
whoever approves use of the university's name and brand).

The site names Lakehead throughout. It uses Lakehead's gold as its main colour,
and it sends every question to a Lakehead mailbox. A terms page normally says
whether the site is an official service of the institution. Lakehead's web
team declining to host it makes this a real question.

**The draft now says:** that the site was built for Lakehead researchers,
students and staff, and that questions go to the Office of Research Services at
`rdm.research@lakeheadu.ca`. It neither claims nor denies that the site is an
official Lakehead service.

**Also confirm:** that the Office of Research Services agrees to be named as the
contact on both pages. It is already named as the contact elsewhere on the site.

### D3. Legal review of the warranty and liability wording, and governing law

**Decided by:** the provider's lawyer. If Lakehead is the provider, that means
Lakehead's legal counsel.

**The draft now says:**

- **No warranty:** plain-language "as is", the same basis as the MIT licence
  the code is already published under.
- **Limitation of liability:** "to the extent the law allows", covering data
  loss and information the user meant to remove or protect.
- **Governing law:** none. It was left out rather than guessed, because the
  right law depends on who the provider is (D1).

### D4. A licence for the guide text

**Decided by:** whoever holds copyright (D1).

The MIT licence covers "this software and associated documentation files".
That arguably includes the page text, but it is a poor fit for prose. It also
cannot cover material quoted from Lakehead, the research agencies or the
Faculty of Graduate Studies.

**The draft now says:** the source code is published under the MIT licence, and
quoted documents belong to their authors. It says nothing about the original
guide text.

**Options:** leave it as drafted, license the original guide text under
Creative Commons Attribution 4.0 (CC BY 4.0), or reserve rights.

### D5. Feedback email and FIPPA

**Decided by:** Lakehead's access and privacy office, with the Office of
Research Services.

Feedback reaches `rdm.research@lakeheadu.ca`. That mailbox then holds the
sender's email address, their message, and the context the dialog adds: page
address, browser, window size and error details. That is personal information
collected by Lakehead. FIPPA s. 39(2) generally requires a notice when an
institution collects personal information. The notice states the legal
authority, the principal purpose, and the title, business address and
telephone number of an employee who can answer questions. Whether it applies
here, and what it should say, is Lakehead's call.

**The draft now says:** the message goes to the Office of Research Services and
"is used to reply to you and to fix what you report". That is a promise made on
Lakehead's behalf, so the office should confirm it. The draft says nothing about
how long messages are kept, because that is not known.

**To do once decided:** add any notice wording, the retention period and the
named official to Privacy → "When you contact us" and "Questions and changes".

### D6. Footer copyright line

**Decided by:** follows from D1.

The footer has no copyright line. `LICENSE` reads "Copyright (c) 2026 Lakehead
University". Add a matching line to `SiteFooter.jsx` once D1 confirms it.

---

## Before publishing

1. Settle D1–D3 and D5, and edit the pages.
2. Set `LEGAL_UPDATED` in [src/data/legal.js](../src/data/legal.js) to the
   publication date.
3. Remove the "Draft" note at the top of `TermsOfUse.jsx`.

## Keeping the privacy statement true

- **Browser storage:** the list comes from `STORED_ITEMS` in
  `src/data/legal.js`. `tests/legal.test.mjs` fails if the code stores an
  `rdm_…` key that is not listed, or if a listed key is no longer used.
- **Hosting:** "What the web host records" describes GitHub Pages. Rewrite it
  before moving to another host, such as Cloudflare Pages or a Lakehead VM.
  Every host keeps some request log. On Cloudflare, do not turn on Cloudflare
  Web Analytics: it adds a script, which the statement says the site does not
  have.
- **New features:** anything that sends data, stores data or opens an email
  needs a matching line on the page, and a new `LEGAL_UPDATED` date.

The claims and sources are also listed in
[CONTENT-REVIEW.md](CONTENT-REVIEW.md).

## Noticed while drafting (not decisions)

- **The tester usage log has no off switch.** Users opt in during the welcome
  tour. The only way to opt out is "Clear all local data", which also wipes
  their other settings. The privacy statement describes this as it is. A
  separate off switch would be friendlier.
- **Fixed: empty divider on undated pages.** Pages without a review date
  (Accessibility, Request a Tool, and now Privacy and Terms) drew an empty
  `content-reviewed-wrap` with a top border. `App.jsx` now renders it only when
  the page has a date.
- **Fixed: new pages opened scrolled down.** The router never reset the
  scroll position of `<main>`, so a link near the bottom of a page opened the
  next page at the same depth. The footer would have hit this on every click.
  `onHashChange` in `App.jsx` now scrolls `<main>` to the top. The glossary's
  `?term=` jump still lands on its entry, because it runs after the page
  renders. Checked in the dev server.
- **Fixed: the accessibility statement's WCAG link.** axe-core 4.12.1 flagged
  it as `link-in-text-block` (serious): gold text with no underline, too close
  to the body grey. `.acc-lede a` is now underlined, like the new pages' links.
