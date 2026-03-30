import { Lock } from 'lucide-react';

export default function EncryptedPDFError({ onNavigate }) {
  return (
    <div className="error-card error-card--encrypted" role="alert">
      <div className="error-card-header">
        <Lock size={18} />
        <strong>Password-Protected PDF</strong>
      </div>
      <p className="error-card-message">
        This PDF is password-protected. Use the{' '}
        <button
          className="error-card-link"
          onClick={() => onNavigate('remove-pdf-password')}
        >
          Remove PDF Password
        </button>{' '}
        tool first, then return here.
      </p>
    </div>
  );
}
