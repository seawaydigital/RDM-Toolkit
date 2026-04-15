import {
  Layers, FileSignature, FileText, Monitor,
  CheckCircle2, ExternalLink, CircleDollarSign,
  AlertCircle, Shield, WifiOff, ChevronRight,
  Clock, Lock, Sparkles
} from 'lucide-react';

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
      { task: 'Merge multiple PDFs into one',         badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Split PDF into separate files',        badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Delete specific pages',               badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Rotate pages',                        badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Reorder pages (drag & drop)',          badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Add page numbers',                    badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Add custom cover page',               badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Inspect & resize page dimensions',    badge: 'rdm',     label: 'RDM Toolkit' },
    ],
  },
  {
    group: 'PDF Security',
    tasks: [
      { task: 'Password protect PDF (AES-256)',       badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Remove PDF password',                 badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Add text watermark (DRAFT, CONFIDENTIAL, etc.)', badge: 'rdm', label: 'RDM Toolkit' },
      { task: 'Extract images from PDF',             badge: 'rdm',     label: 'RDM Toolkit' },
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
      { task: 'PDF → Word or Excel (non-sensitive)',  badge: 'google',  label: 'Google Docs (Lakehead)' },
      { task: 'PDF → Word (sensitive/OCAP® data)',   badge: 'libre',   label: 'LibreOffice (offline)' },
      { task: 'PDF → images (PNG / JPG)',            badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Images → PDF',                       badge: 'rdm',     label: 'RDM Toolkit' },
    ],
  },
  {
    group: 'Privacy & Research Tools',
    tasks: [
      { task: 'Strip metadata from any file',        badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'Data anonymization (PII detection)',  badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'SHA-256 file integrity hashing',      badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'BibTeX bibliography formatting',      badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'CSV ↔ JSON conversion & diff',        badge: 'rdm',     label: 'RDM Toolkit' },
      { task: 'AES-256 text encryption',             badge: 'rdm',     label: 'RDM Toolkit' },
    ],
  },
  {
    group: 'Compliance & Redaction',
    tasks: [
      { task: 'Visual redaction (non-sensitive docs)', badge: 'rdm',   label: 'RDM Toolkit' },
      { task: 'PHIPA/PIPEDA-compliant redaction',    badge: 'coming',  label: 'Planned improvement' },
      { task: 'OCR (scanned document recognition)',  badge: 'skip',    label: "Acrobat\u2019s OCR is mediocre \u2014 use Google Docs (free) or ABBYY FineReader Online" },
    ],
  },
];

const BADGE_META = {
  rdm:     { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  acrobat: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  google:  { color: '#4285F4', bg: 'rgba(66,133,244,0.12)' },
  libre:   { color: '#18A303', bg: 'rgba(24,163,3,0.12)' },
  coming:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  skip:    { color: '#7C9BBF', bg: 'rgba(124,155,191,0.10)' },
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function AcrobatAlternative() {
  return (
    <div className="aa">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="aa-hero">
        <div className="aa-hero-eyebrow">
          <CircleDollarSign size={15} />
          Cost guide for Lakehead researchers
        </div>
        <h1 className="aa-hero-title">Ditch Adobe Acrobat Pro</h1>
        <p className="aa-hero-subtitle">
          Most researchers at Lakehead can cover their entire Adobe Acrobat workflow
          for free — using tools already available to them.
        </p>
        <div className="aa-cost-badge">
          <span className="aa-cost-free">$0&thinsp;/&thinsp;year</span>
          <span className="aa-cost-divider">vs</span>
          <span className="aa-cost-paid">~$240&thinsp;/&thinsp;year</span>
          <span className="aa-cost-label">for Adobe Acrobat Pro</span>
        </div>
      </div>

      {/* ── The Free Stack ─────────────────────────────────────────────── */}
      <section className="aa-section">
        <h2 className="aa-section-title">The Free Stack</h2>
        <p className="aa-section-intro">
          Four free tools — used together — replace Adobe Acrobat Pro for the vast
          majority of research workflows.
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
        <h2 className="aa-section-title">Task Coverage</h2>
        <p className="aa-section-intro">
          Every common Adobe Acrobat Pro task — and which free tool covers it.
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
                <>
                  <tr key={group.group} className="aa-table-group">
                    <td colSpan={2}>{group.group}</td>
                  </tr>
                  {group.tasks.map((row) => {
                    const meta = BADGE_META[row.badge] ?? BADGE_META.skip;
                    return (
                      <tr key={row.task} className="aa-table-row">
                        <td className="aa-table-task">
                          <ChevronRight size={13} className="aa-table-arrow" />
                          {row.task}
                        </td>
                        <td className="aa-table-coverage">
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
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── When Acrobat is Still Worth It ─────────────────────────────── */}
      <section className="aa-section aa-honest-section">
        <div className="aa-honest-header">
          <AlertCircle size={18} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <h2 className="aa-section-title" style={{ margin: 0 }}>When Acrobat Pro Is Still Worth It</h2>
        </div>
        <p className="aa-section-intro">
          Two genuine scenarios where a paid Acrobat subscription is justified. If neither
          applies to your workflow, you likely don't need it.
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
