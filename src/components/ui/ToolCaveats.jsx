import { AlertTriangle } from 'lucide-react';
import { getCaveats } from '../../data/toolExplainers';

/**
 * Pre-use advisory UI: the always-visible ToolCaveats strip (default
 * export) and the upload-time FormFieldsNotice (named export). They live
 * in one module so FormFieldsNotice ships inside the entry chunk (App.jsx
 * imports ToolCaveats statically) instead of becoming a new shared chunk —
 * the bundle-integrity CI guard rejects any new JS chunk.
 */

/**
 * Amber informational notice shown when an uploaded PDF actually contains
 * form fields or signature boxes that the current tool's rebuild/re-save
 * will break. Non-blocking — the user can still proceed.
 *
 * Props:
 *   action    — gerund describing the operation ("merging", "splitting", …)
 *   filenames — optional array of affected file names (multi-file tools);
 *               omit for single-file tools ("This PDF contains …").
 */
export function FormFieldsNotice({ action, filenames }) {
  const hasNames = Array.isArray(filenames) && filenames.length > 0;
  const plural = hasNames && filenames.length > 1;

  return (
    <div className="form-fields-notice" role="status">
      <AlertTriangle size={16} aria-hidden="true" />
      <p>
        {hasNames ? (
          <>
            <strong>{filenames.join(', ')}</strong> {plural ? 'contain' : 'contains'}
          </>
        ) : (
          <>This PDF contains</>
        )}{' '}
        form fields or a signature box &mdash; these won&apos;t work after {action}. If the
        document needs to be signed, get it signed first, then come back. If the fields are
        no longer needed, flatten it first (File &rarr; Print &rarr; Save as PDF).
      </p>
    </div>
  );
}

/**
 * Always-visible pre-use caveats for tools with high-impact gotchas
 * (feature loss, workflow-order advice, compliance-critical caveats).
 * Renders nothing for tools without an entry in TOOL_CAVEATS.
 * Wired globally in App.jsx between the tool header and the tool body.
 */
export default function ToolCaveats({ toolId }) {
  const caveats = getCaveats(toolId);
  if (!caveats) return null;

  return (
    <aside className="tool-caveats" aria-label="Before you use this tool">
      <p className="tool-caveats-title">
        <AlertTriangle size={14} aria-hidden="true" />
        Before you use this tool
      </p>
      <ul className="tool-caveats-list">
        {caveats.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </aside>
  );
}
