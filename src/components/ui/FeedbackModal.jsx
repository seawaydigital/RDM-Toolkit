import { useState, useEffect, useRef } from 'react';
import { X, Mail, Copy, Check, ShieldAlert } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

function buildIssueBody({ description, context, includeLog, log }) {
  const lines = [
    '## What I was trying to do',
    description || '_(not provided)_',
    '',
    '## Context',
    `- Page/tool: ${context.toolId || context.page || 'home'}`,
    `- URL: ${context.url}`,
    `- User agent: ${context.userAgent}`,
    `- Viewport: ${context.viewport}`,
    `- Online: ${context.online}`,
  ];
  if (context.errorMessage) {
    lines.push('', '## Error', '```', context.errorMessage, '```');
    if (context.errorStack) {
      lines.push('', '<details><summary>Stack trace</summary>', '', '```', context.errorStack, '```', '</details>');
    }
  }
  if (includeLog && log && log.length) {
    lines.push('', '## Session log', '```json', JSON.stringify(log.slice(-50), null, 2), '```');
  }
  return lines.join('\n');
}

function buildMailtoHref({ description, context, includeLog, log }) {
  const subject = context.errorMessage
    ? `[RDM Toolkit] Error in ${context.toolId || 'tool'}`
    : `[RDM Toolkit] Feedback: ${context.toolId || context.page || 'general'}`;
  const body = buildIssueBody({ description, context, includeLog, log });
  return `mailto:${INSTITUTION.rdmEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function FeedbackModal({ isOpen, onClose, context, log }) {
  const [description, setDescription] = useState('');
  const [includeLog, setIncludeLog] = useState(Boolean(log && log.length));
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const dialogRef = useRef(null);

  useModalAccessibility({ isOpen, onClose, dialogRef, initialFocusRef: textareaRef });

  // Reset form state when modal closes; sync log-include toggle when it opens.
  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setCopied(false);
    } else {
      setIncludeLog(Boolean(log && log.length));
    }
  }, [isOpen, log]);

  if (!isOpen) return null;

  const payload = { description, context, includeLog, log };

  async function handleCopyLog() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log || [], null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — fall through silently
    }
  }

  return (
    <div className="feedback-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="feedback-modal-header">
          <h2 id="feedback-modal-title" className="feedback-modal-title">
            {context.errorMessage ? 'Report this problem' : 'Send feedback'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="feedback-modal-close"
            aria-label="Close feedback"
          >
            <X size={18} />
          </button>
        </header>

        <div className="feedback-modal-body">
          <p className="feedback-modal-lede">
            {context.errorMessage
              ? `Sorry about this — the ${context.toolId || 'tool'} ran into an error. Your files are still safe in your browser. A short note about what you were doing will help us fix it.`
              : 'Spot a bug, missing feature, or confusing step? Tell us what happened. Your files never leave your device — only the text you write here gets sent.'}
          </p>

          <label className="feedback-modal-label" htmlFor="feedback-description">
            What were you trying to do?
          </label>
          <textarea
            id="feedback-description"
            ref={textareaRef}
            className="feedback-modal-textarea"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I uploaded a 40-page PDF to Compress PDF and got an error…"
          />

          <div className="feedback-modal-context">
            <div className="feedback-modal-context-title">Included automatically:</div>
            <ul className="feedback-modal-context-list">
              <li>Tool / page: <code>{context.toolId || context.page || 'home'}</code></li>
              <li>Browser + viewport size</li>
              {context.errorMessage && <li>Error message + stack trace</li>}
            </ul>
          </div>

          {log && log.length > 0 && (
            <label className="feedback-modal-checkbox">
              <input
                type="checkbox"
                checked={includeLog}
                onChange={(e) => setIncludeLog(e.target.checked)}
              />
              <span>
                Include my session log ({log.length} {log.length === 1 ? 'entry' : 'entries'}) —
                a list of which tools I opened and when. No file names or contents.
              </span>
            </label>
          )}

          <div className="feedback-modal-privacy">
            <ShieldAlert size={14} aria-hidden="true" />
            <span>
              Nothing is uploaded. Clicking the button below opens your email client in a new tab,
              where you can review and send.
            </span>
          </div>
        </div>

        <footer className="feedback-modal-footer">
          <a
            href={buildMailtoHref(payload)}
            className="feedback-modal-cta feedback-modal-cta--primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Mail size={15} /> Email us ({INSTITUTION.rdmEmail})
          </a>
          {log && log.length > 0 && (
            <button
              type="button"
              className="feedback-modal-cta feedback-modal-cta--ghost"
              onClick={handleCopyLog}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy log only'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
