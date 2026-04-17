import { useState } from 'react';

export default function InfoCard({ description, limitations }) {
  const [limitationsOpen, setLimitationsOpen] = useState(false);

  return (
    <div className="info-card">
      <div className="info-card-badges">
        <span className="info-card-badge">{'\u25CF'} Works in your browser</span>
        <span className="info-card-badge">{'\u25CF'} Your files never leave your device</span>
        <span className="info-card-badge">{'\u25CF'} No account</span>
      </div>

      {limitations && limitations.length > 0 && (
        <div className="info-card-limitations">
          <button
            className="info-card-limitations-toggle"
            onClick={() => setLimitationsOpen(o => !o)}
            aria-expanded={limitationsOpen}
            type="button"
          >
            <span className="info-card-limitations-icon">&#9888;</span>
            Limitations
            <span className="info-card-limitations-chevron">
              {limitationsOpen ? '\u25B2' : '\u25BC'}
            </span>
          </button>

          {limitationsOpen && (
            <ul className="info-card-limitations-list">
              {limitations.map((item, i) => (
                <li key={i} className="info-card-limitations-item">{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
