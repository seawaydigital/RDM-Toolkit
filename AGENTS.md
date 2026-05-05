# Agent Guidance

This repository is the RDM Toolkit, a client-side React/Vite application for Lakehead University research data workflows.

## AODA / WCAG 2.0 Status

Current evidence as of 2026-05-05:

- Branch `codex/aoda-wcag20-safe-baseline` added the Lakehead accessibility statement, accessibility-barrier feedback flow, full-route axe scan mode, route inventory, and audit evidence package.
- Full automated AODA scan command:

```powershell
$env:A11Y_TAGS='wcag2a,wcag2aa'
$env:A11Y_ROUTES='all'
npm run a11y:baseline
```

- Latest automated result: 57 public routes scanned, 0 parse errors, 0 WCAG 2.0 A/AA axe violations.
- Evidence files:
  - `docs/accessibility/baseline-2026-05-05.json`
  - `docs/accessibility/baseline-summary-2026-05-05.md`
  - `docs/accessibility/wcag20-route-inventory-2026-05-05.md`
  - `docs/accessibility/aoda-wcag20-aa-audit-report-2026-05-05.md`
  - `docs/accessibility/manual-test-script-wcag20-aa.md`
  - `docs/accessibility/manual-test-results-2026-05-05.md`

## Compliance Claim Boundary

Do not overstate compliance.

Safe wording:

> RDM Toolkit has a clean automated WCAG 2.0 Level A/AA scan across all current public routes.

Do not claim any of the following until manual evidence is complete:

- "The entire site is AODA compliant."
- "Fully WCAG 2.0 AA conformant."
- "Final compliance verified."

Manual testing still required before a final claim:

- Keyboard-only review of shell, sidebar, search, feedback, upload controls, and representative tool workflows.
- Screen reader smoke test, preferably NVDA with Chrome or Edge on Windows.
- 200% zoom/reflow review.
- High-risk pointer workflow review for `#reorder-pages`, `#sign-pdf`, `#fillable-pdf-form`, `#pdf-redaction`, and `#image-cropper`.

## Accessibility Work Rules

- Keep `npm run build` passing.
- Keep the full-route WCAG 2.0 scan clean when changing UI:

```powershell
$env:A11Y_TAGS='wcag2a,wcag2aa'
$env:A11Y_ROUTES='all'
npm run a11y:baseline
```

- If a scan creates `docs/accessibility/baseline-YYYY-MM-DD.*`, commit it only when it is intentionally part of the evidence package.
- When adding form controls, use explicit labels or reliable accessible names.
- When adding icon-only controls, give the control an accessible name and mark decorative icons `aria-hidden="true"`.
- Avoid pointer-only essential workflows. If a canvas or drag interaction is essential, provide or document a keyboard-accessible alternative.
