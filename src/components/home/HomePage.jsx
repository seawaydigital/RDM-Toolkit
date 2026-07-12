import { useState } from 'react';
import { CATEGORIES, PRIMARY_CATEGORIES, MORE_CATEGORIES } from '../../data/toolRegistry';
import { useRecentTools } from '../../hooks/useRecentTools';
import HeroDiagram from './HeroDiagram';
import { ChevronDown, ChevronRight, Shield, HardDrive, BookOpen, Globe } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

// Bento tool tiles — hand-written homepage copy, not registry descriptions
const BENTO_TOOLS = [
  { id: 'merge-pdfs', emoji: '📑', blurb: 'Combine documents in seconds — the most-used tool here.' },
  { id: 'compress-pdf', emoji: '🗜️', blurb: 'Smart presets sized for email.' },
  { id: 'data-anonymizer', emoji: '🕵️', blurb: 'TCPS 2-aligned coding, pseudonyms & key files.' },
  { id: 'strip-image-metadata', emoji: '🖼️', blurb: 'Remove GPS & EXIF before sharing.' },
  { id: 'encrypt-decrypt-text', emoji: '🔐', blurb: 'AES-256, built into your browser.' },
  { id: 'pdf-redaction', emoji: '⬛', blurb: 'True removal — not a black box on top.' },
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

// Flat tool map for bento lookups
const ALL_TOOLS_MAP = {};
CATEGORIES.forEach(cat => {
  cat.tools.forEach(tool => { ALL_TOOLS_MAP[tool.id] = tool; });
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  el.focus({ preventScroll: true });
}

export default function HomePage({ onNavigate }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const { recentTools } = useRecentTools();

  const isReturning = recentTools.length > 0;
  const bentoTools = BENTO_TOOLS
    .map(t => ({ ...t, tool: ALL_TOOLS_MAP[t.id] }))
    .filter(t => Boolean(t.tool));
  const allCategories = [...PRIMARY_CATEGORIES, ...MORE_CATEGORIES];
  const toolCount = allCategories.reduce((n, c) => n + c.tools.length, 0);

  function toggleCat(catId) {
    setExpandedCat(prev => prev === catId ? null : catId);
  }

  return (
    <div className="homepage">

      {/* ── Hero — manifesto split ─────────────────────────────────────────── */}
      <header className={`homepage-hero homepage-hero--split${isReturning ? ' homepage-hero--compact' : ''}`}>
        <div className="homepage-hero-copy">
          <div className="homepage-hero-kicker">
            Lakehead Research Data Toolkit
            <span className="homepage-hero-serial">EST. 2026</span>
          </div>
          <h1 className="homepage-title">
            Your research data <em>never leaves</em> this device.
          </h1>
          <p className="homepage-tagline">
            {toolCount} free tools for PDFs, images, data, and privacy — every byte
            processed in your browser, never on a server. No uploads. No account.
            And you can verify it.
          </p>
          <div className="homepage-hero-ctas">
            <button className="homepage-hero-cta" onClick={() => scrollToSection('homepage-bento')}>
              Browse the tools
            </button>
            {!isReturning && (
              <button className="homepage-hero-cta2" onClick={() => scrollToSection('homepage-how')}>
                How is that possible? ↓
              </button>
            )}
          </div>
        </div>
        {!isReturning && <HeroDiagram />}
      </header>

      {/* ── Stat strip ─────────────────────────────────────────────────────── */}
      <ul className="homepage-stats">
        <li className="homepage-stat">
          <b>{toolCount}</b>
          <span>research tools</span>
        </li>
        <li className="homepage-stat">
          <b>0</b>
          <span>bytes uploaded</span>
        </li>
        <li className="homepage-stat">
          <b><span className="homepage-stat-accent">$</span>0</b>
          <span>now &amp; forever</span>
        </li>
        <li className="homepage-stat">
          <b>100<span className="homepage-stat-accent">%</span></b>
          <span>works offline</span>
        </li>
      </ul>

      {/* ── Recently Used (returning users) ────────────────────────────────── */}
      {isReturning && (
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

      {/* ── Bento — tools + trust interleaved ──────────────────────────────── */}
      <section className="homepage-section" id="homepage-bento" tabIndex={-1}>
        <h2 className="homepage-section-title">
          Start with what you need
          <span className="homepage-section-title-count">tools + the trust to use them</span>
        </h2>
        <div className="homepage-bento">
          {/* row 1: two tools + airplane-mode education tile */}
          {bentoTools.slice(0, 2).map(({ id, emoji, blurb, tool }) => (
            <button key={id} className="homepage-tile" onClick={() => onNavigate(id)} title={tool.description}>
              <span className="homepage-tile-emoji" aria-hidden="true">{emoji}</span>
              <h3 className="homepage-tile-name">{tool.name}</h3>
              <p className="homepage-tile-blurb">{blurb}</p>
            </button>
          ))}
          <div className="homepage-tile homepage-tile--edu homepage-tile--wide">
            <span className="homepage-tile-tag" aria-hidden="true">WHY IT'S SAFE</span>
            <span className="homepage-tile-emoji" aria-hidden="true">🔌</span>
            <h3 className="homepage-tile-name">The airplane-mode test</h3>
            <p className="homepage-tile-blurb">
              Load this site once, then turn off your Wi-Fi. Every tool keeps working —
              because nothing was ever on a server to begin with.
            </p>
          </div>

          {/* row 2: four tools */}
          {bentoTools.slice(2, 6).map(({ id, emoji, blurb, tool }) => (
            <button key={id} className="homepage-tile" onClick={() => onNavigate(id)} title={tool.description}>
              <span className="homepage-tile-emoji" aria-hidden="true">{emoji}</span>
              <h3 className="homepage-tile-name">{tool.name}</h3>
              <p className="homepage-tile-blurb">{blurb}</p>
            </button>
          ))}

          {/* row 3: proof tile + compliance tile */}
          <div className="homepage-tile homepage-tile--proof homepage-tile--wide">
            <h3 className="homepage-tile-name">Don't trust us. Check.</h3>
            <ol className="homepage-proof-rows">
              <li className="homepage-proof-row">
                <span className="homepage-proof-no" aria-hidden="true">№01</span>
                Open DevTools → Network. Process a file. Zero requests.
              </li>
              <li className="homepage-proof-row">
                <span className="homepage-proof-no" aria-hidden="true">№02</span>
                Every line of code is{' '}
                <a href="https://github.com/seawaydigital/RDM-Toolkit" target="_blank" rel="noopener noreferrer">public on GitHub</a>.
              </li>
              <li className="homepage-proof-row">
                <span className="homepage-proof-no" aria-hidden="true">№03</span>
                Meets{' '}
                <a href="https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" target="_blank" rel="noopener noreferrer">PIPEDA</a>,{' '}
                <a href="https://www.ontario.ca/laws/statute/04p03" target="_blank" rel="noopener noreferrer">PHIPA</a> &amp;{' '}
                <a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer">GDPR</a>{' '}
                data-handling rules.
              </li>
            </ol>
          </div>
          <div className="homepage-tile homepage-tile--edu homepage-tile--wide">
            <span className="homepage-tile-tag" aria-hidden="true">FOR SENSITIVE DATA</span>
            <span className="homepage-tile-emoji" aria-hidden="true">⚖️</span>
            <h3 className="homepage-tile-name">Built for research compliance</h3>
            <p className="homepage-tile-blurb">
              Because files never leave your device, OCAP®, PHIPA and REB constraints that
              forbid cloud uploads don't apply here.{' '}
              <a href="#data-classification">Classify your data</a> → pick the right tool.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="homepage-section" id="homepage-how" tabIndex={-1}>
        <h2 className="homepage-section-title">
          How it works
          <span className="homepage-section-title-count">30-second version</span>
        </h2>
        <div className="homepage-steps">
          <div className="homepage-step">
            <span className="homepage-step-n" aria-hidden="true">1</span>
            <h3>Choose a file</h3>
            <p>It opens straight into your browser's memory — like opening it in Word or Preview.</p>
          </div>
          <div className="homepage-step">
            <span className="homepage-step-n" aria-hidden="true">2</span>
            <h3>Your browser does the work</h3>
            <p>Modern browsers ship the same engines desktop apps use — PDF engines, AES-256 encryption, image processing.</p>
          </div>
          <div className="homepage-step">
            <span className="homepage-step-n" aria-hidden="true">3</span>
            <h3>Download the result</h3>
            <p>The output is written to your Downloads folder. The original and the result only ever existed on your device.</p>
          </div>
        </div>
        <p className="homepage-challenge">
          <span className="homepage-challenge-emoji" aria-hidden="true">✈️</span>
          <span>
            <strong>Prove it to yourself:</strong> turn on airplane mode and use any tool.
            It works — there's nothing to upload to.{' '}
            <a href="#how-this-works">Full technical explanation →</a>
          </span>
        </p>
      </section>

      {/* ── Research guides ────────────────────────────────────────────────── */}
      <section className="homepage-section">
        <h2 className="homepage-section-title">
          Research guides
          <span className="homepage-section-title-count">beyond the tools</span>
        </h2>
        <div className="homepage-resources-grid">
          {RESEARCH_PAGES.map(page => {
            const Icon = page.icon;
            return (
              <a key={page.hash} href={`#${page.hash}`} className="homepage-resource-card">
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

      {/* ── All Tools accordion ────────────────────────────────────────────── */}
      <section className="homepage-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
        <h2 className="homepage-section-title">
          All Tools
          <span className="homepage-section-title-count">{toolCount} · total</span>
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
        <p className="homepage-foot">
          Press <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd> to search ·{' '}
          <a href="#how-this-works">How this works, in depth</a>
        </p>
      </section>

    </div>
  );
}
