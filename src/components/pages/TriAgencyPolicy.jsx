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
    a: 'Any digital repository that provides safe storage, preservation, and curation. This could be a disciplinary repository (e.g., ICPSR for social sciences, GenBank for genomics), an institutional repository, or a general-purpose platform like Borealis (formerly Dataverse Canada) or Zenodo. The choice should reflect disciplinary norms.',
  },
  {
    q: 'When does the DMP have to be submitted?',
    a: 'Only for funding opportunities that specifically require it — the call for proposals will say so. The list of applicable programs has been growing since Spring 2022. Check the specific call you are applying to.',
  },
  {
    q: 'Do DMPs have to follow a specific template?',
    a: 'No fixed format is mandated, but agencies recommend using the DMP Assistant tool (assistant.portagenetwork.ca) which offers Canadian and agency-specific templates. The key is that your DMP addresses the required elements outlined in section 3.2.',
  },
  {
    q: 'What if my research involves First Nations, Métis, or Inuit communities?',
    a: 'Special rules apply. The DMP must be co-developed with the community and recognize Indigenous data sovereignty. Communities guide how their data is collected, used, preserved, and may repatriate it. This can result in exceptions to the general data deposit requirement. Consult the FNIGC OCAP® principles and engage the community early.',
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
          <a href="https://assistant.portagenetwork.ca" target="_blank" rel="noopener noreferrer" className="tap-inline-link">
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

        {/* SVG flowchart — proper diamonds, arrowheads, clean routing */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox="0 0 640 830"
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

          {/* ══════════════════════════════════
              Q1 — Tri-Agency funded?
              Diamond: center (300,80) halfW=120 halfH=52
          ══════════════════════════════════ */}
          <polygon points="300,28 420,80 300,132 180,80"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <foreignObject x="222" y="50" width="156" height="60">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              fontSize:'11.5px', fontWeight:'600', color:'#F1F5F9',
              textAlign:'center', lineHeight:'1.45', fontFamily:'system-ui,sans-serif'
            }}>
              Is your research funded by CIHR, NSERC, or SSHRC?
            </div>
          </foreignObject>

          {/* Q1 YES — down to Q2 */}
          <line x1="300" y1="132" x2="300" y2="218" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="276" y="152" width="48" height="20" rx="10" fill="rgba(16,185,129,0.18)" />
          <text x="300" y="166" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>

          {/* Q1 NO — right to Policy box */}
          <line x1="420" y1="80" x2="446" y2="80" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="424" y="68" width="36" height="20" rx="10" fill="rgba(239,68,68,0.15)" />
          <text x="442" y="82" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>

          {/* Policy does not apply box */}
          <rect x="448" y="52" width="182" height="56" rx="8"
            fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" />
          <text x="460" y="72" fill="#F1F5F9" fontSize="11.5" fontWeight="700" fontFamily="system-ui,sans-serif">🚫 Policy does not apply</text>
          <foreignObject x="456" y="75" width="168" height="30">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:'10px', color:'#94A3B8', lineHeight:'1.45', fontFamily:'system-ui,sans-serif' }}>
              Only covers Tri-Agency–funded research.
            </div>
          </foreignObject>

          {/* ══════════════════════════════════
              Q2 — Publishing a journal article?
              Diamond: center (300,274) halfW=120 halfH=52
          ══════════════════════════════════ */}
          <polygon points="300,222 420,274 300,326 180,274"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <foreignObject x="218" y="244" width="164" height="60">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              fontSize:'11.5px', fontWeight:'600', color:'#F1F5F9',
              textAlign:'center', lineHeight:'1.45', fontFamily:'system-ui,sans-serif'
            }}>
              Are you publishing a journal article or pre-print?
            </div>
          </foreignObject>

          {/* Q2 YES — down to Q3 */}
          <line x1="300" y1="326" x2="300" y2="392" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="276" y="346" width="48" height="20" rx="10" fill="rgba(16,185,129,0.18)" />
          <text x="300" y="360" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>

          {/* Q2 NO — right to Wait box */}
          <line x1="420" y1="274" x2="446" y2="274" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="424" y="262" width="36" height="20" rx="10" fill="rgba(239,68,68,0.15)" />
          <text x="442" y="276" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>

          {/* Not yet required box */}
          <rect x="448" y="246" width="182" height="56" rx="8"
            fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" />
          <text x="460" y="266" fill="#F1F5F9" fontSize="11.5" fontWeight="700" fontFamily="system-ui,sans-serif">⏳ Not yet required</text>
          <foreignObject x="456" y="269" width="168" height="32">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:'10px', color:'#94A3B8', lineHeight:'1.45', fontFamily:'system-ui,sans-serif' }}>
              Deposit is triggered at publication. Revisit when you publish.
            </div>
          </foreignObject>

          {/* ══════════════════════════════════
              Q3 — Sensitive / restricted data?
              Diamond: center (300,466) halfW=126 halfH=72
          ══════════════════════════════════ */}
          <polygon points="300,394 426,466 300,538 174,466"
            fill="#0D1B35" stroke="#FFC20E" strokeWidth="2.5" />
          <foreignObject x="216" y="430" width="168" height="72">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              fontSize:'11px', fontWeight:'600', color:'#F1F5F9',
              textAlign:'center', lineHeight:'1.5', fontFamily:'system-ui,sans-serif'
            }}>
              Does your data involve personal info, an NDA, or Indigenous community data?
            </div>
          </foreignObject>

          {/* Q3 — vertical drop from bottom vertex then split */}
          <line x1="300" y1="538" x2="300" y2="564" stroke="#4B5563" strokeWidth="2" />
          {/* horizontal junction bar */}
          <line x1="152" y1="564" x2="448" y2="564" stroke="#4B5563" strokeWidth="2" />

          {/* YES branch — left side down */}
          <line x1="152" y1="564" x2="152" y2="588" stroke="#10B981" strokeWidth="2" markerEnd="url(#arr-yes)" />
          <rect x="128" y="548" width="48" height="20" rx="10" fill="rgba(16,185,129,0.18)" />
          <text x="152" y="562" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">YES</text>

          {/* NO branch — right side down */}
          <line x1="448" y1="564" x2="448" y2="588" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arr-no)" />
          <rect x="424" y="548" width="36" height="20" rx="10" fill="rgba(239,68,68,0.15)" />
          <text x="442" y="562" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">NO</text>

          {/* Restricted deposit box */}
          <rect x="52" y="590" width="200" height="84" rx="8"
            fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" />
          <text x="64" y="611" fill="#F1F5F9" fontSize="11.5" fontWeight="700" fontFamily="system-ui,sans-serif">🔒 Restricted deposit</text>
          <foreignObject x="60" y="614" width="186" height="56">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:'10px', color:'#94A3B8', lineHeight:'1.5', fontFamily:'system-ui,sans-serif' }}>
              Choose a repository with access controls. You are <em style={{color:'#C4B5FD'}}>not</em> required to share data openly.
            </div>
          </foreignObject>

          {/* Open deposit box */}
          <rect x="348" y="590" width="200" height="84" rx="8"
            fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
          <text x="360" y="611" fill="#F1F5F9" fontSize="11.5" fontWeight="700" fontFamily="system-ui,sans-serif">🌐 Open deposit</text>
          <foreignObject x="356" y="614" width="186" height="56">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:'10px', color:'#94A3B8', lineHeight:'1.5', fontFamily:'system-ui,sans-serif' }}>
              Deposit with a Creative Commons or discipline-standard licence. Data is publicly accessible.
            </div>
          </foreignObject>

          {/* Merge lines from both outcome boxes → final action */}
          <polyline points="152,674 152,726 300,726" stroke="#4B5563" strokeWidth="1.5" fill="none" />
          <polyline points="448,674 448,726 300,726" stroke="#4B5563" strokeWidth="1.5" fill="none" />
          <line x1="300" y1="726" x2="300" y2="744" stroke="#4B5563" strokeWidth="1.5" markerEnd="url(#arr-gray)" />

          {/* Final action box */}
          <rect x="72" y="746" width="456" height="74" rx="8"
            fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="2" />
          <text x="300" y="770" textAnchor="middle" fill="#F1F5F9" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">✅ Deposit your data</text>
          <foreignObject x="80" y="774" width="440" height="42">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize:'11px', color:'#94A3B8', textAlign:'center', lineHeight:'1.5', fontFamily:'system-ui,sans-serif' }}>
              Upload to Borealis or FRDR by time of publication and link with a DOI.
            </div>
          </foreignObject>
        </svg>
        </div>

        {/* Repository options */}
        <div className="tap-repos">
          <h3 className="tap-repos-title">Repository Options for Lakehead Researchers</h3>
          <div className="tap-repo-grid">
            <div className="tap-repo-card">
              <strong>Borealis (Dataverse Canada)</strong>
              <span className="tap-repo-type">General / Institutional</span>
              <p>Canada's national research data repository. Lakehead has an institutional collection. Supports restricted access.</p>
            </div>
            <div className="tap-repo-card">
              <strong>ICPSR</strong>
              <span className="tap-repo-type">Social Sciences</span>
              <p>Inter-university Consortium for Political and Social Research. Strong support for restricted and sensitive social science data.</p>
            </div>
            <div className="tap-repo-card">
              <strong>Zenodo</strong>
              <span className="tap-repo-type">General / Open</span>
              <p>CERN-hosted open repository. Good for code, preprints, and datasets without a disciplinary home.</p>
            </div>
            <div className="tap-repo-card">
              <strong>Federated Research Data Repository (FRDR)</strong>
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
