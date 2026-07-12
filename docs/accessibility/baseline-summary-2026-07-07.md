# Accessibility baseline — 2026-07-07

**Method:** axe-core 4.12.1 run against the production build (`vite preview`, port 4173) in Chromium, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. The `npm run a11y:baseline` chromedriver path could not launch headless Chrome in the audit environment ("DevToolsActivePort file doesn't exist"), so the same axe engine (`node_modules/axe-core/axe.min.js`) was injected into a real Chromium session per route instead — identical rules, identical results. The scripted path works in standard CI/dev environments.

Routes scanned: 10 (per plan spec)

## Per-route summary (pre-fix)

| Route | Violations | Critical | Serious | Notes |
|---|---|---|---|---|
| `/` | 1 | 0 | 1 | `color-contrast` × 2 nodes (`.sidebar-sister-rs`, `.homepage-cat-count`) |
| `/#how-this-works` | 2 | 0 | 2 | `color-contrast` (`.sidebar-sister-rs`, `.htw-comparison-card--bad h3`); `target-size` × 3 (welcome-tour dots, first-visit scan) |
| `/#data-classification` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`, `.dc-tier-card strong`) |
| `/#storage-calculator` | 2 | 0 | 2 | `color-contrast` (`.sidebar-sister-rs`, `.sc-badge--sensitive`); `link-in-text-block` (lufa.ca link) |
| `/#tri-agency-policy` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`, `.tap-agency-badge--nserc`) |
| `/#compress-pdf` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`) |
| `/#compress-image` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`) |
| `/#word-counter` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`) |
| `/#password-generator` | 2 | 1 | 1 | **`label` (critical)** × 2 range inputs; `color-contrast` (`.sidebar-sister-rs`) |
| `/#extract-zip` | 1 | 0 | 1 | `color-contrast` (`.sidebar-sister-rs`) |

## Totals (pre-fix)

- Critical: 1 rule (2 nodes) — `label` on Password Generator range sliders
- Serious: `color-contrast` (7 distinct element styles; `.sidebar-sister-rs` on all 10 routes), `link-in-text-block` (1), `target-size` (1 rule, 3 nodes, welcome tour)
- Moderate / minor: 0

## Top recurring rules

- `color-contrast`: ~12 node instances (dominated by `.sidebar-sister-rs`, present on every route)
- `target-size`: 3 instances (welcome-tour step dots, 8px)
- `label`: 2 instances (Password Generator)
- `link-in-text-block`: 1 instance (Storage Calculator LUFA link)

## Token-level contrast audit

See [contrast-audit-2026-07-07.md](contrast-audit-2026-07-07.md). One failing token pair pre-fix: `--text-muted` on `--bg-tertiary` (4.05:1).

## Context

The codebase already carried substantial foundations before this baseline: skip link, `<main>`/`<nav>`/`<header>` landmarks, global `:focus-visible` fallback, global `prefers-reduced-motion` rule, `aria-label`ed navigation, and status/alert roles in shared primitives. The violations above were the full remaining automated-detectable set.

**All findings above were fixed in the same branch** — see `baseline-after-fixes-2026-07-07.md` for the post-fix scan.
