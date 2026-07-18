# Accessibility patterns — RDM Toolkit

Conventions established in AODA Phases 0–1. Later phases follow these. Updated as patterns are added.

## Focus ring

- Use `:focus-visible`, never `:focus` alone.
- Global fallback in [global.css](../../src/styles/global.css): 2px gold (`var(--accent-primary)`) outline + 2px offset on `a`, `button`, `[role="button"]`, `input`, `textarea`, `select`, and positive-tabindex elements.
- Component-specific `:focus-visible` rules override where a different treatment is needed.
- Never `outline: none` without a visible replacement (exception: `.main-content:focus-visible` — the skip-link target itself).

## Contrast tokens

- Every `--text-*` / `--accent-primary` token passes 4.5:1 on every `--bg-*` token. Verified by `npm run a11y:contrast` (add to CI if tokens change).
- Component colors that sit on tinted/translucent surfaces must be checked against the *composited* background, not the token. Known safe picks on dark tints: `#F87171` (red), `#93C5FD` (blue), `#E25555` (brand red on sidebar inset).
- `var(--accent-red)` (#EF4444) passes on `--bg-primary` but FAILS on card surfaces — use `#F87171` for text on cards.

## alert vs status

- `role="alert"` (assertive — interrupts SR speech): fatal errors only — encrypted PDF, save failed.
- `role="status"` (polite — queues): warnings, success messages, neutral updates.
- Canonical example: [DropZone.jsx](../../src/components/ui/DropZone.jsx) — warning uses `status`.

## Live regions

- Single global `#route-announcer` (App.jsx) for hash route changes — announces "<page title>, page loaded" and updates `document.title`. Hash navigation never reloads the page, so this is the only route signal assistive tech gets.
- Per-tool `aria-live="polite"` regions for result completion.

## Skip link

- `.skip-to-content` is the first focusable element; targets `#main-content` (`<main tabIndex={-1}>`).

## Touch targets (WCAG 2.5.8)

- Interactive controls ≥ 24×24 CSS px. When the *visual* affordance should stay small (e.g. welcome-tour dots), keep the button 24×24 and draw the visual via `::before`.

## Visually hidden

- `.visually-hidden` utility class in global.css — in the accessibility tree, not rendered. Use for SR-only text; never `display: none` for content SRs should read.

## Decorative icons

- Lucide icons paired with text get `aria-hidden="true"`.
- Meaningful standalone icons (icon-only buttons): button gets `aria-label`; icon stays `aria-hidden`.

## Links in prose

- Links inside text blocks must be distinguishable without color — underline them (axe `link-in-text-block`).

## Forms

- `<label htmlFor>` + `id` always — never placeholder-only or proximity-only labels.
- `<fieldset>` + `<legend>` for radio groups.

## Headings

- Single `<h1>` per route (the App-level tool header emits it for tools).
- No skips in hierarchy.

## Tables

- `<th scope="col">` / `<th scope="row">` always; `<caption>` for non-trivial tables.

## Motion preferences

- Global `prefers-reduced-motion: reduce` rule in global.css zeroes all animations/transitions.
- Component-specific overrides must not bypass it.

## Verification

- `npm run build && npm run a11y:baseline` — axe-core scan of 10 representative routes (writes to `docs/accessibility/`). Requires headless Chrome; in environments where chromedriver can't launch, run axe in a real browser (see baseline-2026-07-07 notes).
- `npm run a11y:contrast` — token-combination contrast audit (`--strict` exits 1 on failures).
- Lighthouse CI asserts accessibility ≥ 0.95 on every PR.
