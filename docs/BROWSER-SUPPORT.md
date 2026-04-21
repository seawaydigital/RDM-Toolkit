# Browser Support & Testing Matrix

RDM Toolkit runs entirely in the browser. Every feature depends on modern web platform APIs — Web Crypto, Canvas/OffscreenCanvas, WebAssembly, Service Workers, File API, `navigator.clipboard`, and so on. This document captures what we officially support, what we've spot-checked, and what needs real-device testing before launch.

---

## Supported Browsers (Tier 1 — we actively test and fix)

| Browser | Minimum Version | Reason |
|---|---|---|
| Chrome / Chromium / Edge | 90+ (Apr 2021) | OffscreenCanvas, `createImageBitmap`, ES2020 features |
| Firefox | 105+ (Sep 2022) | OffscreenCanvas stable, Service Worker in private mode |
| Safari (macOS) | 16.4+ (Mar 2023) | Service Worker `importScripts`, WASM streaming, `OffscreenCanvas` |
| Safari (iOS/iPadOS) | 16.4+ | Same as above; PWA `display: standalone` support |

**Why these minimums:** PDF.js v5 requires ES2020. `@imgly/background-removal` streams ONNX models via WASM streaming compile. pdf-lib's image embedding needs `createImageBitmap`. Dropping below any of these breaks a subset of tools silently.

## Tier 2 (works but not actively tested)

- Chrome/Firefox on Android (should work; layout tested in Chrome DevTools device emulation only)
- Brave, Vivaldi, Arc — all Chromium-based, assumed equivalent to Chrome
- Samsung Internet — untested

## Unsupported

- Internet Explorer (any version) — hard-blocked by ES2020, WebAssembly, and React 18.
- Opera Mini — runs a server-side proxy that strips JS. The whole app is JS. Won't work.
- UC Browser — untested and not prioritized.

---

## Feature-to-API Map

When a tool breaks on an older browser, this table points at the likely culprit.

| API | Earliest Supported | Tools / Features that need it |
|---|---|---|
| `crypto.subtle` (Web Crypto, AES-GCM) | Chrome 37, FF 34, Safari 11 | Encrypt/Decrypt Text, SHA-256 Hasher, Password Protect PDF key derivation |
| Canvas `toBlob('image/jpeg')` | Chrome 50, FF 19, Safari 11 | Compress PDF (raster), Compress Image, Image Cropper, all image tools |
| `createImageBitmap` | Chrome 50, FF 42, Safari 15 | Compress PDF (smart image replacement), Image tools |
| OffscreenCanvas | Chrome 69, FF 105, Safari 16.4 | Compress PDF (parallel preset rendering) |
| WebAssembly streaming | Chrome 61, FF 58, Safari 15 | PDF.js v5 worker, `@imgly/background-removal` ONNX runtime |
| Service Worker | Chrome 40, FF 44, Safari 11.1 | PWA offline mode (Workbox) |
| `navigator.clipboard.writeText` | Chrome 66, FF 63, Safari 13.1 | Password Generator, SHA-256 Hasher, Feedback modal "Copy log" |
| File System Access API | Chrome 86 only | **Not used** — we deliberately use `<input type="file">` + download attribute for Safari/Firefox compatibility |
| `showSaveFilePicker` | Chrome 86 only | **Not used** — same reason |
| CSS `:has()` | Chrome 105, FF 121, Safari 15.4 | Used in a few hover states; degrades gracefully when unsupported |

---

## Pre-Launch Testing Matrix

Each row is a real device × real browser combination that must be tested before formal user testing starts. Tick the box when verified.

### Desktop

| OS | Browser | Smoke (home + 1 tool) | Full sweep (10 tools) | Offline mode after first load | Tester |
|---|---|:-:|:-:|:-:|---|
| macOS 14+ | Safari 17 | ☐ | ☐ | ☐ | |
| macOS 14+ | Chrome (latest) | ☐ | ☐ | ☐ | |
| macOS 14+ | Firefox (latest) | ☐ | ☐ | ☐ | |
| Windows 11 | Chrome (latest) | ☐ | ☐ | ☐ | |
| Windows 11 | Edge (latest) | ☐ | ☐ | ☐ | |
| Windows 11 | Firefox (latest) | ☐ | ☐ | ☐ | |
| Ubuntu 22.04 | Firefox (latest) | ☐ | ☐ | ☐ | |
| Chromebook | Chrome (latest) | ☐ | ☐ | ☐ | |

### Mobile / Tablet

| Device | Browser | Smoke (home + 1 tool) | Touch: drag-drop, sidebar, modals | Tester |
|---|---|:-:|:-:|---|
| iPhone 14+ (iOS 17+) | Safari | ☐ | ☐ | |
| iPhone 14+ (iOS 17+) | Chrome | ☐ | ☐ | |
| iPad (iPadOS 17+) | Safari | ☐ | ☐ | |
| Pixel 7+ (Android 13+) | Chrome | ☐ | ☐ | |
| Samsung Galaxy S22+ | Samsung Internet | ☐ | ☐ | |

---

## The 10-Tool Full Sweep

When doing a "full sweep" row above, test these 10 tools — they cover every major API surface:

1. **Merge PDFs** — pdf-lib structural save
2. **Compress PDF** — pdfjs rendering + Canvas + OffscreenCanvas + image-XObject replacement
3. **PDF Redaction** — pdfjs rasterization + pdf-lib JPEG embed + output verification
4. **Sign PDF** — pdf-lib font embedding (fontkit)
5. **Image Cropper** — Canvas + drag interaction
6. **Strip Image Metadata** — exifr + Canvas re-encode
7. **Encrypt Text** — Web Crypto AES-GCM
8. **SHA-256 Hasher** — Web Crypto digest + file streaming
9. **De-identify Research Data** — CSV parsing + Web Crypto hashing
10. **Markdown Preview** — DOMPurify + clipboard + downloadHTML

If all 10 pass on a given browser × OS, that row's "Full sweep" box gets ticked.

---

## Known Issues per Browser

_(Populate as testers find issues — keep this section honest.)_

| Browser | Issue | Tool affected | Workaround | Tracked |
|---|---|---|---|---|
| — | — | — | — | — |

---

## How to Run the Offline Test

1. Load any page of RDM Toolkit while online.
2. Wait for `Service worker: ready` in DevTools → Application → Service Workers (about 10 seconds on first load).
3. Turn off Wi-Fi / put the device in Airplane mode.
4. Reload the page.
5. Open Compress PDF (tool code should be cached). Upload a PDF.
6. Verify it processes and downloads.

If step 5 fails with "Failed to fetch dynamically imported module," the service worker didn't precache the tool chunk — reproducible bug, worth filing.
