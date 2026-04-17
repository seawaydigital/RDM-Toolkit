import { useState } from 'react';
import { CATEGORIES, PRIMARY_CATEGORIES, MORE_CATEGORIES } from '../../data/toolRegistry';
import { useRecentTools } from '../../hooks/useRecentTools';
import { ChevronDown, ChevronRight, Shield, HardDrive, BookOpen, Globe, WifiOff } from 'lucide-react';

// Most commonly needed tools for researchers — surfaced directly on the homepage
const POPULAR_TOOL_IDS = [
  'merge-pdfs',
  'compress-pdf',
  'compress-image',
  'strip-image-metadata',
  'encrypt-decrypt-text',
  'password-generator',
  'sha256-hasher',
  'data-anonymizer',
];

const RESEARCH_PAGES = [
  {
    hash: 'data-classification',
    title: 'Classify Your Data',
    icon: Shield,
    description: 'Identify your data classification level (Public → Highly Confidential) and understand what security controls apply.',
  },
  {
    hash: 'storage-calculator',
    title: 'Research Storage Calculator',
    icon: HardDrive,
    description: 'Estimate storage requirements and generate ready-to-paste DMP language for your grant application.',
  },
  {
    hash: 'tri-agency-policy',
    title: 'Tri-Agency RDM Policy',
    icon: BookOpen,
    description: 'Understand federal data deposit requirements, review deposit flowcharts, and plan compliance for your grant.',
  },
  {
    hash: 'drac-services',
    title: 'DRAC Services Guide',
    icon: Globe,
    description: 'Explore national compute clusters, cloud, Borealis, FRDR, Globus, and other research infrastructure.',
  },
];

// Build a lookup of tool id → category emoji for recent tools display
const TOOL_EMOJI = {};
CATEGORIES.forEach(cat => {
  cat.tools.forEach(tool => { TOOL_EMOJI[tool.id] = cat.emoji; });
});

// Build a flat tool map for popular tools lookup
const ALL_TOOLS_MAP = {};
CATEGORIES.forEach(cat => {
  cat.tools.forEach(tool => { ALL_TOOLS_MAP[tool.id] = tool; });
});

export default function HomePage({ onNavigate }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const { recentTools } = useRecentTools();

  const popularTools = POPULAR_TOOL_IDS.map(id => ALL_TOOLS_MAP[id]).filter(Boolean);
  const allCategories = [...PRIMARY_CATEGORIES, ...MORE_CATEGORIES];

  function toggleCat(catId) {
    setExpandedCat(prev => prev === catId ? null : catId);
  }

  return (
    <div className="homepage">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="homepage-hero">
        <div className="homepage-hero-kicker">
          A Scholarly Perspective
          <span className="homepage-hero-serial">№ 01 · EST. 2026</span>
        </div>
        <h1 className="homepage-title">
          Research data, <em>handled</em> with rigor.
        </h1>
        <p className="homepage-tagline">
          A curated suite of browser-native instruments designed to secure, analyze, and preserve your academic data — without a single byte ever leaving your device.
        </p>
        <div className="homepage-trust">
          <span className="homepage-trust-badge">🔒 No uploads</span>
          <span className="homepage-trust-badge">💻 Runs in your browser</span>
          <span className="homepage-trust-badge">🚫 No account</span>
          <span className="homepage-trust-badge"><WifiOff size={12} aria-hidden="true" /> Works offline</span>
        </div>
        <p className="homepage-compliance">
          Meets{' '}
          <a href="https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" target="_blank" rel="noopener noreferrer">PIPEDA</a>,{' '}
          <a href="https://www.ontario.ca/laws/statute/04p03" target="_blank" rel="noopener noreferrer">PHIPA</a>, and{' '}
          <a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer">GDPR</a>{' '}
          data handling requirements — your files never leave your device.
        </p>
      </div>

      {/* ── Recently Used ──────────────────────────────────────────────────── */}
      {recentTools.length > 0 && (
        <section className="homepage-recent">
          <h2 className="homepage-recent-title">Recently Used</h2>
          <div className="homepage-recent-pills">
            {recentTools.map(tool => (
              <button
                key={tool.id}
                className="homepage-recent-pill"
                onClick={() => onNavigate(tool.id)}
                title={tool.description}
              >
                <span aria-hidden="true">{TOOL_EMOJI[tool.id] ?? '🛠️'}</span>
                {tool.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Tools ──────────────────────────────────────────────────── */}
      <section className="homepage-section">
        <h2 className="homepage-section-title">
          Popular Tools
          <span className="homepage-section-title-count">{popularTools.length} · curated</span>
        </h2>
        <div className="homepage-popular-grid">
          {popularTools.map(tool => (
            <button
              key={tool.id}
              className="homepage-popular-item"
              onClick={() => onNavigate(tool.id)}
              title={tool.description}
            >
              <span className="homepage-popular-emoji" aria-hidden="true">{TOOL_EMOJI[tool.id]}</span>
              <span className="homepage-popular-name">{tool.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Research Resources ─────────────────────────────────────────────── */}
      <section className="homepage-section">
        <h2 className="homepage-section-title">
          Research Resources
          <span className="homepage-section-title-count">{RESEARCH_PAGES.length} · guides</span>
        </h2>
        <div className="homepage-resources-grid">
          {RESEARCH_PAGES.map(page => {
            const Icon = page.icon;
            return (
              <a
                key={page.hash}
                href={`#${page.hash}`}
                className="homepage-resource-card"
              >
                <div className="homepage-resource-icon">
                  <Icon size={18} />
                </div>
                <div className="homepage-resource-body">
                  <h3 className="homepage-resource-title">{page.title}</h3>
                  <p className="homepage-resource-desc">{page.description}</p>
                </div>
                <ChevronRight size={16} className="homepage-resource-arrow" />
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Browse by Category ─────────────────────────────────────────────── */}
      <section className="homepage-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
        <h2 className="homepage-section-title">
          All Tools
          <span className="homepage-section-title-count">{allCategories.reduce((n, c) => n + c.tools.length, 0)} · total</span>
        </h2>
        <div className="homepage-cat-list">
          {allCategories.map(cat => {
            const isOpen = expandedCat === cat.id;
            return (
              <div key={cat.id} className={`homepage-cat-item${isOpen ? ' homepage-cat-item--open' : ''}`}>
                <button
                  className="homepage-cat-header"
                  onClick={() => toggleCat(cat.id)}
                  aria-expanded={isOpen}
                >
                  <span className="homepage-cat-emoji" aria-hidden="true">{cat.emoji}</span>
                  <span className="homepage-cat-label">{cat.label}</span>
                  <span className="homepage-cat-count">{cat.tools.length}</span>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {isOpen && (
                  <div className="homepage-cat-tools">
                    {cat.tools.map(tool => (
                      <button
                        key={tool.id}
                        className="homepage-cat-tool"
                        onClick={() => onNavigate(tool.id)}
                        title={tool.description}
                      >
                        {tool.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
