import { CalendarCheck } from 'lucide-react';
import { getReviewDate, formatReviewDate } from '../../data/contentReview';

export const OPEN_FEEDBACK_EVENT = 'rdm:open-feedback';

/**
 * "Content last checked …" line at the foot of a research page. The date comes
 * from src/data/contentReview.js; the button opens the feedback dialog (App
 * listens for OPEN_FEEDBACK_EVENT) so readers can report something stale.
 */
export default function ContentReviewed({ page }) {
  const iso = getReviewDate(page);
  if (!iso) return null;

  return (
    <p className="content-reviewed">
      <CalendarCheck size={14} aria-hidden="true" />
      <span>
        Content last checked <time dateTime={iso}>{formatReviewDate(iso)}</time>.
        {' '}Spot something out of date?{' '}
        <button
          type="button"
          className="content-reviewed-btn"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT))}
        >
          Tell us
        </button>
      </span>
    </p>
  );
}
