/**
 * Per-tool "How it works" explainers.
 *
 * Each entry is read by src/components/ui/HowItWorks.jsx and rendered as a
 * collapsible section below the tool. The goal is plain-English trust:
 * researchers, admin staff, and REB reviewers should be able to read a tool's
 * explainer and understand exactly what happens to their file, what stays on
 * their device, and how to verify it themselves.
 *
 * Shape:
 *   whatItDoes:        string  — one or two sentences, plain English.
 *   howItWorks:        string | string[]  — plain-English walkthrough.
 *   technicalDetails:  { library, flow: string[], sourceFile }  (optional,
 *                      rendered inside a "Technical details (for IT reviewers)"
 *                      accordion). flow entries may contain HTML (e.g. <code>).
 *   privacy:           string[]  — concrete statements about what stays local.
 *   limitations:       string[]  — honest disclosure about what the tool can't
 *                      or won't do (optional).
 *   verify.quick:      string  — a 30-second test the user can run themselves.
 *
 * Coverage (Tier 1 + Tier 2): 25 tools.
 */

const DEFAULT_QUICK_VERIFY =
  'Turn off your Wi-Fi (or unplug your network cable). Come back here and use the tool as you normally would — it still works. That\u2019s because nothing needs to be uploaded; your file never leaves your device.';

const EXPLAINERS = {
  // ============================================================
  // TIER 1 — trust is the product
  // ============================================================

  'encrypt-decrypt-text': {
    whatItDoes: 'Encrypts a piece of text with a password so that only someone with the password can read it — and decrypts text you\u2019ve previously encrypted.',
    howItWorks: [
      'You type some text and choose a password. Your browser uses its own built-in encryption engine (the same one banks rely on) to scramble the text into ciphertext that looks like random letters. The password is never stored — it\u2019s only used in the moment to derive a key.',
      'To decrypt, you paste the ciphertext back in with the same password. If the password matches, you get your original text. If it doesn\u2019t, you get an error — there\u2019s no way to guess or recover a forgotten password.',
    ],
    technicalDetails: {
      library: 'WebCrypto (<code>crypto.subtle</code>) — native browser API, no third-party crypto library.',
      flow: [
        'Key derivation: <code>PBKDF2</code> with <code>SHA-256</code>, <strong>100,000 iterations</strong>, 16-byte random salt per message.',
        'Encryption: <code>AES-256-GCM</code> with a 12-byte random IV per message.',
        'Output: the salt + IV + ciphertext are concatenated and Base64-encoded into a single blob you can copy or paste.',
        'The password itself never touches a network request, never enters storage, and is never logged.',
      ],
      sourceFile: 'src/tools/privacy/EncryptDecryptText.jsx',
    },
    privacy: [
      'Your plaintext and password live only in this browser tab\u2019s memory — nothing is sent over the internet.',
      'The derived key is discarded as soon as encryption or decryption finishes.',
      'Nothing is written to disk, cookies, or local storage. Close the tab and everything is gone.',
      'If you paste ciphertext into the page, the key derivation happens in your browser — there is no server that sees the password.',
    ],
    limitations: [
      'If you forget the password, the text cannot be recovered. There is no backdoor, reset link, or master key — that\u2019s the point.',
      'Encryption only protects the text in transit or at rest. If your device is compromised while you have the plaintext on screen, that\u2019s a separate problem.',
      'A weak password (e.g. a common word or short PIN) makes encryption easy to break by brute force. Pair this tool with our Password Generator for strong passwords.',
    ],
    verify: {
      quick: 'Open the tool, turn off your Wi-Fi, encrypt and decrypt a short message. It still works — because all the crypto is happening inside your browser, not on a server.',
    },
  },

  'password-generator': {
    whatItDoes: 'Generates strong random passwords and shows a realistic estimate of how long they would take to crack.',
    howItWorks: [
      'Your browser asks its own built-in random-number generator — the one designed for cryptographic use — for a stream of random numbers. Those numbers are mapped to characters from your chosen alphabet (letters, numbers, symbols) to build the password.',
      'A second check runs in your browser to estimate how strong the password really is. It uses a well-known open-source password-cracking model (zxcvbn) that knows about common patterns like <em>Summer2024!</em> and adjusts the estimate accordingly — so the strength score reflects real-world attacks, not just character counts.',
    ],
    technicalDetails: {
      library: 'WebCrypto <code>crypto.getRandomValues()</code> for randomness; <code>zxcvbn</code> v4.4.2 for strength estimation.',
      flow: [
        'Random bytes: <code>crypto.getRandomValues(new Uint32Array(length))</code> — not <code>Math.random()</code>, which is predictable.',
        'Each random value is reduced modulo the alphabet size to pick a character.',
        'Shannon entropy is calculated for display; zxcvbn runs locally (no dictionary lookup over the network) to estimate crack time.',
        'No password is ever transmitted, logged, or stored — not even in browser history.',
      ],
      sourceFile: 'src/tools/privacy/PasswordGenerator.jsx',
    },
    privacy: [
      'The random source is your browser\u2019s cryptographic randomness — the same source used for HTTPS key generation.',
      'Passwords are generated and displayed only in this browser tab. Nothing is sent to a server, checked against any database, or saved anywhere.',
      'Close the tab and every generated password is gone — copy what you need into your password manager before you leave.',
    ],
    limitations: [
      'A strong generated password is only as safe as where you store it. Use a reputable password manager (Bitwarden, 1Password, Apple/Google Keychain).',
      'Strength estimates assume modern attackers with commodity GPUs. A well-funded nation-state attacker may do better; a small-time crook will do worse.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi and generate 20 passwords in a row. They\u2019re all unique, and the page never hits the network — because the randomness comes from your browser itself, not from any server.',
    },
  },

  'password-protect-pdf': {
    whatItDoes: 'Adds a password to a PDF so anyone opening it has to enter the password first.',
    howItWorks: [
      'You drop in a PDF and pick a password. An open-source PDF library running inside your browser rewrites the file with the standard PDF encryption header, using the password as the key. The encrypted file downloads straight to your device.',
      'The password is never sent anywhere. It\u2019s used to derive the encryption key in the moment, and then discarded as soon as the save completes.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> v1.17.1 (maintained fork of <code>pdf-lib</code>).',
      flow: [
        'PDF is parsed via <code>PDFDocument.load()</code> into an object tree in memory.',
        '<code>save()</code> is called with <code>userPassword</code> and <code>ownerPassword</code>, triggering PDF standard-security handler encryption.',
        'The output is downloaded as a <code>Blob</code> via a local <code>URL.createObjectURL()</code>; the URL is revoked on reset.',
        'Your password lives in memory for the duration of the save, then is garbage-collected.',
      ],
      sourceFile: 'src/tools/pdf/PasswordProtectPDF.jsx',
    },
    privacy: [
      'Your PDF is read into your browser\u2019s temporary memory with FileReader. It is never uploaded.',
      'The password you type never leaves this browser tab — no server sees it.',
      'The encrypted output is handed to your browser\u2019s download dialog as a local file. Nothing is stored on disk until you save it.',
      'Close the tab and everything (PDF, password, output) is gone.',
    ],
    limitations: [
      'PDF encryption is older and weaker than modern AES-based container formats. For truly sensitive data (interview transcripts, health records), pair this with our Encrypt/Decrypt Text tool inside a 7-Zip or VeraCrypt container.',
      'A short or common password can be brute-forced quickly. Use a strong generated password (at least 16 characters).',
      'If you set only an owner password (not a user password), most PDF readers will still let people open the document. Set both for full protection.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, drop in a PDF, set a password, and download. It still works — nothing needs a server.',
    },
  },

  'remove-pdf-password': {
    whatItDoes: 'Removes the password from a PDF you already know the password for, so you can view and edit it without the lock.',
    howItWorks: [
      'You drop in an encrypted PDF and type the password. Inside your browser, the PDF library uses the password to unlock the document, then re-saves it without any encryption. Download the unlocked file.',
      'The password is used once, locally, and then discarded. It\u2019s never sent anywhere, never logged, and never stored.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> for standard PDF encryption; WebCrypto AES-GCM for our own <code>.pdf.enc</code> bundle format.',
      flow: [
        'PDF is loaded via <code>PDFDocument.load(bytes, { password })</code> — pdf-lib validates the password and decrypts the object tree in memory.',
        'The document is re-saved with no encryption options, producing a clean output file.',
        'If the file is a <code>.pdf.enc</code> bundle (produced by our Encrypt/Decrypt tool), WebCrypto\u2019s <code>PBKDF2</code> + <code>AES-GCM</code> decrypts it with 100,000 iterations.',
        'Your password is in memory for the length of the operation, then dropped.',
      ],
      sourceFile: 'src/tools/pdf/RemovePDFPassword.jsx',
    },
    privacy: [
      'The encrypted PDF is never uploaded — it\u2019s unlocked in your browser\u2019s memory.',
      'Your password is typed into a local form, used in JavaScript, and discarded. No server, no logging, no password-recovery service.',
      'The unlocked PDF is handed to your browser\u2019s download dialog via a local blob URL.',
      'Close the tab and both the password and the unlocked file are gone.',
    ],
    limitations: [
      'This tool only removes passwords you already know. If you\u2019ve forgotten the password, nothing can recover it — that\u2019s by design.',
      'Some PDFs use non-standard or very old encryption that pdf-lib can\u2019t parse. If the tool shows an error, the file may need to be opened in Adobe Acrobat first and re-saved.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, drop in a password-protected PDF you have the password to, and unlock it. The unlocked file downloads locally — proof nothing left your machine.',
    },
  },

  'sha256-hasher': {
    whatItDoes: 'Computes a SHA-256 (or SHA-1, SHA-384, SHA-512) hash of a file or piece of text — a fingerprint you can use to verify the file hasn\u2019t been tampered with.',
    howItWorks: [
      'Your browser reads the file into memory and passes it to its own built-in cryptographic hash function. The result is a fixed-length string of hex characters — a fingerprint that will be identical for identical files, and completely different if even one byte has changed.',
      'You can compare the hash against one published by a software vendor (e.g. to confirm a download wasn\u2019t corrupted or swapped) or record it yourself to verify later that a file hasn\u2019t been altered.',
    ],
    technicalDetails: {
      library: 'WebCrypto <code>crypto.subtle.digest()</code> — native, standards-based, audited browser implementation.',
      flow: [
        'File is read via <code>FileReader.readAsArrayBuffer()</code> into memory.',
        '<code>crypto.subtle.digest(\'SHA-256\', buffer)</code> (or SHA-1 / SHA-384 / SHA-512) returns the digest.',
        'Bytes are converted to a lowercase hex string for display.',
        'No hash, filename, or file content is ever transmitted.',
      ],
      sourceFile: 'src/tools/privacy/SHA256Hasher.jsx',
    },
    privacy: [
      'Files are read in-browser and hashed locally. The file itself never leaves your device.',
      'The computed hash is displayed only on your screen — no server records it.',
      'Nothing is logged, cached to disk, or persisted after you leave the page.',
    ],
    limitations: [
      'SHA-1 is included for compatibility with legacy software but is cryptographically broken. Prefer SHA-256 for any new integrity checks.',
      'A hash proves a file is unchanged, but only if you trust the source of the hash you\u2019re comparing against. Always get the expected hash over a secure channel (HTTPS site, signed email).',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi and hash a file. The hash appears instantly — because it\u2019s being computed on your device, not on any server.',
    },
  },

  'pdf-redaction': {
    whatItDoes: 'Permanently removes sensitive content from a PDF by rasterizing affected pages — the original text bytes are not carried into the output, so copy/paste, search, and text-extraction tools cannot recover what was behind the black rectangles. Suitable for PHIPA, PIPEDA, and TCPS 2 disclosure workflows.',
    howItWorks: [
      'You drop in a PDF, click a page, and drag rectangles over the content you want to redact. When you click "Redact", only the pages you marked are rasterized — they\u2019re rendered to a high-resolution image, the black rectangles are painted onto the image, and the result is embedded as a JPEG into a fresh PDF. Pages without redactions are copied over intact so their text stays selectable.',
      'Before the download is handed to you, the output is re-opened with a PDF parser and every redacted page is checked for extractable text. If any survives, the download is refused.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> for PDF assembly; <code>pdfjs-dist</code> for rendering + verification; Canvas API for painting redactions.',
      flow: [
        'Source PDF loaded via <code>PDFDocument.load()</code> (pdf-lib) and <code>pdfjs.getDocument()</code>.',
        'A fresh <code>PDFDocument.create()</code> holds the output — none of the source document\u2019s catalog (metadata, outlines, AcroForm, attachments, JavaScript, OpenActions) is carried over.',
        'For each page with redactions: pdfjs renders the page to an HTML <code>&lt;canvas&gt;</code> at 200 DPI → <code>ctx.fillRect()</code> paints the redaction rectangles in pure black → <code>canvas.toBlob(\'image/jpeg\', 0.88)</code> produces a flat image → <code>newDoc.embedJpg()</code> and <code>newPage.drawImage()</code> writes it into the output at the original page dimensions.',
        'Pages without redactions are copied intact via <code>newDoc.copyPages(sourceDoc, [idx])</code>, preserving vector text and searchability.',
        'Before save: per-page <code>/Thumb</code>, <code>/PieceInfo</code>, <code>/AA</code>, and <code>/Annots</code> (form widgets, links, file-attachment annotations) are deleted. Document info dict (title/author/subject/keywords/producer/creator) is cleared.',
        'After save: pdfjs re-opens the result, calls <code>getTextContent()</code> on every redacted page, and asserts zero non-empty text items. If the check fails, an error is thrown and the download is blocked.',
      ],
      sourceFile: 'src/tools/pdf/PDFRedaction.jsx',
    },
    privacy: [
      'Your PDF is read into browser memory and never uploaded.',
      'Rasterization, metadata stripping, and verification all happen inside your browser tab.',
      'The output PDF is assembled in memory and handed to your browser\u2019s download dialog.',
    ],
    limitations: [
      'Redacted pages lose text selectability, searchability, and screen-reader accessibility — they become images. File size for those pages will also grow.',
      'Only pages you mark are rasterized. If sensitive content also appears on a page you didn\u2019t redact, that text stays selectable in the output. Draw at least one redaction on every page where PHI/PII appears.',
      'XFA forms (dynamic forms used by some Canadian government PDFs) are unusual; their form values live in an XML stream that pdf-lib handles inconsistently. If your source has an XFA form, flatten it first via File → Print → Save as PDF, then redact.',
      'Handwritten annotations made with a stylus in third-party apps are usually stored as ink annotations — those are stripped out by this tool along with form widgets. If your source relies on annotations, review the output before sharing.',
    ],
    verify: {
      quick: 'After downloading, open the redacted PDF in Adobe Reader (or any viewer) and try to select text in a redacted region. You won\u2019t be able to — because that region is now an image, not text. For a stricter check, run <code>pdftotext</code> on the output and grep for the redacted terms; they should not appear.',
    },
  },

  'strip-file-metadata': {
    whatItDoes: 'Removes hidden metadata (author, edit history, GPS coordinates, camera make, etc.) from PDFs and images.',
    howItWorks: [
      'Your file is read into browser memory. For PDFs, a PDF library clears the standard metadata fields (title, author, subject, keywords, producer) and saves a clean copy. For images, the file is parsed to locate EXIF/XMP metadata blocks, then re-encoded through a canvas so those blocks are left behind.',
      'The cleaned file downloads to your device. Nothing is uploaded — the entire scrubbing happens in this browser tab.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> for PDFs; <code>exifr</code> v7 + Canvas API for images.',
      flow: [
        'PDFs: parsed with <code>PDFDocument.load()</code>; <code>setTitle("")</code>, <code>setAuthor("")</code>, <code>setSubject("")</code>, <code>setKeywords([])</code>, <code>setProducer("")</code>, <code>setCreator("")</code> are called; document re-saved.',
        'Images: <code>exifr</code> parses the original metadata for a before-snapshot; the image is drawn onto a <code>&lt;canvas&gt;</code> and exported via <code>canvas.toBlob()</code>, which by specification does not emit EXIF/XMP.',
        'A second <code>exifr</code> pass on the output verifies the metadata is gone and shows you the before/after comparison.',
      ],
      sourceFile: 'src/tools/privacy/StripFileMetadata.jsx',
    },
    privacy: [
      'Files are loaded into browser memory and processed locally. Never uploaded.',
      'The metadata we show you (before/after) is parsed in your browser — not looked up anywhere.',
      'Output files are built in memory and handed to your browser\u2019s download dialog.',
    ],
    limitations: [
      'For PDFs, we strip the standard Info dictionary and XMP block. Custom or third-party metadata streams (e.g. embedded review comments, form data, attached files) are handled by the main pdf-lib serializer but may survive in edge cases. Inspect sensitive PDFs in Adobe Acrobat\u2019s "Examine Document" afterwards for double-check.',
      'For images, re-encoding through a canvas may slightly change pixel data. For archival originals, keep an untouched copy.',
      'GPS coordinates embedded directly in the image pixels (e.g. burned-in watermarks) cannot be removed by any metadata tool. Crop them out with Image Cropper.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, drop in a photo from your phone, and strip its metadata. Open both the original and the cleaned version in a metadata viewer (e.g. Windows Explorer > Properties > Details, or exiftool). The GPS coordinates are gone from the clean copy.',
    },
  },

  'strip-image-metadata': {
    whatItDoes: 'Removes EXIF and metadata from an image — including GPS coordinates, camera model, and timestamps — so you can share it without leaking where, when, or how it was taken.',
    howItWorks: [
      'Your browser reads the image file and extracts its metadata so you can see what was originally embedded (lat/long, camera, edit date). Then it draws the image onto a canvas and exports it back out as a new image — the canvas export step, by design, does not carry the original metadata with it.',
      'A second metadata scan on the output confirms the EXIF block is gone, and you see a clean before/after report.',
    ],
    technicalDetails: {
      library: '<code>exifr</code> v7.1.3 for EXIF parsing; Canvas API <code>toBlob()</code> for re-encoding.',
      flow: [
        '<code>exifr.parse(file, { gps: true })</code> reads the original metadata.',
        'An <code>&lt;img&gt;</code> element is drawn onto a <code>&lt;canvas&gt;</code> at the image\u2019s native dimensions.',
        '<code>canvas.toBlob(\'image/png\')</code> (or <code>\'image/jpeg\'</code>) emits a fresh file without EXIF/XMP.',
        'A verification pass with <code>exifr</code> confirms the output has no metadata.',
      ],
      sourceFile: 'src/tools/images/StripImageMetadata.jsx',
    },
    privacy: [
      'Your image is loaded into memory with <code>FileReader</code>, parsed locally, and re-encoded locally. Never uploaded.',
      'The before/after metadata report is built in your browser — no EXIF data is sent to any server.',
      'The cleaned image is downloaded as a local blob; nothing is cached beyond your tab\u2019s session.',
    ],
    limitations: [
      'Canvas re-encoding may slightly reduce quality for JPEGs. For archival originals, keep a copy; this tool is for the version you intend to share publicly.',
      'IPTC metadata (caption, credit, copyright fields used by photojournalists) is also removed — if you need to preserve those while removing GPS, a dedicated tool like ExifTool is better.',
      'Metadata burned into the image itself (timestamp watermarks, GPS overlays drawn onto pixels) cannot be removed by this tool. Crop them out instead.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, upload a photo from your phone, and strip its metadata. The GPS coordinates in the before-report disappear in the after-report — all of that parsing happened inside your browser.',
    },
  },

  'data-anonymizer': {
    whatItDoes: 'De-identifies CSV or free-text research data by replacing direct identifiers with codes, pseudonyms, or redactions — so you can share it or work with it without exposing participants.',
    howItWorks: [
      'You paste in text or upload a CSV, pick the columns or entity types that need de-identification, and choose a strategy: <strong>coded</strong> (consistent pseudonyms + a separate key file that maps codes back to originals), <strong>pseudonymized</strong> (one-way hash — no way back), or <strong>anonymized</strong> (redacted to [REDACTED], irreversible).',
      'Everything runs inside your browser. If you pick the coded strategy, the key file is generated as a second download — and per TCPS 2 guidance, you should store it <strong>separately</strong> from the coded data so the two can\u2019t be joined without explicit access.',
    ],
    technicalDetails: {
      library: 'WebCrypto <code>crypto.subtle.digest(\'SHA-256\')</code>; regex patterns for PII detection in text mode.',
      flow: [
        '<strong>Coded:</strong> unique composite values (e.g. <code>First Name | Last Name</code>) are assigned incremental pseudonyms like <code>Person-1</code>, <code>Person-2</code>. The mapping is emitted as a separate CSV <em>key file</em>.',
        '<strong>Pseudonymized:</strong> each value is hashed with SHA-256 and the first 8 hex chars used as the pseudonym — irreversible without a brute-force search over a known input space.',
        '<strong>Anonymized:</strong> values replaced with <code>[REDACTED]</code>.',
        'Free-text mode detects emails, phone numbers, SIN-like patterns, Canadian postal codes, IPs, URLs, and dates via regex and applies the chosen strategy to each match.',
      ],
      sourceFile: 'src/tools/research/DataAnonymizer.jsx',
    },
    privacy: [
      'Your data (CSV or pasted text) is processed entirely inside this browser tab — never uploaded.',
      'The re-identification key file (coded mode only) is generated locally; we never see it.',
      'Hashes are computed with your browser\u2019s native WebCrypto — no external hashing service.',
      'Close the tab and the data, the key file, and any intermediate state are gone.',
    ],
    limitations: [
      'Regex-based PII detection for free text is a helpful first pass, not a guarantee. It will miss context-specific identifiers (e.g. "the only female PhD in Dept. X"), rare name spellings, and typos.',
      'For TCPS 2–compliant research, always pair this tool with manual review. The coded/pseudonymized/anonymized labels match TCPS 2 Article 5.5 language, but the legal and ethical responsibility for adequate de-identification is yours, not the tool\u2019s.',
      'SHA-256 pseudonyms are reversible if the attacker can guess the input space (e.g. a small closed list of employees). For small-N datasets, use coded mode with a key file stored separately — or anonymized mode if no re-identification is ever needed.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, paste in a CSV of test data, run the tool, and download both the coded file and the key file. Everything worked — because everything happened in your browser.',
    },
  },

  'sign-pdf': {
    whatItDoes: 'Lets you draw, type, or upload a signature and place it visually on a PDF — useful for signing forms that don\u2019t require a cryptographic digital signature.',
    howItWorks: [
      'You draw a signature on a canvas (or type your name in a handwriting font, or upload a signature image). Your browser takes that canvas image and embeds it as a picture on the PDF page at the spot you choose.',
      'The signed PDF downloads to your device.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> + Canvas API.',
      flow: [
        'Signature canvas → <code>canvas.toDataURL(\'image/png\')</code> → <code>pdfDoc.embedPng()</code>.',
        '<code>page.drawImage(pngImage, { x, y, width, height })</code> places the signature at the user\u2019s chosen coordinates.',
        'Document saved via <code>pdfDoc.save()</code> and downloaded as a local blob.',
      ],
      sourceFile: 'src/tools/pdf/SignPDF.jsx',
    },
    privacy: [
      'Your signature and the PDF both live only in your browser\u2019s memory. Nothing is uploaded.',
      'The signed output PDF is built locally and handed to your download dialog.',
      'No signature image, PDF, or identity data is ever sent anywhere.',
    ],
    limitations: [
      '<strong>This is a visual signature, not a cryptographic one.</strong> It has no timestamp, no certificate, no tamper-detection, and is trivially removable or replaceable by anyone with PDF-editing software.',
      'For legally binding digital signatures (e.g. contracts that must meet PIPEDA or eIDAS requirements), use a dedicated tool like Adobe Acrobat Pro, DocuSign, or your institution\u2019s certified e-signature service.',
      'If you need a signed-and-locked PDF, run this tool and then password-protect the output with our Password Protect PDF tool — but understand that\u2019s still not a cryptographic signature.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, draw a signature, place it on a PDF, and download. The signed file lands on your desktop with zero network activity.',
    },
  },

  'markdown-preview': {
    whatItDoes: 'Previews Markdown-formatted text as rendered HTML, and lets you download the HTML — safely, with all script and unsafe HTML stripped out.',
    howItWorks: [
      'You paste Markdown into the editor. A small parser running in your browser converts common Markdown syntax (headings, bold, italic, links, code blocks, blockquotes, lists) to HTML. The HTML then passes through a security library (DOMPurify) that strips anything that could run code — things like <code>&lt;script&gt;</code> tags, inline event handlers, and script-style URLs.',
      'Only the sanitized HTML is inserted into the preview. You can read the result side-by-side with your source, or download it as a standalone .html file.',
    ],
    technicalDetails: {
      library: '<code>dompurify</code> v3.3.3 for sanitization; a custom lightweight Markdown parser.',
      flow: [
        '<code>parseMarkdown(text)</code> handles headings, bold/italic, inline/block code, blockquotes, bullet and numbered lists, and links.',
        '<code>DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i, FORBID_ATTR: [\'style\', \'onerror\', \'onload\'], FORBID_TAGS: [\'div\', \'span\'] })</code> — strict allowlist, blocks script-style and embedded-data URLs.',
        'The sanitized HTML is injected into the preview pane via React\u2019s <code>dangerouslySetInnerHTML</code> — safe because DOMPurify has already removed any executable content.',
      ],
      sourceFile: 'src/tools/text/MarkdownPreview.jsx',
    },
    privacy: [
      'Your Markdown source stays in your browser tab. Nothing is sent anywhere.',
      'No rendering service, no external CSS, no remote fonts are fetched while previewing.',
      'The HTML download is built from the sanitized content locally.',
    ],
    limitations: [
      'The Markdown parser covers common syntax but not every GitHub-flavored extension. Tables, footnotes, and task lists are not supported — paste through a heavier tool if you need those.',
      'DOMPurify\u2019s allowlist is intentionally strict. Some valid but less-common HTML (inline styles, certain SVG attributes) will be stripped. That\u2019s the safety trade-off.',
      'Preview is a display tool — it does not "lint" or validate your Markdown. Broken syntax will render as whatever the parser can make of it.',
    ],
    verify: {
      quick: 'Paste a Markdown snippet that includes <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>. The preview renders the rest safely and the script simply does not run — because DOMPurify strips it before it reaches the DOM.',
    },
  },

  'compress-pdf': {
    whatItDoes: 'Shrinks PDF file size — especially dramatically for image-heavy PDFs (scanned documents, archival photos, field notebooks) — so you can email, share, or archive them without hitting size limits.',
    howItWorks: [
      'When you drop in a PDF, the tool looks at what\u2019s inside. If it\u2019s mostly images (scanned pages, photos), it re-compresses each embedded image at a lower quality — your text, vectors, and document outlines stay intact and selectable. If it\u2019s text-heavy, it strips invisible clutter (embedded files, old thumbnails, metadata, JavaScript).',
      'You see three preset sizes (Low / Medium / High compression) side by side before you commit to downloading — a sample-based estimate runs up front to project the output size within about ±15%. If a preset won\u2019t shrink your file enough to matter, it\u2019s hidden.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code>, <code>pdfjs-dist</code> v5.6.205, and Canvas API.',
      flow: [
        '<strong>Analysis:</strong> pdfjs <code>getOperatorList()</code> finds <code>paintImageXObject</code> operations; total image bytes vs. total file bytes routes to smart or text-only mode.',
        '<strong>Smart mode:</strong> <code>pdfDoc.context.enumerateIndirectObjects()</code> walks every JPEG XObject; each is decoded via <code>createImageBitmap()</code>, re-encoded with <code>OffscreenCanvas.convertToBlob(\'image/jpeg\', quality)</code>, and swapped back in via <code>PDFRawStream.of()</code>. Text and vectors are untouched.',
        '<strong>Aggressive mode:</strong> each page is rasterized to a single JPEG and re-embedded. Much smaller, but text becomes pixels.',
        '<strong>Text-only mode:</strong> strips XMP metadata, embedded file attachments, JavaScript, and per-page thumbnails; preserves title, author, outlines, named destinations.',
      ],
      sourceFile: 'src/tools/pdf/CompressPDF.jsx',
    },
    privacy: [
      'Your PDF is loaded into browser memory with <code>FileReader</code>. Never uploaded.',
      'Image re-encoding runs on an <code>OffscreenCanvas</code> inside your browser.',
      'All three preset versions are generated locally when you request them.',
      'The final compressed PDF is handed to your browser\u2019s download dialog as a local blob.',
    ],
    limitations: [
      'Aggressive compression flattens text into images — you lose selectability and screen-reader compatibility. Use Smart or Medium unless you specifically need the smallest possible file.',
      'For heavily scanned documents (100+ pages of images), desktop tools like Ghostscript or PDFGear can sometimes do better than any browser can. We link to them honestly from within the tool when we can\u2019t match their compression.',
      'PDFs with JBIG2 or CCITT Fax image compression (some older scanned documents) can\u2019t use smart mode — the tool falls back to aggressive.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, drop in a scanned PDF, and pick a preset. The download arrives with no network requests — the compression ran entirely on your device.',
    },
  },

  // ============================================================
  // TIER 2 — touches sensitive data / non-obvious privacy property
  // ============================================================

  'merge-pdfs': {
    whatItDoes: 'Combines two or more PDFs into a single document, in the order you arrange them. Text stays selectable; fonts and images come through unchanged.',
    howItWorks: [
      'When you drop your files in, your browser opens them the same way it would open any PDF you click on — temporarily, in memory. A PDF tool library (already downloaded when you first visited this site) copies each page into a new combined document, then hands the new file to your browser\u2019s download prompt.',
      'That\u2019s it. There\u2019s no "upload," no server step, no cloud. If you closed this tab right now, every trace of your files would be gone.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> v1.17.1 (maintained fork of <code>pdf-lib</code>).',
      flow: [
        'Each PDF is read into a <code>Uint8Array</code> in your tab\u2019s memory.',
        '<code>PDFDocument.load()</code> parses each source into an object tree.',
        '<code>PDFDocument.create()</code> builds an empty target document.',
        '<code>copyPages()</code> deep-copies each source page (fonts, images, XObjects) into the target.',
        'The merged bytes are saved and handed to the browser as a local blob.',
      ],
      sourceFile: 'src/tools/pdf/MergePDFs.jsx',
    },
    privacy: [
      'Your PDFs are loaded with <code>FileReader</code> into JavaScript memory. They are never sent anywhere — no <code>fetch()</code>, no <code>XMLHttpRequest</code>, no WebSocket.',
      'The merged output is assembled in memory and handed to your browser\u2019s download dialog via a local blob URL.',
      'Nothing is cached to disk, written to IndexedDB, or persisted in <code>localStorage</code>. Reload the tab and your files are gone.',
    ],
    limitations: [
      'Bookmarks and table-of-contents links from your original PDFs won\u2019t carry over. Page content and links within the document do.',
      'Digital signatures on source PDFs are invalidated by the merge — any time a signed PDF is changed, the signature no longer matches.',
      'Fillable form fields and signature boxes do not survive the merge — the combined PDF loses its form layer, so a signature spot placed for Adobe Acrobat will stop working. If a document needs to be signed, collect the signature first, then merge. If the fields are no longer needed, flatten the source first (File → Print → Save as PDF).',
      'Password-protected PDFs are rejected. Remove the password first with our Remove PDF Password tool.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'extract-images-from-pdf': {
    whatItDoes: 'Pulls every embedded image out of a PDF and packages them as a ZIP file you can download.',
    howItWorks: [
      'The tool opens your PDF inside your browser, walks through each page, and looks for image objects. When it finds one, it extracts the image bytes directly — not a re-rendered copy — so the original resolution and quality are preserved. All the images get bundled into a ZIP for you to download.',
    ],
    technicalDetails: {
      library: '<code>pdfjs-dist</code> v5.6.205 for PDF parsing; <code>jszip</code> v3 for packaging.',
      flow: [
        'For each page, <code>page.getOperatorList()</code> finds <code>OPS.paintImageXObject</code> and <code>OPS.paintJpegImageXObject</code> operations.',
        '<code>page.objs.get(imageRef)</code> returns the raw image data (bitmap or JPEG bytes).',
        'JPEGs are written to the ZIP as-is; bitmap images are converted to PNG via canvas <code>toBlob()</code>.',
        '<code>jszip.generateAsync()</code> builds the archive; the output is downloaded as a local blob.',
      ],
      sourceFile: 'src/tools/pdf/ExtractImagesFromPDF.jsx',
    },
    privacy: [
      'Your PDF is loaded into browser memory with <code>FileReader</code>. Never uploaded.',
      'Image extraction happens entirely inside a sandboxed Web Worker in your browser.',
      'The ZIP is built in memory and downloaded via a local blob URL.',
    ],
    limitations: [
      'Very small images (under 10 pixels) are skipped — they\u2019re almost always rendering artifacts (icons, bullet dots), not real content.',
      'Some PDFs use obscure color spaces or embedded JBIG2 images that the extractor may skip or convert imperfectly.',
      'Vector graphics (shapes, line art) are not "images" in the PDF sense and won\u2019t be extracted. Only raster images come out.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'pdf-page-delete': {
    whatItDoes: 'Permanently removes specific pages from a PDF.',
    howItWorks: [
      'You drop in the PDF and pick which pages to delete. A PDF library in your browser rebuilds the document with only the pages you kept — the deleted pages are not just hidden; they are absent from the output file entirely.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code>.',
      flow: [
        '<code>PDFDocument.load()</code> parses the source PDF.',
        'A new <code>PDFDocument.create()</code> target is built; <code>copyPages()</code> copies only the indexes you chose to keep.',
        'The output PDF is saved and downloaded — the removed pages\u2019 object trees are not included.',
      ],
      sourceFile: 'src/tools/pdf/PDFPageDelete.jsx',
    },
    privacy: [
      'Your PDF is loaded into memory and processed locally. Never uploaded.',
      'The output PDF is built in memory and handed to your browser\u2019s download dialog.',
    ],
    limitations: [
      'Deleted pages are gone from the output — but we recommend keeping a backup of the original. There is no undo within the tool.',
      'Bookmarks and internal links that pointed to deleted pages will be broken in the output. Page content and remaining links are preserved.',
      'Digital signatures on the source are invalidated by any edit, including page deletion.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'pdf-to-images': {
    whatItDoes: 'Renders each page of a PDF as a PNG or JPEG image, useful for slide decks, printing, or flattening a document for redaction.',
    howItWorks: [
      'A PDF rendering engine runs inside your browser and paints each page onto a canvas at a scale you choose (1×, 2×, or 3× for higher resolution). Each canvas is then exported as an image. All the images are packaged as a ZIP you can download.',
    ],
    technicalDetails: {
      library: '<code>pdfjs-dist</code> v5.6.205 + Canvas API + <code>jszip</code>.',
      flow: [
        '<code>page.getViewport({ scale })</code> defines the render resolution.',
        '<code>page.render({ canvasContext, viewport })</code> paints the page onto an off-screen canvas.',
        '<code>canvas.toBlob(\'image/png\')</code> or <code>\'image/jpeg\'</code> exports the image.',
        '<code>jszip.generateAsync()</code> bundles everything into a downloadable archive.',
      ],
      sourceFile: 'src/tools/pdf/PDFToImages.jsx',
    },
    privacy: [
      'Your PDF is loaded in browser memory and rendered inside a sandboxed Web Worker.',
      'Canvas rendering is purely client-side; the generated images never leave your device.',
      'The ZIP download is a local blob — nothing is cached after you leave.',
    ],
    limitations: [
      'Images are pixel-based, so the output is no longer text-searchable. Use this for distribution or print, not for archival where you\u2019ll need to search later.',
      'Higher scales produce sharper images but much bigger files. 2× is a good default for most uses.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'fillable-pdf-form': {
    whatItDoes: 'Turns a flat PDF into a fillable form — add text fields, checkboxes, radio groups, dropdowns, and signature boxes by clicking directly on a page preview.',
    howItWorks: [
      'You drop in a flat PDF (one without existing form fields). For each field you want, you click on the page preview to place and size it. When you\u2019re done, a PDF library in your browser adds those fields to the PDF\u2019s underlying form layer and saves a new version that anyone with Adobe Reader, Foxit, or a browser can fill in.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code> v1.17.1 (AcroForm API).',
      flow: [
        '<code>pdfDoc.getForm().getFields()</code> pre-flight check detects existing form fields and refuses to proceed — adding fields to a PDF that already has them produces broken output in Adobe Acrobat.',
        '<code>form.createTextField(name)</code>, <code>createCheckBox()</code>, <code>createRadioGroup()</code>, <code>createDropdown()</code> build the field definitions.',
        '<code>field.addToPage(page, { x, y, width, height })</code> places each field at the coordinates you clicked.',
        'Signature boxes register real <code>/Sig</code> widgets with <code>SigFlags = 3</code> so Adobe Reader\u2019s Fill & Sign workflow recognizes them.',
      ],
      sourceFile: 'src/tools/pdf/FillablePDFForm.jsx',
    },
    privacy: [
      'Your PDF is loaded into browser memory and edited locally. Never uploaded.',
      'Field placement happens on a canvas overlay in your browser.',
      'The fillable output is built in memory and downloaded as a local blob.',
    ],
    limitations: [
      'This tool refuses to work on PDFs that already have form fields — adding to existing forms produces files Adobe Acrobat flags as broken. Flatten the source first (File → Print → Save as PDF).',
      'Field scripting (validation rules, calculated fields, date formatting) is not supported. You get a working form, but not a programmed one.',
      'Signature boxes are PDF signature widgets, not cryptographic signatures. They pair with Adobe\u2019s certificate-based signing for real digital signatures, but the widget itself is just a placeholder.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'compress-image': {
    whatItDoes: 'Shrinks a JPEG, PNG, or WebP image\u2019s file size by reducing quality or resizing it — with a live preview so you can trade off quality against size.',
    howItWorks: [
      'Your browser draws the image onto a canvas at whatever dimensions you choose, then exports it back out as a JPEG, PNG, or WebP at a quality level you control. You see the before/after size and the result side-by-side before you download.',
    ],
    technicalDetails: {
      library: 'Canvas API — <code>canvas.toBlob(mimeType, quality)</code>.',
      flow: [
        'Image is loaded via <code>createImageBitmap()</code> or an <code>&lt;img&gt;</code> element.',
        'Drawn onto an off-screen canvas at the target dimensions.',
        '<code>canvas.toBlob(\'image/jpeg\', quality)</code> (or <code>\'image/webp\'</code>, <code>\'image/png\'</code>) produces the output.',
        'The blob is handed to a local download link; original size vs. output size are displayed.',
      ],
      sourceFile: 'src/tools/images/CompressImage.jsx',
    },
    privacy: [
      'Your image is loaded into browser memory and re-encoded locally. Never uploaded.',
      'Preview rendering happens on a canvas inside your browser.',
      'The compressed output is handed to your browser\u2019s download dialog.',
    ],
    limitations: [
      'Animated formats (GIF, APNG) are flattened to a single frame — only the first frame is preserved. Use a dedicated animation editor for those.',
      'Quality sliders are perceptual approximations, not linear. Quality 50 is not "half as good" as 100; it depends on the image content.',
      'PNG compression is lossless — the quality slider only applies to JPEG and WebP outputs.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'image-to-pdf': {
    whatItDoes: 'Wraps an image in a PDF wrapper — useful when you need to submit a photo or scan as a PDF for compatibility.',
    howItWorks: [
      'Your browser reads the image, embeds it into a new one-page PDF using a PDF library, and hands you the resulting file. JPEGs are embedded directly without re-encoding; other formats are converted to PNG first via a canvas.',
    ],
    technicalDetails: {
      library: '<code>@cantoo/pdf-lib</code>.',
      flow: [
        'For JPEG inputs: <code>pdfDoc.embedJpg(bytes)</code> embeds the image directly — no re-encoding, no quality loss.',
        'For other formats: image is drawn onto a canvas, exported as PNG via <code>canvas.toBlob()</code>, then embedded via <code>pdfDoc.embedPng()</code>.',
        '<code>pdfDoc.addPage()</code> + <code>page.drawImage()</code> places the image on a page sized A4 or Letter.',
        'Document saved and downloaded as a local blob.',
      ],
      sourceFile: 'src/tools/images/ImageToPDF.jsx',
    },
    privacy: [
      'Your image is loaded into browser memory and embedded locally. Never uploaded.',
      'The output PDF is built in memory and handed to your browser\u2019s download dialog.',
    ],
    limitations: [
      'Multi-image PDFs (combining many photos into one document) are not supported in a single run. Use Merge PDFs to stitch several one-image PDFs together.',
      'Very large images (50+ megapixels) may run out of canvas memory in some browsers. Resize first with our Resize Image tool.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'extract-zip': {
    whatItDoes: 'Opens a ZIP archive and extracts its contents, so you can see or save individual files inside.',
    howItWorks: [
      'A ZIP library in your browser reads the archive\u2019s directory, lists every file inside, and lets you download them individually or as a whole. Before any file is extracted, the tool checks the declared uncompressed size — if the archive claims to decompress to more than 5 GB, it\u2019s refused as a potential "ZIP bomb" (a small archive crafted to fill your disk).',
    ],
    technicalDetails: {
      library: '<code>jszip</code> v3.10.1.',
      flow: [
        '<code>JSZip.loadAsync(bytes)</code> reads the archive\u2019s central directory.',
        '<strong>ZIP-bomb guard:</strong> before extraction, each entry\u2019s <code>_data.uncompressedSize</code> is summed; if total exceeds <strong>5 GB</strong>, extraction is refused.',
        'Each entry\u2019s contents are decompressed into a <code>Uint8Array</code> in memory; each download is a local blob URL.',
        'Password-protected ZIPs are detected via the entry header flag and flagged as unsupported.',
      ],
      sourceFile: 'src/tools/archives/ExtractZIP.jsx',
    },
    privacy: [
      'Your ZIP is loaded into browser memory and decompressed locally. Never uploaded.',
      'Each extracted file is handed to your browser\u2019s download dialog as a local blob.',
      'Contents are never cached to disk by the tool itself.',
    ],
    limitations: [
      'The 5 GB decompressed-size cap protects you from ZIP bombs but also blocks some legitimate very-large archives. For those, use a desktop tool like 7-Zip.',
      'Password-protected ZIPs are not supported. Use 7-Zip or a similar desktop tool to decrypt first.',
      'Very large archives can exhaust your browser\u2019s memory. If the tool freezes on a multi-gigabyte file, try extracting piece by piece instead.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

  'magic-byte-checker': {
    whatItDoes: 'Reads the first few bytes of a file to identify what it really is — catching cases where someone has renamed a file to hide its true type (e.g. a .exe disguised as .pdf).',
    howItWorks: [
      'Every major file format has a unique "magic number" in its first few bytes — a fixed signature the format specification requires. Your browser reads those bytes and compares them against a list of 25+ known signatures (PDF, PNG, JPEG, ZIP, EXE, ELF, Office documents, and more).',
      'The real file type is displayed alongside the claimed extension. If they don\u2019t match, you get a warning.',
    ],
    technicalDetails: {
      library: 'None — vanilla JavaScript + a built-in signature table.',
      flow: [
        '<code>FileReader.readAsArrayBuffer()</code> reads the first 16 bytes of the file.',
        'Each byte sequence is compared against known signatures: e.g. <code>25 50 44 46</code> = PDF, <code>FF D8 FF</code> = JPEG, <code>50 4B 03 04</code> = ZIP.',
        'For text-shaped files, a UTF-8 / ASCII validity check runs to classify as plain text.',
        'Result is the true type plus a mismatch warning if the extension disagrees.',
      ],
      sourceFile: 'src/tools/privacy/MagicByteChecker.jsx',
    },
    privacy: [
      'Only the first 16 bytes of your file are read — but even those stay in your browser. No file data leaves your device.',
      'The signature table is a hard-coded constant in the tool — no external lookup service is consulted.',
    ],
    limitations: [
      'Magic bytes identify the file\u2019s true container format. A file that really is a PDF can still contain malicious content (embedded JavaScript, active-content forms). This tool catches extension spoofing — it doesn\u2019t scan for malware.',
      'Newly defined or obscure formats may not be in the signature table. A negative result means "not one of the 25+ formats we know," not "definitely not a file."',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, upload a file, and get its type. The answer comes back instantly — because no external service was asked.',
    },
  },

  'checksum-verifier': {
    whatItDoes: 'Computes a SHA-256 hash of a file and compares it to an expected value, so you can verify that a download you received matches what the source published.',
    howItWorks: [
      'You drop in a file; your browser computes its SHA-256 hash using its own built-in cryptographic hashing engine. You paste in the expected hash (from the software vendor\u2019s website, a checksums.txt manifest, or a signed email) and the tool tells you whether they match.',
    ],
    technicalDetails: {
      library: 'WebCrypto <code>crypto.subtle.digest()</code>.',
      flow: [
        'File is read into an <code>ArrayBuffer</code> via <code>FileReader</code>.',
        '<code>crypto.subtle.digest(\'SHA-256\', buffer)</code> computes the digest.',
        'Result is converted to lowercase hex and compared with the user-supplied expected hash in constant time.',
        'Manifest files (one hash + filename per line) are parsed locally for batch verification.',
      ],
      sourceFile: 'src/tools/privacy/ChecksumVerifier.jsx',
    },
    privacy: [
      'Files are hashed in-browser. Neither the file nor the hash is sent anywhere.',
      'The expected hash you paste in lives only in this browser tab.',
    ],
    limitations: [
      'A hash match proves the file is bit-identical to the one the vendor hashed — it does not, by itself, prove the vendor is trustworthy. Make sure you got the expected hash over a secure channel.',
      'SHA-256 is used; SHA-1 and MD5 are not supported because they\u2019re cryptographically broken.',
    ],
    verify: {
      quick: 'Turn off your Wi-Fi, drop in a file, and check its hash. The answer appears instantly — all hashing ran in your browser.',
    },
  },

  'to-markdown': {
    whatItDoes: 'Converts safer text-shaped documents (PDF, HTML, CSV, TXT, Markdown, RTF, JSON) into clean Markdown text — useful for feeding documents to AI tools or for clean archival.',
    howItWorks: [
      'Depending on the file type, browser-local parsing extracts text: PDF text comes from pdfjs, HTML is converted through Turndown, and text-shaped formats use native parsers. Two output modes: "AI-friendly" (flattened, no complex formatting) or "Preserve formatting" (full Markdown structure with tables and lists).',
    ],
    technicalDetails: {
      library: '<code>pdfjs-dist</code> for PDF text extraction; <code>turndown</code> + <code>turndown-plugin-gfm</code> for HTML → Markdown; native parsers for JSON/CSV/TXT/RTF/Markdown.',
      flow: [
        'File type is detected by extension after browser file selection.',
        'PDF → <code>pdfjs</code> per-page <code>page.getTextContent()</code> → joined text with paragraph breaks.',
        'CSV → local row parser → Markdown table.',
        'HTML → Turndown (with GFM plugin for tables/strikethrough).',
      ],
      sourceFile: 'src/tools/text/FileToMarkdown.jsx',
    },
    privacy: [
      'Your document is loaded into browser memory and parsed locally. Never uploaded.',
      'All libraries run inside your browser tab — none of them make network calls.',
      'The Markdown output is built in memory and displayed or downloaded as a local blob.',
    ],
    limitations: [
      'DOCX and XLSX input is intentionally disabled until the project has maintained parser dependencies with a clean production security audit. Export those files to PDF, CSV, TXT, or HTML first.',
      'PDF text extraction is best-effort. Scanned PDFs have no text to extract — use OCR first (e.g. Tesseract) or accept that the output will be empty.',
    ],
    verify: {
      quick: DEFAULT_QUICK_VERIFY,
    },
  },

};

export function getExplainer(toolId) {
  return EXPLAINERS[toolId] || null;
}

export const EXPLAINER_TOOL_IDS = Object.keys(EXPLAINERS);

/**
 * Pre-use caveats — the 1-2 highest-impact things a user must know BEFORE
 * using a tool. Rendered always-visible by src/components/ui/ToolCaveats.jsx
 * above the tool UI (wired globally in App.jsx).
 *
 * Standalone map (not a field on EXPLAINERS entries) because caveat coverage
 * is independent of explainer coverage — several structural PDF tools have
 * caveats but no full explainer.
 *
 * Promotion criteria (see docs/superpowers/specs/2026-07-17-tool-caveats-design.md):
 *   1. Feature/data loss the user may need later
 *   2. Workflow-order advice ("do X first, then use this tool")
 *   3. Compliance-critical (PHIPA / TCPS 2 / legal risk if misunderstood)
 * Deliberately NOT every limitation — if every tool shouts, users stop reading.
 * Plain strings only (no HTML). Max 2 per tool.
 */
export const TOOL_CAVEATS = {
  'merge-pdfs': [
    'Merging removes fillable form fields and signature boxes — they will not work in the combined PDF. If a document needs to be signed (for example through Adobe Acrobat), collect the signature first, then merge.',
    'Existing digital signatures are invalidated by any merge — that’s how PDF signing works, not a flaw in this tool.',
  ],
  'split-pdf': [
    'Splitting rebuilds the document, so fillable form fields and signature boxes will not work in the output files. If the document needs to be signed, collect the signature first, then split.',
    'Existing digital signatures are invalidated — any change to a signed PDF breaks its signature.',
  ],
  'reorder-pages': [
    'Reordering rebuilds the document, so fillable form fields and signature boxes will not work in the output. If the document needs to be signed, collect the signature first.',
    'Existing digital signatures are invalidated — any change to a signed PDF breaks its signature.',
  ],
  'pdf-page-delete': [
    'Deleting pages rebuilds the document, so fillable form fields and signature boxes will not survive in the output.',
    'There is no undo — keep a copy of the original file.',
  ],
  'rotate-pages': [
    'Saving a rotated copy can break fillable form fields and signature boxes. If the document needs to be signed, collect the signature first.',
    'Existing digital signatures are invalidated by any edit, including rotation.',
  ],
  'add-page-numbers': [
    'Adding page numbers re-saves the document, which can break fillable form fields and signature boxes. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'add-cover-page': [
    'Adding a cover page rebuilds the document, so fillable form fields and signature boxes will not survive. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'pdf-watermark': [
    'Watermarking re-saves the document, which can break fillable form fields and signature boxes. If the document needs to be signed, get it signed first.',
    'Existing digital signatures are invalidated by any edit.',
  ],
  'compress-pdf': [
    'Aggressive compression flattens pages into images — text stops being selectable, searchable, and screen-reader accessible. Use the Smart presets unless you need the absolute smallest file.',
    'Form fields, signature boxes, and existing digital signatures do not survive compression. If a document needs to be signed, get it signed first.',
  ],
  'pdf-redaction': [
    'Only pages you draw a redaction on are scrubbed. If sensitive content also appears on other pages, that text remains fully extractable — mark every page where it appears.',
    'Redacted pages become images: no text selection, search, or screen-reader access on those pages.',
  ],
  'pdf-to-images': [
    'The output images are pixels, not text — they are not searchable and not screen-reader accessible. Keep the original PDF if you’ll need either.',
  ],
  'sign-pdf': [
    'This places a picture of a signature — it is not a cryptographic digital signature. There is no certificate, timestamp, or tamper protection, and anyone with a PDF editor can remove or move it.',
    'For legally binding signatures, use a certified e-signature service (Adobe Acrobat Sign, DocuSign, or your institution’s provider).',
  ],
  'password-protect-pdf': [
    'PDF password protection is older and weaker than modern container encryption. For genuinely sensitive data (health records, interview transcripts), put the file in an encrypted 7-Zip or VeraCrypt container instead — or as well.',
  ],
  'encrypt-decrypt-text': [
    'There is no password reset, backdoor, or recovery. If you lose the password, the text is gone permanently — that’s the point. Store the password in a password manager.',
  ],
  'data-anonymizer': [
    'Automated de-identification is a first pass, not a guarantee — it cannot catch context clues like “the only female PhD in the department.” TCPS 2 compliance still requires human review of the output.',
    'If you use the coded strategy, store the key file separately from the coded data (TCPS 2 Art. 5.5).',
  ],
  'strip-file-metadata': [
    'For PDFs, rare third-party metadata streams can survive. For sensitive documents, double-check afterwards with Adobe Acrobat’s Examine Document.',
  ],
  'strip-image-metadata': [
    'Information burned into the pixels — timestamp watermarks, GPS overlays — is not metadata and won’t be removed. Crop it out with the Image Cropper instead.',
  ],
  'compress-image': [
    'Animated GIFs and APNGs are flattened to their first frame — the animation is lost.',
  ],
};

export function getCaveats(toolId) {
  return TOOL_CAVEATS[toolId] || null;
}
