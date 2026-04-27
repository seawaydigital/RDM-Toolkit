import { Fragment, useState } from 'react';
import {
  Layers, FileSignature, FileText, Monitor,
  CheckCircle2, ExternalLink, CircleDollarSign,
  AlertCircle, Shield, WifiOff, ChevronRight,
  Clock, Lock, Sparkles, Users, Calculator
} from 'lucide-react';

/* ─── Pricing tiers (used by the savings calculator) ─────────────────────── */

const PRICE_TIERS = [
  { id: 'low',  amount: 177, label: 'Lakehead internal', hint: 'Lakehead enterprise licensing, paid up-front for the full year' },
  { id: 'mid',  amount: 240, label: 'Monthly billing',   hint: 'Adobe individual plan, billed monthly (~$19.99/mo, before tax)' },
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
    covers: [
      'Merge, split, rotate & reorder pages',
      'Add page numbers & cover pages',
      'Password protect & unlock PDFs',
      'Watermarks, image & metadata tools',
      'Research data tools (BibTeX, CSV, anonymization)',
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
    accent: '#FF4444',
    covers: [
      'Fill grant application & HR forms (AcroForms)',
      'Highlight, annotate & comment on PDFs',
      'E-sign documents',
      'Request signatures from collaborators',
    ],
    link: 'https://get.adobe.com/reader/',
    linkLabel: 'Download free',
  },
  {
    id: 'google',
    name: 'Google Docs',
    tagline: "Available via Lakehead\u2019s Google Workspace",
    icon: FileText,
    accent: '#4285F4',
    covers: [
      'Convert PDF \u2192 editable Word document',
      'Convert PDF \u2192 Google Sheets (tables)',
      "Covered by Lakehead\u2019s institutional data agreement",
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
      'High-quality PDF → DOCX conversion',
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
      { task: 'Add page numbers',                    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'add-page-numbers' },
      { task: 'Add custom cover page',               badge: 'rdm',     label: 'RDM Toolkit', toolId: 'add-cover-page' },
      { task: 'Inspect & resize page dimensions',    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'pdf-page-inspector' },
    ],
  },
  {
    group: 'PDF Security',
    tasks: [
      { task: 'Password protect PDF (AES-256)',       badge: 'rdm',     label: 'RDM Toolkit', toolId: 'password-protect-pdf' },
      { task: 'Remove PDF password',                 badge: 'rdm',     label: 'RDM Toolkit', toolId: 'remove-pdf-password' },
      { task: 'Add text watermark (DRAFT, CONFIDENTIAL, etc.)', badge: 'rdm', label: 'RDM Toolkit', toolId: 'pdf-watermark' },
      { task: 'Extract images from PDF',             badge: 'rdm',     label: 'RDM Toolkit', toolId: 'extract-images-from-pdf' },
    ],
  },
  {
    group: 'Annotations & Signing',
    tasks: [
      { task: 'Highlight, annotate & leave comments', badge: 'acrobat', label: 'Free Acrobat Reader' },
      { task: 'Fill grant application & HR forms',   badge: 'acrobat', label: 'Free Acrobat Reader' },
      { task: 'E-sign documents',                    badge: 'acrobat', label: 'Free Acrobat Reader' },
      { task: 'Request signatures from others',      badge: 'acrobat', label: 'Free Acrobat Reader' },
    ],
  },
  {
    group: 'Document Conversion',
    tasks: [
      { task: 'PDF \u2192 Word or Excel',                  badge: 'word',    label: 'Microsoft Word (File \u2192 Open)' },
      { task: 'PDF \u2192 Word (complex formatting)',      badge: 'libre',   label: 'LibreOffice (free) or Tungsten Power PDF (paid)' },
      { task: 'PDF \u2192 images (PNG / JPG)',            badge: 'rdm',     label: 'RDM Toolkit', toolId: 'pdf-to-images' },
      { task: 'Images \u2192 PDF',                       badge: 'rdm',     label: 'RDM Toolkit', toolId: 'image-to-pdf' },
    ],
  },
  {
    group: 'Compliance & Redaction',
    tasks: [
      { task: 'PHIPA/PIPEDA-compliant redaction',    badge: 'rdm',     label: 'RDM Toolkit', toolId: 'pdf-redaction' },
      { task: 'OCR (scanned document recognition)',  badge: 'skip',    label: "Acrobat\u2019s OCR is mediocre \u2014 use Google Docs (free) or ABBYY FineReader Online" },
    ],
  },
];

const BADGE_META = {
  rdm:     { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  acrobat: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  google:  { color: '#4285F4', bg: 'rgba(66,133,244,0.12)' },
  libre:   { color: '#18A303', bg: 'rgba(24,163,3,0.12)' },
  word:    { color: '#2B579A', bg: 'rgba(43,87,154,0.12)' },
  coming:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  skip:    { color: '#7C9BBF', bg: 'rgba(124,155,191,0.10)' },
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function AcrobatAlternative() {
  const [users, setUsers] = useState(1);
  const [tierId, setTierId] = useState('mid');
  const tier = PRICE_TIERS.find((t) => t.id === tierId) ?? PRICE_TIERS[1];

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
          rely on are already available through free, institution-supported tools —
          a quiet way to reclaim a few hundred dollars a year from a subscription
          that may be quietly auto-renewing.
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
          Four complementary tools — most already available to you — together cover the
          same ground as Acrobat Pro for the vast majority of research workflows, with
          no subscription required.
        </p>
        <div className="aa-stack-grid">
          {STACK.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="aa-stack-card"
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
        <div className="aa-table-wrap">
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
                    const meta = BADGE_META[row.badge] ?? BADGE_META.skip;
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
                              {row.badge !== 'skip' && row.badge !== 'coming' && (
                                <CheckCircle2 size={12} />
                              )}
                              {row.badge === 'coming' && <Clock size={12} />}
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
          Two genuine scenarios where an Acrobat Pro subscription earns its keep. If
          neither matches your workflow, the free toolkit above will likely serve you
          just as well.
        </p>
        <div className="aa-honest-cards">
          <div className="aa-honest-card">
            <div className="aa-honest-card-num">1</div>
            <div>
              <div className="aa-honest-card-title">Very high-volume PDF → Word conversion</div>
              <p className="aa-honest-card-desc">
                Google Docs converts PDFs to editable documents for free, but has a monthly
                limit on conversions via Google Workspace. Researchers converting dozens of PDFs
                per month may hit that ceiling. LibreOffice (free, offline) is an alternative
                with no limits — though it requires a desktop install.
              </p>
            </div>
          </div>
          <div className="aa-honest-card">
            <div className="aa-honest-card-num">2</div>
            <div>
              <div className="aa-honest-card-title">Enterprise PKI-certificate digital signatures</div>
              <p className="aa-honest-card-desc">
                Free Acrobat Reader's e-signature is legally valid for the vast majority of
                research and administrative purposes. The rare exception is a regulated process
                requiring a qualified digital signature backed by a PKI certificate — common in
                some legal or government procurement contexts, uncommon in typical research.
              </p>
            </div>
          </div>
        </div>
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
            {[
              { label: 'De-identify Research Data', toolId: 'data-anonymizer' },
              { label: 'SHA-256 File Hasher',    toolId: 'sha256-hasher' },
              { label: 'BibTeX Formatter',       toolId: 'bibtex-formatter' },
              { label: 'Strip File Metadata',    toolId: 'strip-file-metadata' },
              { label: 'CSV \u2194 JSON Converter',   toolId: 'csv-json-converter' },
              { label: 'AES-256 Text Encryption',toolId: 'encrypt-decrypt-text' },
              { label: 'File to Markdown',       toolId: 'to-markdown' },
              { label: 'Password Generator',     toolId: 'password-generator' },
              { label: 'Checksum Verifier',      toolId: 'checksum-verifier' },
              { label: 'CSV Diff',               toolId: 'csv-diff' },
              { label: 'Encoding Detector',      toolId: 'encoding-detector' },
            ].map(({ label, toolId }) => (
              <a key={toolId} href={`#${toolId}`} className="aa-beyond-chip">
                {label}
              </a>
            ))}
          </div>
          <a href="" className="aa-beyond-all" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
            Explore all 46 tools →
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
              where files cannot be uploaded to any cloud service — RDM Toolkit and LibreOffice
              handle everything entirely on your device. No file ever leaves your computer.
              Google Docs (even via Lakehead's institutional tenant) is not appropriate for
              these data types. When in doubt, use the offline tools.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
