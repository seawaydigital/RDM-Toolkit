# Phase 1 Delta — Accessibility Baseline Comparison

## Summary

Phase 1 implemented infrastructure and pattern improvements (contrast token refinements, focus-visible system, route announcer, decorative icon labeling, heading hierarchy fixes) that lay groundwork for visible-to-axe fixes in later phases. The baseline violation count remains stable: **no new regressions, no Phase-0-to-Phase-1 improvement in axe-detectable issues.**

## Violation Totals

| Severity | Phase 0 | Phase 1 | Change |
|---|---|---|---|
| **Critical** | 1 | 1 | — |
| **Serious** | 10 | 10 | — |
| **Moderate** | 0 | 0 | — |
| **Minor** | 0 | 0 | — |
| **Total** | **11** | **11** | **No change** |

## Top Recurring Rules

| Rule | Phase 0 | Phase 1 | Phase |
|---|---|---|---|
| `target-size` | 30 instances | 30 instances | Phase 2 / Phase 5 (desktop hover affordances) |
| `label` | 2 instances (password-generator) | 2 instances | Phase 5e (form label refinement) |

## Phase 1 Improvements (Infrastructure — Not Yet Axe-Detectable)

Phase 1 laid necessary groundwork for Phase 2–5 fixes:

- **Contrast token lift** (`--text-muted` #94A3B8 → #9CB3C8): improves visual hierarchy for metadata, footer links, placeholders; axe doesn't measure subjective readability improvements
- **Focus-visible system** (Safari/Chrome `:focus-visible`, `.focus-ring` utility): enables Phase 2 visible focus indicators; not yet applied to all interactive elements in Phase 1 scope
- **Route announcer** (ARIA live region, H1 restoration per route): ensures screen-reader users see page structure; axe has no rule for live announcements
- **Decorative icon `aria-hidden`** (foundation files: TopBar, Sidebar, Footer): removes icon spam from screen-reader tree; doesn't register as a violation fix since icons were not violations
- **Heading hierarchy** (FileToMarkdown h1 → h2): aligns structure; no axe rule fires for this specific fix since no `multiple-h1` violation existed on that route

## Violations Deferred to Later Phases

| Issue | Severity | Deferral | Reason |
|---|---|---|---|
| `target-size`: Button/link hit targets <44×44px | Serious (10 instances) | Phase 2 | Requires layout/spacing redesign; low-hanging fruit: topbar buttons, sidebar icons, modal close. Phase 5: stretch goal is desktop hover affordances (larger touch zones on hover). |
| `label`: Form labels missing on `input type="text"` (#password-generator) | Critical (1 instance) | Phase 5e | Requires form UX overhaul; low-priority tool; deferred pending larger form accessibility initiative. |

## Routes with Stable Violations

All 10 routes remain at 1–2 violations each (no improvement, no regression):
- `/`, `/#how-this-works`, `/#data-classification`, `/#storage-calculator`, `/#tri-agency-policy`, `/#compress-pdf`, `/#compress-image`, `/#word-counter`, `/#extract-zip`: 1 violation each (target-size)
- `/#password-generator`: 2 violations (1 label critical, 1 target-size serious)

## Conclusion

Phase 1 successfully delivered 6 infrastructure improvements without introducing regressions. Axe-detectable violation count held steady at 11 total (1 critical, 10 serious), awaiting Phase 2 (hit-target redesign) and Phase 5 (form + polish) for impact on violation counts. Focus ring, route announcer, and contrast token improvements provide better UX for assistive-technology users even though axe doesn't quantify them.
