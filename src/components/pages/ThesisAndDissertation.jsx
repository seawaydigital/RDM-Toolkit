import { ExternalLink, AlertTriangle, ArrowRight, Users, FileCheck } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';
import { getWorkflow, stepHash } from '../../data/workflows';

// Facts on this page come from FGS's Thesis Process and Dissertation Process
// pages and the Embargo Procedure (10 November 2023), checked 2026-10-03.
// Re-check them with docs/CONTENT-REVIEW.md before changing anything here.
const FGS = INSTITUTION.graduateStudies;

const PDFA_ROUTES = [
  {
    title: 'Microsoft Word (Windows)',
    body: 'File → Save As → choose PDF → Options → tick “PDF/A compliant”. Do this from the final Word document, not from a PDF.',
  },
  {
    title: 'LibreOffice Writer',
    body: 'File → Export as PDF → General → tick “Archive (PDF/A, ISO 19005)”. Free, and works the same on Windows, macOS and Linux.',
  },
  {
    title: 'An existing PDF',
    body: 'If you only have a PDF (for example, chapters you combined), the free command-line tool OCRmyPDF can convert it: ocrmypdf --output-type pdfa --skip-text in.pdf out.pdf. It runs on your own computer.',
    href: 'https://ocrmypdf.readthedocs.io/',
    linkLabel: 'OCRmyPDF documentation',
  },
  {
    title: 'Check the result',
    body: 'veraPDF is a free, open-source validator for PDF/A files. It tells you whether the file meets the standard and what to fix if it does not.',
    href: 'https://verapdf.org/',
    linkLabel: 'veraPDF',
  },
];

export default function ThesisAndDissertation({ onNavigate }) {
  const thesisTask = getWorkflow('thesis-pdf');
  const depositTask = getWorkflow('deposit-dataset');

  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Graduate students</div>
        <h1 className="htw-title">Thesis &amp; Dissertation</h1>
        <p className="htw-subtitle">
          What the {FGS.name} needs from your final PDF, which tools on this site help, and
          what to do with the research data behind your thesis.
        </p>
      </div>

      {/* FGS file requirements */}
      <section className="htw-section" aria-labelledby="thesis-requirements">
        <h2 className="htw-section-title" id="thesis-requirements">What FGS needs from your final PDF</h2>
        <div className="htw-promise">
          <FileCheck size={32} />
          <div>
            <p>
              Both the master’s thesis and doctoral dissertation process pages say the same
              thing: the PDF “should not be locked, password protected or include any
              signatures (written or digital) and should be PDF/A compliant.” In practice:
            </p>
            <ul className="thesis-list">
              <li><strong>PDF/A.</strong> An archival version of PDF with every font embedded, so the file looks the same in decades.</li>
              <li><strong>No password or restrictions.</strong> Don’t run your final copy through Password Protect PDF.</li>
              <li><strong>No signatures.</strong> Leave out signed approval pages, and don’t add a signature with Sign PDF.</li>
            </ul>
            <p className="thesis-links">
              <a href={FGS.thesisProcessUrl} target="_blank" rel="noopener noreferrer">
                Thesis process (master’s) <ExternalLink size={11} />
              </a>
              <a href={FGS.dissertationProcessUrl} target="_blank" rel="noopener noreferrer">
                Dissertation process (doctoral) <ExternalLink size={11} />
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Making PDF/A */}
      <section className="htw-section" aria-labelledby="thesis-pdfa">
        <h2 className="htw-section-title" id="thesis-pdfa">Making the PDF/A file</h2>
        <p className="thesis-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <strong>The tools on this site don’t produce PDF/A.</strong> They can help you check
            page sizes and combine chapters, but the last step has to happen in one of the
            programs below.
          </span>
        </p>
        <p className="htw-section-intro">
          The simplest route is to keep the whole thesis in one document and export it to
          PDF/A once, at the end.
        </p>
        <div className="gai-ethics-grid">
          {PDFA_ROUTES.map(route => (
            <div key={route.title} className="gai-ethics-card">
              <strong>{route.title}</strong>
              <p>{route.body}</p>
              {route.href && (
                <a href={route.href} target="_blank" rel="noopener noreferrer">
                  {route.linkLabel} <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tools that help */}
      <section className="htw-section" aria-labelledby="thesis-tools">
        <h2 className="htw-section-title" id="thesis-tools">Where this site helps</h2>
        <ol className="gai-steps">
          <li>
            <span className="gai-step-num">1</span>
            <div>
              <strong><a href="#pdf-page-inspector">PDF Page Inspector</a></strong>
              <p>Check that every page is the same size. Chapters exported from different programs often mix Letter and A4.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">2</span>
            <div>
              <strong><a href="#merge-pdfs">Merge &amp; Rotate PDFs</a></strong>
              <p>Only if your chapters are separate PDFs: combine them in order and fix sideways pages. Then convert the result to PDF/A as described above.</p>
            </div>
          </li>
          <li>
            <span className="gai-step-num">3</span>
            <div>
              <strong><a href="#strip-file-metadata">Strip File Metadata</a> (drafts only)</strong>
              <p>Before you send a draft to a committee member, you can clear tracked author names and edit history. Don’t run it on the PDF/A file itself: PDF/A requires the embedded metadata this tool removes.</p>
            </div>
          </li>
        </ol>
        {thesisTask && (
          <button
            type="button"
            className="tasks-card-start thesis-task-start"
            onClick={() => onNavigate(stepHash(thesisTask, 1))}
          >
            Walk me through it step by step
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </section>

      {/* Forms and embargo */}
      <section className="htw-section" aria-labelledby="thesis-forms">
        <h2 className="htw-section-title" id="thesis-forms">Forms and embargoes</h2>
        <div className="gai-ethics-grid">
          <div className="gai-ethics-card">
            <strong>Licence to the University</strong>
            <p>
              Required, signed and witnessed. You keep your copyright and give the University a
              non-exclusive licence to archive and share the thesis. You also confirm that any
              figures or other material from other sources are fair dealing under the Copyright
              Act, or that you have written permission to use them.
            </p>
            <a href={FGS.licenceFormUrl} target="_blank" rel="noopener noreferrer">
              Licence form (PDF) <ExternalLink size={11} />
            </a>
          </div>
          <div className="gai-ethics-card">
            <strong>Embargo (optional)</strong>
            <p>
              Delays public access, for example while a paper or patent is pending. Submit the
              form to FGS with your thesis. FGS sets the end date from your final submission
              date, and the embargo lifts automatically.
            </p>
            <a href={FGS.embargoFormUrl} target="_blank" rel="noopener noreferrer">
              Embargo form (PDF) <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <p className="thesis-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <strong>Decide on an embargo before you submit.</strong> A late embargo is possible,
            but the{' '}
            <a href={FGS.embargoProcedureUrl} target="_blank" rel="noopener noreferrer">
              embargo procedure
            </a>{' '}
            notes that copies already picked up by services such as Google Scholar can’t be
            pulled back. Only an embargo in place from the start prevents that.
          </span>
        </p>
      </section>

      {/* Where it ends up */}
      <section className="htw-section" aria-labelledby="thesis-repository">
        <h2 className="htw-section-title" id="thesis-repository">Where your thesis ends up</h2>
        <p className="htw-section-intro">
          FGS sends your PDF to the Library, which deposits it in{' '}
          <a href={INSTITUTION.knowledgeCommonsUrl} target="_blank" rel="noopener noreferrer">
            Knowledge Commons
          </a>
          , {INSTITUTION.shortName}’s open-access repository. If it is embargoed, only the
          abstract and details appear until the end date. You submit through FGS, not through
          the Knowledge Commons deposit form.
        </p>
      </section>

      {/* Data */}
      <section className="htw-section" aria-labelledby="thesis-data">
        <h2 className="htw-section-title" id="thesis-data">The data behind your thesis</h2>
        <ul className="thesis-list thesis-list--spaced">
          <li>
            <strong>Your consent forms decide what you can share.</strong> If participants were
            told their data would be kept confidential or destroyed, that promise outlasts your
            degree. Check your REB approval before depositing or sharing anything.
          </li>
          <li>
            <strong>Your supervisor’s plan may already cover it.</strong> Data collected under a
            funded project usually falls under that project’s data management plan. Ask your
            supervisor where the data should live after you graduate.
          </li>
          <li>
            <strong>Deposit what you can share.</strong> De-identified data can go in{' '}
            <a href="#lakehead-dataverse">Lakehead’s collection on Borealis</a>, which gives it a
            DOI you can cite in the thesis.{' '}
            <a href={`#${stepHash(depositTask, 1)}`}>Prepare a dataset for deposit</a>{' '}
            walks through it.
          </li>
          <li>
            <strong>Don’t keep identifiable data on a personal device or account</strong> when
            you leave. Find out where your data’s classification allows it to be stored with the{' '}
            <a href="#data-classification">Data Classification tool</a>.
          </li>
        </ul>
      </section>

      {/* Contact */}
      <section className="htw-section">
        <div className="htw-promise">
          <Users size={28} />
          <div>
            <h2>Questions?</h2>
            <p>
              For submission requirements, forms and deadlines, contact the{' '}
              <a href={FGS.homeUrl} target="_blank" rel="noopener noreferrer">{FGS.name}</a>.
              For the data behind your thesis, email{' '}
              <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>, or{' '}
              <a href={MAILTO.dataLibrarian}>{INSTITUTION.dataLibrarian.name}</a> for deposits.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

