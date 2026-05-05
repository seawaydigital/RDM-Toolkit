# Phase 4 baseline delta — 2026-05-05

## Totals comparison

| Severity | Phase 3 | Phase 4 | Δ |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| Serious | 10 | 10 | 0 |
| Moderate | 0 | 0 | 0 |
| Minor | 0 | 0 | 0 |

Same as Phase 3. The 10 serious are all `target-size` (30 instances across routes); the 1 critical is `label` on `/#password-generator`. Both are scoped to Phase 5 (per-tool batches).

## Phase 4 work that doesn't show in axe static scan

- **Decorative icon `aria-hidden`** across 3 prose pages (HowThisWorks, RequestATool, GrantsAndIdentifiers): runtime SR behavior, not flagged by axe's static rules unless an icon was the only content of an interactive element.
- **External-link "(opens in new tab)" indicators** on GrantsAndIdentifiers (4 instances): SR-only context cue, not visible to axe.
- **DRACServices ARIA tabs pattern**: full `role="tablist"` / `tab` / `tabpanel` with arrow-key navigation. Axe's static scan doesn't drive interaction — the pattern is verified by a manual keyboard test.
- **StorageCalculator chart canvas `aria-hidden` + legend `<dl>`/`<dt>`/`<dd>`**: same data, more semantic markup. Axe doesn't penalize the prior `<div>` legend (no rule fires) so the improvement is invisible to the static scan.

## Phase 4c deferred

Three pages were in scope for Phase 4c but deferred to a future iteration:
- `TriAgencyPolicy.jsx` (18 external links missing "(opens in new tab)" indicators; CLAUDE.md mentioned an SVG flowchart that no longer exists in the file)
- `LakeheadDataverse.jsx` (3 external links)
- `AcrobatAlternative.jsx` (1 external link + cost-badge contrast verification)

Total ~22 individual link-level edits. None are axe-flagged; they're best-practice SR context cues. Tracked as a follow-up that fits naturally with future Phase 4c work.

## Phase 5 preview

The remaining `target-size` count (30 instances) and `label` critical (2 instances on /#password-generator) belong to per-tool UI in `src/tools/` — Phase 5 territory. Phase 5 is the largest phase (46 tools across 7 PR batches per the master plan).
