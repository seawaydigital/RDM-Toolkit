# Homepage Redesign — "Manifesto Split + Bento" — Design

**Date:** 2026-06-12
**Status:** Approved (brainstorming session, high-fidelity mockup signed off)
**Mockup reference:** `.superpowers/brainstorm/101-1781277701/content/homepage-hifi.html`

## Goal

Elevate the homepage to award-winning quality while making it actively *educate* first-time visitors on (a) what the site can do, (b) how local-in-browser processing works, and (c) why they should trust it — without slowing returning users down.

## Decisions made during brainstorming

1. **Primary takeaway:** a deliberate blend — trust first, capability second, institutional credibility woven throughout.
2. **Education on the homepage:** inline narrative ("How it works" 3-step band) plus one falsifiable interactive-proof element (airplane-mode challenge); deep detail stays on the How This Works page.
3. **Visual scope:** homepage-only flourishes (motion, larger typographic moments, bento composition) built strictly from the existing design tokens (Fraunces / IBM Plex / navy / Lakehead gold / parchment). No site-wide reskin. Must be AODA-compliant (WCAG 2.2 AA, aligning with the 2026-05-03 AODA plan) and on-brand with Lakehead University (cobalt `--lh-cobalt`, blaze gold `--lh-blaze`).
4. **Returning users:** adaptive page — when `recentTools` is non-empty, the hero compresses and a Recently Used row is lifted above the bento; first-timers get the full narrative.
5. **Layout direction:** Option B "Manifesto Split + Bento", folding in Option C's verifiability framing as a single "Don't trust us. Check." proof tile.

## Page structure (top to bottom)

### 1. Hero — manifesto split (two columns; stacks on mobile)

- **Left column:** existing kicker style ("Lakehead Research Data Toolkit"), headline `Your research data <em>never leaves</em> this device.` (Fraunces, parchment, gold italic emphasis), lede (~2 lines: 46 free tools, processed in-browser, no uploads, no account, verifiable), CTA row: gold primary button **Browse the tools** (smooth-scrolls to the bento) + text link **How is that possible? ↓** (smooth-scrolls to the How It Works band).
- **Right column:** the **privacy diagram** — three nodes (`Your file → This browser → Your download`) connected by dashed gold wires, with the center node gold-highlighted; below a hairline divider, a crossed-out cloud node with the caption "No server. No upload. The internet is not involved." A small mono `● LIVE ON YOUR DEVICE` tag sits top-right.
- **Motion:** on first paint the wires draw in (CSS `stroke-dashoffset` if SVG, or background-position keyframe if CSS borders) and the cloud strike-through draws last. Entire animation ≤ 2.5 s, runs once, no loop. Under `prefers-reduced-motion: reduce` the diagram renders in its final state with no animation.
- **Implementation note:** diagram is an inline SVG (preferred — precise wire animation, crisp at any DPI) with `role="img"` and an `aria-label` describing the flow ("Diagram: your file is processed by your browser and downloaded — no server involved"). Decorative emoji/icons inside are `aria-hidden`.
- **Returning-user compressed variant:** hero keeps left column only (smaller title, no diagram, single CTA), rendered with a `homepage-hero--compact` modifier class.

### 2. Stat strip

Four cells in a bordered strip: **46** research tools · **0** bytes uploaded · **$0** now & forever · **100%** works offline. Fraunces numerals in parchment with gold accent glyphs; uppercase mono labels. The "46" is computed from the registry (`allCategories.reduce(...)`), not hardcoded.

### 3. Recently Used (returning users only)

Existing pill row, moved here — directly above the bento — when `recentTools.length > 0`. Unchanged behavior.

### 4. Bento grid — "Start with what you need"

Section title uses the existing flex-rule pattern with mono meta ("tools + the trust to use them"). 4-column grid (2 on tablet, 1 on small mobile) mixing two tile types:

- **Tool tiles (6):** merge-pdfs, compress-pdf, data-anonymizer (De-identify Research Data), strip-image-metadata, encrypt-decrypt-text, pdf-redaction. Each: emoji, name, one-line benefit description (hand-written for the homepage, not the registry description). Click → `onNavigate(toolId)`. Rendered as `<button>`.
- **Education tiles (3, each spanning 2 columns; the first and third gold-tinted with a mono corner tag, the proof tile on a darker inset surface):**
  - **"The airplane-mode test"** (wide, span 2; tag `WHY IT'S SAFE`): load once, turn off Wi-Fi, everything still works.
  - **"Don't trust us. Check."** (wide, span 2, darker inset surface): three numbered proof rows — №01 DevTools → Network shows zero requests; №02 all code public on GitHub (link); №03 meets PIPEDA · PHIPA · GDPR (links, existing URLs).
  - **"Built for research compliance"** (wide, span 2; tag `FOR SENSITIVE DATA`): OCAP® / PHIPA / REB framing; links to `#data-classification`.
- Tool tiles get the existing hover lift + gold border treatment; education tiles are informational (links inside, not whole-tile clickable).

### 5. How it works — 30-second version

Three numbered step cards (Fraunces italic numerals): **1 Choose a file** (opens into browser memory, like opening it in Word) → **2 Your browser does the work** (modern browsers ship desktop-grade engines: PDF, AES-256, image processing) → **3 Download the result** (original and output only ever existed on your device). Below: a dashed-gold **challenge callout** — "Prove it to yourself: turn on airplane mode and use any tool…" with a link "Full technical explanation →" to `#how-this-works`.

### 6. Research guides

The existing four resource cards (Classify Your Data, Tri-Agency RDM Policy, Storage Calculator, DRAC Services) restyled minimally to match — content and links unchanged.

### 7. All Tools accordion + footer hint

Existing category accordion unchanged. Above/below it, a centered footer-hint line: "Press **Ctrl K** to search · How this works, in depth" (platform-aware ⌘K on Mac, same detection as Topbar).

## Removed / replaced from current homepage

- Old hero (kicker/title/tagline/trust badges/compliance paragraph) → replaced by sections 1–2. The compliance links move into the proof tile; the four trust badges' content is absorbed by the stat strip and hero lede.
- Old "Popular Tools" 8-item grid → replaced by the 6 tool tiles in the bento (sha256-hasher, password-generator, compress-image drop off the homepage; still reachable via sidebar/search/accordion).

## Architecture & implementation

- **Files touched:** `src/components/home/HomePage.jsx` (restructure; may extract `HeroDiagram.jsx` as a sibling component in `components/home/` for clarity), `src/styles/global.css` (new `.homepage-*` classes; remove orphaned ones), no registry or routing changes.
- **CSS:** all new classes under the existing `.homepage-` prefix (e.g. `.homepage-hero--split`, `.homepage-diagram`, `.homepage-stats`, `.homepage-bento`, `.homepage-tile--edu`, `.homepage-steps`, `.homepage-challenge`). Tokens only — no new color literals except via existing variables; gold tints use `rgba(255,194,14,…)` consistent with current patterns.
- **No new dependencies.** Icons from lucide-react where needed; diagram is hand-written inline SVG.
- **Adaptive logic:** `const isReturning = recentTools.length > 0;` drives the hero modifier and section order. No new storage keys.

## Accessibility (AODA / WCAG 2.2 AA)

- All text on tinted surfaces checked for ≥ 4.5:1 contrast (gold `#FFC20E` on navy passes for large text/accents; body copy stays `--text-primary`/`--text-secondary` on dark surfaces as today).
- Diagram: `role="img"` + descriptive `aria-label`; animation honors `prefers-reduced-motion`; no flashing, nothing loops.
- Tool tiles are `<button>`s with visible focus rings (existing focus style); education-tile links are real `<a>`s; smooth-scroll CTAs use `scrollIntoView({ behavior: 'smooth' })` guarded by reduced-motion preference, and targets get `tabindex="-1"` + programmatic focus so keyboard/AT users land where the scroll goes.
- Heading order: one `h1` (hero), `h2` per section, `h3` inside tiles/cards.
- Stat strip is a list (`<ul>`) semantically, not a table.

## Error handling / edge cases

- Empty `recentTools` → first-timer layout (default).
- Registry changes (tool removed): bento tool IDs filtered through `ALL_TOOLS_MAP` with `.filter(Boolean)` exactly like the current popular list — a missing ID degrades to a smaller grid, never crashes.
- Tool count in stat strip derived from the registry so it can never go stale.

## Testing / verification

- `npm run dev` + preview tools: verify first-timer layout, then seed `localStorage` recent tools and verify compact-hero/returning layout.
- Keyboard pass: tab order hero → stats → bento → steps → guides → accordion; focus visible on every interactive element.
- `prefers-reduced-motion` emulation: diagram static, no smooth scroll.
- Mobile (375px) and tablet (768px) breakpoints: hero stacks, bento collapses 4→2→1, no horizontal scroll.
- `npm run security:audit` and `npx vite build` clean; Lighthouse a11y score ≥ current.
- CLAUDE.md "Recent Changes" updated as part of the implementation PR.
