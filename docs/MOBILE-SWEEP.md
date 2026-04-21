# Mobile Tool Sweep

Each of the 46 tools needs at least one touch-device pass before formal user testing. This is a checklist. Tick the box, note any issue briefly.

**Baseline test device:** iPhone 14 Pro in Safari at default zoom. Repeat on Android Chrome + iPad if time allows.

**What counts as "passed":**
- Tool page loads without horizontal scroll
- Primary action (upload / paste / input) works via touch
- Secondary controls (buttons, toggles, dropdowns) have ≥ 40 × 40 px tap targets and don't overlap
- Result is downloadable (browser shows file or Save sheet)
- No JavaScript errors in console

---

## PDF Tools (17)

| # | Tool | Loads | Upload/drop | Process | Download | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Merge PDFs | ☐ | ☐ | ☐ | ☐ | |
| 2 | Split PDF | ☐ | ☐ | ☐ | ☐ | |
| 3 | Reorder Pages | ☐ | ☐ | ☐ | ☐ | Drag reorder on touch? |
| 4 | PDF Page Delete | ☐ | ☐ | ☐ | ☐ | |
| 5 | Rotate Pages | ☐ | ☐ | ☐ | ☐ | |
| 6 | Compress PDF | ☐ | ☐ | ☐ | ☐ | Preset cards tappable? |
| 7 | PDF Page Inspector | ☐ | ☐ | ☐ | ☐ | |
| 8 | Add Cover Page | ☐ | ☐ | ☐ | ☐ | |
| 9 | Add Page Numbers | ☐ | ☐ | ☐ | ☐ | |
| 10 | PDF Watermark | ☐ | ☐ | ☐ | ☐ | |
| 11 | Sign PDF | ☐ | ☐ | ☐ | ☐ | Signature draw on touch? |
| 12 | Fillable PDF Form | ☐ | ☐ | ☐ | ☐ | Field placement on touch is likely broken |
| 13 | PDF Redaction | ☐ | ☐ | ☐ | ☐ | Rectangle draw on touch? |
| 14 | Password Protect PDF | ☐ | ☐ | ☐ | ☐ | |
| 15 | Remove PDF Password | ☐ | ☐ | ☐ | ☐ | |
| 16 | Extract Images from PDF | ☐ | ☐ | ☐ | ☐ | |
| 17 | PDF to Images | ☐ | ☐ | ☐ | ☐ | |

## Image Tools (6)

| # | Tool | Loads | Upload | Process | Download | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Compress Image | ☐ | ☐ | ☐ | ☐ | |
| 2 | Resize Image | ☐ | ☐ | ☐ | ☐ | |
| 3 | Image Cropper | ☐ | ☐ | ☐ | ☐ | Crop-handle drag on touch? |
| 4 | Convert Image Format | ☐ | ☐ | ☐ | ☐ | |
| 5 | Strip Image Metadata | ☐ | ☐ | ☐ | ☐ | |
| 6 | Image to PDF | ☐ | ☐ | ☐ | ☐ | |

## Text & Data Tools (8)

| # | Tool | Loads | Input | Process | Output | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Word Counter | ☐ | ☐ | ☐ | ☐ | |
| 2 | Find & Replace | ☐ | ☐ | ☐ | ☐ | |
| 3 | Text Diff | ☐ | ☐ | ☐ | ☐ | Side-by-side layout readable? |
| 4 | JSON Formatter | ☐ | ☐ | ☐ | ☐ | |
| 5 | CSV ↔ JSON Converter | ☐ | ☐ | ☐ | ☐ | |
| 6 | File to Markdown | ☐ | ☐ | ☐ | ☐ | |
| 7 | BibTeX Formatter | ☐ | ☐ | ☐ | ☐ | |
| 8 | De-identify Research Data | ☐ | ☐ | ☐ | ☐ | Column-group tapping works? |

## Privacy & Security (4)

| # | Tool | Loads | Input | Process | Output | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Strip File Metadata | ☐ | ☐ | ☐ | ☐ | |
| 2 | Encrypt / Decrypt Text | ☐ | ☐ | ☐ | ☐ | |
| 3 | Password Generator | ☐ | ☐ | ☐ | ☐ | Copy-to-clipboard works? |
| 4 | SHA-256 Hasher | ☐ | ☐ | ☐ | ☐ | |

## Archives (3)

| # | Tool | Loads | Upload | Process | Download | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Create ZIP | ☐ | ☐ | ☐ | ☐ | Multi-file select on touch? |
| 2 | Extract ZIP | ☐ | ☐ | ☐ | ☐ | |
| 3 | File Size Analyser | ☐ | ☐ | ☐ | ☐ | |

## More Text (5)

| # | Tool | Loads | Input | Process | Output | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Whitespace Cleaner | ☐ | ☐ | ☐ | ☐ | |
| 2 | Remove Duplicate Lines | ☐ | ☐ | ☐ | ☐ | |
| 3 | CSV Diff | ☐ | ☐ | ☐ | ☐ | |
| 4 | CSV Encoding Fixer | ☐ | ☐ | ☐ | ☐ | |
| 5 | Markdown Preview | ☐ | ☐ | ☐ | ☐ | |

## More Security (3)

| # | Tool | Loads | Input | Process | Output | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Magic Byte Checker | ☐ | ☐ | ☐ | ☐ | |
| 2 | Checksum Verifier | ☐ | ☐ | ☐ | ☐ | |
| 3 | Encoding Detector | ☐ | ☐ | ☐ | ☐ | |

---

## Cross-cutting Mobile Checks

Run these once per device, not per tool:

- ☐ **Global drag-and-drop**: on desktop we route dropped files to the right tool. On mobile there's no drag-and-drop — is the "tap to choose file" messaging clear?
- ☐ **Sidebar drawer**: hamburger → drawer opens → backdrop click closes → Esc closes
- ☐ **Topbar feedback button**: 40×40 tap target, modal opens, modal closes
- ☐ **Welcome tour on first visit**: all 3 steps reachable, dots tappable, Skip works
- ☐ **Search (Ctrl/Cmd+K)**: the keyboard shortcut is hidden on mobile — is there a discoverable way to search? (If not, this is a known gap worth fixing.)
- ☐ **Recent tools chips on home**: tap targets ≥ 40px, no overflow
- ☐ **Long tables** (LU Dataverse picker, Acrobat task coverage, Data Classification controls, Tri-Agency matrix): right-edge fade visible, horizontal scroll works
- ☐ **Form inputs**: do they zoom the viewport on focus? (Safari does this if font-size < 16px)
- ☐ **100vh issues**: Safari URL bar resize doesn't break layout

---

## Known Touch-Unfriendly Tools

Heads-up: these tools have desktop-first interactions that probably don't translate well to mobile. Flag them as "desktop only" if fixing them is out of scope:

1. **Fillable PDF Form** — click-to-place field workflow
2. **PDF Redaction** — click-and-drag rectangle drawing
3. **Sign PDF** — freehand signature capture (might actually work better on touch, to verify)
4. **Reorder Pages** — dnd-kit drag reorder
5. **Image Cropper** — crop-handle dragging
6. **Fullscreen editor modes** — Fillable PDF Form has a fullscreen mode that's likely cramped on mobile

For each of these, the minimum ship requirement is: tool *loads* without errors and shows a "best viewed on desktop" hint. Actually making them work on touch is Phase 4+ work.
