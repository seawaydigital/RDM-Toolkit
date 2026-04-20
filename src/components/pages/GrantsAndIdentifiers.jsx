import {
  BadgeCheck, Fingerprint, FileText, BookOpen, Database,
  ExternalLink, CheckCircle, Info, ArrowRight, Users, ClipboardList
} from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';

// Each card in the "identifiers" grid
const IDENTIFIERS = [
  {
    id: 'orcid',
    icon: Fingerprint,
    title: 'ORCID iD',
    tagline: 'Your persistent researcher identifier',
    color: '#A6CE39',
    description: 'A free, permanent 16-digit ID that distinguishes you from every other researcher with a similar name. Required or strongly recommended by all three federal agencies and by most major publishers.',
    bullets: [
      'One-time registration at orcid.org (under 2 minutes)',
      'Links all your publications, datasets, and grants to one record',
      'Required by DMP Assistant and many journal submission systems',
      'Works internationally — not tied to any single institution',
    ],
    cta: { label: 'Register for ORCID', href: 'https://orcid.org/register' },
    learnMore: { label: 'ORCID for researchers', href: 'https://info.orcid.org/researchers/' },
  },
  {
    id: 'ccv',
    icon: ClipboardList,
    title: 'Canadian Common CV (CCV)',
    tagline: 'The shared CV format for federal grants',
    color: '#00427A',
    description: 'The national system CIHR, NSERC, and SSHRC use to collect biographical and publication information from applicants. Maintaining an up-to-date CCV saves hours on every grant submission.',
    bullets: [
      'Populate once, reuse across all three agencies',
      'Links to your ORCID iD to pull publication metadata automatically',
      'Note: The Tri-Agencies are transitioning to the Tri-Agency Researcher Profile (TARP), a narrative-CV approach — keep your ORCID current to ease the migration',
      'Contributions and memberships carry forward between submissions',
    ],
    cta: { label: 'Access the CCV', href: 'https://ccv-cvc.ca/' },
    learnMore: { label: 'CCV user guides', href: 'https://ccv-cvc.ca/home-en.frm' },
  },
  {
    id: 'doi',
    icon: BadgeCheck,
    title: 'DOIs for Your Data',
    tagline: 'Citable, permanent dataset identifiers',
    color: '#FFC20E',
    description: 'A DOI (Digital Object Identifier) makes a dataset citable, discoverable, and permanent. Tri-Agency data deposit expects a DOI so the paper can link to the underlying data.',
    bullets: [
      <>Depositing to <a href={INSTITUTION.dataverseUrl} target="_blank" rel="noopener noreferrer">{INSTITUTION.shortName} Dataverse</a> on Borealis mints a DOI automatically — no extra step</>,
      'DataCite (the registry behind most research DOIs) issues DOIs through Scholars Portal for Ontario researchers',
      'Zenodo and FRDR also mint DOIs on deposit',
      'Cite the dataset DOI in your paper\u2019s Data Availability statement',
    ],
    cta: { label: 'Deposit at LU Dataverse', href: '#lakehead-dataverse', internal: true },
    learnMore: { label: 'What is a DOI?', href: 'https://www.doi.org/the-identifier/what-is-a-doi/' },
  },
];

// Each card in the REB/ethics section
const ETHICS_RESOURCES = [
  {
    title: 'TCPS 2 Core Tutorial',
    body: 'Canada\u2019s mandatory ethics certification for anyone conducting research with human participants. Free, online, about 3 hours. Your certificate is valid indefinitely but agencies expect recent completion on grant applications.',
    href: 'https://tcps2core.ca/',
    linkLabel: 'Take the tutorial',
  },
  {
    title: 'TCPS 2 (full policy)',
    body: 'The Tri-Council Policy Statement is the authoritative document. Chapter 5 covers privacy; Chapter 9 covers research with First Nations, Inuit, and Métis Peoples. Reference it directly in your REB application.',
    href: 'https://ethics.gc.ca/eng/policy-politique_2022.html',
    linkLabel: 'Read TCPS 2 (2022)',
  },
  {
    title: `${INSTITUTION.shortName} REB`,
    body: `${INSTITUTION.name}'s Research Ethics Board reviews all human-participant research involving ${INSTITUTION.shortName} faculty, staff, and students. Submit well in advance of data collection — reviews can take several weeks.`,
    href: INSTITUTION.rebContactUrl,
    linkLabel: `${INSTITUTION.shortName} Research Ethics`,
  },
  {
    title: 'DMP Assistant',
    body: 'The national tool for Data Management Plans. Templates are agency-aligned and bilingual. Link your ORCID to your DMP Assistant account to pre-fill author metadata.',
    href: 'https://dmp-pgd.ca/',
    linkLabel: 'Start a DMP',
  },
  {
    title: 'Accessible Research Outputs (AODA / WCAG 2.1 AA)',
    body: 'Ontario\u2019s AODA requires public-facing digital content to meet WCAG 2.1 AA, and Tri-Agency reviews increasingly ask how your outputs (papers, datasets, websites, figures) will be accessible. Plan for alt text, structured headings, sufficient colour contrast, and accessible PDFs from the outset — retrofitting is expensive.',
    href: 'https://www.w3.org/WAI/WCAG21/quickref/',
    linkLabel: 'WCAG 2.1 quick reference',
  },
  {
    title: 'AODA overview (Ontario)',
    body: 'The Accessibility for Ontarians with Disabilities Act applies to Lakehead as a designated public-sector organization. Research communications hosted on institutional domains fall under its Information and Communications Standard.',
    href: 'https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits',
    linkLabel: 'AODA requirements',
  },
];

export default function GrantsAndIdentifiers() {
  return (
    <div className="htw">
      {/* Hero */}
      <div className="htw-hero">
        <div className="htw-kicker">Grant &amp; identifier toolkit</div>
        <h1 className="htw-title">Grants &amp; Identifiers</h1>
        <p className="htw-subtitle">
          The ORCID, CCV, DOI, and REB essentials every {INSTITUTION.shortName} researcher
          needs for Tri-Agency grant applications and data deposits.
        </p>
      </div>

      {/* Intro */}
      <section className="htw-section">
        <div className="htw-promise">
          <BadgeCheck size={32} />
          <div>
            <h2>Why this matters</h2>
            <p>
              A Tri-Agency grant application is an integration task. You need an
              identifier that travels with you (ORCID), a CV the agencies will accept
              (CCV), a DMP that links to your data, and a DOI for your dataset at
              publication. Setting these up <em>before</em> the deadline saves hours
              and prevents common submission errors.
            </p>
            <p style={{ marginTop: '12px' }}>
              This page is a single-screen reference to each one, in the order a new
              researcher typically encounters them.
            </p>
          </div>
        </div>
      </section>

      {/* Identifiers */}
      <section className="htw-section">
        <h2 className="htw-section-title">The Four Identifiers</h2>
        <p className="htw-section-intro">
          Three federal identifiers plus one REB checklist. Set them up once; they compound in value over every grant and publication.
        </p>
        <div className="gai-cards">
          {IDENTIFIERS.map(ident => {
            const Icon = ident.icon;
            return (
              <div key={ident.id} className="gai-card" style={{ '--gai-accent': ident.color }}>
                <div className="gai-card-head">
                  <Icon size={22} />
                  <div>
                    <strong>{ident.title}</strong>
                    <span>{ident.tagline}</span>
                  </div>
                </div>
                <p className="gai-card-desc">{ident.description}</p>
                <ul className="gai-card-bullets">
                  {ident.bullets.map((b, i) => (
                    <li key={i}>
                      <CheckCircle size={12} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="gai-card-actions">
                  <a
                    href={ident.cta.href}
                    target={ident.cta.internal ? undefined : '_blank'}
                    rel={ident.cta.internal ? undefined : 'noopener noreferrer'}
                    className="gai-card-cta"
                  >
                    {ident.cta.label}
                    {ident.cta.internal
                      ? <ArrowRight size={13} />
                      : <ExternalLink size={11} />}
                  </a>
                  <a
                    href={ident.learnMore.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gai-card-secondary"
                  >
                    {ident.learnMore.label} <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recommended order */}
      <section className="htw-section">
        <h2 className="htw-section-title">Recommended Setup Order</h2>
        <p className="htw-section-intro">
          If you are setting these up for the first time, do them in this order — each step unlocks the next.
        </p>
        <ol className="gai-steps">
          <li>
            <span className="gai-step-num">1</span>
            <div>
              <strong>Register for ORCID</strong>
              <p>5 minutes. Free. You will use this ID in every subsequent system. Add your institutional affiliation and current employment.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">2</span>
            <div>
              <strong>Set up your CCV</strong>
              <p>Link your ORCID to pull publication metadata automatically. Allow 30–60 minutes for your first CCV — subsequent updates are quick.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">3</span>
            <div>
              <strong>Complete the TCPS 2 Core tutorial</strong>
              <p>Required for human-participant research. Allow ~3 hours. Your certificate will be requested on most grant applications and REB submissions.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">4</span>
            <div>
              <strong>Draft your DMP in DMP Assistant</strong>
              <p>Link your ORCID here too. Start early — your DMP will inform your budget (storage, software, personnel) and your REB submission.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">5</span>
            <div>
              <strong>Submit to {INSTITUTION.shortName} REB if applicable</strong>
              <p>Human-participant research requires REB approval before data collection begins. Reviews can take 4–8 weeks depending on risk level.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">6</span>
            <div>
              <strong>At publication, deposit your data and get a DOI</strong>
              <p>
                Deposit to the{' '}
                <a href="#lakehead-dataverse" className="tap-inline-link">{INSTITUTION.shortName} Dataverse</a>
                {' '}(free, DOI auto-minted), cite the DOI in your paper, and close the loop.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Ethics & DMP */}
      <section className="htw-section">
        <h2 className="htw-section-title">Ethics, DMPs &amp; Supporting Resources</h2>
        <p className="htw-section-intro">
          The policies and tools that sit alongside the identifiers above.
        </p>
        <div className="gai-ethics-grid">
          {ETHICS_RESOURCES.map(r => (
            <div key={r.title} className="gai-ethics-card">
              <strong>{r.title}</strong>
              <p>{r.body}</p>
              <a href={r.href} target="_blank" rel="noopener noreferrer">
                {r.linkLabel} <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="htw-section">
        <div className="htw-promise" style={{ borderLeftColor: 'var(--accent-primary)' }}>
          <Users size={28} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h2>Need help?</h2>
            <p>
              {INSTITUTION.name}'s {INSTITUTION.researchOffice} can help you plan an
              application, review your DMP, and connect you with the library's data
              services. Contact{' '}
              <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>.
            </p>
            <p style={{ marginTop: '12px' }}>
              For data deposits specifically, <a href={MAILTO.dataLibrarian}>{INSTITUTION.dataLibrarian.name}</a>
              {' '}({INSTITUTION.dataLibrarian.title}) reviews datasets before publication
              and helps with metadata and restricted access.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
