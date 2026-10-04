import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_TOOLS } from '../../data/toolRegistry';
import { searchAll } from '../../data/searchIndex';

const KIND_LABEL = { task: 'Task', page: 'Guide', term: 'Glossary' };
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

function getRecentTools() {
  const ids = readRecentIds().slice(0, MAX_RECENT);
  return ids
    .map(id => ALL_TOOLS.find(t => t.id === id))
    .filter(Boolean)
    .map(tool => ({
      kind: 'tool',
      id: tool.id,
      title: tool.name,
      description: tool.description,
      hash: tool.id,
      emoji: tool.categoryEmoji,
    }));
}

export default function SearchBar({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = query.trim() ? searchAll(query) : getRecentTools();
  const isShowingRecent = !query.trim();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Defer focus to next tick so the element is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Keep activeIndex in bounds when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback((hash) => {
    onNavigate(hash);
    onClose();
  }, [onNavigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
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
      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex].hash);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, results, activeIndex, onClose, handleSelect]);

  // Scroll active result into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('.search-result--active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search the site">
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-row">
          <Search size={18} className="search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search tools, tasks and guides…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search tools, tasks and guides"
            aria-autocomplete="list"
            aria-controls="search-results-list"
            aria-activedescendant={results[activeIndex] ? `search-result-${results[activeIndex].kind}-${results[activeIndex].id}` : undefined}
          />
          <button className="search-close-btn" onClick={onClose} aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <div className="search-results-container">
          {results.length > 0 && (
            <>
              <div className="search-results-label">
                {isShowingRecent ? 'Recently Used' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
              </div>
              <ul
                id="search-results-list"
                ref={listRef}
                className="search-results-list"
                role="listbox"
              >
                {results.map((result, idx) => (
                  <li
                    key={`${result.kind}-${result.id}`}
                    id={`search-result-${result.kind}-${result.id}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`search-result${idx === activeIndex ? ' search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(result.hash)}
                  >
                    <span className="search-result-emoji" aria-hidden="true">{result.emoji}</span>
                    <span className="search-result-body">
                      <span className="search-result-name">
                        {result.title}
                        {KIND_LABEL[result.kind] && (
                          <span className="search-result-kind">{KIND_LABEL[result.kind]}</span>
                        )}
                      </span>
                      <span className="search-result-desc">{result.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {query.trim() && results.length === 0 && (
            <div className="search-empty">
              Nothing found for <strong>"{query}"</strong>
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
