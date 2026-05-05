# WCAG 2.0 AA manual test script

Use this script after `npm run build` and the full automated AODA scan pass:

```powershell
$env:A11Y_TAGS='wcag2a,wcag2aa'
$env:A11Y_ROUTES='all'
npm run a11y:baseline
```

## Test environment

Record the exact environment in `manual-test-results-YYYY-MM-DD.md`:

- Tester
- Date
- Browser and version
- Operating system
- Assistive technology, if used
- Viewport or device

## Global shell

1. Load `/`.
2. Press Tab once.
3. Confirm the "Skip to main content" link appears.
4. Press Enter.
5. Confirm focus moves to the main content region.
6. Continue tabbing through the top bar and sidebar.
7. Confirm focus order is logical and visible.
8. At mobile width, open the sidebar menu.
9. Confirm Escape closes the sidebar and focus returns to the menu button.

## Search modal

1. Open search from the top bar.
2. Confirm focus moves into the search field.
3. Type `pdf`.
4. Use ArrowDown and ArrowUp through results.
5. Press Enter on a result.
6. Confirm the route changes and the modal closes.
7. Reopen search, press Escape, and confirm focus returns to the search button.

## Feedback and barrier reporting

1. Open Feedback from the top bar.
2. Confirm the dialog has a visible heading and focus moves inside it.
3. Select each feedback topic with keyboard only.
4. Select "Accessibility barrier".
5. Confirm the description label changes to ask about the barrier.
6. Confirm the email link uses an accessibility-barrier subject.
7. Press Escape and confirm focus returns to the Feedback button.

## Accessibility statement

1. Navigate to `/#accessibility`.
2. Confirm the page has one H1.
3. Confirm the report-barrier button opens the feedback modal with "Accessibility barrier" selected.
4. Confirm the mailto fallback is reachable by keyboard.

## Static pages

For each static/information route:

- `/`
- `/#how-this-works`
- `/#request-a-tool`
- `/#data-classification`
- `/#storage-calculator`
- `/#tri-agency-policy`
- `/#grants-identifiers`
- `/#lakehead-dataverse`
- `/#drac-services`
- `/#acrobat-alternative`
- `/#accessibility`

Check:

- One H1 per route.
- Headings do not skip levels.
- Links have meaningful text.
- External links identify that they open externally when applicable.
- Tables have row/column headers where present.
- Text remains readable at 200% browser zoom.

## Representative tool workflows

Run at least one successful keyboard-only workflow for each group:

- PDF: `/#compress-pdf`
- Image: `/#compress-image`
- Text: `/#word-counter`
- Privacy/security: `/#password-generator`
- Archive: `/#extract-zip`

For each workflow:

1. Reach the upload/input area by keyboard.
2. Use the file picker or text input without drag-and-drop.
3. Run the tool.
4. Confirm success/result text appears.
5. Confirm copy/download controls are reachable and named clearly.
6. Trigger one validation/error path where practical and confirm it is announced or visibly associated.

## High-risk pointer workflows

These routes need extra keyboard and assistive technology review:

- `/#reorder-pages`
- `/#sign-pdf`
- `/#fillable-pdf-form`
- `/#pdf-redaction`
- `/#image-cropper`

For each route, document whether the essential task can be completed without a mouse. If not, record the barrier and the available workaround or remediation task.

## Screen reader smoke test

Recommended minimum: NVDA with Chrome or Edge on Windows.

Check:

- Landmark list includes banner, navigation, and main.
- Route changes announce the new page title.
- Form fields announce labels and current values.
- Modal opening and closing is understandable.
- Result and error messages are discoverable.

## Pass criteria

- No keyboard traps.
- Focus is always visible.
- All essential tasks have a keyboard path or documented accessible alternative.
- No unlabeled controls are found during manual review.
- Automated scan remains clean after manual fixes.
