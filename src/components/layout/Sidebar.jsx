import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, MessageSquarePlus, ShieldCheck, HardDrive, MoreHorizontal } from 'lucide-react';
import { PRIMARY_CATEGORIES, MORE_CATEGORIES, CATEGORIES } from '../../data/toolRegistry';

export default function Sidebar({ currentToolId, currentPage, onNavigate, isOpen, onClose }) {
  const [expanded, setExpanded] = useState(new Set());
  const [showMore, setShowMore] = useState(false);

  // Auto-expand the category containing the current tool
  useEffect(() => {
    if (currentToolId) {
      for (const cat of CATEGORIES) {
        if (cat.tools.some(t => t.id === currentToolId)) {
          setExpanded(prev => {
            if (prev.has(cat.id)) return prev;
            const next = new Set(prev);
            next.add(cat.id);
            return next;
          });
          // If tool is in a "more" category, auto-show that section
          if (!cat.primary) setShowMore(true);
          break;
        }
      }
    }
  }, [currentToolId]);

  function toggleCategory(catId) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function handleToolClick(toolId) {
    onNavigate(toolId);
    if (onClose) onClose();
  }

  function renderCategory(cat) {
    const isExpanded = expanded.has(cat.id);
    return (
      <div key={cat.id} className="sidebar-category">
        <button
          className="sidebar-category-header"
          onClick={() => toggleCategory(cat.id)}
          aria-expanded={isExpanded}
        >
          <span className="sidebar-category-icon">{cat.emoji}</span>
          <span className="sidebar-category-label">{cat.label}</span>
          <span className="sidebar-category-count">{cat.tools.length}</span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {isExpanded && (
          <ul className="sidebar-tool-list">
            {cat.tools.map(tool => (
              <li key={tool.id}>
                <button
                  className={`sidebar-tool-item ${currentToolId === tool.id ? 'sidebar-tool-item--active' : ''}`}
                  onClick={() => handleToolClick(tool.id)}
                >
                  {tool.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <nav className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label="Tool navigation">
        <div className="sidebar-scroll">
          {/* Primary categories */}
          {PRIMARY_CATEGORIES.map(renderCategory)}

          {/* More Tools divider */}
          <button
            className="sidebar-more-toggle"
            onClick={() => setShowMore(!showMore)}
          >
            <MoreHorizontal size={16} />
            <span>{showMore ? 'Less Tools' : 'More Tools'}</span>
            <span className="sidebar-category-count">
              {MORE_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0)}
            </span>
            {showMore ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showMore && MORE_CATEGORIES.map(renderCategory)}

          {/* Special pages */}
          <div className="sidebar-divider" />
          <a
            href="#storage-calculator"
            className={`sidebar-htw-link ${currentPage === 'storage-calculator' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <HardDrive size={16} />
            Research Storage Calculator
          </a>
          <a
            href="#data-classification"
            className={`sidebar-htw-link ${currentPage === 'data-classification' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <ShieldCheck size={16} />
            Classify Your Data
          </a>
          <a
            href="#how-this-works"
            className={`sidebar-htw-link ${currentPage === 'how-this-works' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <HelpCircle size={16} />
            How This Works
          </a>
          <a
            href="#request-a-tool"
            className={`sidebar-htw-link ${currentPage === 'request-a-tool' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <MessageSquarePlus size={16} />
            Request a Tool
          </a>
        </div>
      </nav>
    </>
  );
}
