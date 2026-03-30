import { Loader2 } from 'lucide-react';

export default function ActionButton({ label, onClick, disabled = false, loading = false }) {
  return (
    <button
      className={`action-button ${loading ? 'action-button--loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Loader2 size={18} className="action-button-spinner" />}
      {loading ? 'Processing\u2026' : label}
    </button>
  );
}
