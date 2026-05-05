# WCAG 2.0 AA manual test results - 2026-05-05

Status: not yet complete.

Automated baseline:

- Command: `A11Y_TAGS=wcag2a,wcag2aa A11Y_ROUTES=all npm run a11y:baseline`
- Routes scanned: 57
- Parse errors: 0
- Violations: 0
- Evidence files:
  - `docs/accessibility/baseline-2026-05-05.json`
  - `docs/accessibility/baseline-summary-2026-05-05.md`

## Manual environment

| Field | Value |
|---|---|
| Tester | Pending |
| Date | Pending |
| Browser/version | Pending |
| Operating system | Pending |
| Assistive technology | Pending |
| Viewport/device | Pending |

## Results

| Area | Route or flow | Result | Notes |
|---|---|---|---|
| Global shell | `/` skip link, topbar, sidebar | Pending | Keyboard-only review required |
| Mobile sidebar | menu open/close/focus return | Pending | Keyboard-only review required |
| Search modal | open, navigate, select, close | Pending | Keyboard-only review required |
| Feedback modal | topics, close, focus return | Pending | Keyboard-only review required |
| Accessibility barrier flow | `/#accessibility` to feedback modal | Pending | Verify topic preselection and mailto subject |
| Static pages | all information routes | Pending | Heading/link/zoom review required |
| PDF representative | `/#compress-pdf` | Pending | Keyboard workflow required |
| Image representative | `/#compress-image` | Pending | Keyboard workflow required |
| Text representative | `/#word-counter` | Pending | Keyboard workflow required |
| Security representative | `/#password-generator` | Pending | Keyboard workflow required |
| Archive representative | `/#extract-zip` | Pending | Keyboard workflow required |
| High-risk pointer tools | reorder/sign/fill/redact/crop | Pending | Essential-task keyboard path must be verified |
| Screen reader smoke test | NVDA + Chrome/Edge | Pending | Landmarks, labels, modals, results |
| 200% zoom/reflow | desktop and mobile width | Pending | Check clipping/overlap |

## Findings

No manual findings recorded yet.

## Recommendation

Do not make a final conformance claim until the pending manual checks are complete. Current automated evidence supports "WCAG 2.0 A/AA automated scan clean across all public routes."
