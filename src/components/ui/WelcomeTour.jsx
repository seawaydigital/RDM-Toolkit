import { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Wand2, Telescope, ChevronRight, ChevronLeft } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

const DISMISS_KEY = 'rdm_tour_dismissed_v1';

export function hasDismissedTour() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return true; // if localStorage is blocked, don't show the tour
  }
}

function dismissTour() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

const STEPS = [
  {
    icon: ShieldCheck,
    kicker: 'Step 1 of 3',
    title: 'Your files never leave your browser',
    body:
      'Every tool here runs on your own device — no uploads, no servers, no accounts. You can turn off your Wi-Fi after the page loads and every tool still works.',
    hint: 'This matters for OCAP®, PHIPA, and TCPS 2 data that can\'t be sent to third-party services.',
  },
  {
    icon: Wand2,
    kicker: 'Step 2 of 3',
    title: '46 tools, one workflow',
    body:
      'Merge PDFs, strip metadata, de-identify research data, calculate storage needs, and more. Use Ctrl/⌘+K anywhere to jump to a tool, or drop a file onto the page and we\'ll route you to the right one.',
    hint: 'Recently used tools live on the home page so you can pick up where you left off.',
  },
  {
    icon: Telescope,
    kicker: 'Step 3 of 3',
    title: 'Help us make this better',
    body:
      'You\'re one of the first testers. The Feedback button (top right) sends your notes straight to the RDM team — no account required. Every tool also has a "How this tool works" explainer so you can verify the privacy claim for yourself.',
    hint: 'Questions or requests? The "Request a Tool" link in the sidebar is always open.',
  },
];

export default function WelcomeTour({ onClose, onEnableUsageLog }) {
  const [step, setStep] = useState(0);
  const [logOptIn, setLogOptIn] = useState(false);
  const dialogRef = useRef(null);

  // Delegate focus trap, focus restoration, Escape-to-close, and body scroll
  // lock to the shared hook. isOpen is always true while this component is
  // mounted — the parent unmounts it on close.
  useModalAccessibility({ isOpen: true, onClose: handleClose, dialogRef });

  // Re-focus the primary button whenever the step changes so keyboard users
  // land on a sensible target after navigating with Arrow keys or dot buttons.
  useEffect(() => {
    const t = setTimeout(() => {
      const primary = dialogRef.current?.querySelector('.welcome-tour-btn--primary');
      if (primary) primary.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [step]);

  // Arrow key step navigation — app-specific, not handled by the hook.
  useEffect(() => {
    function onArrow(e) {
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) setStep(s => s + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    }
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [step]);

  function handleClose() {
    dismissTour();
    if (logOptIn && onEnableUsageLog) onEnableUsageLog();
    onClose();
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="welcome-tour-backdrop">
      <div
        className="welcome-tour"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
      >
        <button
          type="button"
          className="welcome-tour-close"
          onClick={handleClose}
          aria-label="Skip tour"
        >
          <X size={18} />
        </button>

        <div className="welcome-tour-icon">
          <Icon size={32} strokeWidth={1.6} />
        </div>

        <div className="welcome-tour-kicker">{current.kicker}</div>
        <h2 id="welcome-tour-title" className="welcome-tour-title">{current.title}</h2>
        <p className="welcome-tour-body">{current.body}</p>
        <p className="welcome-tour-hint">{current.hint}</p>

        {isLast && (
          <label className="welcome-tour-optin">
            <input
              type="checkbox"
              checked={logOptIn}
              onChange={(e) => setLogOptIn(e.target.checked)}
            />
            <span>
              Help improve the toolkit: keep a local log of which tools I open. Stored only on this
              device; never transmitted until I choose to share it via Feedback.
            </span>
          </label>
        )}

        <div className="welcome-tour-dots" role="tablist" aria-label="Tour steps">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`Go to step ${i + 1}`}
              className={`welcome-tour-dot ${i === step ? 'welcome-tour-dot--active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="welcome-tour-nav">
          {step > 0 ? (
            <button
              type="button"
              className="welcome-tour-btn welcome-tour-btn--ghost"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button
              type="button"
              className="welcome-tour-btn welcome-tour-btn--ghost"
              onClick={handleClose}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            className="welcome-tour-btn welcome-tour-btn--primary"
            onClick={handleNext}
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
