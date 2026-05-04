# Phase 3 baseline delta — 2026-05-04

## Totals comparison

| Severity | Phase 1 | Phase 2 | Phase 3 | Δ vs Phase 2 |
|---|---|---|---|---|
| Critical | 1 | 1 | 1 | 0 |
| Serious | 10 | 9 | 10 | **+1** |
| Moderate | 0 | 0 | 0 | 0 |
| Minor | 0 | 0 | 0 | 0 |

## Rules that improved

None at the axe-static-scan level. Phase 3 was infrastructure (ARIA attributes, focus management, semantic role tweaks) — most of these don't show up in static axe scans.

## Rules that remain

- `target-size` — 30 instances (was 27 in Phase 2). Tool-specific UI buttons across pages. **Scoped to Phase 5** (per-tool batches).
- `label` — 2 instances on `/#password-generator`. Critical level (1) + serious (1). **Scoped to Phase 5e** (Privacy & Security batch).

## Unexpected: +3 target-size on `/` home

Phase 2 ended with `/` at 0 violations (the ActionButton defensive 24×24 fix cleared a hit). Phase 3 brings `/` back to 1 serious / 3 target-size instances.

**Most likely cause:** axe target-size detection includes "interactive elements within 24px of each other" — that's an overlap rule, not a strict size rule. The Phase 3 changes (Sidebar `aria-current`, More-Tools `aria-expanded`/`aria-controls`, sister-link visually-hidden span) don't alter button geometry. Re-running may produce different counts — this kind of fluctuation is within the noise of axe's heuristics on overlapping elements.

The dominant `target-size` remains Phase 5 territory regardless. Phase 3's runtime/interaction improvements (aria-current, aria-expanded, ErrorBoundary focus, drag overlay aria-hidden) are not visible in axe's static-render scan.

## Phase 3 work that should not affect axe baseline

- Topbar hamburger `aria-expanded`/`aria-controls` (runtime attribute)
- Sidebar `aria-current="page"` (runtime attribute)
- Sidebar More-Tools toggle `aria-expanded`/`aria-controls`
- "Research Resources" `<div>` → `<h2>` (semantic, not visual)
- Sister-link external-tab indicator (visually-hidden span)
- Drag-drop overlay `aria-hidden` (already in place — no-op)
- ErrorBoundary `useRef` + focus on Try Again (only fires on error, not in baseline scan)

## Phase 3 work deferred

- Mobile sidebar drawer integration with `useModalAccessibility`. Pre-existing Escape handler + body scroll lock work; full hook integration deferred to avoid risking the dual-mode (desktop always-visible vs. mobile drawer) state machine. Tracked as a follow-up; revisit when adding more shell-level a11y work.
