import { Mail, ShieldCheck } from 'lucide-react';
import { INSTITUTION } from '../../data/institutionConfig';

export default function AccessibilityStatement({ onReportBarrier }) {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Accessibility</div>
        <h1 className="htw-title">Accessibility Statement</h1>
        <p className="htw-subtitle">
          RDM Toolkit is being prepared for Lakehead University use under AODA and WCAG 2.0 Level AA.
        </p>
      </div>

      <section className="htw-section">
        <div className="htw-promise">
          <ShieldCheck size={32} aria-hidden="true" />
          <div>
            <h2>Our target standard</h2>
            <p>
              This site is being tested against the Web Content Accessibility Guidelines
              (WCAG) 2.0 Level AA criteria required by the Accessibility for Ontarians
              with Disabilities Act (AODA). The public website, information pages, and
              browser-based tools are in scope.
            </p>
            <p style={{ marginTop: '12px' }}>
              The toolkit is also reviewed against Lakehead accessibility practices:
              proper heading structure, meaningful text alternatives, descriptive links,
              visible focus, and no reliance on colour alone.
            </p>
          </div>
        </div>
      </section>

      <section className="htw-section">
        <h2 className="htw-section-title">Known limitations</h2>
        <p className="htw-section-intro">
          Some tools include pointer-heavy workflows, such as PDF signing, redaction,
          form field placement, page reordering, and image cropping. These workflows
          need additional keyboard and screen reader review before this site should be
          described as fully conforming.
        </p>
        <p className="htw-section-intro">
          If a tool is not accessible for your workflow, contact us and we will work
          with you to provide the information or service in an accessible format.
        </p>
      </section>

      <section className="htw-section">
        <h2 className="htw-section-title">Report an accessibility barrier</h2>
        <p className="htw-section-intro">
          Tell us what page or tool you were using, what happened, and what assistive
          technology or browser you were using if you are comfortable sharing that detail.
        </p>

        <div className="error-card-actions">
          <button
            type="button"
            className="action-button"
            onClick={onReportBarrier}
          >
            <Mail size={18} aria-hidden="true" />
            Report an accessibility barrier
          </button>
          <a
            className="feedback-modal-cta feedback-modal-cta--secondary"
            href={`mailto:${INSTITUTION.rdmEmail}?subject=${encodeURIComponent('[RDM Toolkit] Accessibility barrier')}`}
          >
            Email {INSTITUTION.rdmEmail}
          </a>
        </div>
      </section>

      <section className="htw-section">
        <h2 className="htw-section-title">Review status</h2>
        <p className="htw-section-intro">
          Last reviewed: May 5, 2026. Automated checks are passing on the current
          sampled route set; full-route and manual testing remain part of the AODA
          readiness work.
        </p>
      </section>
    </div>
  );
}
