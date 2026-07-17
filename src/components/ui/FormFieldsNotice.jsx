import { AlertTriangle } from 'lucide-react';

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
export default function FormFieldsNotice({ action, filenames }) {
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
