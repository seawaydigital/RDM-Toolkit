import { useState, useEffect } from 'react';
import { Lock, Menu, HelpCircle, Search, MessageSquare } from 'lucide-react';
import SearchBar from '../ui/SearchBar';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export default function Topbar({ onMenuToggle, showMenuButton, onLogoClick, currentPage, onNavigate, onOpenFeedback }) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          {showMenuButton && (
            <button className="topbar-menu-btn" onClick={onMenuToggle} aria-label="Toggle sidebar">
              <Menu size={20} />
            </button>
          )}
          <span className="topbar-logo" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
            <span className="topbar-logo-mark">RDM</span> Toolkit
          </span>
          <span className="topbar-subtitle">Research Data Management</span>
        </div>
        <div className="topbar-right">
          <button
            className="topbar-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label={`Search tools (${isMac ? '⌘' : 'Ctrl'}+K)`}
            title={`Search tools (${isMac ? '⌘' : 'Ctrl'}+K)`}
          >
            <Search size={16} />
            <span className="topbar-search-label">Search</span>
            <kbd className="topbar-search-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
          <a
            href="#how-this-works"
            className={`topbar-htw-link ${currentPage === 'how-this-works' ? 'topbar-htw-link--active' : ''}`}
          >
            <HelpCircle size={15} />
            How This Works
          </a>
          {onOpenFeedback && (
            <button
              type="button"
              className="topbar-feedback-btn"
              onClick={onOpenFeedback}
              aria-label="Send feedback"
              title="Send feedback"
            >
              <MessageSquare size={15} />
              <span className="topbar-feedback-label">Feedback</span>
            </button>
          )}
          <span className="topbar-badge">
            <Lock size={14} />
            100% Browser-Based
          </span>
        </div>
      </header>

      <SearchBar
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}
