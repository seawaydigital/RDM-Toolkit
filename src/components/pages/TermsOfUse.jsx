import { AlertCircle, FileText } from 'lucide-react';
import { INSTITUTION, MAILTO, PROJECT } from '../../data/institutionConfig';
import { LEGAL_UPDATED, LICENCE_NAMES, OPEN_SOURCE } from '../../data/legal';
import { formatReviewDate } from '../../data/contentReview';

// The decisions behind this page's wording (who is named, the warranty and
// liability sections, what is still optional) are recorded in
// docs/LEGAL-PAGES.md. The wording is the maintainer's; no lawyer has
// reviewed it.

const CHECKS = [
  {
    title: 'Redaction',
    body: 'Open the result and look at every redacted page. Make sure nothing you meant to hide is still readable and no page is missing. If the PDF came from someone you do not trust, check the result in a second PDF reader as well.',
  },
  {
    title: 'De-identification',
    body: 'Read through the output for names, ID numbers, email addresses and free-text answers that still point to a person. Removing direct identifiers does not make data anonymous: a combination of other fields can still identify someone. Keep any key file apart from the data.',
  },
  {
    title: 'Password protection',
    body: 'Before you send a protected file, open it and confirm it asks for the password. Send the password by a different route from the file.',
  },
  {
    title: 'Metadata removal',
    body: 'The metadata tools remove the hidden information they list. They do not change what is visible on the page, such as names in a header or a signature.',
  },
  {
    title: 'Everything else',
    body: 'Most tools have a “How this tool works” panel that says what the tool does not do. Read it before you rely on the result.',
  },
];

// 'MIT licence' → ['React', 'pdf-lib', …], in the order OPEN_SOURCE lists them.
const CREDITS_BY_LICENCE = Object.entries(LICENCE_NAMES)
  .map(([spdx, label]) => ({
    label,
    names: OPEN_SOURCE.filter(entry => entry.licence === spdx).map(entry => entry.name),
  }))
  .filter(group => group.names.length > 0);

export default function TermsOfUse() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Terms</div>
        <h1>Terms of use</h1>
        <p className="htw-hero-subtitle">
          RDM Toolkit is free to use and needs no account. By using it you agree
          to these terms. Most of them come down to one thing: check the result
          before you rely on it.
        </p>
      </div>

      <section className="legal-section">
        <h2 className="htw-section-title">What the site is</h2>
        <p className="legal-lede">
          RDM Toolkit is a set of research data management tools that run in your
          web browser, with guides to the policies around them. It is developed
          and maintained by {PROJECT.maintainer.name},{' '}
          {PROJECT.maintainer.title} in the {INSTITUTION.researchOffice} at{' '}
          {INSTITUTION.name}. It was built for Lakehead researchers, students
          and staff, and anyone may use it.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Check every result yourself</h2>
        <p className="legal-lede">
          The tools work on your files inside your browser, and they can fail in
          ways that are hard to see. You are responsible for checking a result
          before you share it or rely on it. In particular:
        </p>
        <ul className="acc-limitations legal-checks">
          {CHECKS.map(({ title, body }) => (
            <li key={title}>
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="legal-lede legal-lede--spaced">
          The tools never change your original file. They make a new one. Keep
          your originals until you have checked the result.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Guidance, not advice</h2>
        <p className="legal-lede">
          The guides summarise documents such as the Tri-Agency Research Data
          Management Policy, TCPS 2 and Lakehead’s{' '}
          <a
            href={INSTITUTION.dataClassificationStandard.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <em>{INSTITUTION.dataClassificationStandard.title}</em>
          </a>
          . They are not legal advice. They do not replace those documents, your
          ethics approval, your funder’s terms or any data agreement you have
          signed. Where a guide and the original differ, the original applies.
        </p>
        <p className="legal-lede">
          Using a tool does not change what you are allowed to do with your data.
          The controls for its classification still apply. If you are unsure,
          ask the {INSTITUTION.researchOffice} at{' '}
          <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a> first.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">No warranty</h2>
        <p className="legal-lede">
          The site, its tools and its guides are provided “as is”, without
          warranty of any kind, express or implied. These are the same terms the
          source code is published under. We work to keep everything accurate
          and we fix problems when we learn of them, but we do not promise that
          the site will always be available, free of errors, or suitable for
          your purpose.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Limitation of liability</h2>
        {/* Open, optional (docs/LEGAL-PAGES.md D3): a clause naming whose law
            applies. Left out until the maintainer decides. */}
        <p className="legal-lede">
          To the extent the law allows, the site’s developer, {INSTITUTION.name}{' '}
          and anyone else who contributes to RDM Toolkit are not liable for any
          loss or damage that comes from using the site, its tools or its
          guides, or from relying on their results. This includes loss of data
          and the disclosure of information you meant to remove or protect.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Using the site fairly</h2>
        <p className="legal-lede">
          Do not use the site to break the law or to invade anyone’s privacy, and
          do not try to disrupt it. If you find a security problem, please report
          it privately, as the{' '}
          <a href={`${PROJECT.repoUrl}/security/policy`} target="_blank" rel="noopener noreferrer">
            security policy
          </a>{' '}
          describes, rather than in public.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Source code, content and trademarks</h2>
        {/* Open, optional (docs/LEGAL-PAGES.md D4): a licence for the guide
            text, separate from the code's MIT licence. */}
        <p className="legal-lede">
          The source code is published under the{' '}
          <a href={`${PROJECT.sourceBaseUrl}LICENSE`} target="_blank" rel="noopener noreferrer">
            MIT licence
          </a>
          . Policies, forms and other documents quoted in the guides belong to
          their authors. To reuse them, follow the original.
        </p>
        <p className="legal-lede">
          OCAP® is a registered trademark of the First Nations Information
          Governance Centre (FNIGC). Other product and company names, such as
          Adobe Acrobat and Microsoft Word, are trademarks of their owners. They
          are named only to describe or compare, and naming them does not mean
          their owners endorse this site.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Open-source software</h2>
        <p className="legal-lede">
          The site is built with open-source software. Each project remains the
          work of its authors and is used under its own licence:
        </p>
        <ul className="legal-credits">
          {CREDITS_BY_LICENCE.map(({ label, names }) => (
            <li key={label}>
              <strong>{label}:</strong> {names.join(', ')}
            </li>
          ))}
        </ul>
        <p className="legal-lede">
          Each package and its version is listed in the site’s{' '}
          <a href={`${PROJECT.sourceBaseUrl}package.json`} target="_blank" rel="noopener noreferrer">
            package.json
          </a>
          .
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Other websites</h2>
        <p className="legal-lede">
          The guides link to many other sites. Their content and terms are their
          own, and a link is not an endorsement. How links treat your privacy is
          covered in the <a href="#privacy">privacy statement</a>.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Changes and questions</h2>
        <p className="legal-lede">
          These terms may change. The date below shows the last change, and using
          the site after a change means you accept the new terms.
        </p>
        <p className="legal-lede">
          For questions about these terms, or to report something on the site
          that is wrong or out of date, email{' '}
          <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>.
        </p>
        <p className="acc-meta">
          <FileText size={14} aria-hidden="true" /> Last updated{' '}
          {formatReviewDate(LEGAL_UPDATED)}.
        </p>
      </section>
    </div>
  );
}
