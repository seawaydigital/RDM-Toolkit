import { Fragment, useState } from 'react';
import {
  Layers, FileSignature, FileText, FilePen, Monitor,
  CheckCircle2, ExternalLink, CircleDollarSign,
  AlertCircle, Shield, WifiOff, ChevronRight,
  Lock, Sparkles, Users, Calculator
} from 'lucide-react';
import { ALL_TOOLS, getToolById } from '../../data/toolRegistry';

/* ─── Pricing tiers (used by the savings calculator) ─────────────────────── */

const PRICE_TIERS = [
  { id: 'low',  amount: 177, label: 'Lakehead internal', hint: 'Lakehead enterprise licensing, paid up-front for the full year' },
  { id: 'high', amount: 352, label: 'Retail (with HST)', hint: 'Adobe individual annual plan at retail, including 13% Ontario HST' },
];

/* ─── Data ──────────────────────────────────────────────────────────────── */

const STACK = [
  {
    id: 'rdm',
    name: 'RDM Toolkit',
    tagline: 'This app — already open in your browser',
    icon: Layers,
    accent: '#FFC20E',
    wide: true,
    covers: [
      'Merge, split, rotate & reorder pages',
      'Compress PDFs to email-friendly sizes',
      'Add page numbers, cover pages & watermarks',
      'Build fillable forms & place signatures',
      'Password protect, unlock & redact PDFs',
      'Strip hidden metadata from PDFs & images',
      'Research data tools (BibTeX, CSV, de-identification)',
      'Privacy tools (SHA-256 hashing, encryption)',
    ],
    link: null,
    linkLabel: "You're already here",
  },
  {
    id: 'acrobat',
    name: 'Adobe Acrobat Reader',
    tagline: 'Free download — no Adobe subscription needed',
    icon: FileSignature,
    accent: '#FF6B6B',
    covers: [
      'Fill grant application & HR forms (AcroForms)',
      'Highlight, annotate & comment on PDFs',
      'Sign documents yourself (Fill & Sign)',
      'Certificate-based digital signatures (Use a certificate)',
    ],
    link: 'https://get.adobe.com/reader/',
    linkLabel: 'Download free',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Word & Excel',
    tagline: 'Free to all Lakehead staff and students (Microsoft 365)',
    icon: FilePen,
    accent: '#A5C2F0',
    covers: [
      'Open a PDF as an editable document (File → Open)',
      'Compare two versions of a document (Review → Compare)',
      'Check accessibility before you export to PDF',
      'Pull PDF tables into Excel (Data → Get Data → From File → From PDF, Windows only)',
    ],
    link: null,
    linkLabel: 'Already on your computer',
  },
  {
    id: 'google',
    name: 'Google Docs',
    tagline: 'Available via Lakehead’s Google Workspace',
    icon: FileText,
    accent: '#4285F4',
    covers: [
      'Open a PDF as an editable Doc (best for simple, text-heavy layouts)',
      'OCR small scans (files 2 MB or smaller)',
      'Sign in with your Lakehead account, not a personal one',
    ],
    link: 'https://docs.google.com',
    linkLabel: 'Open Google Docs',
  },
  {
    id: 'libre',
    name: 'LibreOffice',
    tagline: 'Free, fully offline, no cloud upload required',
    icon: Monitor,
    accent: '#18A303',
    covers: [
      'Small in-place text fixes in a PDF (opens in Draw)',
      'Export Writer & Calc files to PDF',
      'Appropriate for OCAP® & PHIPA-governed data',
      'Nothing leaves your device — ever',
    ],
    link: 'https://www.libreoffice.org',
    linkLabel: 'Download free',
  },
];

const TASK_GROUPS = [
  {
    group: 'PDF Page Operations',
    tasks: [
      { task: 'Merge multiple PDFs into one',         badge: 'rdm',     label: 'RDM Toolkit', toolId: 'merge-pdfs' },
      { task: 'Split PDF into separate files',        badge: 'rdm',     label: 'RDM Toolkit', toolId: 'split-pdf' },
      { task: 'Delete specific pages',               badge: 'rdm',     label: 'RDM Toolkit', toolId: 'pdf-page-delete' },
      { task: 'Rotate pages',                        badge: 'rdm',     label: 'RDM Toolkit', toolId: 'rotate-pages' },
      { task: 'Reorder pages (drag & drop)',          badge: 'rdm',     label: 'RDM Toolkit', toolId: 'reorder-pages' },
      { task: 'Compress / reduce file size',         badge: 'rdm',     label: 'RDM Toolkit', toolId: 'compress-pdf' },
      { task: 'Add page numbers',                    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'add-page-numbers' },
      { task: 'Add custom cover page',               badge: 'rdm',     label: 'RDM Toolkit', toolId: 'add-cover-page' },
      { task: 'Inspect & resize page dimensions',    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'pdf-page-inspector' },
    ],
  },
  {
    group: 'PDF Security & Privacy',
    tasks: [
      { task: 'Password protect PDF (AES-256)',       badge: 'rdm',     label: 'RDM Toolkit', toolId: 'password-protect-pdf' },
      { task: 'Remove PDF password',                 badge: 'rdm',     label: 'RDM Toolkit', toolId: 'remove-pdf-password' },
      { task: 'Add text watermark (DRAFT, CONFIDENTIAL, etc.)', badge: 'rdm', label: 'RDM Toolkit', toolId: 'pdf-watermark' },
      { task: 'Remove hidden metadata (author, XMP, attachments)', badge: 'rdm', label: 'RDM Toolkit', toolId: 'strip-file-metadata' },
    ],
  },
  {
    group: 'Forms & Signing',
    tasks: [
      { task: 'Create fillable forms (fields, checkboxes, signature boxes)', badge: 'rdm', label: 'RDM Toolkit', toolId: 'fillable-pdf-form' },
      { task: 'Place a drawn or typed signature',    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'sign-pdf' },
      { task: 'Fill grant application & HR forms',   badge: 'acrobat', label: 'Free Acrobat Reader' },
      { task: 'Highlight, annotate & leave comments', badge: 'acrobat', label: 'Free Acrobat Reader' },
      { task: 'Certificate (PKI) digital signature', badge: 'acrobat', label: 'Free Acrobat Reader (Use a certificate) or LibreOffice' },
      { task: 'Send documents out for signature',    badge: 'gap',     label: 'Your unit’s e-signature service, or OpenSign (free; cloud upload — not for PHIPA/OCAP® documents)' },
    ],
  },
  {
    group: 'Document Conversion',
    tasks: [
      { task: 'PDF → Word',                          badge: 'microsoft', label: 'Microsoft Word (File → Open)' },
      { task: 'PDF tables → Excel',                  badge: 'microsoft', label: 'Microsoft Excel on Windows (Data → Get Data → From File → From PDF)' },
      { task: 'PDF → Word (complex layouts)',        badge: 'gap',       label: 'No reliable free option — Acrobat Pro or another paid converter' },
      { task: 'PDF → images (PNG / JPG)',            badge: 'rdm',       label: 'RDM Toolkit', toolId: 'pdf-to-images' },
      { task: 'Images → PDF',                        badge: 'rdm',       label: 'RDM Toolkit', toolId: 'image-to-pdf' },
      { task: 'Extract images from PDF',             badge: 'rdm',       label: 'RDM Toolkit', toolId: 'extract-images-from-pdf' },
    ],
  },
  {
    group: 'Editing & Review',
    tasks: [
      { task: 'Edit existing text or images in a PDF', badge: 'gap',       label: 'Small fixes: LibreOffice Draw. Otherwise edit the source file and re-export' },
      { task: 'Compare two versions of a document',    badge: 'microsoft', label: 'Microsoft Word (Review → Compare)' },
    ],
  },
  {
    group: 'Compliance, Redaction & Accessibility',
    tasks: [
      { task: 'Redact so the hidden text is removed, not just covered', badge: 'rdm', label: 'RDM Toolkit', toolId: 'pdf-redaction' },
      { task: 'Search-and-redact every occurrence of a term', badge: 'gap', label: 'Stirling-PDF Auto Redact (free, open source, offline) — RDM redaction is drawn page by page' },
      { task: 'OCR (make scanned documents searchable)', badge: 'gap', label: 'NAPS2 (free, offline) — or Google Docs for short, non-sensitive scans' },
      { task: 'Accessibility check & tagging (AODA)',  badge: 'gap', label: 'Check: PAC or veraPDF (free). Fix: in the source file, or Acrobat Pro' },
    ],
  },
];

const BADGE_META = {
  rdm:       { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  acrobat:   { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  microsoft: { color: '#A5C2F0', bg: 'rgba(165,194,240,0.12)' },
  gap:       { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)' },
};

/* Free alternatives for the jobs RDM Toolkit can't do. Inclusion rule: files are
   processed on the user's own computer (or the upload is called out), the tool
   comes from an open-source project or an established publisher, and the free
   version has no watermark or trial limit. Researched and re-verified 2026-09-28.
   Stirling-PDF is listed for Auto Redact only: its docs list auto-redact as a local
   ("Ultra-Lite") tool, while its OCR and Office conversion need a server. Deliberately
   excluded: PDFgear (closed source, online AI features), PDF-XChange Editor free
   (watermarks edits), PDFix Desktop Lite (watermarks saved files), PDF24 Creator
   (its offline PDF→Word and search-and-redact could not be confirmed in PDF24's
   own documentation), online converters. */
const HONEST_CASES = [
  {
    title: 'Editing the existing text or images in a PDF',
    free: [
      { name: 'LibreOffice Draw', url: 'https://www.libreoffice.org', note: 'open source, all platforms; opens each text block as editable. Best for short fixes, and there is a learning curve.' },
    ],
    proWins: 'you edit PDFs often, or need paragraphs to reflow cleanly after an edit.',
  },
  {
    title: 'Making scanned documents searchable (OCR)',
    free: [
      { name: 'NAPS2', url: 'https://www.naps2.com/', note: 'open source, Windows/Mac/Linux; OCR runs offline after a one-time language download, and it can add a searchable text layer to an existing PDF.' },
      { name: 'OCRmyPDF', url: 'https://ocrmypdf.readthedocs.io/', note: 'open source command-line tool for batches of scans.' },
    ],
    proWins: 'you need to correct the recognised text in place across large, mixed-quality archives.',
  },
  {
    title: 'Converting PDFs with complex layouts to Word',
    free: [
      { name: 'Microsoft Word', url: null, note: 'File → Open converts text-heavy PDFs well. Pages that are mostly charts or graphics may come through as images, and we found no free offline tool that reliably does better.' },
    ],
    proWins: 'tables and multi-column layouts must come through faithfully.',
  },
  {
    title: 'Accessibility checking and tagging (AODA)',
    free: [
      { name: 'Fix it in the source', url: null, note: 'run Word’s Accessibility Checker (or use LibreOffice’s tagged-PDF export) before creating the PDF.' },
      { name: 'PAC', url: 'https://pac.pdf-accessibility.org/en', note: 'free PDF/UA and WCAG checker for Windows.' },
      { name: 'veraPDF', url: 'https://verapdf.org/', note: 'open source PDF/UA validator for Windows, Mac and Linux.' },
    ],
    proWins: 'you have to repair inherited PDFs that have no source file.',
  },
  {
    title: 'Redacting every occurrence of a name or number',
    free: [
      { name: 'Stirling-PDF', url: 'https://www.stirling.com/download', note: 'open source desktop app for Windows, Mac and Linux. Its Auto Redact runs offline, finds words or patterns, deletes the matching text and flattens pages to images by default — the same trade-off as RDM’s redaction tool. If the app ever asks you to sign in, that tool is not running locally; don’t sign in for sensitive files.' },
    ],
    proWins: 'redacted pages must stay text-searchable, or you need Bates numbering for legal productions.',
  },
  {
    title: 'Sending documents out for signature',
    free: [
      { name: 'Your unit’s e-signature service', url: null, note: 'ask your department or the Research Office what is already licensed.' },
      { name: 'OpenSign', url: 'https://www.opensignlabs.com/', note: 'open source, free cloud or self-hosted. The cloud version uploads your file, so it is not for PHIPA or OCAP® documents.' },
    ],
    proWins: 'you send high volumes and need templates and audit trails at scale.',
  },
  {
    title: 'Certificate-based (PKI) digital signatures',
    free: [
      { name: 'Free Acrobat Reader', url: 'https://get.adobe.com/reader/', note: 'All tools → Use a certificate → Digitally sign, with a digital ID from your institution or a certificate authority.' },
      { name: 'LibreOffice', url: 'https://www.libreoffice.org', note: 'File → Digital Signatures → Sign Existing PDF.' },
    ],
    proWins: 'you must certify a document as its author, locking it against later changes — Reader can sign but not certify.',
  },
];

/* Research tools shown in the "Beyond Acrobat" card. Names come from the
   registry so the chip always matches the tool page it opens. */
const BEYOND_TOOL_IDS = [
  'data-anonymizer',
  'sha256-hasher',
  'bibtex-formatter',
  'csv-json-converter',
  'encrypt-decrypt-text',
  'to-markdown',
  'password-generator',
  'checksum-verifier',
  'csv-diff',
  'encoding-detector',
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function AcrobatAlternative() {
  const [users, setUsers] = useState(1);
  const [tierId, setTierId] = useState('low');
  const tier = PRICE_TIERS.find((t) => t.id === tierId) ?? PRICE_TIERS[0];

  const safeUsers = Math.max(1, Math.min(500, Number.isFinite(users) ? Math.round(users) : 1));
  const yearlySavings = safeUsers * tier.amount;
  const fiveYearSavings = yearlySavings * 5;
  const fmt = (n) => `$${n.toLocaleString('en-CA')}`;

  return (
    <div className="aa">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="aa-hero">
        <div className="aa-hero-eyebrow">
          <CircleDollarSign size={15} />
          Subscription review for Lakehead researchers
        </div>
        <h1 className="aa-hero-title">Do you still need Adobe Acrobat Pro?</h1>
        <p className="aa-hero-subtitle">
          Before your next renewal, it's worth taking stock of what you actually use
          Acrobat Pro for. For most research workflows at Lakehead, the features you
          rely on are already available through free tools, most of them provided
          through Lakehead — a simple way to reclaim a few hundred dollars a year
          from a subscription that may be quietly auto-renewing.
        </p>
        <div className="aa-cost-badge">
          <span className="aa-cost-free">$0&thinsp;/&thinsp;year</span>
          <span className="aa-cost-divider">vs</span>
          <span className="aa-cost-paid">$177–$352&thinsp;/&thinsp;year</span>
          <span className="aa-cost-label">Acrobat Pro subscription</span>
        </div>
      </div>

      {/* ── Savings Calculator ─────────────────────────────────────────── */}
      <section className="aa-section aa-calc-section">
        <h2 className="aa-section-title">
          <Calculator size={18} aria-hidden="true" />
          What could your team reclaim?
        </h2>
        <p className="aa-section-intro">
          Estimate how much your lab, department, or research group could redirect
          from Acrobat Pro renewals into other priorities — equipment, conference
          travel, or a research assistant. Numbers below are estimates only;
          your actual Adobe quote may vary.
        </p>

        <div className="aa-calc">
          <div className="aa-calc-controls">
            <div className="aa-calc-field">
              <label htmlFor="aa-calc-users" className="aa-calc-label">
                <Users size={14} aria-hidden="true" />
                Number of users
              </label>
              <div className="aa-calc-users-row">
                <input
                  id="aa-calc-users"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={Math.min(safeUsers, 50)}
                  onChange={(e) => setUsers(parseInt(e.target.value, 10))}
                  className="aa-calc-slider"
                  aria-label="Number of users (slider, 1 to 50)"
                />
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={safeUsers}
                  onChange={(e) => setUsers(parseInt(e.target.value, 10) || 1)}
                  className="aa-calc-number"
                  aria-label="Number of users (exact)"
                />
              </div>
              <div className="aa-calc-hint">
                Drag the slider for a department, or type any number up to 500.
              </div>
            </div>

            <div className="aa-calc-field">
              <span className="aa-calc-label">
                <CircleDollarSign size={14} aria-hidden="true" />
                Acrobat Pro plan (per user, per year)
              </span>
              <div className="aa-calc-tiers" role="radiogroup" aria-label="Acrobat Pro plan tier">
                {PRICE_TIERS.map((t) => {
                  const active = t.id === tierId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTierId(t.id)}
                      className={`aa-calc-tier${active ? ' aa-calc-tier--active' : ''}`}
                    >
                      <span className="aa-calc-tier-amount">${t.amount}</span>
                      <span className="aa-calc-tier-label">{t.label}</span>
                      <span className="aa-calc-tier-hint">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="aa-calc-result" aria-live="polite">
            <div className="aa-calc-result-eyebrow">Estimated savings</div>
            <div className="aa-calc-result-primary">
              <div className="aa-calc-result-amount">{fmt(yearlySavings)}</div>
              <div className="aa-calc-result-period">per year</div>
            </div>
            <div className="aa-calc-result-secondary">
              <span className="aa-calc-result-secondary-label">Over 5 years</span>
              <span className="aa-calc-result-secondary-value">{fmt(fiveYearSavings)}</span>
            </div>
            <div className="aa-calc-result-formula">
              {safeUsers.toLocaleString('en-CA')} {safeUsers === 1 ? 'user' : 'users'}
              {' '}× ${tier.amount}/yr ({tier.label.toLowerCase()})
            </div>
          </div>
        </div>
      </section>

      {/* ── The Free Stack ─────────────────────────────────────────────── */}
      <section className="aa-section">
        <h2 className="aa-section-title">The equivalent toolkit</h2>
        <p className="aa-section-intro">
          Five complementary tools — most already available to you — together cover the
          everyday Acrobat Pro jobs in most research workflows, with no subscription
          required. The gaps are listed honestly further down.
        </p>
        <div className="aa-stack-grid">
          {STACK.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className={`aa-stack-card${tool.wide ? ' aa-stack-card--wide' : ''}`}
                style={{ '--card-accent': tool.accent }}
              >
                <div className="aa-stack-card-header">
                  <div className="aa-stack-card-icon" style={{ background: `${tool.accent}1A`, color: tool.accent }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="aa-stack-card-title">{tool.name}</div>
                    <div className="aa-stack-card-tagline">{tool.tagline}</div>
                  </div>
                </div>
                <ul className="aa-stack-card-covers">
                  {tool.covers.map((item, i) => (
                    <li key={i}>
                      <CheckCircle2 size={13} style={{ color: tool.accent, flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {tool.link ? (
                  <a
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aa-stack-card-link"
                    style={{ color: tool.accent, borderColor: `${tool.accent}40` }}
                  >
                    {tool.linkLabel}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="aa-stack-card-link aa-stack-card-link--here" style={{ color: tool.accent, borderColor: `${tool.accent}40` }}>
                    <Sparkles size={12} />
                    {tool.linkLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Task Coverage Table ─────────────────────────────────────────── */}
      <section className="aa-section">
        <h2 className="aa-section-title">Task coverage</h2>
        <p className="aa-section-intro">
          A task-by-task comparison of common Acrobat Pro workflows and the free
          tools that handle them.
        </p>
        <p className="aa-table-legend">
          <span className="aa-table-legend-item">
            <CheckCircle2 size={12} style={{ color: BADGE_META.rdm.color }} aria-hidden="true" />
            Check mark: covered for free
          </span>
          <span className="aa-table-legend-item">
            <AlertCircle size={12} style={{ color: BADGE_META.gap.color }} aria-hidden="true" />
            Amber: only partly covered, or a paid tool does it better
          </span>
        </p>
        <div className="aa-table-wrap" tabIndex={0} role="region" aria-label="Task coverage table">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Free alternative</th>
              </tr>
            </thead>
            <tbody>
              {TASK_GROUPS.map((group) => (
                <Fragment key={group.group}>
                  <tr className="aa-table-group">
                    <td colSpan={2}>{group.group}</td>
                  </tr>
                  {group.tasks.map((row) => {
                    const meta = BADGE_META[row.badge] ?? BADGE_META.gap;
                    const BadgeIcon = row.badge === 'gap' ? AlertCircle : CheckCircle2;
                    const href = row.toolId ? `#${row.toolId}` : null;
                    return (
                      <tr
                        key={row.task}
                        className={`aa-table-row${href ? ' aa-table-row--linked' : ''}`}
                      >
                        <td className="aa-table-task">
                          <ChevronRight size={13} className="aa-table-arrow" />
                          {href ? (
                            <a href={href} className="aa-table-task-link">{row.task}</a>
                          ) : (
                            row.task
                          )}
                        </td>
                        <td className="aa-table-coverage">
                          {href ? (
                            <a
                              href={href}
                              className="aa-badge aa-badge--link"
                              style={{ color: meta.color, background: meta.bg }}
                            >
                              <CheckCircle2 size={12} />
                              {row.label}
                            </a>
                          ) : (
                            <span
                              className="aa-badge"
                              style={{ color: meta.color, background: meta.bg }}
                            >
                              <BadgeIcon size={12} />
                              {row.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── When Acrobat is Still Worth It ─────────────────────────────── */}
      <section className="aa-section aa-honest-section">
        <div className="aa-honest-header">
          <AlertCircle size={18} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <h2 className="aa-section-title" style={{ margin: 0 }}>When Acrobat Pro still earns its keep</h2>
        </div>
        <p className="aa-section-intro">
          Seven jobs RDM Toolkit can't do. Most have a free answer; each card says when
          Acrobat Pro is still worth paying for. If none of these match your workflow,
          the toolkit above will likely serve you just as well.
        </p>
        <p className="aa-honest-rule">
          We only list free tools that work on your own computer without uploading your
          file (or we say so when they do), that come from an open-source project or an
          established publisher, and that don't watermark or time-limit the free version.
        </p>
        <ol className="aa-honest-cards">
          {HONEST_CASES.map((c, i) => (
            <li key={c.title} className="aa-honest-card">
              <div className="aa-honest-card-num" aria-hidden="true">{i + 1}</div>
              <div>
                <h3 className="aa-honest-card-title">{c.title}</h3>
                <div className="aa-honest-free-label">Free option</div>
                <ul className="aa-honest-free">
                  {c.free.map((opt) => (
                    <li key={opt.name}>
                      {opt.url ? (
                        <a href={opt.url} target="_blank" rel="noopener noreferrer">
                          {opt.name}
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      ) : (
                        <strong>{opt.name}</strong>
                      )}
                      {' — '}{opt.note}
                    </li>
                  ))}
                </ul>
                <p className="aa-honest-prowins">
                  <strong>Pro still wins when</strong> {c.proWins}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Beyond Acrobat ─────────────────────────────────────────────── */}
      <section className="aa-section">
        <div className="aa-beyond-card">
          <div className="aa-beyond-top">
            <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div className="aa-beyond-title">Research-specific tools Acrobat doesn't cover</div>
          </div>
          <p className="aa-beyond-body">
            The comparison above is limited to PDF workflows, which is where Acrobat Pro
            is strongest. RDM Toolkit also includes a suite of research-specific tools
            outside Acrobat's scope — all running privately in your browser, with no
            account, no subscription, and no files ever leaving your device.
          </p>
          <div className="aa-beyond-chips">
            {BEYOND_TOOL_IDS.map((id) => getToolById(id)).filter(Boolean).map((tool) => (
              <a key={tool.id} href={`#${tool.id}`} className="aa-beyond-chip">
                {tool.name}
              </a>
            ))}
          </div>
          <a href="#" className="aa-beyond-all" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
            Explore all {ALL_TOOLS.length} tools →
          </a>
        </div>
      </section>

      {/* ── Privacy Note ───────────────────────────────────────────────── */}
      <section className="aa-section">
        <div className="aa-privacy-note">
          <div className="aa-privacy-note-icons">
            <Shield size={20} style={{ color: 'var(--accent-green)' }} />
            <WifiOff size={20} style={{ color: 'var(--accent-green)' }} />
            <Lock size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <div className="aa-privacy-note-title">A note on sensitive research data</div>
            <p className="aa-privacy-note-body">
              For data governed by <strong>OCAP® principles</strong> or <strong>PHIPA</strong> —
              where community agreements, REB protocols or privacy rules often bar cloud
              uploads — RDM Toolkit, LibreOffice,
              NAPS2 (for OCR) and the other offline tools listed above work entirely on your
              device. No file leaves your computer. Google Docs (even via Lakehead's
              institutional tenant) and cloud e-signature services are not appropriate for
              these data types. When in doubt, use the offline tools.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
