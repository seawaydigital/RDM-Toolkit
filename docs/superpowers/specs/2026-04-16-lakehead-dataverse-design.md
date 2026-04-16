# Lakehead University Dataverse Page — Design Spec

**Date:** 2026-04-16  
**Status:** Approved  
**Feature:** New page `#lakehead-dataverse` + Option A integrations in existing pages

---

## Overview

Add a dedicated page to the RDM Toolkit that encourages Lakehead University researchers to use the institutional Dataverse collection on Borealis, and educates them on how to deposit data there. The page combines persuasion (why use it) with practical guidance (how to do it), following the same structure as the existing `AcrobatAlternative` page.

Also update two existing pages (TriAgencyPolicy, DRACServices) to link directly to the LU-specific Borealis collection URL and improve the Borealis callout text.

---

## New Page: Lakehead Dataverse

### Route & Registration

| Field | Value |
|---|---|
| Hash | `#lakehead-dataverse` |
| Component | `src/components/pages/LakeheadDataverse.jsx` |
| CSS prefix | `.lud-*` |
| Sidebar icon | `Database` (lucide-react) |
| Sidebar placement | Second in special pages group, immediately below "Adobe Acrobat Alternative" (before Research Storage Calculator) |
| PAGES Set | Add `'lakehead-dataverse'` to the PAGES Set in `App.jsx` |
| App render | Add render case in `App.jsx` page-rendering conditional |
| App import | Add a **static (eager) import** at the top of `App.jsx`: `import LakeheadDataverse from './components/pages/LakeheadDataverse'` — do NOT use `React.lazy()`, consistent with all other page components |
| Sidebar import | Add `Database` to the lucide-react import destructure in `Sidebar.jsx` (it is not currently imported there) |

---

## Page Sections

### 1. Hero

**Headline:** "Your research deserves a permanent home."

**Subheading:** Lakehead University's Dataverse is a free, secure repository for all LU researchers. Deposit your data, get a citable DOI, satisfy Tri-Agency and journal requirements — in under 30 minutes.

**CTAs:**
- Primary button: "Browse the Lakehead Dataverse →" → `https://borealisdata.ca/dataverse/lakehead` (external, `target="_blank" rel="noopener noreferrer"`)
- Secondary quiet link: "Get help from the library" → `mailto:payeni1@lakeheadu.ca`

**Trust strip:** A horizontal flex row of small pill/chip elements below the CTAs, using classes `.lud-trust-strip` (flex container, gap, centered) and `.lud-trust-badge` (pill shape, subtle border, small text). This is a new pattern — use `tap-agency-badge` in `TriAgencyPolicy.jsx` as the closest visual analogue for pill styling. Four badges:
- Free for all LU researchers
- Canadian servers
- Tri-Agency compliant
- Open or restricted access

---

### 2. Key Benefits Grid

Six cards in a responsive 2×3 grid (`.lud-benefits-grid`). Each card: Lucide icon + bold title + 1–2 sentence description.

| Icon | Title | Description |
|---|---|---|
| `Link` | Permanent DOI | Every dataset gets a citable DOI the moment you save — even before publishing. Share it in papers, grant applications, and CVs. |
| `Shield` | Secure Canadian Servers | All files are stored on Canadian infrastructure. Your data never leaves the country, satisfying sovereignty requirements for sensitive research. |
| `Lock` | You Control Access | Publish openly or restrict access to specific people, groups, or an embargo period. The repository, not your inbox, manages access requests. |
| `CheckCircle` | Tri-Agency & Journal Compliant | Meets the data deposit requirements of CIHR, NSERC, and SSHRC, plus policies from most major journals. |
| `GitBranch` | Version Control | Upload new versions of your dataset without breaking existing DOI links. Prior versions are preserved and accessible. |
| `Users` | Free for All LU Researchers | Open to all Lakehead faculty, students, and staff. No storage fees, no subscription — funded through the library. |

---

### 3. Repository Picker ("Which repository is right for me?")

HTML `<table>` with three data columns (LU Dataverse, FRDR, Zenodo) and a row-label column. The `<th>` for the LU Dataverse column gets `background-color: var(--accent-primary)` and `color: #0A1628` to highlight it with Lakehead gold — apply via a `.lud-table-highlight` class on that `<th>`. All other column headers use the default `--bg-secondary` background.

| Row | LU Dataverse (Borealis) | FRDR | Zenodo |
|---|---|---|---|
| Best for | Most Lakehead datasets — any size, any discipline | Very large datasets (TB-scale) needing curation | Code, preprints, datasets with no disciplinary home |
| File size | Up to 2.5 GB per file | Unlimited (Globus required for large files) | Up to 50 GB per dataset |
| Curation support | Self-service (library can help on request) | Staff-curated before publication | Self-service |
| Access controls | Open, restricted, embargoed | Open or restricted | Open or restricted |
| Who can deposit | All LU researchers — no extra registration | DRAC/Alliance account required | Anyone with a free account |
| Tri-Agency compliant | Yes | Yes | Generally accepted |
| Canadian servers | Yes | Yes | No (CERN, Switzerland) |

**Callout below table:** "Not sure? Start with the LU Dataverse. The library can help you migrate to FRDR if your dataset grows." + Dr. Ayeni's email as a `mailto:` link.

---

### 4. Step-by-Step Deposit Guide

Numbered stepper component (`.lud-steps`). Each step: number badge + bold title + plain-language body + inline links where relevant.

**Step 1 — Create or log into your Borealis account**  
Go to borealisdata.ca and sign in with institutional credentials via the Alliance/DRAC login. First time? Create a free account — faculty register directly; students and staff need a faculty sponsor.  
Link: "Log in to Borealis →" → `https://borealisdata.ca` (external)

**Step 2 — Navigate to the Lakehead Dataverse**  
Search for "Lakehead University" or go directly to the LU collection. Depositing here ties your data to Lakehead and makes it discoverable in the institutional catalogue.  
Link: "Go to LU Dataverse →" → `https://borealisdata.ca/dataverse/lakehead` (external)

**Step 3 — Add a new dataset**  
Click Add Data → New Dataset. A dataset is a container for all files related to one study or publication — think of it like a folder with a permanent address.

**Step 4 — Fill in your metadata**  
Complete required fields (marked with a red asterisk): title, author(s), contact, description, subject, and keywords. Good metadata is what makes your dataset findable — spend a few minutes here.  
Link: "Metadata Best Practices Guide →" → `https://learn.scholarsportal.info/all-guides/borealis/` (external)

**Step 5 — Upload your files**  
Drag and drop or browse to upload. All file formats accepted — data files, codebooks, README files, analysis scripts. You can add more files later.

**Step 6 — Set access permissions**  
Choose open (anyone can download) or restricted (you approve requests). You can also set an embargo — data stays private until a date you choose, then opens automatically.

**Step 7 — Save your dataset**  
Click Save Dataset. Your DOI is reserved immediately — add it to your paper's data availability statement right now, even before publishing.

**Step 8 — Publish (or submit for review)**  
When ready, click Publish. Metadata becomes publicly visible and your DOI activates. Note: once published, a dataset cannot be deleted — only deaccessioned — so review carefully first.

**Info callout after steps (`.lud-step-note`):** "Need to update your data after publishing? No problem — Borealis supports versioned updates. Your DOI stays the same; a new version is logged."

---

### 5. FAQ Accordion

Same collapsible pattern as `TriAgencyPolicy.jsx` (button toggles open state, `ChevronRight`/`ChevronDown` icon, answer rendered below). Seven items:

**Q1: Do I have to make my data public?**  
No. You choose. You can restrict access entirely, limit it to specific users, or set an embargo. The Tri-Agency policy requires deposit into a repository — not open sharing.

**Q2: What file formats are accepted?**  
All of them. Data files, spreadsheets, images, PDFs, scripts, codebooks, README files — there's no format restriction. Using open formats (CSV over XLSX, TIFF over PSD) improves long-term accessibility, but it's not required.

**Q3: Can I update my dataset after publishing?**  
Yes. Borealis supports versioned updates — upload new files or edit metadata and republish as a new version. Your DOI stays the same; prior versions remain accessible.

**Q4: My dataset contains sensitive or identifiable data — can I still deposit it?**  
Yes. Use restricted access to control who can download the files. The metadata (title, description, keywords) becomes public, but the actual files stay protected behind your access controls.

**Q5: How do I get a DOI?**  
Automatically — a DOI is reserved the moment you save your dataset and activates when you publish. You don't need to apply for one separately.

**Q6: Does depositing here satisfy my funder or journal's data sharing requirement?**  
In most cases, yes. The Lakehead Dataverse meets Tri-Agency RDM policy requirements and is accepted by most major journal data sharing policies. If your funder specifies a disciplinary repository, check their guidelines — but for general deposit, this works.

**Q7: What if I need help with metadata or don't know where to start?**  
Contact Dr. Philips Ayeni, Lakehead's Scholarly Communications & Data Services Librarian, at `payeni1@lakeheadu.ca` (mailto link). He can review your dataset before you publish, advise on metadata, and help with restricted access setup.

---

### 6. Contact CTA

Card at bottom of page (same style as Tri-Agency Policy CTA — flex row with icon, heading, and body):

**Heading:** "Not sure where to start? The library is here to help."

**Body:** Dr. Philips Ayeni, Scholarly Communications & Data Services Librarian, can review your DMP, advise on metadata, set up restricted access, and guide you through your first deposit.

**Links:**
- `mailto:payeni1@lakeheadu.ca` displayed as `payeni1@lakeheadu.ca`
- `https://libguides.lakeheadu.ca/c.php?g=613282&p=4276405` displayed as "Lakehead Library Data Management Guide →" (external)

---

## Option A Integrations

### TriAgencyPolicy.jsx — Repository Options Section

- Change Borealis card link `href`: `https://borealisdata.ca` → `https://borealisdata.ca/dataverse/lakehead`
- Add a small "Recommended for Lakehead" badge inside the card using class `tap-repo-badge--featured` (gold pill: `background: var(--accent-primary); color: #0A1628; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700`)
- Expand description to: "Canada's national Dataverse-based repository. Lakehead has its own institutional collection — deposit here for free, get a DOI, and satisfy Tri-Agency requirements. Supports restricted access."
- **Do NOT change** the Borealis link in the FAQ "What counts as a repository?" answer (line 164) — that link correctly points to `https://borealisdata.ca` in a generic context listing multiple repository options, not a Lakehead-specific recommendation.

### DRACServices.jsx — Borealis Entry

- Change `url`: `https://borealisdata.ca` → `https://borealisdata.ca/dataverse/lakehead`
- Update `tagline`: `'Lakehead\'s institutional data repository'`
- Update `description`: `"Canada's national Dataverse-based repository. Lakehead University has its own institutional collection on Borealis — the recommended starting point for most LU researchers. Self-service deposit, DOI assignment, restricted access, and version control. Free for all LU researchers."`

---

## Files to Create / Modify

| Action | File | Notes |
|---|---|---|
| Create | `src/components/pages/LakeheadDataverse.jsx` | New page component |
| Modify | `src/App.jsx` | Static import + PAGES Set + render case |
| Modify | `src/components/layout/Sidebar.jsx` | Add `Database` to lucide import + add nav link (2nd in special pages group) |
| Modify | `src/components/pages/TriAgencyPolicy.jsx` | Borealis card URL + badge + description; FAQ link unchanged |
| Modify | `src/components/pages/DRACServices.jsx` | Borealis url + tagline + description |
| Modify | `src/styles/global.css` | Add `.lud-*` styles |
| Modify | `CLAUDE.md` | Update pages table + recent changes |

---

## Design System Notes

- CSS variables: use existing `--bg-*`, `--text-*`, `--accent-primary` (`#FFC20E`), `--accent-green`, `--border` — no new variables needed
- Fonts: `--font-sans` throughout
- Spacing: 8px base grid (`--space-*` variables)
- All external links: `target="_blank" rel="noopener noreferrer"`
- Component pattern: follows `AcrobatAlternative.jsx` as closest structural analogue for overall page layout; `TriAgencyPolicy.jsx` for FAQ accordion and CTA card patterns
- No new dependencies required — all icons from `lucide-react`, no new npm packages

---

## Out of Scope

- No changes to the homepage research resources cards (Borealis already appears in DRAC Services card description)
- No changes to the deposit flowchart SVG in TriAgencyPolicy (already says "Upload to Borealis or FRDR")
- No server-side functionality — page is fully static, client-side only
- Do not update the Borealis link in TriAgencyPolicy FAQ Q2 ("What counts as a repository?") — it correctly uses the generic URL in that context
