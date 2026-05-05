import { useState, useEffect, useRef } from 'react';
import { X, Mail, Copy, Check, ShieldAlert } from 'lucide-react';
import { INSTITUTION } from '../../data/institutionConfig';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

const FEEDBACK_TOPICS = [
  { id: 'general', label: 'General feedback' },
  { id: 'bug-report', label: 'Bug report' },
  { id: 'accessibility-barrier', label: 'Accessibility barrier' },
  { id: 'tool-request', label: 'Tool request' },
];

function getTopicLabel(topic) {
  return FEEDBACK_TOPICS.find((item) => item.id === topic)?.label || 'General feedback';
}

function getDefaultTopic(context) {
  if (context.topic) return context.topic;
  if (context.errorMessage) return 'bug-report';
  return 'general';
}

function buildIssueBody({ description, context, includeLog, log, topic }) {
  const lines = [
    '## Topic',
    getTopicLabel(topic),
    '',
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

function buildMailtoHref({ description, context, includeLog, log, topic }) {
  const target = context.toolId || context.page || 'general';
  const subject = topic === 'accessibility-barrier'
    ? `[RDM Toolkit] Accessibility barrier: ${target}`
    : context.errorMessage
      ? `[RDM Toolkit] Error in ${context.toolId || 'tool'}`
      : `[RDM Toolkit] ${getTopicLabel(topic)}: ${target}`;
  const body = buildIssueBody({ description, context, includeLog, log, topic });
  return `mailto:${INSTITUTION.rdmEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function FeedbackModal({ isOpen, onClose, context, log }) {
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState(() => getDefaultTopic(context));
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
      setTopic(getDefaultTopic(context));
    }
  }, [isOpen, log, context.topic, context.errorMessage]);

  if (!isOpen) return null;

  const payload = { description, context, includeLog, log, topic };

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
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="feedback-modal-body">
          <p className="feedback-modal-lede">
            {context.errorMessage
              ? `Sorry about this — the ${context.toolId || 'tool'} ran into an error. Your files are still safe in your browser. A short note about what you were doing will help us fix it.`
              : topic === 'accessibility-barrier'
                ? 'Tell us what accessibility barrier you encountered. Your files never leave your device; only the text you write here gets sent through your email client.'
                : 'Spot a bug, missing feature, or confusing step? Tell us what happened. Your files never leave your device — only the text you write here gets sent.'}
          </p>

          <fieldset className="feedback-modal-topic-group">
            <legend className="feedback-modal-label">Feedback topic</legend>
            <div className="feedback-modal-topic-options">
              {FEEDBACK_TOPICS.map((item) => (
                <label key={item.id} className="feedback-modal-topic-option">
                  <input
                    type="radio"
                    name="feedback-topic"
                    value={item.id}
                    checked={topic === item.id}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="feedback-modal-label" htmlFor="feedback-description">
            {topic === 'accessibility-barrier'
              ? 'What accessibility barrier did you encounter?'
              : 'What were you trying to do?'}
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
            <Mail size={15} aria-hidden="true" /> Email us ({INSTITUTION.rdmEmail})
          </a>
          {log && log.length > 0 && (
            <button
              type="button"
              className="feedback-modal-cta feedback-modal-cta--ghost"
              onClick={handleCopyLog}
            >
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {copied ? 'Copied!' : 'Copy log only'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
