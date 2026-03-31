import { useState } from 'react';
import {
  Server, Database, Code2, BookOpen, ChevronDown, ChevronRight,
  ExternalLink, Users, Cpu, HardDrive, Cloud, Search, FileText,
  Globe, Zap, ArrowRight, Star, CheckCircle, Info
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────

const RDM_TOOLS = [
  {
    id: 'dmp',
    name: 'DMP Assistant',
    icon: FileText,
    color: '#FFC20E',
    tagline: 'Build your Data Management Plan',
    url: 'https://dmp-pgd.ca',
    description: 'A free, bilingual, online tool that walks you through creating a Data Management Plan (DMP) step by step. Includes templates aligned with CIHR, NSERC, and SSHRC requirements.',
    stats: '16,000+ DMPs created',
    tags: ['Required for Tri-Agency grants', 'Bilingual', 'Free'],
    useCases: [
      'Writing a DMP for a grant application',
      'Updating a DMP as your project evolves',
      'Meeting Tri-Agency RDM policy requirements',
    ],
    bestFor: 'All researchers applying for or holding Tri-Agency funding',
  },
  {
    id: 'frdr',
    name: 'FRDR',
    icon: Upload,
    color: '#3B82F6',
    tagline: 'Deposit large research datasets',
    url: 'https://www.frdr-dfdr.ca',
    description: 'The Federated Research Data Repository (FRDR) is a national, bilingual repository purpose-built for large datasets. Data is curated by staff, preserved long-term, and gets a citable DOI.',
    stats: '334+ TB deposited',
    tags: ['Large datasets', 'Curation support', 'DOI assignment'],
    useCases: [
      'Depositing a large dataset supporting a publication',
      'Sharing data with collaborators or the public',
      'Long-term preservation of research outputs',
    ],
    bestFor: 'Researchers with large or complex datasets needing curation support',
  },
  {
    id: 'borealis',
    name: 'Borealis',
    icon: Database,
    color: '#10B981',
    tagline: 'Institutional data repository (Dataverse)',
    url: 'https://borealisdata.ca',
    description: 'Canada\'s national Dataverse-based repository, supported by academic libraries across Canada. Lakehead University has an institutional collection on Borealis for self-deposit.',
    stats: '25,000+ datasets',
    tags: ['Self-service', 'Institutional', 'Restricted access supported'],
    useCases: [
      'Depositing datasets linked to journal publications',
      'Sharing data within your research group or publicly',
      'Lakehead researchers depositing under the LU collection',
    ],
    bestFor: 'Researchers wanting quick self-service deposit with institutional branding',
  },
  {
    id: 'lunaris',
    name: 'Lunaris',
    icon: Search,
    color: '#8B5CF6',
    tagline: 'Discover Canadian research data',
    url: 'https://www.lunaris.ca',
    description: 'Canada\'s national data discovery portal. Search across 150+ academic, government, and research repositories by keyword or map location to find datasets relevant to your work.',
    stats: '105,000+ discoverable datasets',
    tags: ['Discovery only', 'Map-based search', 'Cross-repository'],
    useCases: [
      'Finding existing datasets before collecting new data',
      'Literature reviews and secondary analysis',
      'Discovering related data from other Canadian researchers',
    ],
    bestFor: 'Researchers looking to find and reuse existing Canadian datasets',
  },
];

function Upload(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

const ARC_SYSTEMS = [
  {
    name: 'Nibi',
    operator: 'Compute Ontario / University of Waterloo',
    type: 'HPC + AI',
    status: 'new',
    specs: '134,400 CPU cores · 288 NVIDIA H100 GPUs · Immersion-cooled',
    note: 'Canada\'s first immersion-cooled supercomputer. Optimized for AI and machine learning workloads.',
  },
  {
    name: 'Rorqual',
    operator: 'Calcul Québec / ETS Montréal',
    type: 'HPC',
    status: 'new',
    specs: '137,000 CPU cores · 587 TB RAM · 69 PB disk · 324 GPUs',
    note: 'Replaces the Béluga cluster. General-purpose with AI-optimized GPU nodes.',
  },
  {
    name: 'Fir',
    operator: 'BC DRI Group',
    type: 'HPC',
    status: 'active',
    specs: 'Heterogeneous cluster — wide range of node types',
    note: 'Versatile system suited to diverse scientific workloads across disciplines.',
  },
  {
    name: 'Trillium',
    operator: 'Compute Ontario',
    type: 'HPC',
    status: 'active',
    specs: 'Part of the national ARC fleet',
    note: 'General-purpose cluster supporting Ontario-region researchers.',
  },
  {
    name: 'Arbutus',
    operator: 'BC DRI Group / University of Victoria',
    type: 'Cloud (IaaS)',
    status: 'active',
    specs: 'OpenStack-based · Virtual machines + persistent storage',
    note: 'Best for web services, databases, and workloads needing always-on resources.',
  },
  {
    name: 'Narval',
    operator: 'Calcul Québec',
    type: 'HPC',
    status: 'active',
    specs: 'CPU + GPU nodes · General-purpose',
    note: 'Full-featured HPC cluster; available to all eligible Canadian researchers.',
  },
];

const ACCESS_TIERS = [
  {
    name: 'Rapid Access Service',
    short: 'RAS',
    color: '#10B981',
    icon: Zap,
    desc: 'Available immediately after creating a free CCDB account. No competition required.',
    includes: ['Modest CPU allocation', 'Project + scratch storage', 'Cloud VM access (Arbutus)', 'Access to all national clusters'],
    ideal: 'Students, new users, small-scale projects, exploratory work',
    url: 'https://alliancecan.ca/en/services/advanced-research-computing/accessing-resources/rapid-access-service',
  },
  {
    name: 'Resource Allocation Competition',
    short: 'RAC',
    color: '#FFC20E',
    icon: Star,
    desc: 'Annual peer-reviewed competition for larger allocations. Two streams.',
    includes: [
      'Resources for Research Groups (RRG) — large compute or storage for research projects',
      'Research Platforms & Portals (RPP) — infrastructure for scientific gateways',
      'Allocations valid for one year; renewable annually',
    ],
    ideal: 'PIs with established projects needing large-scale CPU/GPU/storage',
    url: 'https://alliancecan.ca/en/services/advanced-research-computing/accessing-resources/resource-allocation-competition',
  },
];

const SOFTWARE_AREAS = [
  {
    icon: Code2,
    title: 'Research Software Platforms',
    desc: 'Curated Canadian research software platforms, open-source and publicly funded, covering a wide range of disciplines.',
    link: 'https://alliancecan.ca/en/services/research-software/canadian-research-software-platforms',
    linkText: 'Browse platforms',
  },
  {
    icon: Users,
    title: 'Research Software Engineering (RSE) Community',
    desc: 'Programs supporting professional research software engineers at Canadian institutions — best practices, community building, and national coordination.',
    link: 'https://alliancecan.ca/en/services/research-software',
    linkText: 'Learn about RSE',
  },
  {
    icon: BookOpen,
    title: 'Training & Best Practices',
    desc: 'Resources on reproducibility, version control, software citation, and open-source licensing for researchers who write code.',
    link: 'https://alliancecan.ca/en/services/research-software',
    linkText: 'View resources',
  },
  {
    icon: Star,
    title: '$18M Inaugural Funding Opportunity',
    desc: 'New 2025–2026 funding program to support research software capacity across Canada. Applications open to eligible institutions.',
    link: 'https://alliancecan.ca/en/funding-opportunities/inaugural-funding-opportunity',
    linkText: 'View opportunity',
    highlight: true,
  },
];

const GETTING_STARTED = [
  {
    step: 1,
    title: 'Access the national platforms',
    detail: 'All DRAC national platforms — CCDB (HPC), FRDR (large datasets), DMP Assistant, and Borealis — are accessed from one login page. New users can create a free account there. Faculty can register directly; students and staff must be sponsored by a faculty supervisor.',
    link: 'https://www.alliancecan.ca/en/login',
    linkText: 'Log in to national platforms',
  },
  {
    step: 2,
    title: 'Get immediate access (RAS)',
    detail: 'Once approved, your account includes Rapid Access Service — modest compute and storage on all national clusters, no application needed.',
    link: 'https://docs.alliancecan.ca/wiki/Getting_started',
    linkText: 'Getting started guide',
  },
  {
    step: 3,
    title: 'Apply for larger resources (optional)',
    detail: 'If your project needs more CPU, GPU, or storage than RAS provides, apply in the annual Resource Allocation Competition (typically September–November each year).',
    link: 'https://alliancecan.ca/en/services/advanced-research-computing/accessing-resources/resource-allocation-competition',
    linkText: 'RAC information',
  },
  {
    step: 4,
    title: 'Get support from campus experts',
    detail: 'The Alliance has 200+ technical experts at 38 campuses. Contact them via the national helpdesk or ask your institutional RDM team.',
    link: 'https://docs.alliancecan.ca/wiki/Technical_support',
    linkText: 'Contact support',
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function DRACServices() {
  const [activeTab, setActiveTab] = useState('rdm');
  const [openRdmTool, setOpenRdmTool] = useState(null);
  const [openSystem, setOpenSystem] = useState(null);

  const tabs = [
    { id: 'rdm',      label: 'Research Data Management', icon: Database },
    { id: 'arc',      label: 'Advanced Research Computing', icon: Server },
    { id: 'software', label: 'Research Software', icon: Code2 },
    { id: 'start',    label: 'Getting Started', icon: Zap },
  ];

  return (
    <div className="drac">

      {/* Hero */}
      <div className="drac-hero">
        <div className="drac-hero-logo">
          <Globe size={28} />
          <span>Digital Research Alliance of Canada</span>
        </div>
        <h1 className="drac-title">Canada's National Research Infrastructure</h1>
        <p className="drac-subtitle">
          The Alliance provides free computing, data, and software services to all
          eligible Canadian researchers. Funded by the Government of Canada.
        </p>
        <div className="drac-stats">
          <div className="drac-stat"><strong>334+ TB</strong><span>data in FRDR</span></div>
          <div className="drac-stat-div" />
          <div className="drac-stat"><strong>16,000+</strong><span>DMPs created</span></div>
          <div className="drac-stat-div" />
          <div className="drac-stat"><strong>200+</strong><span>campus experts</span></div>
          <div className="drac-stat-div" />
          <div className="drac-stat"><strong>38</strong><span>campuses served</span></div>
        </div>
        <a
          href="https://alliancecan.ca/en"
          target="_blank"
          rel="noopener noreferrer"
          className="drac-hero-link"
        >
          <ExternalLink size={13} />
          alliancecan.ca
        </a>
      </div>

      {/* Tab nav */}
      <div className="drac-tabs">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`drac-tab${activeTab === t.id ? ' drac-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── RDM Tab ── */}
      {activeTab === 'rdm' && (
        <div className="drac-content">
          <p className="drac-content-intro">
            The Alliance provides four national platforms that cover every stage of the
            research data lifecycle — from planning, to deposit, to discovery.
          </p>

          <div className="drac-rdm-grid">
            {RDM_TOOLS.map(tool => {
              const Icon = tool.icon;
              const isOpen = openRdmTool === tool.id;
              return (
                <div key={tool.id} className={`drac-rdm-card${isOpen ? ' drac-rdm-card--open' : ''}`} style={{ '--tool-color': tool.color }}>
                  <button className="drac-rdm-card-header" onClick={() => setOpenRdmTool(isOpen ? null : tool.id)} aria-expanded={isOpen}>
                    <div className="drac-rdm-icon">
                      <Icon size={20} />
                    </div>
                    <div className="drac-rdm-header-text">
                      <strong>{tool.name}</strong>
                      <span>{tool.tagline}</span>
                    </div>
                    <div className="drac-rdm-stat">{tool.stats}</div>
                    <ChevronDown size={16} className={`drac-rdm-chevron${isOpen ? ' drac-rdm-chevron--open' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="drac-rdm-body">
                      <p className="drac-rdm-desc">{tool.description}</p>
                      <div className="drac-rdm-tags">
                        {tool.tags.map((tag, i) => <span key={i} className="drac-rdm-tag">{tag}</span>)}
                      </div>
                      <div className="drac-rdm-details">
                        <div>
                          <h4>Use cases</h4>
                          <ul>
                            {tool.useCases.map((u, i) => (
                              <li key={i}><CheckCircle size={12} />{u}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="drac-rdm-best-for">
                          <Info size={13} />
                          <span><strong>Best for:</strong> {tool.bestFor}</span>
                        </div>
                      </div>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer" className="drac-rdm-link">
                        Open {tool.name} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lifecycle diagram */}
          <div className="drac-lifecycle">
            <h3>Which tool do I use when?</h3>
            <div className="drac-lifecycle-flow">
              {[
                { stage: 'Plan', tool: 'DMP Assistant', color: '#FFC20E' },
                { stage: 'Collect & Manage', tool: 'Your own systems + Borealis', color: '#10B981' },
                { stage: 'Deposit', tool: 'FRDR or Borealis', color: '#3B82F6' },
                { stage: 'Discover', tool: 'Lunaris', color: '#8B5CF6' },
              ].map((item, i, arr) => (
                <div key={i} className="drac-lifecycle-step">
                  <div className="drac-lifecycle-node" style={{ '--lc-color': item.color }}>
                    <span className="drac-lifecycle-stage">{item.stage}</span>
                    <span className="drac-lifecycle-tool">{item.tool}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight size={16} className="drac-lifecycle-arrow" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ARC Tab ── */}
      {activeTab === 'arc' && (
        <div className="drac-content">
          <p className="drac-content-intro">
            The Alliance operates a fleet of national supercomputers and cloud systems available free
            to all eligible Canadian researchers. Access starts the day your CCDB account is approved.
          </p>

          {/* Access tiers */}
          <div className="drac-access-tiers">
            {ACCESS_TIERS.map(tier => {
              const Icon = tier.icon;
              return (
                <div key={tier.short} className="drac-tier-card" style={{ '--tier-color': tier.color }}>
                  <div className="drac-tier-header">
                    <div className="drac-tier-badge">
                      <Icon size={16} />
                      {tier.short}
                    </div>
                    <strong>{tier.name}</strong>
                  </div>
                  <p>{tier.desc}</p>
                  <ul className="drac-tier-includes">
                    {tier.includes.map((item, i) => (
                      <li key={i}><CheckCircle size={12} />{item}</li>
                    ))}
                  </ul>
                  <div className="drac-tier-ideal">
                    <strong>Ideal for:</strong> {tier.ideal}
                  </div>
                  <a href={tier.url} target="_blank" rel="noopener noreferrer" className="drac-tier-link">
                    Learn more <ExternalLink size={12} />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Systems */}
          <h3 className="drac-subsection-title">National Systems</h3>
          <div className="drac-systems-list">
            {ARC_SYSTEMS.map(sys => {
              const isOpen = openSystem === sys.name;
              return (
                <div key={sys.name} className={`drac-system-row${isOpen ? ' drac-system-row--open' : ''}`}>
                  <button className="drac-system-header" onClick={() => setOpenSystem(isOpen ? null : sys.name)} aria-expanded={isOpen}>
                    <div className="drac-system-name-wrap">
                      <strong className="drac-system-name">{sys.name}</strong>
                      {sys.status === 'new' && <span className="drac-system-badge drac-system-badge--new">New</span>}
                      <span className={`drac-system-type drac-system-type--${sys.type === 'Cloud (IaaS)' ? 'cloud' : 'hpc'}`}>{sys.type}</span>
                    </div>
                    <span className="drac-system-operator">{sys.operator}</span>
                    <ChevronRight size={14} className={`drac-system-chevron${isOpen ? ' drac-system-chevron--open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="drac-system-body">
                      <div className="drac-system-specs">
                        <Cpu size={14} />
                        <span>{sys.specs}</span>
                      </div>
                      <p>{sys.note}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="drac-arc-note">
            <Info size={15} />
            <p>All national systems are documented at <a href="https://docs.alliancecan.ca" target="_blank" rel="noopener noreferrer" className="drac-inline-link">docs.alliancecan.ca <ExternalLink size={11} /></a> with cluster-specific guides, software stacks, and example job scripts.</p>
          </div>
        </div>
      )}

      {/* ── Software Tab ── */}
      {activeTab === 'software' && (
        <div className="drac-content">
          <p className="drac-content-intro">
            The Alliance's Research Software program treats software as a first-class research output,
            supporting Canadian researchers who create, maintain, or depend on research software.
          </p>
          <div className="drac-software-grid">
            {SOFTWARE_AREAS.map((area, i) => {
              const Icon = area.icon;
              return (
                <div key={i} className={`drac-software-card${area.highlight ? ' drac-software-card--highlight' : ''}`}>
                  <div className="drac-software-icon"><Icon size={20} /></div>
                  <h3>{area.title}</h3>
                  <p>{area.desc}</p>
                  <a href={area.link} target="_blank" rel="noopener noreferrer" className="drac-software-link">
                    {area.linkText} <ExternalLink size={12} />
                  </a>
                </div>
              );
            })}
          </div>

          <div className="drac-software-strategy">
            <h3>National Research Software Strategy 2025–2030</h3>
            <div className="drac-strategy-pillars">
              {[
                { label: 'Capability', desc: 'Advancing the technical quality and sustainability of research software across Canada.' },
                { label: 'Community', desc: 'Building and supporting the research software engineering (RSE) community.' },
                { label: 'Coordination', desc: 'Aligning national efforts, reducing duplication, and establishing shared standards.' },
              ].map((p, i) => (
                <div key={i} className="drac-strategy-pillar">
                  <span className="drac-strategy-num">{i + 1}</span>
                  <div>
                    <strong>{p.label}</strong>
                    <p>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Getting Started Tab ── */}
      {activeTab === 'start' && (
        <div className="drac-content">
          <p className="drac-content-intro">
            All services are free to eligible Canadian researchers. Here is how to get up and running.
          </p>

          <div className="drac-start-steps">
            {GETTING_STARTED.map(step => (
              <div key={step.step} className="drac-start-step">
                <div className="drac-start-num">{step.step}</div>
                <div className="drac-start-body">
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  <a href={step.link} target="_blank" rel="noopener noreferrer" className="drac-start-link">
                    {step.linkText} <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Eligibility callout */}
          <div className="drac-eligibility">
            <h3>Who is eligible?</h3>
            <div className="drac-eligibility-grid">
              <div className="drac-elig-card drac-elig-card--yes">
                <CheckCircle size={18} />
                <div>
                  <strong>Full access</strong>
                  <p>Faculty members at Canadian universities (the "PI sponsor" of their group's allocation)</p>
                </div>
              </div>
              <div className="drac-elig-card drac-elig-card--yes">
                <CheckCircle size={18} />
                <div>
                  <strong>Sponsored access</strong>
                  <p>Graduate students, postdocs, and research staff — must be sponsored by a faculty PI</p>
                </div>
              </div>
              <div className="drac-elig-card drac-elig-card--yes">
                <CheckCircle size={18} />
                <div>
                  <strong>External collaborators</strong>
                  <p>International collaborators can be added to projects sponsored by a Canadian PI</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="drac-contact">
            <div className="drac-contact-item">
              <strong>Technical support</strong>
              <a href="mailto:support@tech.alliancecan.ca" className="drac-inline-link">support@tech.alliancecan.ca</a>
            </div>
            <div className="drac-contact-item">
              <strong>Account registration</strong>
              <a href="mailto:accounts@tech.alliancecan.ca" className="drac-inline-link">accounts@tech.alliancecan.ca</a>
            </div>
            <div className="drac-contact-item">
              <strong>Documentation</strong>
              <a href="https://docs.alliancecan.ca" target="_blank" rel="noopener noreferrer" className="drac-inline-link">docs.alliancecan.ca <ExternalLink size={11} /></a>
            </div>
            <div className="drac-contact-item">
              <strong>Lakehead RDM support</strong>
              <a href="mailto:rdm.research@lakeheadu.ca" className="drac-inline-link">rdm.research@lakeheadu.ca</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
