# Lakehead Dataverse Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `#lakehead-dataverse` page that persuades and guides Lakehead University researchers to deposit data in the LU Borealis collection, plus update two existing pages to link to the LU-specific URL.

**Architecture:** Static React page component registered in App.jsx's hash router, eagerly imported (not lazy-loaded) consistent with all other page components. Six sections: Hero, Benefits grid, Repository picker table, Step-by-step deposit guide, FAQ accordion, Contact CTA. CSS uses the `.lud-*` prefix and follows the same pattern as `TriAgencyPolicy.jsx` and `AcrobatAlternative.jsx`.

**Tech Stack:** React 18, plain CSS in `src/styles/global.css`, lucide-react icons, hash-based routing in `App.jsx`.

**Spec:** `docs/superpowers/specs/2026-04-16-lakehead-dataverse-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/components/pages/TriAgencyPolicy.jsx` | Update Borealis card URL + badge + description (Option A) |
| Modify | `src/components/pages/DRACServices.jsx` | Update Borealis url + tagline + description (Option A) |
| Modify | `src/App.jsx` | Static import + add to PAGES Set + add render case |
| Modify | `src/components/layout/Sidebar.jsx` | Add `Database` to lucide import + add nav link |
| Modify | `src/styles/global.css` | Add all `.lud-*` styles at end of file |
| Create | `src/components/pages/LakeheadDataverse.jsx` | New page component (all 6 sections) |
| Modify | `CLAUDE.md` | Update pages table + recent changes |

---

## Task 1: Option A — Update TriAgencyPolicy.jsx Borealis Card

**Files:**
- Modify: `src/components/pages/TriAgencyPolicy.jsx` (lines ~528–535)

The Borealis repo card currently has `href="https://borealisdata.ca"` and a short description. We're updating it to point to the LU-specific collection, adding a "Recommended for Lakehead" gold badge, and expanding the description.

**Do NOT touch** the Borealis link in the FAQ answer (line 164) — it correctly uses the generic URL.

- [ ] **Step 1: Locate the Borealis card in TriAgencyPolicy.jsx**

Open `src/components/pages/TriAgencyPolicy.jsx`. Find the `tap-repo-card` div that contains the Borealis link — it's around line 530. The current card looks like:

```jsx
<div className="tap-repo-card">
  <a href="https://borealisdata.ca" target="_blank" rel="noopener noreferrer"><strong>Borealis (Dataverse Canada)</strong></a>
  <span className="tap-repo-type">General / Institutional</span>
  <p>Canada's national research data repository. Lakehead has an institutional collection. Supports restricted access.</p>
</div>
```

- [ ] **Step 2: Replace the Borealis card content**

Replace that entire `<div className="tap-repo-card">` block with:

```jsx
<div className="tap-repo-card">
  <a href="https://borealisdata.ca/dataverse/lakehead" target="_blank" rel="noopener noreferrer"><strong>Borealis — Lakehead Dataverse</strong></a>
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
    <span className="tap-repo-type">General / Institutional</span>
    <span className="tap-repo-badge--featured">Recommended for Lakehead</span>
  </div>
  <p>Canada's national Dataverse-based repository. Lakehead has its own institutional collection — deposit here for free, get a DOI, and satisfy Tri-Agency requirements. Supports restricted access.</p>
</div>
```

- [ ] **Step 3: Add the `tap-repo-badge--featured` CSS rule to global.css**

Open `src/styles/global.css`. Find the `.tap-repo-type` rule (around line 6499). Add the new modifier rule immediately after it:

```css
.tap-repo-badge--featured {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--accent-primary);
  color: #0A1628;
}
```

- [ ] **Step 4: Start the dev server and verify**

Run: `npm run dev`

Navigate to `http://localhost:5173/#tri-agency-policy` and scroll to "Repository Options for Lakehead Researchers". Confirm:
- Borealis card link goes to `borealisdata.ca/dataverse/lakehead`
- Gold "Recommended for Lakehead" badge appears
- Expanded description is visible
- FAQ "What counts as a repository?" answer still links to `borealisdata.ca` (unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/TriAgencyPolicy.jsx src/styles/global.css
git commit -m "feat: update TriAgencyPolicy Borealis card to LU-specific URL and badge"
```

---

## Task 2: Option A — Update DRACServices.jsx Borealis Entry

**Files:**
- Modify: `src/components/pages/DRACServices.jsx` (lines ~47–62)

The `borealis` object in the `RDM_TOOLS` array needs its `url`, `tagline`, and `description` updated.

- [ ] **Step 1: Locate the borealis object in DRACServices.jsx**

Open `src/components/pages/DRACServices.jsx`. Find the object with `id: 'borealis'` (around line 47). Current values:

```js
url: 'https://borealisdata.ca',
tagline: 'Institutional data repository (Dataverse)',
description: 'Canada\'s national Dataverse-based repository, supported by academic libraries across Canada. Lakehead University has an institutional collection on Borealis for self-deposit.',
```

- [ ] **Step 2: Update the three fields**

Replace those three lines with:

```js
url: 'https://borealisdata.ca/dataverse/lakehead',
tagline: 'Lakehead\'s institutional data repository',
description: 'Canada\'s national Dataverse-based repository. Lakehead University has its own institutional collection on Borealis — the recommended starting point for most LU researchers. Self-service deposit, DOI assignment, restricted access, and version control. Free for all LU researchers.',
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:5173/#drac-services`. Open the Borealis tab/card. Confirm:
- Updated tagline: "Lakehead's institutional data repository"
- Updated description mentions "recommended starting point for most LU researchers"
- The "Visit" or external link button points to `borealisdata.ca/dataverse/lakehead`

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/DRACServices.jsx
git commit -m "feat: update DRACServices Borealis entry to LU-specific URL"
```

---

## Task 3: Register the New Page in App.jsx and Sidebar.jsx

**Files:**
- Modify: `src/App.jsx` (lines 12, 111, 329)
- Modify: `src/components/layout/Sidebar.jsx` (lines 2, 120–127)

Register the route so navigating to `#lakehead-dataverse` renders the new component. The component doesn't exist yet — that's fine. We'll create a minimal placeholder to confirm routing works, then replace it in later tasks.

- [ ] **Step 1: Add the static import to App.jsx**

Open `src/App.jsx`. After line 12 (`import AcrobatAlternative from './components/pages/AcrobatAlternative';`), add:

```js
import LakeheadDataverse from './components/pages/LakeheadDataverse';
```

- [ ] **Step 2: Add 'lakehead-dataverse' to the PAGES Set in App.jsx**

Find line 111:
```js
const PAGES = new Set(['how-this-works', 'request-a-tool', 'data-classification', 'storage-calculator', 'tri-agency-policy', 'drac-services', 'acrobat-alternative']);
```

Replace with:
```js
const PAGES = new Set(['how-this-works', 'request-a-tool', 'data-classification', 'storage-calculator', 'tri-agency-policy', 'drac-services', 'acrobat-alternative', 'lakehead-dataverse']);
```

- [ ] **Step 3: Add the render case in App.jsx**

Find line 329:
```jsx
{currentPage === 'acrobat-alternative' && <AcrobatAlternative />}
```

Add immediately after it:
```jsx
{currentPage === 'lakehead-dataverse' && <LakeheadDataverse />}
```

- [ ] **Step 4: Add Database to Sidebar.jsx lucide import**

Open `src/components/layout/Sidebar.jsx`. Line 2 currently ends with `CircleDollarSign`. Add `Database` to the destructure:

```js
import { ChevronDown, ChevronRight, HelpCircle, MessageSquarePlus, ShieldCheck, HardDrive, MoreHorizontal, BookOpen, Globe, X, CircleDollarSign, Database } from 'lucide-react';
```

- [ ] **Step 5: Add the sidebar nav link**

In `Sidebar.jsx`, find the special pages section. After the `acrobat-alternative` link (around line 127), add the new link immediately after it (before the `storage-calculator` link):

```jsx
<a
  href="#lakehead-dataverse"
  className={`sidebar-htw-link ${currentPage === 'lakehead-dataverse' ? 'sidebar-htw-link--active' : ''}`}
  onClick={onClose}
>
  <Database size={16} />
  Lakehead Dataverse
</a>
```

- [ ] **Step 6: Create a minimal placeholder component**

Create `src/components/pages/LakeheadDataverse.jsx` with a simple placeholder so the import doesn't break the build:

```jsx
export default function LakeheadDataverse() {
  return <div className="lud"><h1>Lakehead Dataverse — coming soon</h1></div>;
}
```

- [ ] **Step 7: Verify routing works**

In the browser navigate to `http://localhost:5173/#lakehead-dataverse`. Confirm:
- "Lakehead Dataverse — coming soon" renders
- "Lakehead Dataverse" link appears in the sidebar, second in the special pages group (below Adobe Acrobat Alternative)
- Link is highlighted as active when on the page

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/layout/Sidebar.jsx src/components/pages/LakeheadDataverse.jsx
git commit -m "feat: register #lakehead-dataverse route and sidebar link"
```

---

## Task 4: Add CSS Styles for the New Page

**Files:**
- Modify: `src/styles/global.css` (append at end of file)

All `.lud-*` styles go at the very end of the file. This is a self-contained block.

- [ ] **Step 1: Append the full `.lud-*` CSS block to global.css**

Open `src/styles/global.css` and append the following at the very end of the file:

```css
/* ═══════════════════════════════════════════════════════════════
   Lakehead Dataverse page  (.lud-*)
   ═══════════════════════════════════════════════════════════════ */

/* Wrapper */
.lud { max-width: 860px; }

/* ── Hero ── */
.lud-hero {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  background: linear-gradient(135deg, rgba(255,194,14,0.06) 0%, rgba(0,66,122,0.12) 100%);
  border: 1px solid rgba(255,194,14,0.15);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2xl);
}
.lud-hero-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-md);
  background: rgba(255,194,14,0.12);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}
.lud-hero h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  line-height: 1.25;
}
.lud-hero-sub {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto var(--space-lg);
}
.lud-hero-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
}
.lud-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--accent-primary);
  color: #0A1628;
  font-weight: 700;
  font-size: 14px;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: opacity 0.15s;
}
.lud-hero-btn:hover { opacity: 0.88; }
.lud-hero-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
  border-radius: var(--radius-md);
  transition: color 0.15s;
}
.lud-hero-link:hover { color: var(--text-primary); }

/* Trust strip */
.lud-trust-strip {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-wrap: wrap;
}
.lud-trust-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-secondary);
}

/* ── Section shell ── */
.lud-section {
  margin-bottom: var(--space-2xl);
}
.lud-section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}
.lud-section-intro {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-lg);
}

/* ── Benefits grid ── */
.lud-benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-md);
}
.lud-benefit-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.lud-benefit-icon {
  width: 36px;
  height: 36px;
  background: rgba(255,194,14,0.1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}
.lud-benefit-card strong {
  font-size: 14px;
  color: var(--text-primary);
}
.lud-benefit-card p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* ── Repository picker table ── */
.lud-picker-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  margin-bottom: var(--space-md);
}
.lud-picker-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.lud-picker-table th {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.lud-picker-table th.lud-table-highlight {
  background: var(--accent-primary);
  color: #0A1628;
}
.lud-picker-table td {
  padding: var(--space-sm) var(--space-md);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.5;
}
.lud-picker-table tr:last-child td { border-bottom: none; }
.lud-picker-table td:first-child {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  background: var(--bg-secondary);
}
.lud-picker-table tr:hover td { background: rgba(255,255,255,0.02); }
.lud-picker-callout {
  font-size: 13px;
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  background: rgba(255,194,14,0.05);
  border: 1px solid rgba(255,194,14,0.15);
  border-radius: var(--radius-md);
  line-height: 1.6;
}
.lud-picker-callout a { color: var(--accent-primary); text-decoration: underline; }

/* ── Deposit steps ── */
.lud-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.lud-step {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
}
.lud-step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: #0A1628;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.lud-step-body {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}
.lud-step-body strong {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.lud-step-body p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 6px;
  line-height: 1.6;
}
.lud-step-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--accent-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.lud-step-note {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: rgba(16,185,129,0.06);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── FAQ ── */
.lud-faq { display: flex; flex-direction: column; gap: 2px; }
.lud-faq-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.lud-faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
  line-height: 1.5;
  font-family: var(--font-sans);
}
.lud-faq-question:hover { background: var(--bg-tertiary); }
.lud-faq-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform 0.2s; }
.lud-faq-chevron--open { transform: rotate(90deg); }
.lud-faq-answer {
  padding: 0 var(--space-md) var(--space-md);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  border-top: 1px solid var(--border);
  padding-top: var(--space-sm);
}
.lud-faq-answer a { color: var(--accent-primary); text-decoration: underline; }

/* ── CTA ── */
.lud-cta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: rgba(255,194,14,0.06);
  border: 1px solid rgba(255,194,14,0.2);
  border-radius: var(--radius-lg);
}
.lud-cta svg { color: var(--accent-primary); flex-shrink: 0; margin-top: 2px; }
.lud-cta strong { display: block; font-size: 15px; color: var(--text-primary); margin-bottom: var(--space-xs); }
.lud-cta p { font-size: 14px; color: var(--text-secondary); margin: 0 0 var(--space-sm); line-height: 1.6; }
.lud-cta a { color: var(--accent-primary); text-decoration: underline; text-underline-offset: 3px; }
```

- [ ] **Step 2: Verify styles compile without errors**

The dev server should hot-reload. Check browser console for CSS errors. The placeholder page at `#lakehead-dataverse` won't show much yet — that's fine.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add .lud-* CSS styles for Lakehead Dataverse page"
```

---

## Task 5: Build LakeheadDataverse.jsx — Full Component (All 6 Sections)

**Files:**
- Modify: `src/components/pages/LakeheadDataverse.jsx` (replace placeholder)

Replace the placeholder with the real component, starting with the Hero and Benefits grid. We'll add the remaining sections in later tasks.

- [ ] **Step 1: Replace LakeheadDataverse.jsx with the Hero + Benefits implementation**

Overwrite `src/components/pages/LakeheadDataverse.jsx` with:

```jsx
import { useState } from 'react';
import {
  Link, Shield, Lock, CheckCircle, GitBranch, Users,
  ChevronRight, Star, Database, ExternalLink
} from 'lucide-react';

/* ── Benefits data ───────────────────────────────────────────── */
const BENEFITS = [
  {
    icon: Link,
    title: 'Permanent DOI',
    desc: 'Every dataset gets a citable DOI the moment you save — even before publishing. Share it in papers, grant applications, and CVs.',
  },
  {
    icon: Shield,
    title: 'Secure Canadian Servers',
    desc: 'All files are stored on Canadian infrastructure. Your data never leaves the country, satisfying sovereignty requirements for sensitive research.',
  },
  {
    icon: Lock,
    title: 'You Control Access',
    desc: 'Publish openly or restrict access to specific people, groups, or an embargo period. The repository, not your inbox, manages access requests.',
  },
  {
    icon: CheckCircle,
    title: 'Tri-Agency & Journal Compliant',
    desc: 'Meets the data deposit requirements of CIHR, NSERC, and SSHRC, plus policies from most major journals.',
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
  { label: 'File size',          lu: 'Up to 2.5 GB per file',                               frdr: 'Unlimited (Globus required for large files)',             zenodo: 'Up to 50 GB per dataset' },
  { label: 'Curation support',   lu: 'Self-service (library can help on request)',           frdr: 'Staff-curated before publication',                        zenodo: 'Self-service' },
  { label: 'Access controls',    lu: 'Open, restricted, embargoed',                          frdr: 'Open or restricted',                                      zenodo: 'Open or restricted' },
  { label: 'Who can deposit',    lu: 'All LU researchers — no extra registration',           frdr: 'DRAC/Alliance account required',                          zenodo: 'Anyone with a free account' },
  { label: 'Tri-Agency compliant', lu: 'Yes',                                               frdr: 'Yes',                                                     zenodo: 'Generally accepted' },
  { label: 'Canadian servers',   lu: 'Yes',                                                  frdr: 'Yes',                                                     zenodo: 'No (CERN, Switzerland)' },
];

/* ── Deposit steps data ──────────────────────────────────────── */
const STEPS = [
  {
    title: 'Create or log into your Borealis account',
    body: 'Go to borealisdata.ca and sign in with institutional credentials via the Alliance/DRAC login. First time? Create a free account — faculty register directly; students and staff need a faculty sponsor.',
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
    a: 'Yes. Use restricted access to control who can download the files. The metadata (title, description, keywords) becomes public, but the actual files stay protected behind your access controls.',
  },
  {
    q: 'How do I get a DOI?',
    a: 'Automatically — a DOI is reserved the moment you save your dataset and activates when you publish. You don\'t need to apply for one separately.',
  },
  {
    q: 'Does depositing here satisfy my funder or journal\'s data sharing requirement?',
    a: 'In most cases, yes. The Lakehead Dataverse meets Tri-Agency RDM policy requirements and is accepted by most major journal data sharing policies. If your funder specifies a disciplinary repository, check their guidelines — but for general deposit, this works.',
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
          Deposit your data, get a citable DOI, satisfy Tri-Agency and journal requirements —
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
          <a href="mailto:payeni1@lakeheadu.ca" className="lud-hero-link">
            Get help from the library
          </a>
        </div>
        <div className="lud-trust-strip">
          {['Free for all LU researchers', 'Canadian servers', 'Tri-Agency compliant', 'Open or restricted access'].map(label => (
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
        <div className="lud-picker-wrap">
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
          <a href="mailto:payeni1@lakeheadu.ca">Contact Dr. Ayeni →</a>
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
                  i === 6
                    ? <p className="lud-faq-answer">
                        Contact Dr. Philips Ayeni, Lakehead's Scholarly Communications &amp; Data
                        Services Librarian, at{' '}
                        <a href="mailto:payeni1@lakeheadu.ca">payeni1@lakeheadu.ca</a>. He can review
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
            <a href="mailto:payeni1@lakeheadu.ca">payeni1@lakeheadu.ca</a>
            {' · '}
            <a
              href="https://libguides.lakeheadu.ca/c.php?g=613282&p=4276405"
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
```

- [ ] **Step 2: Verify the page renders fully in browser**

Navigate to `http://localhost:5173/#lakehead-dataverse`. Confirm:
- Hero renders with headline, subheading, two CTAs, and four trust badges
- Benefits grid shows 6 cards in 2-3 columns
- Repository picker table renders with gold header on LU Dataverse column
- All 8 deposit steps render with numbered badges
- Green note callout appears after the steps
- FAQ accordion works (click to expand/collapse)
- Contact CTA renders at the bottom
- No console errors

- [ ] **Step 3: Check responsive layout at mobile width**

Resize browser to ~375px wide. Confirm:
- Hero CTAs stack vertically (flex-wrap works)
- Benefits grid collapses to 1 column
- Repository picker table scrolls horizontally (overflow-x: auto)
- Steps remain readable

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/LakeheadDataverse.jsx
git commit -m "feat: implement Lakehead Dataverse page — all 6 sections"
```

---

## Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Two updates: add the new page to the Pages table, and add an entry in Recent Changes.

- [ ] **Step 1: Add the page to the Pages table in CLAUDE.md**

Find the Pages section table. Add a new row after the `#acrobat-alternative` row:

```markdown
| `#lakehead-dataverse` | `LakeheadDataverse.jsx` | Dedicated guide for depositing data to the Lakehead University Dataverse on Borealis — persuasive intro, 6-card benefits grid, repo picker (LU Dataverse vs FRDR vs Zenodo), 8-step deposit guide, FAQ, contact CTA for Dr. Ayeni |
```

- [ ] **Step 2: Add a Recent Changes entry**

Add to the top of the Recent Changes table:

```markdown
| 2026-04-16 | Added Lakehead Dataverse page (`#lakehead-dataverse`) — persuasive + practical guide for LU researchers to deposit data to the institutional Borealis collection; 6 benefit cards, repository picker table (LU Dataverse vs FRDR vs Zenodo), 8-step deposit walkthrough, FAQ accordion, contact CTA for Dr. Philips Ayeni; sidebar link (Database icon, second in special pages group); CSS prefix `.lud-*` |
| 2026-04-16 | Option A integrations: updated Borealis links in TriAgencyPolicy (repo card URL → LU-specific, added "Recommended for Lakehead" gold badge) and DRACServices (url, tagline, description updated to highlight LU institutional collection) |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Lakehead Dataverse page and Option A integrations"
```

---

## Verification Checklist

Before marking the feature complete, confirm all of the following:

- [ ] `#lakehead-dataverse` renders the full page (hero → benefits → repo picker → steps → FAQ → CTA)
- [ ] Sidebar shows "Lakehead Dataverse" as the second item in the special pages group (below Adobe Acrobat Alternative)
- [ ] Sidebar link highlights when on the page
- [ ] Hero primary button links to `https://borealisdata.ca/dataverse/lakehead`
- [ ] Repository picker table: LU Dataverse column `<th>` has gold background
- [ ] All 8 deposit steps render with numbered gold circles
- [ ] Step 1, 2, and 4 show external link icons and correct URLs
- [ ] FAQ accordion expands/collapses correctly for all 7 questions
- [ ] FAQ Q7 answer renders the mailto link correctly
- [ ] Contact CTA shows both email and library guide link
- [ ] TriAgencyPolicy Borealis card: links to `borealisdata.ca/dataverse/lakehead`, shows gold "Recommended for Lakehead" badge
- [ ] TriAgencyPolicy FAQ Q2 "What counts as a repository?" still links to generic `borealisdata.ca`
- [ ] DRACServices Borealis entry: updated tagline and description, links to LU-specific URL
- [ ] No browser console errors on any of the three pages
- [ ] Mobile layout (375px): no overflow, table scrolls horizontally, hero CTAs stack
