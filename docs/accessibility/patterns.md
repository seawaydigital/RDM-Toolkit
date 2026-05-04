# Accessibility patterns — RDM Toolkit

Conventions established during the Phase 1 AODA foundations work (May 2026). Phases 2–6 follow these. Updated as patterns are added.

This doc is the cross-PR consistency anchor for accessibility work. PR descriptions for accessibility-touching changes should reference the relevant section.

## Focus ring

- Use `:focus-visible`, never `:focus` alone.
- Default: 2px gold (`var(--accent-primary)`) outline + 2px offset on dark surfaces.
- On gold or parchment surfaces, add the `.on-gold-surface` class — outline switches to navy via `--focus-ring-on-gold` (an alias to `--bg-primary`).
- Never `outline: none` without a visible replacement.
- The Phase 1 audit verified all 29 existing `outline: none` declarations have a visible replacement (border-color change, box-shadow, or background highlight on `:focus`).
- Reference: [src/styles/global.css](../../src/styles/global.css) — search for `:focus-visible`.

## alert vs status

- `role="alert"` (assertive — interrupts SR speech): fatal errors only.
  - Examples: encryption failed, password incorrect, network unreachable.
- `role="status"` (polite — queues): warnings, success messages, neutral updates.
  - Examples: file uploaded, password copied, classification updated.
- **Canonical example:** [src/components/ui/DropZone.jsx](../../src/components/ui/DropZone.jsx) — error uses `role="alert"`, warning uses `role="status"` (lines 162-163). Use this as the reference when deciding which to apply.

## Live regions

- Single global `#route-announcer` in [src/App.jsx](../../src/App.jsx) — announces page title on hash route change ("Compress PDF, page loaded"). Hash routing doesn't trigger this natively.
- `aria-atomic="true"` so the full text is read each update.
- Per-tool `aria-live="polite"` regions for result completion (Phase 2 wiring through ResultPanel).
- Use `aria-busy="true"` on parent during long operations (Phase 2 convention).

## Modals (Phase 2 — to be drafted)

[Drafted in Phase 2.A — extracts existing FeedbackModal pattern at src/components/ui/FeedbackModal.jsx into a `useModalAccessibility` hook. The hook provides: focus trap, focus restoration, body scroll lock, Escape close, role="dialog" + aria-modal. WelcomeTour and the mobile sidebar drawer (Phase 3) will reuse it.]

## aria-current="page"

- Active sidebar tool/page link gets `aria-current="page"` (Phase 3 application).
- Visual styling stays as-is (gold left rail).

## aria-disabled vs disabled

- For buttons in busy/conditional states, prefer `aria-disabled="true"` over the native `disabled` attribute.
- Reason: `aria-disabled` keeps the button keyboard-focusable so screen-reader users can hear *why* it's not actionable.
- Apply during Phase 2 to ActionButton.

## External links

- Add visually-hidden `(opens in new tab)` text alongside any external-link icon, so screen-reader users hear the context.
- Pattern:
  ```jsx
  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
    Link text
    <ExternalLink size={14} aria-hidden="true" />
    <span className="visually-hidden"> (opens in new tab)</span>
  </a>
  ```
- The `.visually-hidden` utility is defined globally in [src/styles/global.css](../../src/styles/global.css).

## Decorative icons

- All lucide icons paired with text or in a labelled parent (button with aria-label, link with text) get `aria-hidden="true"`.
- Phase 1 applied this to the 18 icons in 3 foundation files: Topbar.jsx (5), Sidebar.jsx (12), DropZone.jsx (1).
- Phase 4-5 will extend this convention to page and tool components incrementally as PRs touch them — full sweep is unnecessary because parents have accessible names (axe baseline showed 0 violations on icon-related rules).
- Meaningful standalone icons (icon-only buttons): button gets `aria-label`; icon gets `aria-hidden`. Example: Topbar mobile feedback button.

## Tables

- `<th scope="col">` and `<th scope="row">` always.
- `<caption>` for non-trivial tables (anything beyond a 2-column quick-reference).
- Phase 4 will apply across all info-page tables (control matrix, pillar matrix, repository picker, task coverage).

## Forms

- `<label htmlFor>` always — never placeholder-only labels.
- `<fieldset>` + `<legend>` for radio groups (Phase 4 application: DataClassification wizard).
- Required fields: native `required` attribute + visible indication (asterisk, "Required") rather than relying on color alone.

## Headings

- Single `<h1>` per route. The App.jsx tool-header pattern owns the h1 for tool routes; each info-page component owns its own h1.
- Heading hierarchy unbroken (no h2 → h4 jumps). Phase 1 audit found one violation (FileToMarkdown.jsx had a redundant h1 alongside App.jsx tool-header) — demoted to h2.

## Best-effort canvas tools (Phase 5 — to be drafted)

[Drafted in Phase 5.B — additive alternative pattern (typed name / coordinate form / numeric input). Never a replacement that regresses sighted UX. Examples: SignPDF (Draw | Type | Upload tabs), PDFRedaction (Draw | By coordinates), ImageCropper (canvas + numeric inputs), FillablePDFForm (click-to-place + arrow-key nudging).]

## Motion preferences

- Global `@media (prefers-reduced-motion: reduce)` rule in [src/styles/global.css](../../src/styles/global.css) zeroes all animations/transitions.
- Component-specific overrides should respect this — never bypass with `!important` unless equally bypassed in the reduce rule.
- The Phase 1 baseline showed multiple component-level prefers-reduced-motion blocks (HowThisWorks timeline, etc.) plus a global fallback already in place from prior tester-readiness work.

## Skip-to-main-content link

- Implementation: [src/App.jsx](../../src/App.jsx) — first child of the layout, class `skip-to-content`. Targets `#main-content` (set on `<main>` in MainContent.jsx with `tabIndex={-1}` for programmatic focus reception).
- Visually-hidden by default; slides into view on focus.
- WCAG 2.4.1 (Bypass Blocks).
