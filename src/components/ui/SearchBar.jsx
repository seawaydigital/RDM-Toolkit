import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_TOOLS } from '../../data/toolRegistry';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

const MAX_RESULTS = 8;
const MAX_RECENT = 5;
const STORAGE_KEY = 'rdm_recent_tools';

function readRecentIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function filterTools(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ALL_TOOLS.filter(tool => {
    if (tool.name.toLowerCase().includes(q)) return true;
    if (tool.description.toLowerCase().includes(q)) return true;
    if (tool.categoryLabel?.toLowerCase().includes(q)) return true;
    if (tool.tags?.some(tag => tag.toLowerCase().includes(q))) return true;
    return false;
  }).slice(0, MAX_RESULTS);
}

function getRecentTools() {
  const ids = readRecentIds().slice(0, MAX_RECENT);
  return ids.map(id => ALL_TOOLS.find(t => t.id === id)).filter(Boolean);
}

export default function SearchBar({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [liveText, setLiveText] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const modalRef = useRef(null);

  const results = query.trim() ? filterTools(query) : getRecentTools();
  const isShowingRecent = !query.trim();
  const hasResults = results.length > 0;

  // Apply modal accessibility: focus trap, focus restoration, scroll lock, Escape
  useModalAccessibility({ isOpen, onClose, dialogRef: modalRef, initialFocusRef: inputRef });

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setLiveText('');
    }
  }, [isOpen]);

  // Keep activeIndex in bounds when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback((toolId) => {
    onNavigate(toolId);
    onClose();
  }, [onNavigate, onClose]);

  // Announce result count when results change after a search query
  useEffect(() => {
    if (!isOpen || isShowingRecent) return;
    if (results.length === 0) {
      setLiveText('No tools found');
    } else {
      setLiveText(`${results.length} ${results.length === 1 ? 'tool matches' : 'tools match'}`);
    }
  }, [results.length, isOpen, isShowingRecent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation (Escape handled by useModalAccessibility)
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(results.length > 0 ? results.length - 1 : 0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex].id);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, results, activeIndex, handleSelect]);

  // Scroll active result into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('.search-result--active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search tools">
      <div className="search-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        {/* Visually-hidden live region for result count announcements */}
        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
        >
          {liveText}
        </span>

        <div className="search-input-row">
          <Search size={18} className="search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            role="combobox"
            placeholder="Search tools…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search tools"
            aria-expanded={hasResults}
            aria-controls="searchbar-listbox"
            aria-autocomplete="list"
            aria-activedescendant={hasResults && activeIndex >= 0 ? `searchbar-option-${activeIndex}` : undefined}
          />
          <button className="search-close-btn" onClick={onClose} aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <div className="search-results-container">
          {results.length > 0 && (
            <>
              <div className="search-results-label" aria-hidden="true">
                {isShowingRecent ? 'Recently Used' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
              </div>
              <ul
                id="searchbar-listbox"
                ref={listRef}
                className="search-results-list"
                role="listbox"
                aria-label="Search results"
              >
                {results.map((tool, idx) => (
                  <li
                    key={tool.id}
                    id={`searchbar-option-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`search-result${idx === activeIndex ? ' search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(tool.id)}
                  >
                    <span className="search-result-emoji" aria-hidden="true">{tool.categoryEmoji}</span>
                    <span className="search-result-body">
                      <span className="search-result-name">{tool.name}</span>
                      <span className="search-result-desc">{tool.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {query.trim() && results.length === 0 && (
            <div className="search-empty">
              No tools found for <strong>"{query}"</strong>
            </div>
          )}

          {!query.trim() && results.length === 0 && (
            <div className="search-empty">
              No recently used tools yet. Start using tools and they'll appear here.
            </div>
          )}
        </div>

        <div className="search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
