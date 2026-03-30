import { useState } from 'react';
import { PRIMARY_CATEGORIES, MORE_CATEGORIES } from '../../data/toolRegistry';
import { useRecentTools } from '../../hooks/useRecentTools';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  const [showMore, setShowMore] = useState(false);
  const { recentTools } = useRecentTools();

  return (
    <div className="homepage">
      <div className="homepage-hero">
        <h1 className="homepage-title">RDM Toolkit</h1>
        <p className="homepage-tagline">Research Data Management Toolkit</p>
        <p className="homepage-subtitle">Free, browser-based tools for researchers. No uploads. No accounts. No tracking.</p>
      </div>

      <div className="homepage-about">
        <p>
          RDM Toolkit is a Lakehead University browser-based file utility toolkit that gives researchers,
          graduate students, and office staff a private, trustworthy alternative to third-party conversion
          websites. Every tool runs entirely inside your browser tab. Files never leave your device.
          No upload ever occurs. No server processes anything. No account is required. No tracking
          takes place.
        </p>
        <p className="homepage-compliance">
          Designed to meet PIPEDA, PHIPA, and GDPR data handling requirements {'\u2014'} your data never leaves your device.
        </p>
      </div>

      {recentTools.length > 0 && (
        <div className="homepage-recent">
          <h2 className="homepage-recent-title">Recently Used</h2>
          <div className="homepage-recent-pills">
            {recentTools.map(tool => (
              <button
                key={tool.id}
                className="homepage-recent-pill"
                onClick={() => onNavigate(tool.id)}
                title={tool.description}
              >
                <span aria-hidden="true">{tool.categoryEmoji}</span>
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="homepage-grid">
        {PRIMARY_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="homepage-card"
            onClick={() => onNavigate(cat.tools[0].id)}
          >
            <span className="homepage-card-emoji">{cat.emoji}</span>
            <h2 className="homepage-card-title">{cat.label}</h2>
            <span className="homepage-card-count">{cat.tools.length} tools</span>
            <p className="homepage-card-description">{cat.description}</p>
          </button>
        ))}
      </div>

      {/* More Tools section */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
        <button
          onClick={() => setShowMore(!showMore)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', fontSize: 14, fontWeight: 500,
            color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)',
            cursor: 'pointer',
          }}
        >
          {showMore ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {showMore ? 'Hide' : 'Show'} More Tools ({MORE_CATEGORIES.reduce((s, c) => s + c.tools.length, 0)})
        </button>
      </div>

      {showMore && (
        <div className="homepage-grid" style={{ paddingBottom: 'var(--space-2xl)' }}>
          {MORE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className="homepage-card"
              onClick={() => onNavigate(cat.tools[0].id)}
            >
              <span className="homepage-card-emoji">{cat.emoji}</span>
              <h2 className="homepage-card-title">{cat.label}</h2>
              <span className="homepage-card-count">{cat.tools.length} tools</span>
              <p className="homepage-card-description">{cat.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
