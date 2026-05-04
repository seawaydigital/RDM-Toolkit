# AODA Phase 2 — Shared UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Follows from `2026-05-03-aoda-compliance-plan.md` master plan.

**Goal:** Apply WCAG 2.2 AA conventions to the 13 shared UI primitives in `src/components/ui/` so Phase 3-5 work inherits accessible building blocks.

**Conventions reference:** [docs/accessibility/patterns.md](../../accessibility/patterns.md) — established in Phase 1.

**Tech stack:** Same as Phase 0+1. No new dependencies. axe-cli + manual smoke tests for verification.

**Branch:** `a11y/phase-2` (stacked on `a11y/phase-0-1`).

---

## Component inventory (13 components)

| Component | Issue class | Group |
|---|---|---|
| `ActionButton` | Form-style input + size | C |
| `DropZone` | Form-style input + status messaging | B+C |
| `EncryptedPDFError` | Status messaging | B |
| `ErrorCard` | Status messaging | B |
| `FeedbackModal` | Modal/overlay | A |
| `HowItWorks` | Disclosure widget | G |
| `InfoCard` | Status messaging | B |
| `RelatedTools` | List/navigation | E |
| `ResultPanel` | Status messaging | B |
| `SearchBar` | Form-style input (combobox) | C |
| `ToolSkeleton` | Loading state | F |
| `Tooltip` | Hover/focus content | D |
| `WelcomeTour` | Modal/overlay | A |

**Pre-existing strengths** (don't redo): FeedbackModal already has focus trap + restore + Escape close. DropZone already splits `role="alert"` for error vs `role="status"` for warning. The `target-size` baseline issue (10 hits) is likely in ActionButton or related — Phase 2.C should clear most of it.

---

## PR split

- **PR 2A** — Group A (modals) + Group B (status/alert): `FeedbackModal`, `WelcomeTour`, `ErrorCard`, `InfoCard`, `ResultPanel`, `EncryptedPDFError`. Plus the new `useModalAccessibility` hook extraction.
- **PR 2B** — Groups C/D/E/F/G: `DropZone`, `SearchBar`, `ActionButton`, `Tooltip`, `RelatedTools`, `ToolSkeleton`, `HowItWorks`.

---

# PR 2A — Modals + Status/Alert (Days 7–10)

### Task 2A.1: Extract `useModalAccessibility` hook from FeedbackModal pattern

**Files:**
- Create: `src/hooks/useModalAccessibility.js`
- Modify: `src/components/ui/FeedbackModal.jsx` (consume the hook)

**Step 1: Read FeedbackModal.jsx lines 60-90** to understand the existing pattern (focus trap, focus restoration, Escape close, body scroll lock). Document the API the hook should expose.

**Step 2: Create `useModalAccessibility` hook**

API: `useModalAccessibility({ isOpen, onClose, initialFocusRef, dialogRef })` returns nothing; performs side effects:
- On open: capture `document.activeElement` for restoration; set initial focus to `initialFocusRef.current ?? dialogRef.current`
- While open: trap Tab/Shift-Tab cycling within `dialogRef.current` (find focusable elements via the standard selector); listen for Escape key (calls `onClose`); set `document.body.style.overflow = 'hidden'`
- On close: restore focus to captured element; restore body overflow

**Step 3: Refactor FeedbackModal to use the hook** — move existing focus-trap/Escape/scroll-lock logic into the hook. JSX should still get `role="dialog" aria-modal="true" aria-labelledby={titleId}` directly. Verify behavior unchanged via dev smoke test.

**Step 4: Smoke test** `npm run dev` + open feedback modal: Tab cycles within, Escape closes, body doesn't scroll, focus restores on close.

**Step 5: Commit**: `a11y(ui): extract useModalAccessibility hook from FeedbackModal`

---

### Task 2A.2: Apply `useModalAccessibility` to WelcomeTour

**File:** `src/components/ui/WelcomeTour.jsx`

WelcomeTour likely has bespoke focus management. Replace it with the hook.

**Step 1:** Read current WelcomeTour focus/Escape/scroll-lock logic.
**Step 2:** Add `role="dialog" aria-modal="true" aria-labelledby` and `useModalAccessibility` hook usage.
**Step 3:** Verify the 3-step navigation (Arrow keys, dot indicators, Esc) still works.
**Step 4:** Build clean.
**Step 5:** Commit: `a11y(ui): apply useModalAccessibility hook to WelcomeTour`

---

### Task 2A.3: Audit + fix status/alert role usage in remaining UI components

**Files:** `src/components/ui/ErrorCard.jsx`, `InfoCard.jsx`, `ResultPanel.jsx`, `EncryptedPDFError.jsx`

For each component:
- Read the file
- Verify role choice per `patterns.md` `alert vs status` section:
  - `role="alert"` only for fatal errors (interrupts SR)
  - `role="status"` for warnings, success, neutral updates
- DropZone is the canonical example (already correct in Phase 1; don't re-touch)

If a component lacks any role attribute, add the appropriate one. If it uses the wrong role, switch.

**Most likely outcomes:**
- `ErrorCard` should have `role="alert"` (it's used for fatal errors)
- `InfoCard` should have `role="status"` or no role (informational, not assertive)
- `ResultPanel` should have `aria-live="polite"` on the result content area so completion announces ("PDF compressed, file ready for download")
- `EncryptedPDFError` should have `role="alert"` (fatal)

**Step 1-4:** Read each, apply minimal fix, build clean.
**Step 5:** Commit: `a11y(ui): standardize alert/status roles across status-messaging primitives`

---

### Task 2A.4: Wire ResultPanel completion announcement

**File:** `src/components/ui/ResultPanel.jsx`

When a result becomes available, announce via `aria-live="polite"`. The text should be action-descriptive ("PDF compressed, file ready for download") rather than generic ("Result ready").

**Step 1:** Read ResultPanel API — does it accept an `announceText` prop, or is it derived from filename/operation?
**Step 2:** Add `aria-live="polite"` (and `aria-atomic="true"`) to the wrapper that renders when result exists. Or expose an `announceText` prop that callers pass with their tool-specific message.
**Step 3:** Verify against 1-2 representative tools (e.g., `compress-pdf`) that the announcement fires.
**Step 4:** Commit: `a11y(ui): announce ResultPanel completion via aria-live`

(This may be folded into 2A.3 if the changes are small enough.)

---

### Task 2A.5: Open PR 2A

Push branch, open PR titled `feat(a11y): Phase 2A — modal hook + status/alert primitives`. Reference patterns.md and master plan.

---

# PR 2B — Form inputs / hover / lists / loading / disclosure (Days 11–13)

### Task 2B.1: ActionButton — `aria-disabled` + `aria-busy` + size minimum

**File:** `src/components/ui/ActionButton.jsx`

Per spec + Phase 0 baseline (target-size: 10 instances likely include ActionButton):

**Step 1:** Read ActionButton. Confirm it uses real `<button>` (not `<div onClick>`).
**Step 2:** When `disabled`, prefer `aria-disabled="true"` over native `disabled` (keeps the button keyboard-focusable so SR users hear *why* it's not actionable). The native `disabled` should only be used if the button must NOT submit a form.
**Step 3:** When in busy state (loading), add `aria-busy="true"`.
**Step 4:** Verify the rendered button hits **24×24 CSS pixels minimum** (WCAG 2.2 SC 2.5.8 AA). Most lucide-icon ActionButtons should already exceed this; verify in CSS. If not, add `min-width: 24px; min-height: 24px;` to the base class.
**Step 5:** Build + dev smoke test.
**Step 6:** Commit: `a11y(ui): ActionButton aria-disabled, aria-busy, target-size minimum`

---

### Task 2B.2: DropZone — minor tweaks

**File:** `src/components/ui/DropZone.jsx`

DropZone is already 80% there (Phase 0/1 verified). Remaining:

**Step 1:** Confirm the button (`<div role="button" tabIndex={0}>`) hits 24×24 minimum (it's currently a large drop target — should easily pass).
**Step 2:** Verify keyboard activation (`Enter` and `Space` both trigger file picker). Already in place per [DropZone.jsx:96-101](../../../src/components/ui/DropZone.jsx).
**Step 3:** No code changes likely needed beyond `aria-hidden` on the Upload icon (already done in Phase 1.10). May be a no-op task.
**Step 4:** Commit only if changes were made.

---

### Task 2B.3: SearchBar combobox ARIA pattern

**File:** `src/components/ui/SearchBar.jsx`

Implement the WAI-ARIA Authoring Practices combobox pattern.

**Step 1:** Read current SearchBar — understand state model (input, results array, selectedIndex).
**Step 2:** Apply ARIA attributes:
- Wrapper: `role="combobox"`, `aria-expanded={results.length > 0}`, `aria-controls={listboxId}`, `aria-haspopup="listbox"`, `aria-autocomplete="list"`, `aria-activedescendant={activeOptionId}`
- Listbox: `role="listbox"` with id matching `aria-controls`
- Each result: `role="option"` with id, `aria-selected={index === selectedIndex}`
**Step 3:** Implement keyboard navigation: ArrowDown/ArrowUp through results, Enter selects, Escape closes.
**Step 4:** Announce result count via the existing route-announcer (e.g., `setRouteAnnouncement('5 tools match')`) OR a dedicated `aria-live` region.
**Step 5:** Smoke test: open with Cmd/Ctrl+K, type, arrow-key navigate, Enter selects, Escape closes.
**Step 6:** Commit: `a11y(ui): SearchBar combobox ARIA pattern + keyboard navigation`

---

### Task 2B.4: Tooltip — WCAG 2.2 SC 1.4.13

**File:** `src/components/ui/Tooltip.jsx`

WCAG 2.2 requires tooltips be **dismissible, hoverable, persistent**.

**Step 1:** Read current Tooltip. Likely shows on hover only; need to add focus.
**Step 2:** Implement:
- Show on `hover` AND `focus` (not hover-only)
- Stay visible until: `Escape` pressed, focus moves elsewhere, or hover ends (with grace period letting cursor move from trigger onto tooltip content)
- `aria-describedby` linkage: trigger has `aria-describedby={tooltipId}`, tooltip has matching id
**Step 3:** Build + dev smoke test (Tab to a tooltip-bearing element, verify it appears; Esc dismisses).
**Step 4:** Commit: `a11y(ui): Tooltip dismissible/hoverable/persistent (WCAG 2.2 SC 1.4.13)`

---

### Task 2B.5: RelatedTools list semantics

**File:** `src/components/ui/RelatedTools.jsx`

**Step 1:** Read current structure. CLAUDE.md says it uses `<h2>` for the section title. Confirm the cards are wrapped in `<ul>`/`<li>` (not just sibling divs).
**Step 2:** If cards are siblings, wrap in `<ul role="list">` with each card as `<li>`. Each card's link should be a single `<a>` (not `<div onClick>`).
**Step 3:** Build clean.
**Step 4:** Commit: `a11y(ui): RelatedTools uses ul/li semantics`

(May be a no-op if already well-structured.)

---

### Task 2B.6: ToolSkeleton + HowItWorks — minor

**Files:** `src/components/ui/ToolSkeleton.jsx`, `src/components/ui/HowItWorks.jsx`

ToolSkeleton:
**Step 1:** Mark `aria-hidden="true"` (decorative; loading state communicated via parent's `aria-busy`).

HowItWorks:
**Step 1:** Confirm uses native `<details>` / `<summary>` (per CLAUDE.md it does).

If both confirm correct, this task is a no-op.

**Step 2:** Combined commit if changes were made: `a11y(ui): ToolSkeleton aria-hidden; HowItWorks confirmed native details`

---

### Task 2B.7: Re-run baseline scan + Phase 2 delta

**Step 1:** Build + scan.
**Step 2:** Rename to `baseline-after-phase-2-{date}.{json,md}`.
**Step 3:** Write `phase-2-delta.md` comparing post-Phase-1 (11 violations) to post-Phase-2.

**Expected:** `target-size` count drops substantially (ActionButton fix). `label` critical likely still firing (Phase 5e fix). New rules may surface that weren't visible on Phase 1's static scan (modal/combobox patterns may register new rules during interaction states — but axe in CI doesn't drive interaction).

**Step 4:** Commit: `docs(a11y): post-Phase-2 baseline scan + delta vs Phase 1`

---

### Task 2B.8: Update patterns.md

**File:** `docs/accessibility/patterns.md`

Fill in the Phase 2 forward-references that were stubs:
- Modal pattern: document `useModalAccessibility` hook API (just-extracted in 2A.1)
- aria-disabled: cite ActionButton.jsx as canonical example
- Combobox: link to SearchBar.jsx implementation

**Commit:** `docs(a11y): update patterns.md with Phase 2 conventions`

---

### Task 2B.9: Open PR 2B

Push branch, open PR titled `feat(a11y): Phase 2B — form inputs / tooltip / list semantics`. Stack on top of PR 2A. (Or push to same branch; combine into one PR for Phase 2 if review feels right.)

---

# Cross-cutting reminders

- **Per-PR checklist** (same as Phase 0+1):
  - axe-cli scan against affected route(s) — 0 critical/serious new
  - Lighthouse a11y ≥ 0.95
  - Keyboard-only smoke test
  - patterns.md cited in PR description; updated if a new convention added
- **Don't** add unit tests for components — repo has no test framework. Verification is axe + manual.
- **Don't** mass-add `aria-hidden` to icons in pages/tools — that's Phase 4-5 territory, applied incrementally.

# What's next after Phase 2

Phase 3 — Global shell (Topbar, Sidebar, App.jsx). Will reuse the `useModalAccessibility` hook for the mobile sidebar drawer. Drafted as `2026-05-XX-aoda-phase-3-shell.md` after PRs 2A+2B merge.
