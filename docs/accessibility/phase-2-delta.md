# Phase 2 baseline delta — 2026-05-04

## Totals comparison

| Severity | Phase 1 | Phase 2 | Δ |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| Serious | 10 | 9 | -1 |
| Moderate | 0 | 0 | 0 |
| Minor | 0 | 0 | 0 |

## Rules that improved

- `target-size`: 30 → 27 instances (-3). Phase 2 ActionButton fix (24×24 minimum) resolved 3 small button targets on the homepage.
- `label`: 2 instances (unchanged) — both remain on `#password-generator` (interactive strength meter feedback).

## Rules that remain

- `target-size`: 27 instances still firing across 9 routes (all routes except homepage). Remaining issues: small icon buttons in Topbar (search, feedback), Sidebar (close/category toggles), RelatedTools pill buttons, SearchBar results, and tool-specific inline icons.
- `label`: 2 instances on `#password-generator` — linked feedback output lacks explicit `<label>` or `aria-label` (strength meter reading is runtime-updated text, not a labelled form control — intentionally deferred to Phase 3).
- `color-contrast` (pre-existing): Not reported by axe 4.8, likely below reportable threshold or masked by vendor prefixes in computed styles.

## Unexpected changes

None. The homepage violation was the only Phase 1 issue touched by Phase 2 work (ActionButton 24×24 minimum sizing).

## Phase 2 work that should have axe-detectable impact

- ActionButton: defensive 24×24 minimum target size — **hit**: 3 instances on homepage resolved (search icon, feedback icon, category toggle).
- aria-disabled / aria-busy on ActionButton — axe does not flag semantic ARIA state changes; no impact on static violations.
- SearchBar combobox ARIA — static scan does not evaluate keyboard interaction states; no axe impact.
- Tooltip dismissibility — no axe impact for static scan.
- ResultPanel live region — no axe impact for static scan.

## Phase 2 work that won't affect axe baseline

- useModalAccessibility hook extraction (refactor).
- WelcomeTour migration to custom hook (refactor).
- patterns.md draft (docs).

## Next steps

Phase 3 should focus on:
1. Remaining `target-size` across other routes (Sidebar, Topbar icons, tool-specific buttons).
2. SearchBar results pills + Sidebar tool items (both are small touch targets).
3. Password Generator strength meter (add `aria-live="polite"` + explicit label or `aria-describedby` to clarify feedback source).
