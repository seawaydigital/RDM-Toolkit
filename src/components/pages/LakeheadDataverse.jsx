import { useState } from 'react';
import {
  Link, Shield, Lock, CheckCircle, GitBranch, Users,
  ChevronRight, Star, Database, ExternalLink
} from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';

/* ── Benefits data ───────────────────────────────────────────── */
const BENEFITS = [
  {
    icon: Link,
    title: 'Permanent DOI',
    desc: 'A DOI is reserved the moment you save a draft, so it can go into your paper before the data is public. It becomes resolvable when you publish.',
  },
  {
    icon: Shield,
    title: 'Secure Canadian Servers',
    desc: 'Borealis stores files on Canadian infrastructure. Note that it does not accept identifiable data, even with restricted access — de-identify before you deposit.',
  },
  {
    icon: Lock,
    title: 'You Control Access',
    desc: 'Publish openly or restrict access to specific people, groups, or an embargo period. The repository, not your inbox, manages access requests.',
  },
  {
    icon: CheckCircle,
    title: 'Tri-Agency & Journal Compliant',
    desc: 'A digital repository of the kind the Tri-Agency RDM Policy calls for, and accepted by most journal data-availability policies.',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    desc: 'Upload new versions of your dataset without breaking existing DOI links. Prior versions are preserved and accessible.',
  },
  {
    icon: Users,
    title: 'Free for All LU Researchers',
    desc: 'Open to all Lakehead faculty, students, and staff. No storage fees, no subscription — funded through the library.',
  },
];

/* ── Repository picker data ──────────────────────────────────── */
const PICKER_ROWS = [
  { label: 'Best for',           lu: 'Most Lakehead datasets — any size, any discipline',   frdr: 'Very large datasets (TB-scale) needing curation',         zenodo: 'Code, preprints, datasets with no disciplinary home' },
  { label: 'File size',          lu: 'Up to 5 GB per file in the browser (larger via API)',                               frdr: 'Large datasets; 1 TB default per depositor (Globus recommended)',             zenodo: 'Up to 50 GB per dataset' },
  { label: 'Curation support',   lu: 'Self-service (library can help on request)',           frdr: 'Staff-curated before publication',                        zenodo: 'Self-service' },
  { label: 'Access controls',    lu: 'Open, restricted, embargoed (de-identified data only)',                          frdr: 'Open only (temporary embargo allowed)',                                      zenodo: 'Open or restricted' },
  { label: 'Who can deposit',    lu: 'LU faculty, students and staff',           frdr: 'PIs (or designates they sponsor); FRDR account required',                          zenodo: 'Anyone with a free account' },
  { label: 'Tri-Agency compliant', lu: 'Yes',                                               frdr: 'Yes',                                                     zenodo: 'Generally accepted' },
  { label: 'Canadian servers',   lu: 'Yes',                                                  frdr: 'Yes',                                                     zenodo: 'No (CERN, Switzerland)' },
];

/* ── Deposit steps data ──────────────────────────────────────── */
const STEPS = [
  {
    title: 'Create or log into your Borealis account',
    body: 'Go to borealisdata.ca and click Log In. If Lakehead appears in the institution list, sign in with your Lakehead credentials; otherwise create a free standard Borealis account.',
    link: { href: 'https://borealisdata.ca', label: 'Log in to Borealis →' },
  },
  {
    title: 'Navigate to the Lakehead Dataverse',
    body: 'Search for "Lakehead University" or go directly to the LU collection. Depositing here ties your data to Lakehead and makes it discoverable in the institutional catalogue.',
    link: { href: 'https://borealisdata.ca/dataverse/lakehead', label: 'Go to LU Dataverse →' },
  },
  {
    title: 'Add a new dataset',
    body: 'Click Add Data → New Dataset. A dataset is a container for all files related to one study or publication — think of it like a folder with a permanent address.',
    link: null,
  },
  {
    title: 'Fill in your metadata',
    body: 'Complete required fields (marked with a red asterisk): title, author(s), contact, description, subject, and keywords. Good metadata is what makes your dataset findable — spend a few minutes here.',
    link: { href: 'https://learn.scholarsportal.info/all-guides/borealis/', label: 'Metadata Best Practices Guide →' },
  },
  {
    title: 'Upload your files',
    body: 'Drag and drop or browse to upload. All file formats accepted — data files, codebooks, README files, analysis scripts. You can add more files later.',
    link: null,
  },
  {
    title: 'Set access permissions',
    body: 'Choose open (anyone can download) or restricted (you approve requests). You can also set an embargo — data stays private until a date you choose, then opens automatically.',
    link: null,
  },
  {
    title: 'Save your dataset',
    body: 'Click Save Dataset. Your DOI is reserved immediately — add it to your paper\'s data availability statement right now, even before publishing.',
    link: null,
  },
  {
    title: 'Publish (or submit for review)',
    body: 'When ready, click Publish. Metadata becomes publicly visible and your DOI activates. Note: once published, a dataset cannot be deleted — only deaccessioned — so review carefully first.',
    link: null,
  },
];

/* ── FAQ data ────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'Do I have to make my data public?',
    a: 'No. You choose. You can restrict access entirely, limit it to specific users, or set an embargo. The Tri-Agency policy requires deposit into a repository — not open sharing.',
  },
  {
    q: 'What file formats are accepted?',
    a: 'All of them. Data files, spreadsheets, images, PDFs, scripts, codebooks, README files — there\'s no format restriction. Using open formats (CSV over XLSX, TIFF over PSD) improves long-term accessibility, but it\'s not required.',
  },
  {
    q: 'Can I update my dataset after publishing?',
    a: 'Yes. Borealis supports versioned updates — upload new files or edit metadata and republish as a new version. Your DOI stays the same; prior versions remain accessible.',
  },
  {
    q: 'My dataset contains sensitive or identifiable data — can I still deposit it?',
    a: 'Only once it is de-identified. Borealis\'s terms do not allow data that could directly or indirectly identify a participant, even in restricted or embargoed files, unless participants consented to its release or it poses no privacy risk. You also need REB approval for the deposit. After de-identifying, you can still use restricted access: the metadata (title, description, keywords) is public, but the files stay behind your access controls. Talk to the library before depositing anything sensitive.',
  },
  {
    q: 'How do I get a DOI?',
    a: 'Automatically — a DOI is reserved the moment you save your dataset and activates when you publish. You don\'t need to apply for one separately.',
  },
  {
    q: 'Does depositing here satisfy my funder or journal\'s data sharing requirement?',
    a: 'In most cases, yes. The Lakehead Dataverse is the kind of repository the Tri-Agency RDM Policy calls for, and most journal data-sharing policies accept it. If your funder or journal names a disciplinary repository, use that instead.',
  },
  {
    q: 'What if I need help with metadata or don\'t know where to start?',
    a: null, // rendered as JSX below
  },
];

/* ── Component ───────────────────────────────────────────────── */
export default function LakeheadDataverse() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="lud">

      {/* ── Hero ── */}
      <div className="lud-hero">
        <div className="lud-hero-icon">
          <Database size={24} />
        </div>
        <h1>Your research deserves a permanent home.</h1>
        <p className="lud-hero-sub">
          Lakehead University's Dataverse is a free, secure repository for all LU researchers.
          Deposit your data, get a citable DOI, and meet Tri-Agency and journal expectations —
          in under 30 minutes.
        </p>
        <div className="lud-hero-actions">
          <a
            href="https://borealisdata.ca/dataverse/lakehead"
            target="_blank"
            rel="noopener noreferrer"
            className="lud-hero-btn"
          >
            Browse the Lakehead Dataverse <ExternalLink size={14} />
          </a>
          <a href={MAILTO.dataLibrarian} className="lud-hero-link">
            Get help from the library
          </a>
        </div>
        <div className="lud-trust-strip">
          {['Free for all LU researchers', 'Canadian servers', 'Citable DOIs', 'Open or restricted access'].map(label => (
            <span key={label} className="lud-trust-badge">{label}</span>
          ))}
        </div>
      </div>

      {/* ── Benefits ── */}
      <section className="lud-section">
        <h2 className="lud-section-title">Why deposit here?</h2>
        <div className="lud-benefits-grid">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="lud-benefit-card">
              <div className="lud-benefit-icon"><Icon size={18} /></div>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Repository picker ── */}
      <section className="lud-section">
        <h2 className="lud-section-title">Which repository is right for me?</h2>
        <p className="lud-section-intro">
          Most Lakehead researchers should start with the LU Dataverse. Use this table if you
          need to compare options.
        </p>
        <div className="lud-picker-wrap" tabIndex={0} role="region" aria-label="Repository comparison table">
          <table className="lud-picker-table">
            <thead>
              <tr>
                <th></th>
                <th className="lud-table-highlight">LU Dataverse (Borealis)</th>
                <th>FRDR</th>
                <th>Zenodo</th>
              </tr>
            </thead>
            <tbody>
              {PICKER_ROWS.map(row => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.lu}</td>
                  <td>{row.frdr}</td>
                  <td>{row.zenodo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lud-picker-callout">
          Not sure? Start with the LU Dataverse. The library can help you migrate to FRDR if
          your dataset grows.{' '}
          <a href={MAILTO.dataLibrarian}>Contact Dr. Ayeni →</a>
        </p>
      </section>

      {/* ── Deposit steps ── */}
      <section className="lud-section">
        <h2 className="lud-section-title">How to deposit your data</h2>
        <p className="lud-section-intro">Eight steps from zero to published dataset.</p>
        <div className="lud-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="lud-step">
              <div className="lud-step-num">{i + 1}</div>
              <div className="lud-step-body">
                <strong>{step.title}</strong>
                <p>{step.body}</p>
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lud-step-link"
                  >
                    {step.link.label} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="lud-step-note">
          Need to update your data after publishing? No problem — Borealis supports versioned
          updates. Your DOI stays the same; a new version is logged.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="lud-section">
        <h2 className="lud-section-title">Common questions</h2>
        <div className="lud-faq">
          {FAQS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="lud-faq-item">
                <button
                  className="lud-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronRight size={16} className={`lud-faq-chevron${isOpen ? ' lud-faq-chevron--open' : ''}`} />
                </button>
                {isOpen && (
                  item.a === null
                    ? <p className="lud-faq-answer">
                        Contact Dr. Philips Ayeni, Lakehead's Scholarly Communications &amp; Data
                        Services Librarian, at{' '}
                        <a href={MAILTO.dataLibrarian}>{INSTITUTION.dataLibrarian.email}</a>. He can review
                        your dataset before you publish, advise on metadata, and help with restricted
                        access setup.
                      </p>
                    : <p className="lud-faq-answer">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="lud-section">
        <div className="lud-cta">
          <Star size={24} />
          <div>
            <strong>Not sure where to start? The library is here to help.</strong>
            <p>
              Dr. Philips Ayeni, Scholarly Communications &amp; Data Services Librarian, can
              review your DMP, advise on metadata, set up restricted access, and guide you
              through your first deposit.
            </p>
            <a href={MAILTO.dataLibrarian}>{INSTITUTION.dataLibrarian.email}</a>
            {' · '}
            <a
              href={INSTITUTION.libraryDataGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lakehead Library Data Management Guide <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
