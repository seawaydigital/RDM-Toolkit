import { Loader2 } from 'lucide-react';

export default function ActionButton({ label, onClick, disabled = false, loading = false }) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={`action-button ${loading ? 'action-button--loading' : ''}`}
      onClick={isDisabled ? undefined : onClick}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
    >
      {loading && <Loader2 size={18} className="action-button-spinner" />}
      {loading ? 'Processing\u2026' : label}
    </button>
  );
}
