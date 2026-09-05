import { Accessibility, CheckCircle, AlertCircle, Mail, FileText } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';

const CONFORMANCE = [
  {
    icon: CheckCircle,
    title: 'Automated testing',
    body: 'Every release is scanned with axe-core against WCAG 2.0 A, 2.0 AA, 2.1 AA and 2.2 AA rule sets across ten representative routes — the home page, the eight research-resource pages, and a cross-section of tools. The current build reports zero violations.',
  },
  {
    icon: CheckCircle,
    title: 'Colour contrast',
    body: 'Every text and background colour pair in the design system has been audited against the WCAG AA 4.5:1 threshold for body text. The audit runs as an automated check, so a future colour change that fails is caught before release.',
  },
  {
    icon: CheckCircle,
    title: 'Assistive technology compatibility',
    body: 'The five most-used tools have been audited against the accessibility tree — the same information a screen reader reads — to confirm that every control has an accessible name, form fields are properly labelled, and results and errors are announced without moving focus. Defects that automated scanning missed were found and fixed this way.',
  },
  {
    icon: CheckCircle,
    title: 'Keyboard access',
    body: 'All functionality is reachable without a mouse. Focus indicators are visible throughout, dialogs trap focus while open and close on Escape, and the sidebar can be dismissed from the keyboard.',
  },
  {
    icon: CheckCircle,
    title: 'Reduced motion',
    body: 'Animation respects the operating system "reduce motion" setting. With it enabled, decorative animation is disabled and smooth scrolling becomes instant.',
  },
];

const LIMITATIONS = [
  {
    title: 'Complex tool interfaces',
    body: 'A few tools use drag-and-drop to reorder PDF pages. Keyboard alternatives exist for every one of these actions, but the drag interaction itself is not exposed to assistive technology in a way we consider finished.',
  },
  {
    title: 'Visual document previews',
    body: 'PDF page thumbnails and the fillable-form editor are inherently visual. Page counts, dimensions and field names are available as text, but a rendered page image cannot be conveyed to a screen reader.',
  },
  {
    title: 'Generated files',
    body: 'This site does not alter the accessibility of the files you process. A PDF that was inaccessible before you merged or compressed it will still be inaccessible afterwards.',
  },
  {
    title: 'Heading levels inside tool explainers',
    body: 'Expanding the "How this tool works" panel on a tool page introduces a heading that skips a level. The content is fully readable and correctly ordered, but the outline a screen reader reports is not as clean as it should be. This is a known defect with a fix planned.',
  },
  {
    title: 'No screen-reader testing yet',
    body: 'Our testing so far is automated: an accessibility scanner plus an audit of the accessibility tree that screen readers read from. Neither is a substitute for a person using NVDA, JAWS or VoiceOver and telling us how it actually sounds. That testing has not happened yet. If you use a screen reader and something does not work, please tell us — we will treat it as a defect, not a preference.',
  },
  {
    title: 'Ongoing work',
    body: 'Automated testing catches roughly a third of WCAG success criteria. Manual review beyond the five tools named above is in progress, and shared interface components are being revised to improve consistency for assistive technology.',
  },
];

export default function AccessibilityStatement() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Accessibility</div>
        <h1>Accessibility statement</h1>
        <p className="htw-hero-subtitle">
          RDM Toolkit is committed to providing an accessible experience for all
          researchers, students and staff at {INSTITUTION.name}, in keeping with
          the Accessibility for Ontarians with Disabilities Act.
        </p>
      </div>

      <section className="acc-section">
        <h2 className="htw-section-title">Conformance status</h2>
        <p className="acc-lede">
          This site aims to conform to the{' '}
          <a
            href="https://www.w3.org/TR/WCAG21/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1
          </a>{' '}
          at Level AA, the standard referenced by the AODA Information and
          Communications Standard. We test against WCAG 2.2 AA as well, and
          consider the site <strong>partially conformant</strong>: most of the
          standard is met, and the exceptions are listed below rather than
          left for you to discover.
        </p>

        <div className="acc-grid">
          {CONFORMANCE.map(({ icon: Icon, title, body }) => (
            <div className="acc-card" key={title}>
              <Icon size={18} className="acc-card-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Known limitations</h2>
        <p className="acc-lede">
          We would rather tell you where the gaps are than let you find them.
        </p>
        <ul className="acc-limitations">
          {LIMITATIONS.map(({ title, body }) => (
            <li key={title}>
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Alternate formats</h2>
        <p className="acc-lede">
          If any content on this site is not accessible to you, we will provide
          it in another format on request, at no cost. Contact the{' '}
          {INSTITUTION.researchOffice} using the details below and tell us what
          format works for you.
        </p>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Feedback</h2>
        <p className="acc-lede">
          If you encounter a barrier, we want to hear about it. Feedback is
          reviewed by the {INSTITUTION.researchOffice}, and we aim to respond
          within five business days.
        </p>
        <p className="acc-lede">
          It helps if you can tell us the page or tool, what you were trying to
          do, and any assistive technology you were using — but please get in
          touch even if you cannot.
        </p>
        <div className="acc-contact">
          <a className="acc-contact-cta" href={MAILTO.rdm}>
            <Mail size={16} aria-hidden="true" />
            {INSTITUTION.rdmEmail}
          </a>
          <a
            className="acc-contact-secondary"
            href="https://www.lakeheadu.ca/faculty-and-staff/departments/services/human-rights-and-equity/accessibility"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText size={16} aria-hidden="true" />
            Lakehead University accessibility services
          </a>
        </div>
      </section>

      <section className="acc-section">
        <h2 className="htw-section-title">Technical notes</h2>
        <p className="acc-lede">
          Accessibility here depends on HTML, CSS, JavaScript and WAI-ARIA. The
          site is tested in current versions of Chrome, Edge, Firefox and Safari.
          It runs entirely in your browser, so it also works with the operating
          system accessibility settings you already use — including offline.
        </p>
        <p className="acc-meta">
          <Accessibility size={14} aria-hidden="true" /> This statement was last
          reviewed on 5 September 2026.
        </p>
      </section>
    </div>
  );
}
