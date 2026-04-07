import { useState } from 'react';
import {
  Search, Database, Share2, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle, AlertCircle, Clock, Building2, Users, FlaskConical,
  FileText, Upload, BookOpen, ArrowRight, ArrowDown, Info, ExternalLink,
  Feather, Globe, Shield, Star
} from 'lucide-react';

// ── FAIR card data ─────────────────────────────────────────────────────────
const FAIR = [
  {
    letter: 'F', word: 'Findable', icon: Search, color: '#FFC20E',
    plain: 'Others can discover your data exists',
    details: [
      'Assign a persistent identifier (DOI or Handle) to your dataset',
      'Include rich metadata that describes the data clearly',
      'Register or index your dataset in a searchable repository',
    ],
  },
  {
    letter: 'A', word: 'Accessible', icon: Database, color: '#3B82F6',
    plain: 'Others can retrieve the data (with any access rules stated clearly)',
    details: [
      'Data and metadata are retrievable via a standard open protocol',
      'Access conditions (open, restricted, embargoed) are clearly documented',
      'Metadata stays accessible even if the data itself is removed',
    ],
  },
  {
    letter: 'I', word: 'Interoperable', icon: Share2, color: '#10B981',
    plain: 'The data can be combined with other datasets',
    details: [
      'Use a formal, broadly applicable language for knowledge representation',
      'Use standard file formats and controlled vocabularies or ontologies',
      'Include qualified references to other related datasets',
    ],
  },
  {
    letter: 'R', word: 'Reusable', icon: RefreshCw, color: '#A855F7',
    plain: 'Others can build on your work',
    details: [
      'Metadata is richly described with plural, relevant attributes',
      'Data is released with a clear and accessible data usage licence',
      'Provenance (how the data was collected/created) is detailed',
    ],
  },
];

// ── Role content ───────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'pi',
    label: 'Principal Investigator',
    icon: FlaskConical,
    obligations: [
      { required: true,  text: 'Include RDM best practices in all grant proposals' },
      { required: true,  text: 'Submit a Data Management Plan (DMP) when required by the funding call' },
      { required: true,  text: 'Deposit data, metadata, and code supporting journal publications into a repository by time of publication' },
      { required: false, text: 'Share data where ethical, legal and commercial constraints allow (sharing is encouraged, not mandatory)' },
      { required: false, text: 'Link deposited data to publications using a persistent identifier (e.g., DOI)' },
    ],
  },
  {
    id: 'student',
    label: 'Graduate Student / Postdoc',
    icon: BookOpen,
    obligations: [
      { required: true,  text: 'Follow your supervisor\'s DMP — your data is covered by it' },
      { required: true,  text: 'Document your data collection, formats, and processing steps clearly' },
      { required: true,  text: 'Hand over data and documentation if you leave the research team (succession planning)' },
      { required: false, text: 'Ask your supervisor or the RDM office about repository options before graduating' },
      { required: false, text: 'Store working copies in a backed-up, secure location (not just your laptop)' },
    ],
  },
  {
    id: 'admin',
    label: 'Institution / Administrator',
    icon: Building2,
    obligations: [
      { required: true,  text: 'Post a public RDM strategy on the institutional website (deadline: March 1, 2023 — now in effect)' },
      { required: true,  text: 'Notify the agencies when the strategy is completed and share the public URL' },
      { required: true,  text: 'Provide or support access to repository services for researchers' },
      { required: false, text: 'Regularly review and revise the strategy as RDM services evolve' },
      { required: false, text: 'Promote RDM awareness to researchers, staff, and students' },
    ],
  },
];

// ── DMP checklist ──────────────────────────────────────────────────────────
const DMP_ITEMS = [
  { section: 'Data Description', items: [
    'What types of data will be collected or created?',
    'What existing datasets will be reused?',
    'What file formats will be used, and are they open/standard formats?',
    'Approximate volume and number of datasets expected',
  ]},
  { section: 'Documentation & Metadata', items: [
    'How will the data be documented (lab notebooks, REDCap, spreadsheets)?',
    'What metadata standards will be used?',
    'How will versions of datasets be tracked?',
  ]},
  { section: 'Storage & Security', items: [
    'Where will data be stored during the project (working storage)?',
    'How will data be backed up — does it follow the 3-2-1 rule?',
    'What access controls are in place for sensitive data?',
    'Is encryption required? (Yes for identifiable or confidential data)',
  ]},
  { section: 'Ethics & Legal', items: [
    'Does the data contain personal or health information (PHIPA/PIPEDA applies)?',
    'Is there an ethics protocol number (REB approval)?',
    'Are there commercial confidentiality or NDA constraints?',
    'Is any data subject to Indigenous data sovereignty (OCAP®/FNIGC principles)?',
    'Are there export controls or national security considerations?',
  ]},
  { section: 'Sharing & Deposit', items: [
    'Will data be shared? If not, explain the constraint',
    'Which repository will be used for deposit (institutional, disciplinary, or general)?',
    'When will data be deposited (by time of publication is required)?',
    'What licence will govern reuse (Creative Commons, Open Government, etc.)?',
  ]},
  { section: 'Roles & Succession', items: [
    'Who is the data steward / responsible person for this project\'s data?',
    'What happens to the data if that person leaves the team?',
    'What are the data-related roles of other team members?',
  ]},
];

// ── Timeline ───────────────────────────────────────────────────────────────
const TIMELINE = [
  {
    date: 'March 1, 2023',
    status: 'done',
    title: 'Institutional RDM Strategies',
    body: 'All eligible institutions required to post their RDM strategy publicly and share the link with the agencies.',
  },
  {
    date: 'Spring 2022 → ongoing',
    status: 'active',
    title: 'Data Management Plans',
    body: 'DMPs required for an initial set of funding opportunities identified in 2022. The agencies are continuing to expand the DMP requirement across funding calls.',
  },
  {
    date: 'Phasing in',
    status: 'pending',
    title: 'Data Deposit (general)',
    body: 'Agencies will phase in the full data deposit requirement after reviewing institutional strategies and assessing readiness of the Canadian research community.',
  },
  {
    date: 'Since Jan 1, 2008',
    status: 'done',
    title: 'CIHR-Funded Data Deposit (bioinformatics)',
    body: 'CIHR recipients have been required to deposit bioinformatics, atomic, and molecular coordinate data since 2008. This requirement continues in effect.',
  },
];

// ── FAQ ────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Does "data deposit" mean I have to make my data open/public?',
    a: 'No. The policy requires deposit into a repository, not open sharing. You are only required to share data where ethical, cultural, legal, and commercial requirements allow. The repository can enforce restricted or embargoed access. The policy is explicitly not an open data mandate.',
  },
  {
    q: 'What counts as a "repository"?',
    a: <>Any digital repository that provides safe storage, preservation, and curation. This could be a disciplinary repository (e.g., <a href="https://www.icpsr.umich.edu" target="_blank" rel="noopener noreferrer">ICPSR</a> for social sciences, <a href="https://www.ncbi.nlm.nih.gov/genbank/" target="_blank" rel="noopener noreferrer">GenBank</a> for genomics), an institutional repository, or a general-purpose platform like <a href="https://borealisdata.ca" target="_blank" rel="noopener noreferrer">Borealis</a> (formerly Dataverse Canada) or <a href="https://zenodo.org" target="_blank" rel="noopener noreferrer">Zenodo</a>. The choice should reflect disciplinary norms.</>,
  },
  {
    q: 'When does the DMP have to be submitted?',
    a: 'Only for funding opportunities that specifically require it — the call for proposals will say so. The list of applicable programs has been growing since Spring 2022. Check the specific call you are applying to.',
  },
  {
    q: 'Do DMPs have to follow a specific template?',
    a: <>No fixed format is mandated, but agencies recommend using the <a href="https://dmp-pgd.ca/" target="_blank" rel="noopener noreferrer">DMP Assistant tool (dmp-pgd.ca)</a> which offers Canadian and agency-specific templates. The key is that your DMP addresses the required elements outlined in section 3.2.</>,
  },
  {
    q: 'What if my research involves First Nations, Métis, or Inuit communities?',
    a: <>Special rules apply. The DMP must be co-developed with the community and recognize Indigenous data sovereignty. Communities guide how their data is collected, used, preserved, and may repatriate it. This can result in exceptions to the general data deposit requirement. Consult the <a href="https://fnigc.ca/ocap-training/" target="_blank" rel="noopener noreferrer">FNIGC OCAP® principles</a> and engage the community early.</>,
  },
  {
    q: 'What happens if I don\'t comply?',
    a: 'By accepting agency funds, institutions and researchers accept all policy terms. Non-compliance may trigger proceedings under the Tri-Agency Framework: Responsible Conduct of Research, which can result in consequences for future funding eligibility.',
  },
  {
    q: 'Does this policy apply to SSHRC qualitative/interview data?',
    a: 'Yes, but with context. The policy recognizes disciplinary differences. Qualitative data often cannot be shared due to participant confidentiality. You still need to address data management in your DMP, but sharing and deposit requirements are subject to ethical and legal constraints — which will often preclude open deposit for personal interview data.',
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function TriAgencyPolicy() {
  const [openFair, setOpenFair] = useState(null);
  const [activeRole, setActiveRole] = useState('pi');
  const [openDmpSection, setOpenDmpSection] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [depositStep, setDepositStep] = useState(null);

  const currentRole = ROLES.find(r => r.id === activeRole);

  return (
    <div className="tap">

      {/* Hero */}
      <div className="tap-hero">
        <div className="tap-hero-agencies">
          <span className="tap-agency-badge tap-agency-badge--cihr">CIHR</span>
          <span className="tap-agency-sep">+</span>
          <span className="tap-agency-badge tap-agency-badge--nserc">NSERC</span>
          <span className="tap-agency-sep">+</span>
          <span className="tap-agency-badge tap-agency-badge--sshrc">SSHRC</span>
        </div>
        <h1 className="tap-title">Tri-Agency Research Data Management Policy</h1>
        <p className="tap-subtitle">
          A plain-language guide to Canada's federal RDM requirements for researchers and institutions.
        </p>
        <a
          href="https://science.gc.ca/site/science/en/interagency-research-funding/policies-and-guidelines/research-data-management/tri-agency-research-data-management-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="tap-source-link"
        >
          <ExternalLink size={13} />
          Read the official policy
        </a>
      </div>

      {/* What is this? */}
      <section className="tap-section">
        <div className="tap-what-is">
          <div className="tap-what-is-text">
            <h2>What is this policy?</h2>
            <p>
              Canada's three federal research granting agencies — <strong>CIHR</strong> (health),{' '}
              <strong>NSERC</strong> (natural sciences &amp; engineering), and <strong>SSHRC</strong>{' '}
              (social sciences &amp; humanities) — jointly require that research funded with public money
              is managed responsibly from start to finish.
            </p>
            <p>
              The policy has <strong>three main pillars</strong>: institutions must publish an RDM
              strategy, researchers should write data management plans (DMPs), and data supporting
              published findings must be deposited in a repository.
            </p>
            <div className="tap-not-open-data">
              <Info size={16} />
              <span><strong>This is not an open data policy.</strong> You are not required to make your data publicly available — only to manage it responsibly and deposit it somewhere safe.</span>
            </div>
          </div>
          <div className="tap-three-pillars">
            <div className="tap-pillar">
              <Building2 size={22} />
              <div>
                <strong>Institutions</strong>
                <span>RDM Strategy</span>
              </div>
            </div>
            <ArrowDown size={16} className="tap-pillar-arrow" />
            <div className="tap-pillar">
              <FileText size={22} />
              <div>
                <strong>Researchers</strong>
                <span>Data Management Plans</span>
              </div>
            </div>
            <ArrowDown size={16} className="tap-pillar-arrow" />
            <div className="tap-pillar">
              <Upload size={22} />
              <div>
                <strong>Publication</strong>
                <span>Data Deposit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAIR Principles */}
      <section className="tap-section">
        <h2 className="tap-section-title">The FAIR Principles</h2>
        <p className="tap-section-intro">
          The policy aligns with the FAIR guiding principles — the international standard for
          responsible data stewardship. Click each principle to see what it means in practice.
        </p>
        <div className="tap-fair-grid">
          {FAIR.map(f => {
            const Icon = f.icon;
            const isOpen = openFair === f.letter;
            return (
              <button
                key={f.letter}
                className={`tap-fair-card${isOpen ? ' tap-fair-card--open' : ''}`}
                style={{ '--fair-color': f.color }}
                onClick={() => setOpenFair(isOpen ? null : f.letter)}
                aria-expanded={isOpen}
              >
                <div className="tap-fair-letter">{f.letter}</div>
                <div className="tap-fair-body">
                  <div className="tap-fair-header">
                    <Icon size={16} />
                    <strong>{f.word}</strong>
                    <span className="tap-fair-plain">{f.plain}</span>
                    <ChevronDown size={14} className={`tap-fair-chevron${isOpen ? ' tap-fair-chevron--open' : ''}`} />
                  </div>
                  {isOpen && (
                    <ul className="tap-fair-details">
                      {f.details.map((d, i) => (
                        <li key={i}><CheckCircle size={12} />{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Who does this apply to? */}
      <section className="tap-section">
        <h2 className="tap-section-title">What Are My Obligations?</h2>
        <p className="tap-section-intro">Select your role to see what the policy requires of you.</p>
        <div className="tap-role-tabs">
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                className={`tap-role-tab${activeRole === r.id ? ' tap-role-tab--active' : ''}`}
                onClick={() => setActiveRole(r.id)}
              >
                <Icon size={16} />
                {r.label}
              </button>
            );
          })}
        </div>
        {currentRole && (
          <div className="tap-role-content">
            {currentRole.obligations.map((ob, i) => (
              <div key={i} className={`tap-obligation${ob.required ? ' tap-obligation--required' : ''}`}>
                {ob.required
                  ? <AlertCircle size={16} className="tap-obligation-icon tap-obligation-icon--req" />
                  : <CheckCircle size={16} className="tap-obligation-icon tap-obligation-icon--rec" />
                }
                <div>
                  <span className={`tap-obligation-badge${ob.required ? '' : ' tap-obligation-badge--rec'}`}>
                    {ob.required ? 'Required' : 'Recommended'}
                  </span>
                  <p>{ob.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DMP deep-dive */}
      <section className="tap-section">
        <h2 className="tap-section-title">What Goes in a Data Management Plan?</h2>
        <p className="tap-section-intro">
          A DMP is a living document — it can change as your project evolves. Use this checklist
          to make sure your plan covers everything the agencies expect. The{' '}
          <a href="https://dmp-pgd.ca" target="_blank" rel="noopener noreferrer" className="tap-inline-link">
            DMP Assistant tool <ExternalLink size={11} />
          </a>{' '}
          provides guided templates for Canadian researchers.
        </p>
        <div className="tap-dmp-list">
          {DMP_ITEMS.map((section, si) => {
            const isOpen = openDmpSection === si;
            return (
              <div key={si} className="tap-dmp-section">
                <button
                  className="tap-dmp-header"
                  onClick={() => setOpenDmpSection(isOpen ? null : si)}
                  aria-expanded={isOpen}
                >
                  <span className="tap-dmp-num">{si + 1}</span>
                  <span className="tap-dmp-title">{section.section}</span>
                  <ChevronDown size={16} className={`tap-dmp-chevron${isOpen ? ' tap-dmp-chevron--open' : ''}`} />
                </button>
                {isOpen && (
                  <ul className="tap-dmp-items">
                    {section.items.map((item, ii) => (
                      <li key={ii}>
                        <div className="tap-dmp-checkbox" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Deposit flowchart */}
      <section className="tap-section">
        <h2 className="tap-section-title">Do I Need to Deposit My Data?</h2>
        <p className="tap-section-intro">
          Follow the arrows from top to bottom. Each diamond is a yes/no question — your path
          ends at a coloured outcome box. "Deposit" means uploading to a repository, not
          necessarily making data public.
        </p>

        {/* SVG flowchart — SVG text/tspan throughout, no foreignObject overflow */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox="0 0 640 860"
          width="100%"
          style={{ maxWidth: '640px', display: 'block', margin: '0 auto' }}
          aria-label="Flowchart: Do I Need to Deposit My Data?"
        >
          <defs>
            <marker id="arr-yes" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#10B981" />
            </marker>
            <marker id="arr-no" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#EF4444" />
            </marker>
            <marker id="arr-gray" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#4B5563" />
            </marker>
          </defs>

          {/* ── Q1: center(280,90) halfW=120 halfH=60 ── */}
          <polygon points="280,30 400,90 280,150 160,90"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <text textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="600" fontFamily="system-ui,sans-serif">
            <tspan x="280" y="83">Is your research funded</tspan>
            <tspan x="280" dy="15">by CIHR, NSERC, or SSHRC?</tspan>
          </text>

          {/* Q1 YES ↓ — label to RIGHT of line */}
          <line x1="280" y1="150" x2="280" y2="226" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="286" y="178" width="40" height="18" rx="9" fill="rgba(16,185,129,0.30)" />
          <text x="306" y="191" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>

          {/* Q1 NO → Policy box — longer arrow gives label room */}
          <line x1="400" y1="90" x2="462" y2="90" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="408" y="68" width="36" height="18" rx="9" fill="rgba(239,68,68,0.30)" />
          <text x="426" y="81" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>
          <rect x="464" y="60" width="172" height="60" rx="8" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" />
          <text fontFamily="system-ui,sans-serif">
            <tspan x="475" y="80" fill="#F1F5F9" fontSize="12" fontWeight="700">🚫 Policy does not apply</tspan>
            <tspan x="475" dy="16" fill="#94A3B8" fontSize="10">Only covers Tri-Agency–</tspan>
            <tspan x="475" dy="13" fill="#94A3B8" fontSize="10">funded research.</tspan>
          </text>

          {/* ── Q2: center(280,290) halfW=120 halfH=60 ── */}
          <polygon points="280,230 400,290 280,350 160,290"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <text textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="600" fontFamily="system-ui,sans-serif">
            <tspan x="280" y="283">Are you publishing a</tspan>
            <tspan x="280" dy="15">journal article or pre-print?</tspan>
          </text>

          {/* Q2 YES ↓ — label to RIGHT of line */}
          <line x1="280" y1="350" x2="280" y2="416" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="286" y="378" width="40" height="18" rx="9" fill="rgba(16,185,129,0.30)" />
          <text x="306" y="391" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>

          {/* Q2 NO → Wait box — longer arrow gives label room */}
          <line x1="400" y1="290" x2="462" y2="290" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="408" y="268" width="36" height="18" rx="9" fill="rgba(239,68,68,0.30)" />
          <text x="426" y="281" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>
          <rect x="464" y="260" width="172" height="60" rx="8" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" />
          <text fontFamily="system-ui,sans-serif">
            <tspan x="475" y="280" fill="#F1F5F9" fontSize="12" fontWeight="700">⏳ Not yet required</tspan>
            <tspan x="475" dy="16" fill="#94A3B8" fontSize="10">Deposit is triggered at</tspan>
            <tspan x="475" dy="13" fill="#94A3B8" fontSize="10">publication. Revisit then.</tspan>
          </text>

          {/* ── Q3: center(280,490) halfW=130 halfH=74 ── */}
          <polygon points="280,416 410,490 280,564 150,490"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <text textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="600" fontFamily="system-ui,sans-serif">
            <tspan x="280" y="475">Does your data involve</tspan>
            <tspan x="280" dy="15">personal info, an NDA, or</tspan>
            <tspan x="280" dy="15">Indigenous community data?</tspan>
          </text>

          {/* Q3 drop → horizontal junction → YES left / NO right */}
          <line x1="280" y1="564" x2="280" y2="594" stroke="#4B5563" strokeWidth="2" />
          <line x1="140" y1="594" x2="420" y2="594" stroke="#4B5563" strokeWidth="2" />
          {/* YES drop — label to LEFT of drop line, above arrowhead */}
          <line x1="140" y1="594" x2="140" y2="618" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="92" y="594" width="40" height="18" rx="9" fill="rgba(16,185,129,0.30)" />
          <text x="112" y="607" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>
          {/* NO drop — label to RIGHT of drop line, above arrowhead */}
          <line x1="420" y1="594" x2="420" y2="618" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="424" y="594" width="36" height="18" rx="9" fill="rgba(239,68,68,0.25)" />
          <text x="442" y="607" textAnchor="middle" fill="#F1F5F9" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>

          {/* Restricted deposit box — bottom center x=140 */}
          <rect x="36" y="620" width="208" height="88" rx="8" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" />
          <text fontFamily="system-ui,sans-serif">
            <tspan x="48" y="641" fill="#F1F5F9" fontSize="12" fontWeight="700">🔒 Restricted deposit</tspan>
            <tspan x="48" dy="16" fill="#94A3B8" fontSize="10">Choose a repository with</tspan>
            <tspan x="48" dy="13" fill="#94A3B8" fontSize="10">access controls. You are</tspan>
            <tspan x="48" dy="13" fill="#94A3B8" fontSize="10">not required to share openly.</tspan>
          </text>

          {/* Open deposit box — bottom center x=420 */}
          <rect x="356" y="620" width="208" height="88" rx="8" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
          <text fontFamily="system-ui,sans-serif">
            <tspan x="368" y="641" fill="#F1F5F9" fontSize="12" fontWeight="700">🌐 Open deposit</tspan>
            <tspan x="368" dy="16" fill="#94A3B8" fontSize="10">Deposit with a Creative</tspan>
            <tspan x="368" dy="13" fill="#94A3B8" fontSize="10">Commons or standard</tspan>
            <tspan x="368" dy="13" fill="#94A3B8" fontSize="10">licence. Publicly accessible.</tspan>
          </text>

          {/* Merge → final action */}
          <polyline points="140,708 140,758 280,758" stroke="#4B5563" strokeWidth="1.5" fill="none" />
          <polyline points="420,708 420,758 280,758" stroke="#4B5563" strokeWidth="1.5" fill="none" />
          <line x1="280" y1="758" x2="280" y2="776" stroke="#4B5563" strokeWidth="1.5" markerEnd="url(#arr-gray)" />

          {/* Final action box */}
          <rect x="58" y="778" width="444" height="72" rx="8" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="2" />
          <text textAnchor="middle" fontFamily="system-ui,sans-serif">
            <tspan x="280" y="802" fill="#F1F5F9" fontSize="13" fontWeight="700">✅ Deposit your data</tspan>
            <tspan x="280" dy="18" fill="#94A3B8" fontSize="10.5">Upload to Borealis or FRDR by time of publication.</tspan>
            <tspan x="280" dy="14" fill="#94A3B8" fontSize="10.5">Link your dataset to the paper with a DOI.</tspan>
          </text>
        </svg>
        </div>

        {/* Repository options */}
        <div className="tap-repos">
          <h3 className="tap-repos-title">Repository Options for Lakehead Researchers</h3>
          <div className="tap-repo-grid">
            <div className="tap-repo-card">
              <a href="https://borealisdata.ca" target="_blank" rel="noopener noreferrer"><strong>Borealis (Dataverse Canada)</strong></a>
              <span className="tap-repo-type">General / Institutional</span>
              <p>Canada's national research data repository. Lakehead has an institutional collection. Supports restricted access.</p>
            </div>
            <div className="tap-repo-card">
              <a href="https://www.icpsr.umich.edu" target="_blank" rel="noopener noreferrer"><strong>ICPSR</strong></a>
              <span className="tap-repo-type">Social Sciences</span>
              <p>Inter-university Consortium for Political and Social Research. Strong support for restricted and sensitive social science data.</p>
            </div>
            <div className="tap-repo-card">
              <a href="https://zenodo.org" target="_blank" rel="noopener noreferrer"><strong>Zenodo</strong></a>
              <span className="tap-repo-type">General / Open</span>
              <p>CERN-hosted open repository. Good for code, preprints, and datasets without a disciplinary home.</p>
            </div>
            <div className="tap-repo-card">
              <a href="https://www.frdr-dfdr.ca" target="_blank" rel="noopener noreferrer"><strong>Federated Research Data Repository (FRDR)</strong></a>
              <span className="tap-repo-type">General / Canadian</span>
              <p>Canadian platform for discovering and sharing research data. Suitable for large datasets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Indigenous Data Sovereignty */}
      <section className="tap-section">
        <div className="tap-indigenous">
          <div className="tap-indigenous-header">
            <Feather size={24} />
            <h2>Indigenous Data Sovereignty</h2>
          </div>
          <p>
            Research conducted <em>by and with</em> First Nations, Métis, and Inuit communities
            is subject to additional and distinct requirements. These communities have the right
            to guide and determine how their data is collected, used, and preserved.
          </p>
          <div className="tap-indigenous-grid">
            <div className="tap-indigenous-card">
              <strong>DMPs must be co-developed</strong>
              <p>Data management plans for community-involved research must be created together with the community — not just reviewed by them.</p>
            </div>
            <div className="tap-indigenous-card">
              <strong>Communities can override deposit requirements</strong>
              <p>If a community determines that data should not be deposited publicly (or at all), that decision takes precedence over the general deposit requirement.</p>
            </div>
            <div className="tap-indigenous-card">
              <strong>OCAP® is one model, not the only model</strong>
              <p>The OCAP® principles (Ownership, Control, Access, Possession) apply specifically to First Nations. Métis and Inuit communities may have different frameworks — a distinctions-based approach is required.</p>
            </div>
            <div className="tap-indigenous-card">
              <strong>Right of repatriation</strong>
              <p>Communities have the right to have their data returned to them. Plan for this in your DMP. Include provisions for renegotiation of the DMP as the project evolves.</p>
            </div>
          </div>
          <p className="tap-indigenous-note">
            Engage community partners and Lakehead's Indigenous Research Support Office early in your project planning — these conversations cannot happen at the last minute.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="tap-section">
        <h2 className="tap-section-title">Implementation Timeline</h2>
        <div className="tap-timeline">
          {TIMELINE.map((item, i) => (
            <div key={i} className={`tap-timeline-item tap-timeline-item--${item.status}`}>
              <div className="tap-timeline-marker">
                {item.status === 'done' && <CheckCircle size={18} />}
                {item.status === 'active' && <AlertCircle size={18} />}
                {item.status === 'pending' && <Clock size={18} />}
              </div>
              <div className="tap-timeline-content">
                <span className={`tap-timeline-badge tap-timeline-badge--${item.status}`}>
                  {item.status === 'done' ? 'In Effect' : item.status === 'active' ? 'Expanding' : 'Phasing In'}
                </span>
                <strong>{item.title}</strong>
                <span className="tap-timeline-date">{item.date}</span>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="tap-section">
        <h2 className="tap-section-title">Common Questions</h2>
        <div className="tap-faq">
          {FAQS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="tap-faq-item">
                <button
                  className="tap-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronRight size={16} className={`tap-faq-chevron${isOpen ? ' tap-faq-chevron--open' : ''}`} />
                </button>
                {isOpen && <p className="tap-faq-answer">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="tap-section">
        <div className="tap-cta">
          <Star size={24} />
          <div>
            <strong>Need help with your DMP or data deposit?</strong>
            <p>
              Lakehead's Research Data Management team can review your DMP, recommend repositories,
              and guide you through compliance. Contact{' '}
              <a href="mailto:rdm.research@lakeheadu.ca" className="tap-inline-link">
                rdm.research@lakeheadu.ca
              </a>
              .
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
