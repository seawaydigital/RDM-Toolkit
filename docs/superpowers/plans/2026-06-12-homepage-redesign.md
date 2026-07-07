# Homepage Redesign ("Manifesto Split + Bento") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage as a trust-first, education-forward "Manifesto Split + Bento" layout per `docs/superpowers/specs/2026-06-12-homepage-redesign-design.md`.

**Architecture:** Pure presentational change — `HomePage.jsx` is restructured, a new `HeroDiagram.jsx` sibling component holds the animated inline SVG, and all styling lands in `global.css` under the existing `.homepage-` prefix using only existing design tokens. Adaptive layout keys off the existing `useRecentTools()` hook. No routing, registry, or dependency changes.

**Tech Stack:** React 18, plain CSS (no Tailwind), lucide-react icons, inline SVG. **This project has no unit-test framework** — verification is `npx vite build`, `npm run security:audit`, and browser preview checks (the project's established pattern).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/home/HeroDiagram.jsx` | Create | Self-contained animated privacy-flow SVG (file → browser → download, crossed-out cloud) |
| `src/components/home/HomePage.jsx` | Rewrite | Page composition: hero split, stat strip, adaptive Recently Used, bento, How It Works, guides, accordion, footer hint |
| `src/styles/global.css` | Modify | Add new `.homepage-*` classes; remove orphaned hero/popular classes; update mobile media queries |
| `CLAUDE.md` | Modify | Recent Changes entry (final task) |

---

### Task 1: HeroDiagram component

**Files:**
- Create: `src/components/home/HeroDiagram.jsx`

- [ ] **Step 1: Create the component**

Write `src/components/home/HeroDiagram.jsx` exactly as follows. It is a pure inline-SVG component: three nodes joined by dashed gold wires, a `LIVE ON YOUR DEVICE` tag, and a crossed-out cloud row underneath. All animation is CSS-driven (classes defined in Task 3), so reduced-motion handling lives entirely in the stylesheet.

```jsx
import { FileText, ShieldCheck, Download, CloudOff } from 'lucide-react';

/**
 * Animated privacy-flow diagram for the homepage hero.
 * Your file → This browser → Your download, with a crossed-out cloud below.
 * Animation classes (.homepage-diagram-wire, .homepage-diagram-strike) are
 * pure CSS and frozen under prefers-reduced-motion (see global.css).
 */
export default function HeroDiagram() {
  return (
    <div
      className="homepage-diagram"
      role="img"
      aria-label="Diagram: your file is processed by your browser and downloaded — no server is ever involved"
    >
      <span className="homepage-diagram-live" aria-hidden="true">● LIVE ON YOUR DEVICE</span>

      <div className="homepage-diagram-row" aria-hidden="true">
        <div className="homepage-diagram-node">
          <span className="homepage-diagram-icon"><FileText size={22} /></span>
          <span className="homepage-diagram-label">Your file</span>
        </div>

        <svg className="homepage-diagram-wire" viewBox="0 0 100 8" preserveAspectRatio="none">
          <line x1="0" y1="4" x2="100" y2="4" />
        </svg>

        <div className="homepage-diagram-node homepage-diagram-node--device">
          <span className="homepage-diagram-icon"><ShieldCheck size={22} /></span>
          <span className="homepage-diagram-label">This browser</span>
        </div>

        <svg className="homepage-diagram-wire homepage-diagram-wire--second" viewBox="0 0 100 8" preserveAspectRatio="none">
          <line x1="0" y1="4" x2="100" y2="4" />
        </svg>

        <div className="homepage-diagram-node">
          <span className="homepage-diagram-icon"><Download size={22} /></span>
          <span className="homepage-diagram-label">Your download</span>
        </div>
      </div>

      <div className="homepage-diagram-cloud" aria-hidden="true">
        <span className="homepage-diagram-cloud-icon">
          <CloudOff size={18} />
          <svg className="homepage-diagram-strike" viewBox="0 0 40 40" preserveAspectRatio="none">
            <line x1="4" y1="36" x2="36" y2="4" />
          </svg>
        </span>
        <span className="homepage-diagram-cloud-label">No server. No upload. The internet is not involved.</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file parses**

Run: `npx vite build`
Expected: build completes with no errors (component is not imported yet — this just catches syntax issues via the JSX transform when Task 2 lands; if the unimported file isn't compiled, that's fine — proceed).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HeroDiagram.jsx
git commit -m "feat(home): HeroDiagram privacy-flow SVG component"
```

---

### Task 2: HomePage restructure

**Files:**
- Modify (full rewrite): `src/components/home/HomePage.jsx`

- [ ] **Step 1: Rewrite HomePage.jsx**

Replace the entire contents of `src/components/home/HomePage.jsx` with:

```jsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vite build`
Expected: build succeeds (page will look unstyled-ish until Task 3 — that's expected).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomePage.jsx
git commit -m "feat(home): restructure homepage — manifesto hero, stat strip, bento, how-it-works"
```

---

### Task 3: CSS — new homepage styles, orphan removal, responsive + reduced motion

**Files:**
- Modify: `src/styles/global.css` (hero block ~lines 1378–1523, popular-grid block ~1562–1616, media queries ~1813–1840 and ~11050–11165)

- [ ] **Step 1: Remove orphaned class blocks**

Delete these rule blocks entirely (they are no longer referenced after Task 2):
- `.homepage-trust`, `.homepage-trust-badge`, `.homepage-trust-sep` (~lines 1473–1500)
- `.homepage-compliance`, `.homepage-compliance a`, `.homepage-compliance a:hover` (~lines 1502–1523)
- `.homepage-popular-grid`, `.homepage-popular-item`, `.homepage-popular-item::before`, `.homepage-popular-item:hover`, `.homepage-popular-item:hover::before`, `.homepage-popular-emoji`, `.homepage-popular-name` (~lines 1562–1616)

Then grep for stragglers and remove any `.homepage-popular-grid` / `.homepage-trust-sep` rules inside media queries:

Run: `grep -n "homepage-popular\|homepage-trust\|homepage-compliance" src/styles/global.css`
Expected: no matches after cleanup.

- [ ] **Step 2: Add the new homepage CSS**

Insert the following immediately after the `.homepage-title em` block (i.e., where the deleted `.homepage-tagline`-adjacent blocks lived — keep `.homepage-tagline` itself, it's still used). Add after the `.homepage-tagline` rule:

```css
/* ── Hero split layout ──────────────────────────────────────────────────── */

.homepage-hero--split {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: var(--space-xl);
  align-items: center;
}

.homepage-hero--split .homepage-title {
  font-size: 46px;
}

.homepage-hero--compact {
  grid-template-columns: 1fr;
  padding: 32px 36px 28px;
}

.homepage-hero--compact .homepage-title {
  font-size: 36px;
}

.homepage-hero-copy {
  position: relative;
}

.homepage-hero-ctas {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.homepage-hero-cta {
  background: var(--accent-primary);
  color: #0A1628;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 14px;
  padding: 11px 20px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.homepage-hero-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -6px rgba(255, 194, 14, 0.5);
}

.homepage-hero-cta2 {
  background: none;
  border: none;
  color: var(--text-parchment);
  font-family: var(--font-sans);
  font-size: 13.5px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 8px 4px;
}

.homepage-hero-cta2:hover {
  text-decoration-color: var(--accent-primary);
}

/* ── Hero privacy diagram ───────────────────────────────────────────────── */

.homepage-diagram {
  position: relative;
  background: var(--bg-inset);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  padding: 30px 18px 16px;
}

.homepage-diagram-live {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--accent-green);
}

.homepage-diagram-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.homepage-diagram-node {
  text-align: center;
  width: 84px;
  flex-shrink: 0;
}

.homepage-diagram-icon {
  width: 46px;
  height: 46px;
  margin: 0 auto 7px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.homepage-diagram-node--device .homepage-diagram-icon {
  background: rgba(255, 194, 14, 0.12);
  border-color: rgba(255, 194, 14, 0.5);
  box-shadow: 0 0 24px rgba(255, 194, 14, 0.15);
  color: var(--accent-primary);
}

.homepage-diagram-label {
  display: block;
  font-family: var(--font-sans);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.homepage-diagram-node--device .homepage-diagram-label {
  color: var(--accent-primary);
}

.homepage-diagram-wire {
  flex: 1;
  height: 8px;
  margin: 19px 6px 0;
  overflow: visible;
}

.homepage-diagram-wire line {
  stroke: var(--accent-primary);
  stroke-width: 2;
  stroke-dasharray: 6 6;
  stroke-dashoffset: 120;
  animation: homepage-wire-draw 0.9s ease-out 0.3s forwards;
}

.homepage-diagram-wire--second line {
  animation-delay: 1.1s;
}

@keyframes homepage-wire-draw {
  to { stroke-dashoffset: 0; }
}

.homepage-diagram-cloud {
  margin-top: var(--space-md);
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.homepage-diagram-cloud-icon {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--bg-secondary);
  border: 1px solid rgba(239, 68, 68, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.homepage-diagram-strike {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.homepage-diagram-strike line {
  stroke: var(--accent-red);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 46;
  stroke-dashoffset: 46;
  animation: homepage-wire-draw 0.5s ease-out 2s forwards;
}

.homepage-diagram-cloud-label {
  font-family: var(--font-sans);
  font-size: 11.5px;
  color: #F0A7A7;
}

/* ── Stat strip ─────────────────────────────────────────────────────────── */

.homepage-stats {
  display: flex;
  list-style: none;
  margin: 0 0 var(--space-2xl);
  padding: 0;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  overflow: hidden;
}

.homepage-stat {
  flex: 1;
  text-align: center;
  padding: 20px 8px;
  border-right: 1px solid var(--border-soft);
}

.homepage-stat:last-child {
  border-right: none;
}

.homepage-stat b {
  display: block;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  color: var(--text-parchment);
  line-height: 1;
  margin-bottom: 6px;
}

.homepage-stat-accent {
  color: var(--accent-primary);
}

.homepage-stat span {
  font-family: var(--font-sans);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

/* ── Bento grid ─────────────────────────────────────────────────────────── */

.homepage-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.homepage-tile {
  background: var(--bg-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: left;
  position: relative;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  cursor: pointer;
  font-family: var(--font-sans);
  color: var(--text-primary);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.homepage-tile:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 194, 14, 0.4);
}

.homepage-tile-emoji {
  font-size: 20px;
}

.homepage-tile-name {
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.homepage-tile-blurb {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.45;
}

.homepage-tile--wide {
  grid-column: span 2;
}

.homepage-tile--edu {
  background: linear-gradient(150deg, rgba(255, 194, 14, 0.10), rgba(255, 194, 14, 0.03));
  border-color: rgba(255, 194, 14, 0.3);
  cursor: default;
}

.homepage-tile--edu:hover {
  transform: none;
  border-color: rgba(255, 194, 14, 0.3);
}

.homepage-tile--edu a {
  color: var(--accent-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.homepage-tile-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.12em;
  color: var(--accent-primary);
}

.homepage-tile--proof {
  background: var(--bg-inset);
  border-color: rgba(255, 255, 255, 0.12);
  cursor: default;
}

.homepage-tile--proof:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.12);
}

.homepage-proof-rows {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.homepage-proof-row {
  display: flex;
  gap: 9px;
  font-size: 11.5px;
  color: var(--text-secondary);
  align-items: baseline;
  line-height: 1.4;
}

.homepage-proof-row a {
  color: var(--text-parchment);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(255, 255, 255, 0.25);
}

.homepage-proof-row a:hover {
  text-decoration-color: var(--accent-primary);
}

.homepage-proof-no {
  font-family: var(--font-mono);
  color: var(--accent-primary);
  font-size: 9.5px;
  flex-shrink: 0;
}

/* ── How it works steps ─────────────────────────────────────────────────── */

.homepage-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.homepage-step {
  background: var(--bg-secondary);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  padding: 18px 16px;
}

.homepage-step-n {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 28px;
  color: var(--accent-primary);
  line-height: 1;
}

.homepage-step h3 {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-parchment);
  margin: 8px 0 5px;
}

.homepage-step p {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.homepage-challenge {
  margin: 12px 0 0;
  border: 1px dashed rgba(255, 194, 14, 0.45);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12.5px;
  color: var(--text-primary);
  background: rgba(255, 194, 14, 0.05);
  line-height: 1.5;
}

.homepage-challenge-emoji {
  font-size: 20px;
  flex-shrink: 0;
}

.homepage-challenge strong {
  color: var(--text-parchment);
}

.homepage-challenge a {
  color: var(--accent-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── Footer hint ────────────────────────────────────────────────────────── */

.homepage-foot {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-soft);
  font-size: 11.5px;
  color: var(--text-muted);
  text-align: center;
}

.homepage-foot kbd {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-parchment);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-hairline);
  border-radius: 4px;
  padding: 2px 6px;
}

.homepage-foot a {
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.homepage-foot a:hover {
  color: var(--text-parchment);
}

/* ── Focus + reduced motion ─────────────────────────────────────────────── */

#homepage-bento:focus,
#homepage-how:focus {
  outline: none;
}

.homepage-hero-cta:focus-visible,
.homepage-hero-cta2:focus-visible,
.homepage-tile:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .homepage-diagram-wire line,
  .homepage-diagram-strike line {
    animation: none;
    stroke-dashoffset: 0;
  }
  .homepage-tile,
  .homepage-hero-cta {
    transition: none;
  }
  .homepage-tile:hover,
  .homepage-hero-cta:hover {
    transform: none;
  }
}
```

- [ ] **Step 3: Update responsive rules**

In the `@media (max-width: 1023px)` / tablet-range homepage media query (~line 1813, where `.homepage-popular-grid` rules were removed), add:

```css
  .homepage-bento {
    grid-template-columns: repeat(2, 1fr);
  }
```

In the mobile `@media (max-width: 767px)` homepage block (~line 11050, near the existing `.homepage-title` mobile override), add:

```css
  .homepage-hero--split {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }
  .homepage-hero--split .homepage-title {
    font-size: 32px;
  }
  .homepage-stats {
    flex-wrap: wrap;
  }
  .homepage-stat {
    flex: 1 1 50%;
    border-bottom: 1px solid var(--border-soft);
  }
  .homepage-stat:nth-child(n+3) {
    border-bottom: none;
  }
  .homepage-stat:nth-child(2n) {
    border-right: none;
  }
  .homepage-bento {
    grid-template-columns: 1fr;
  }
  .homepage-tile--wide {
    grid-column: span 1;
  }
  .homepage-steps {
    grid-template-columns: 1fr;
  }
```

Also check the existing mobile `.homepage-title` override (~line 11058) — it sets a font-size for the old 64px title; ensure it doesn't fight the new `.homepage-hero--split .homepage-title` rule (the split rule above is more specific, so it wins; leave the old rule for safety).

- [ ] **Step 4: Build and verify**

Run: `npx vite build`
Expected: clean build, no warnings beyond the pre-existing zxcvbn chunk note.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(home): bento/hero/stat-strip styles, reduced-motion + responsive rules"
```

---

### Task 4: Browser verification (both layouts, a11y, mobile)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and check the first-timer layout**

Use the preview tools (`preview_start`, then `preview_screenshot`). Before checking, clear recent tools so the first-timer layout renders:

`preview_eval`: `localStorage.removeItem('rdm_recent_tools'); location.reload();`

(If the key name differs, check `src/hooks/useRecentTools.js` for the exact localStorage key and remove that.)

Verify visually: split hero with diagram, stat strip showing the live tool count, bento with 6 tool tiles + 3 education tiles, How It Works steps + challenge callout, guides, accordion, footer hint. Check `preview_console_logs` for errors.

- [ ] **Step 2: Check the returning-user layout**

`preview_eval`: navigate to a tool (e.g. `location.hash = 'merge-pdfs'`), then back to home, reload. Verify: compact hero (no diagram, single CTA), Recently Used row above the bento.

- [ ] **Step 3: Reduced motion + mobile**

- `preview_resize` to 375×812: hero stacks, stats wrap 2×2, bento single column, no horizontal scroll.
- Emulate reduced motion (`preview_eval` can't toggle the media query — instead verify the CSS block exists and the animation end-state matches: wires fully drawn). If CSS emulation isn't available, code-review the `@media (prefers-reduced-motion: reduce)` block instead.

- [ ] **Step 4: Keyboard pass**

Tab through: hero CTAs → stat strip (non-interactive, skipped) → bento tiles (each focusable, visible gold outline) → proof-tile links → step section → guide cards → accordion headers. Verify "Browse the tools" CTA scrolls and moves focus to the bento section.

- [ ] **Step 5: Run guardrails**

Run: `npm run security:audit`
Expected: PASS (new external links all carry `rel="noopener noreferrer"`).

Run: `npx vite build`
Expected: clean.

- [ ] **Step 6: Screenshot proof + commit any fixes**

`preview_screenshot` of both layouts for the user. If fixes were needed, commit them:

```bash
git add -A src/
git commit -m "fix(home): verification fixes from preview pass"
```

---

### Task 5: Documentation

**Files:**
- Modify: `CLAUDE.md` (Recent Changes table + HomePage description line in Directory Structure)

- [ ] **Step 1: Update CLAUDE.md**

Add a row at the top of the Recent Changes table (date 2026-06-12) summarizing: homepage redesigned to "Manifesto Split + Bento" — split hero with animated privacy diagram (`HeroDiagram.jsx`), stat strip, bento grid interleaving 6 tool tiles with 3 education/proof tiles, 3-step How It Works band with airplane-mode challenge, adaptive returning-user layout (compact hero + Recently Used lifted), AODA-compliant (reduced motion, focus management, semantic headings). Note removed classes (`.homepage-trust*`, `.homepage-compliance*`, `.homepage-popular-*`) and the Popular Tools section's replacement by the bento.

Update the Directory Structure line for `HomePage.jsx` to: `# Home screen — manifesto hero + diagram, stat strip, bento, how-it-works, guides, accordion` and add `HeroDiagram.jsx`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md for homepage redesign"
```

---

## Self-review notes

- **Spec coverage:** hero split + diagram (T1/T2), stat strip (T2/T3), adaptive returning layout (T2 — compact hero, Recently Used lifted), bento with 6 tools + 3 edu tiles incl. proof tile (T2/T3), How It Works + challenge (T2/T3), guides + accordion retained (T2), footer hint with platform-aware kbd (T2), orphan CSS removal (T3), AODA items — reduced motion, aria-label on diagram, focus management, semantic lists/headings (T1/T2/T3), verification incl. keyboard + mobile + security audit (T4), CLAUDE.md (T5). No gaps found.
- **Type consistency:** `scrollToSection(id)` matches the `id`/`tabIndex={-1}` targets `homepage-bento` / `homepage-how`; `BENTO_TOOLS` ids all exist in the registry (merge-pdfs, compress-pdf, data-anonymizer, strip-image-metadata, encrypt-decrypt-text, pdf-redaction — all present per toolRegistry).
- **Known judgment call:** the spec's "hero CTAs use smooth scroll" is implemented with buttons + `scrollIntoView` rather than anchor links so reduced-motion can be respected programmatically.
