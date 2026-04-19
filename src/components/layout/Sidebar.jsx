import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, ShieldCheck, HardDrive, MoreHorizontal, BookOpen, Globe, CircleDollarSign, Database, ArrowUpRight, BadgeCheck } from 'lucide-react';
import { PRIMARY_CATEGORIES, MORE_CATEGORIES, CATEGORIES } from '../../data/toolRegistry';

export default function Sidebar({ currentToolId, currentPage, onNavigate, isOpen, onClose }) {
  const [expanded, setExpanded] = useState(new Set());
  const [showMore, setShowMore] = useState(false);
  const navRef = useRef(null);

  // Close sidebar on Escape key when open (mobile)
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
      <nav className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label="Tool navigation" ref={navRef}>
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
          <div className="sidebar-section-label">Research Resources</div>
          <a
            href="#how-this-works"
            className={`sidebar-htw-link ${currentPage === 'how-this-works' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <HelpCircle size={16} />
            How This Works
          </a>
          <a
            href="#tri-agency-policy"
            className={`sidebar-htw-link ${currentPage === 'tri-agency-policy' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <BookOpen size={16} />
            Tri-Agency RDM Policy
          </a>
          <a
            href="#grants-identifiers"
            className={`sidebar-htw-link ${currentPage === 'grants-identifiers' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <BadgeCheck size={16} />
            Grants &amp; Identifiers
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
            href="#storage-calculator"
            className={`sidebar-htw-link ${currentPage === 'storage-calculator' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <HardDrive size={16} />
            Research Storage Calculator
          </a>
          <a
            href="#lakehead-dataverse"
            className={`sidebar-htw-link ${currentPage === 'lakehead-dataverse' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <Database size={16} />
            Lakehead Dataverse
          </a>
          <a
            href="#drac-services"
            className={`sidebar-htw-link ${currentPage === 'drac-services' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <Globe size={16} />
            DRAC Services
          </a>
          <a
            href="#acrobat-alternative"
            className={`sidebar-htw-link ${currentPage === 'acrobat-alternative' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <CircleDollarSign size={16} />
            Adobe Acrobat Alternative
          </a>
        </div>

        {/* Pinned CTA — Request a Tool */}
        <div className="sidebar-cta">
          <a
            href="#request-a-tool"
            className="sidebar-cta-card"
            onClick={onClose}
          >
            <span className="sidebar-cta-kicker">Missing something?</span>
            <span className="sidebar-cta-title">
              Request a Tool
              <ArrowUpRight size={16} strokeWidth={2.5} />
            </span>
          </a>
        </div>
      </nav>
    </>
  );
}
