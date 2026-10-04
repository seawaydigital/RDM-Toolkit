# Content review register

The research pages make claims that go out of date: policy dates, program lists, repository rules, file limits, contact details. This file lists those claims, page by page, with the source each one was checked against. It turns the next review into a checklist instead of a re-research.

The date a reader sees ("Content last checked …") comes from [`src/data/contentReview.js`](../src/data/contentReview.js). Only change a page's date after reviewing **every** row for that page.

## How to review a page

1. Open each source below and confirm the claim still holds. Note anything that changed.
2. Fix the page (and `CLAUDE.md` if the claim is described there).
3. Re-check every external link on the page returns 200 (`curl -s -o /dev/null -w '%{http_code}' -L <url>`).
4. Update the page's date in `src/data/contentReview.js` and the "Last checked" column here.
5. Add a row to CLAUDE.md's Recent Changes saying what changed and why.

Suggested cadence: every page each September (before fall grant season) and whenever the Tri-Agency or Lakehead publishes a policy change.

---

## Tri-Agency RDM Policy (`#tri-agency-policy`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| Institutional strategies (Pillar 1) were due 1 March 2023 | [Tri-Agency RDM Policy](https://science.gc.ca/site/science/en/interagency-research-funding/policies-and-guidelines/research-data-management/tri-agency-research-data-management-policy) |
| DMP-required programs (SSHRC Partnership Grants Stage 2 + Policy Innovation Partnership Grants; NSERC Subatomic Physics Discovery + Alliance Society; CIHR checked per call on ResearchNet) | Agency RDM pages / funding opportunity listings |
| Deposit (Pillar 3) is still phasing in; no compliance date set; implementation approach expected late 2026 | Tri-Agency RDM pages; 2025 *What We Heard* report |
| Student obligations are recommendations, not requirements | Policy text |
| CARE released 2019 (Global Indigenous Data Alliance) | [GIDA CARE principles](https://www.gida-global.org/careprinciples) |
| DMP crosswalk headings match DMP Assistant's default template (Data Collection … Ethics and Legal Compliance) | [DMP Assistant](https://dmp-pgd.ca/) — sign in and open the default template |

## Lakehead Dataverse (`#lakehead-dataverse`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| Borealis does not accept identifiable data, even with restricted access | [Borealis policies](https://borealisdata.ca/) |
| Borealis file limit 5 GB | Borealis user guide |
| Borealis login: institutional SSO or a standard account | Borealis login page |
| FRDR is open-access only (embargo allowed) | [FRDR](https://www.frdr-dfdr.ca/) policies |
| Dr. Philips Ayeni is the deposit contact (`INSTITUTION.dataLibrarian`) | Lakehead Library staff directory |

## Storage Calculator (`#storage-calculator`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| Classification badge uses Lakehead's three tiers and is indicative only | [Research Data Guidelines and Classification Standard (March 2024)](https://www.lakeheadu.ca/sites/default/files/profile-data/swright/Lakehead%20University%20-%20Research%20Data%20Classification%20Guidelines%20and%20Standard%20-%20Final%20(27.03.2024).pdf) |
| LUFA 7-year minimum retention | LUFA collective agreement |

## Data Classification (`#data-classification`) — last checked 2026-10-02

Content is the standard itself, kept verbatim at the owner's request. Check only that the standard has not been replaced: title, date and URL live in `INSTITUTION.dataClassificationStandard`.

## Grants & Identifiers (`#grants-identifiers`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| ORCID is optional for the agencies and not required by DMP Assistant | Agency and DMP Assistant help pages |
| CCV is being replaced by the narrative tri-agency CV; SSHRC began December 2024, CIHR and NSERC phasing in | [Tri-agency CV](https://science.gc.ca/) announcements |
| AODA requires WCAG 2.0 AA | [AODA Integrated Accessibility Standards, s. 14](https://www.ontario.ca/laws/regulation/110191) |
| DataCite Canada is run by CRKN and the Alliance | [DataCite Canada](https://www.crkn-rcdr.ca/) |

## DRAC Services (`#drac-services`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| Cluster names and specs (Fir, Trillium, Nibi, Rorqual, Narval, Killarney) | [Alliance documentation](https://docs.alliancecan.ca/) |
| Research software strategy 2025–2030 | Alliance announcements |
| DMP Assistant, Borealis and FRDR do not use the CCDB login | Each service's login page |

## Acrobat Alternative (`#acrobat-alternative`) — last checked 2026-10-02

| Claim | Source |
|---|---|
| Acrobat Pro price (~$312/yr) | Adobe Canada pricing page |
| Free Reader cannot request signatures; can sign with a certificate | Adobe Reader help |
| Google Docs OCR limit 2 MB | Google Docs help |
| Excel PDF import: Data → Get Data → From File → From PDF (Windows only) | Microsoft support |
| Each vetted free tool (LibreOffice Draw, NAPS2, OCRmyPDF, Stirling-PDF, PAC, veraPDF, OpenSign) still runs locally, has no watermark/trial | Each project's site — see the comment above `HONEST_CASES` |

## How This Works (`#how-this-works`) — last checked 2026-09-30

| Claim | Source |
|---|---|
| FIPPA (not PIPEDA) covers Ontario universities; PHIPA for health information | [FIPPA](https://www.ontario.ca/laws/statute/90f31), [PHIPA](https://www.ontario.ca/laws/statute/04p03) |
| Lakehead has not published a list of AI tools approved for research data (added 2026-10-03) | Searched lakeheadu.ca: only academic-integrity guidance ([ChatGPT & Other AI Tools](https://www.lakeheadu.ca/students/student-life/student-conduct/academic-integrity/chatgpt-ai-tools)). **If Lakehead publishes one, link it from the AI card and FAQ.** |
| What the site stores locally (recent tools, sidebar view, tour state, opt-in usage log) | `scripts/security-audit.mjs` localStorage allowlist |

## Thesis & Dissertation (`#thesis`) — last checked 2026-10-03

| Claim | Source |
|---|---|
| Final PDF must be PDF/A, unlocked, unsigned (same wording for master's and doctoral) | [Thesis process](https://www.lakeheadu.ca/programs/graduate/academic-information/degree-completion/thesis), [Dissertation process](https://www.lakeheadu.ca/programs/graduate/academic-information/degree-completion/dissertation) |
| Licence: non-exclusive, author keeps copyright, signed and witnessed, third-party material is fair dealing or has written permission | [Licence to the University (PDF)](https://www.lakeheadu.ca/sites/default/files/uploads/56/Thesis-Licence-Library-LU-March%2019-15-rev-%281%29.pdf) |
| Embargo form goes to FGS, FGS sets the end date, embargo lifts automatically; late embargoes cannot recall harvested copies | [Embargo Procedure, 10 Nov 2023 (PDF)](https://www.lakeheadu.ca/sites/default/files/profile-data/tmlaught/Embargo%20Procedure.pdf) |
| Library deposits all theses in Knowledge Commons; embargoed ones show abstract and metadata only | Embargo Procedure; [Knowledge Commons](https://knowledgecommons.lakeheadu.ca/) |
| Word for Windows: File → Save As → PDF → Options → "PDF/A compliant"; LibreOffice: Export as PDF → General → "Archive (PDF/A, ISO 19005)" | Microsoft and LibreOffice help |
| OCRmyPDF `--output-type pdfa --skip-text` converts an existing PDF | [OCRmyPDF docs](https://ocrmypdf.readthedocs.io/) |

## Common Tasks (`#tasks`) — last checked 2026-10-03

| Claim | Source |
|---|---|
| Each step does what its text says | The tool's source in `src/tools/` — re-read it if a tool changes. `tests/workflows.test.mjs` only checks that ids exist. |
| Create ZIP does not encrypt | `src/tools/archives/CreateZIP.jsx` |
| Borealis does not accept identifiable data | Same source as Lakehead Dataverse above |

## Glossary (`#glossary`) — last checked 2026-10-03

| Claim | Source |
|---|---|
| Coded / anonymized definitions | TCPS 2 (2022), Chapter 5 |
| OCAP® is a registered trademark of FNIGC | [FNIGC](https://fnigc.ca/ocap-training/) |
| Tri-Agency deposit requirement is phasing in | Same source as Tri-Agency above |
| Lakehead's three classification tiers | Lakehead classification standard (above) |
