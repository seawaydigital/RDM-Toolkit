# Accessibility scan after fixes — 2026-07-07

Same method and 10 routes as [baseline-summary-2026-07-07.md](baseline-summary-2026-07-07.md) (axe-core 4.12.1, production build, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`).

## Result: 0 violations on all 10 routes

| Route | Violations | h1 count | document.title |
|---|---|---|---|
| `/` | 0 | 1 | RDM Toolkit — Research Data Management Tools |
| `/#how-this-works` | 0 | 1 | How This Works — RDM Toolkit |
| `/#data-classification` | 0 | 1 | Data Classification Tool — RDM Toolkit |
| `/#storage-calculator` | 0 | 1 | Research Storage Calculator — RDM Toolkit |
| `/#tri-agency-policy` | 0 | 1 | Tri-Agency RDM Policy — RDM Toolkit |
| `/#compress-pdf` | 0 | 1 | Compress PDF — RDM Toolkit |
| `/#compress-image` | 0 | 1 | Compress Image — RDM Toolkit |
| `/#word-counter` | 0 | 1 | Word Counter — RDM Toolkit |
| `/#password-generator` | 0 | 1 | Password Generator — RDM Toolkit |
| `/#extract-zip` | 0 | 1 | Extract ZIP — RDM Toolkit |

First-visit state (welcome tour open) also re-scanned on `/`: 0 violations; tour dots measure 24×24.

## Fixes applied

| Finding | Fix |
|---|---|
| `label` (critical) — Password Generator sliders | `htmlFor`/`id` pairs (`pw-length`, `pw-count`) in [PasswordGenerator.jsx](../../src/tools/privacy/PasswordGenerator.jsx) |
| `color-contrast` — `.sidebar-sister-rs` (all routes) | `#D53A3A` → `#E25555` (4.0 → 4.9:1) |
| `color-contrast` — `.homepage-cat-count` | `--text-muted` → `--text-secondary` on the pill |
| `color-contrast` — `.htw-comparison-card--bad h3` | `var(--accent-red)` → `#F87171` (3.6 → 4.9:1) |
| `color-contrast` — `.dc-tier-card` confidential tier | TIERS color `#EF4444` → `#F87171` |
| `color-contrast` — `.sc-badge--sensitive` | `var(--accent-red)` → `#F87171` |
| `color-contrast` — `.tap-agency-badge--nserc` | `#60A5FA` → `#93C5FD` (4.4 → 6.2:1) |
| `link-in-text-block` — LUFA links (Storage Calculator) | underlined |
| `target-size` — welcome-tour dots (8px) | 24×24 buttons, visual dot drawn via `::before` |
| Token audit — `--text-muted` on `--bg-tertiary` 4.05:1 | token `#7C9BBF` → `#86A6C9` (≥4.5:1 on every surface) |

## New in this pass (beyond fixes)

- Route announcer: polite live region announces "<title>, page loaded" on every hash navigation; `document.title` now updates per route (WCAG 2.4.2, 4.1.3).
- `<html lang="en-CA">`.
- Lighthouse CI accessibility threshold raised 0.9 → 0.95.
- `npm run a11y:baseline` (axe scan driver), `npm run a11y:contrast` (token audit, `--strict` for CI), `npm run a11y:contrast:test`.
- Dev-only `@axe-core/react` console reporting in `npm run dev`.
- [patterns.md](patterns.md) conventions doc.

## Outstanding (not automated-detectable; future phases)

- Manual screen-reader testing (NVDA/VoiceOver) — out of scope per spec.
- Canvas-based tool alternatives (sign-pdf, pdf-redaction, image-cropper, fillable-pdf-form) — Phase 5.
- SearchBar combobox ARIA pattern, DRACServices tabs ARIA, StorageCalculator chart data table — Phases 2–4.
- Accessibility statement page — Phase 6.
