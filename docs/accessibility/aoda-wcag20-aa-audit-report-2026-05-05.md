# AODA WCAG 2.0 AA audit report - 2026-05-05

## Executive summary

RDM Toolkit has a clean automated WCAG 2.0 A/AA scan across the current public route inventory. The scan covered 57 routes with zero parse errors and zero axe violations.

This is a strong AODA readiness milestone, but it is not a final conformance claim by itself. Manual keyboard, zoom/reflow, and screen reader checks remain required, especially for pointer-heavy tools.

## Scope

In scope:

- Public React/Vite single-page application routes.
- Static information pages.
- Browser-based file tools.
- Feedback and accessibility-barrier reporting flow.
- Generated client-side UI states visible during ordinary route load.

Out of scope for this report:

- Third-party sites linked from the application.
- User-provided files and user-generated output quality.
- Formal legal certification.

## Standard

Target standard:

- AODA public web requirement.
- WCAG 2.0 Level A and Level AA.

AODA media exceptions noted:

- WCAG 2.0 SC 1.2.4 Captions (Live).
- WCAG 2.0 SC 1.2.5 Audio Description (Prerecorded).

No first-party audio or video media is currently part of the tested route inventory.

## Automated test evidence

Command used:

```powershell
$env:A11Y_TAGS='wcag2a,wcag2aa'
$env:A11Y_ROUTES='all'
npm run a11y:baseline
```

Results:

- Routes scanned: 57
- Parse errors: 0
- Critical violations: 0
- Serious violations: 0
- Moderate violations: 0
- Minor violations: 0

Evidence files:

- `docs/accessibility/baseline-2026-05-05.json`
- `docs/accessibility/baseline-summary-2026-05-05.md`
- `docs/accessibility/wcag20-route-inventory-2026-05-05.md`

## Remediation completed in this branch

- Added explicit labels for previously unlabeled range controls in Strong Password Generator.
- Increased WelcomeTour step-dot hit targets.
- Added an accessibility statement route at `/#accessibility`.
- Added an accessibility-barrier topic to the feedback modal.
- Added full-route AODA scan support to `scripts/axe-baseline.mjs`.
- Fixed select/input/textarea accessible-name issues found by the full-route scan.
- Fixed the Acrobat Alternative paid-price contrast issue.

## Manual testing status

Manual testing is pending. Required evidence is defined in:

- `docs/accessibility/manual-test-script-wcag20-aa.md`
- `docs/accessibility/manual-test-results-2026-05-05.md`

Minimum manual checks before a stronger conformance statement:

- Keyboard-only review of shell, sidebar, search, feedback, upload, and representative tool flows.
- Screen reader smoke test with NVDA and Chrome or Edge on Windows.
- 200% zoom/reflow review.
- Essential-task review for pointer-heavy tools.

## Known higher-risk areas

The following tools need manual keyboard review because axe cannot prove their essential workflows are keyboard-operable:

- `/#reorder-pages`
- `/#sign-pdf`
- `/#fillable-pdf-form`
- `/#pdf-redaction`
- `/#image-cropper`

If any essential task is pointer-only, document the barrier and add a keyboard-accessible alternative or an accessible workaround before claiming conformance.

## Current recommendation

Current wording supported by the evidence:

> RDM Toolkit has a clean automated WCAG 2.0 Level A/AA scan across all current public routes. Manual keyboard and assistive technology testing is in progress.

Avoid this wording until manual evidence is complete:

> RDM Toolkit is fully AODA compliant.
