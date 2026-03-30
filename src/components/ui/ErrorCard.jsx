import { AlertCircle } from 'lucide-react';

export default function ErrorCard({ title = 'Error', message }) {
  return (
    <div className="error-card" role="alert">
      <div className="error-card-header">
        <AlertCircle size={18} />
        <strong>{title}</strong>
      </div>
      <p className="error-card-message">{message}</p>
    </div>
  );
}
