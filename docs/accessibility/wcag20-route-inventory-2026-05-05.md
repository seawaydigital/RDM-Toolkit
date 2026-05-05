# WCAG 2.0 AA route inventory - 2026-05-05

Purpose: define the public surface that must be checked for AODA readiness. Automated scans use WCAG 2.0 A/AA tags (`wcag2a,wcag2aa`); manual checks cover keyboard operation, focus order, labels, status announcements, zoom, and screen-reader smoke testing.

## Static and information routes

| Route | Component | Interaction type | Risk | Status |
|---|---|---|---|---|
| `/` | `src/components/home/HomePage.jsx` | static navigation | medium | full axe pass; manual pending |
| `/#how-this-works` | `src/components/pages/HowThisWorks.jsx` | static, diagrams | low | full axe pass; manual pending |
| `/#request-a-tool` | `src/components/pages/RequestATool.jsx` | external mail link, accordions | low | full axe pass; manual pending |
| `/#data-classification` | `src/components/pages/DataClassification.jsx` | form/wizard | high | full axe pass; manual pending |
| `/#storage-calculator` | `src/components/pages/StorageCalculator.jsx` | form, chart/table | high | full axe pass; manual pending |
| `/#tri-agency-policy` | `src/components/pages/TriAgencyPolicy.jsx` | tables/diagram | medium | full axe pass; manual pending |
| `/#grants-identifiers` | `src/components/pages/GrantsAndIdentifiers.jsx` | static resources | low | full axe pass; manual pending |
| `/#lakehead-dataverse` | `src/components/pages/LakeheadDataverse.jsx` | static resources | low | full axe pass; manual pending |
| `/#drac-services` | `src/components/pages/DRACServices.jsx` | resource navigation | medium | full axe pass; manual pending |
| `/#acrobat-alternative` | `src/components/pages/AcrobatAlternative.jsx` | static resources | low | full axe pass; manual pending |
| `/#accessibility` | `src/components/pages/AccessibilityStatement.jsx` | statement, barrier report | medium | full axe pass; manual pending |

## Tool routes

| Route | Component | Interaction type | Risk | Status |
|---|---|---|---|---|
| `/#merge-pdfs` | `src/tools/pdf/MergePDFs.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#split-pdf` | `src/tools/pdf/SplitPDF.jsx` | upload, page ranges, generated output | medium | full axe pass; manual pending |
| `/#reorder-pages` | `src/tools/pdf/ReorderPages.jsx` | upload, drag/reorder | high | full axe pass; keyboard review required |
| `/#pdf-page-delete` | `src/tools/pdf/PDFPageDelete.jsx` | upload, page selection | medium | full axe pass; manual pending |
| `/#rotate-pages` | `src/tools/pdf/RotatePages.jsx` | upload, page controls | medium | full axe pass; manual pending |
| `/#compress-pdf` | `src/tools/pdf/CompressPDF.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#pdf-page-inspector` | `src/tools/pdf/PdfPageInspector.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#add-cover-page` | `src/tools/pdf/AddCoverPage.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#add-page-numbers` | `src/tools/pdf/AddPageNumbers.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#pdf-watermark` | `src/tools/pdf/PDFWatermark.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#sign-pdf` | `src/tools/pdf/SignPDF.jsx` | upload, canvas/signature placement | high | full axe pass; manual pending; keyboard alternative required |
| `/#fillable-pdf-form` | `src/tools/pdf/FillablePDFForm.jsx` | upload, field placement | high | full axe pass; keyboard review required |
| `/#pdf-redaction` | `src/tools/pdf/PDFRedaction.jsx` | upload, canvas/redaction placement | high | full axe pass; manual pending; keyboard alternative required |
| `/#password-protect-pdf` | `src/tools/pdf/PasswordProtectPDF.jsx` | upload, password form | medium | full axe pass; manual pending |
| `/#remove-pdf-password` | `src/tools/pdf/RemovePDFPassword.jsx` | upload, password form | medium | full axe pass; manual pending |
| `/#extract-images-from-pdf` | `src/tools/pdf/ExtractImagesFromPDF.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#pdf-to-images` | `src/tools/pdf/PDFToImages.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#compress-image` | `src/tools/images/CompressImage.jsx` | upload, sliders, generated output | medium | full axe pass; manual pending |
| `/#resize-image` | `src/tools/images/ResizeImage.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#image-cropper` | `src/tools/images/ImageCropper.jsx` | upload, crop controls/canvas | high | full axe pass; keyboard review required |
| `/#convert-image-format` | `src/tools/images/ConvertImageFormat.jsx` | upload, form controls | medium | full axe pass; manual pending |
| `/#strip-image-metadata` | `src/tools/images/StripImageMetadata.jsx` | upload, metadata table | medium | full axe pass; manual pending |
| `/#image-to-pdf` | `src/tools/images/ImageToPDF.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#word-counter` | `src/tools/text/WordCounter.jsx` | textarea, live metrics | low | full axe pass; manual pending |
| `/#find-replace` | `src/tools/text/FindReplace.jsx` | text inputs, generated output | medium | full axe pass; manual pending |
| `/#text-diff` | `src/tools/text/TextDiff.jsx` | textareas, generated output | medium | full axe pass; manual pending |
| `/#json-formatter` | `src/tools/text/JSONFormatter.jsx` | textarea, generated output | medium | full axe pass; manual pending |
| `/#csv-json-converter` | `src/tools/text/CSVJSONConverter.jsx` | textarea/upload, generated output | medium | full axe pass; manual pending |
| `/#to-markdown` | `src/tools/text/FileToMarkdown.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#bibtex-formatter` | `src/tools/text/BibTeXFormatter.jsx` | textarea, generated output | medium | full axe pass; manual pending |
| `/#data-anonymizer` | `src/tools/research/DataAnonymizer.jsx` | textarea/upload, generated output | high | full axe pass; manual pending |
| `/#strip-file-metadata` | `src/tools/privacy/StripFileMetadata.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#encrypt-decrypt-text` | `src/tools/privacy/EncryptDecryptText.jsx` | form, passwords, generated output | high | full axe pass; manual pending |
| `/#password-generator` | `src/tools/privacy/PasswordGenerator.jsx` | sliders, generated output | medium | full axe pass; manual pending |
| `/#sha256-hasher` | `src/tools/privacy/SHA256Hasher.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#create-zip` | `src/tools/archives/CreateZIP.jsx` | multi-upload, generated output | medium | full axe pass; manual pending |
| `/#extract-zip` | `src/tools/archives/ExtractZIP.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#file-size-analyser` | `src/tools/archives/FileSizeAnalyser.jsx` | upload, generated output | low | full axe pass; manual pending |
| `/#whitespace-cleaner` | `src/tools/text/WhitespaceCleaner.jsx` | textarea, generated output | low | full axe pass; manual pending |
| `/#remove-duplicate-lines` | `src/tools/text/RemoveDuplicateLines.jsx` | textarea, generated output | low | full axe pass; manual pending |
| `/#csv-diff` | `src/tools/text/CSVDiff.jsx` | textarea/upload, generated output | medium | full axe pass; manual pending |
| `/#csv-encoding-fixer` | `src/tools/text/CSVEncodingFixer.jsx` | upload, generated output | medium | full axe pass; manual pending |
| `/#markdown-preview` | `src/tools/text/MarkdownPreview.jsx` | textarea, preview HTML | medium | full axe pass; manual pending |
| `/#magic-byte-checker` | `src/tools/privacy/MagicByteChecker.jsx` | upload, generated output | low | full axe pass; manual pending |
| `/#checksum-verifier` | `src/tools/privacy/ChecksumVerifier.jsx` | upload, manifest verification | medium | full axe pass; manual pending |
| `/#encoding-detector` | `src/tools/privacy/EncodingDetector.jsx` | upload, generated output | low | full axe pass; manual pending |

## Manual checks still required

- Keyboard-only: Tab, Shift+Tab, Enter, Space, Escape across shell, modals, upload controls, and one complete workflow per tool category.
- Screen reader smoke test: NVDA with Chrome or Edge on Windows for landmarks, headings, form labels, and result/error announcements.
- Zoom/reflow: 200% desktop and mobile-width checks for clipped or overlapping text.
- High-risk pointer flows: `sign-pdf`, `pdf-redaction`, `image-cropper`, `fillable-pdf-form`, and `reorder-pages`.
