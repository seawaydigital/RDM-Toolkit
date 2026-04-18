import { useState, useId } from 'react';
import { ChevronDown, ShieldCheck, Cog, Lock, AlertTriangle, SearchCheck, ExternalLink } from 'lucide-react';
import { getExplainer } from '../../data/toolExplainers';

const GITHUB_BASE = 'https://github.com/seawaydigital/RDM-Toolkit/blob/master/';

/**
 * Collapsible "How this tool works" explainer.
 * Reads content from src/data/toolExplainers.js keyed by tool id.
 * Renders nothing if no explainer is registered for the tool.
 */
export default function HowItWorks({ toolId }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  const explainer = getExplainer(toolId);
  if (!explainer) return null;

  const {
    whatItDoes,
    howItWorks,
    technicalDetails,
    privacy,
    limitations,
    verify,
  } = explainer;

  return (
    <section className={`hiw${open ? ' hiw--open' : ''}`} aria-label="How this tool works">
      <button
        type="button"
        className="hiw-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(v => !v)}
      >
        <ShieldCheck size={18} className="hiw-toggle-icon" />
        <span className="hiw-toggle-label">
          <strong>How this tool works</strong>
          <span className="hiw-toggle-sub">A plain-English walkthrough — what happens to your file, what stays on your device, and how you can check for yourself.</span>
        </span>
        <ChevronDown size={18} className="hiw-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div id={contentId} className="hiw-content">
          {/* Section 1 — What it does */}
          <div className="hiw-section">
            <h3 className="hiw-section-title">
              <Cog size={14} aria-hidden="true" />
              What it does
            </h3>
            <p>{whatItDoes}</p>
          </div>

          {/* Section 2 — How it works */}
          <div className="hiw-section">
            <h3 className="hiw-section-title">
              <Cog size={14} aria-hidden="true" />
              How it works
            </h3>
            {Array.isArray(howItWorks)
              ? howItWorks.map((p, i) => <p key={i}>{p}</p>)
              : <p>{howItWorks}</p>}

            {technicalDetails && (
              <details className="hiw-technical">
                <summary>Technical details (for IT reviewers)</summary>
                <div className="hiw-technical-body">
                  {technicalDetails.library && (
                    <p><strong>Library:</strong> {technicalDetails.library}</p>
                  )}
                  {technicalDetails.flow && (
                    <ul className="hiw-technical-flow">
                      {technicalDetails.flow.map((step, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
                      ))}
                    </ul>
                  )}
                  {technicalDetails.sourceFile && (
                    <p className="hiw-technical-source">
                      <a
                        href={`${GITHUB_BASE}${technicalDetails.sourceFile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View the exact source on GitHub
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Section 3 — What stays on your device */}
          <div className="hiw-section">
            <h3 className="hiw-section-title">
              <Lock size={14} aria-hidden="true" />
              What stays on your device
            </h3>
            <ul className="hiw-list">
              {privacy.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          {/* Section 4 — Honest limitations */}
          {limitations && limitations.length > 0 && (
            <div className="hiw-section">
              <h3 className="hiw-section-title">
                <AlertTriangle size={14} aria-hidden="true" />
                What to know before you use it
              </h3>
              <ul className="hiw-list hiw-list--amber">
                {limitations.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}

          {/* Section 5 — Verify it yourself */}
          <div className="hiw-section">
            <h3 className="hiw-section-title">
              <SearchCheck size={14} aria-hidden="true" />
              Check for yourself
            </h3>
            <p>You don&apos;t have to take our word for any of this. Here are two ways to verify:</p>

            {verify?.quick && (
              <div className="hiw-verify-block">
                <h4 className="hiw-verify-heading">The quick check (30 seconds)</h4>
                <p>{verify.quick}</p>
              </div>
            )}

            <div className="hiw-verify-block">
              <h4 className="hiw-verify-heading">The thorough check (for the skeptical)</h4>
              <ol className="hiw-list hiw-list--ordered">
                <li>In this browser tab, press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> on Windows, <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd> on Mac) to open Developer Tools.</li>
                <li>Click the <strong>Network</strong> tab at the top of the panel that opens.</li>
                <li>Click the clear button to empty the request list.</li>
                <li>Now use the tool as you normally would.</li>
                <li>The Network tab stays empty. Every network request your browser makes would show up here — and there are none.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
