import { useState } from 'react';
import { Eraser, AlertTriangle } from 'lucide-react';

/**
 * One-click wipe of everything RDM Toolkit stores in the browser:
 * recent tools, search history, welcome-tour dismissal, and the opt-in
 * usage log. Intended for shared lab / library computers. Two-step
 * confirm, then clears storage and reloads so all in-memory state resets.
 */
export default function ClearLocalData() {
  const [confirming, setConfirming] = useState(false);

  const handleClear = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage unavailable (e.g. blocked) — nothing stored, nothing to clear.
    }
    window.location.reload();
  };

  if (!confirming) {
    return (
      <button type="button" className="htw-cleardata-btn" onClick={() => setConfirming(true)}>
        <Eraser size={15} aria-hidden="true" />
        Clear all local data
      </button>
    );
  }

  return (
    <div className="htw-cleardata-confirm" role="alertdialog" aria-label="Confirm clearing local data">
      <p>
        <AlertTriangle size={14} aria-hidden="true" /> This removes your recent-tools
        list, search history, tour preference, and the optional usage log from this
        browser, then reloads the page. Files you downloaded are not affected.
      </p>
      <div className="htw-cleardata-actions">
        <button type="button" className="htw-cleardata-btn htw-cleardata-btn--danger" onClick={handleClear}>
          Yes, clear everything
        </button>
        <button type="button" className="htw-cleardata-btn htw-cleardata-btn--ghost" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
