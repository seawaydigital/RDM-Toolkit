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
          {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </button>
        {isExpanded && (
          <ul className="sidebar-tool-list">
            {cat.tools.map(tool => (
              <li key={tool.id}>
                <button
                  className={`sidebar-tool-item ${currentToolId === tool.id ? 'sidebar-tool-item--active' : ''}`}
                  onClick={() => handleToolClick(tool.id)}
                  aria-current={currentToolId === tool.id ? 'page' : undefined}
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
      <nav id="sidebar" className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label="Tool navigation" ref={navRef}>
        <div className="sidebar-scroll">
          {/* Primary categories */}
          {PRIMARY_CATEGORIES.map(renderCategory)}

          {/* More Tools divider */}
          <button
            className="sidebar-more-toggle"
            onClick={() => setShowMore(!showMore)}
            aria-expanded={showMore}
            aria-controls="sidebar-more-tools"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
            <span>{showMore ? 'Less Tools' : 'More Tools'}</span>
            <span className="sidebar-category-count">
              {MORE_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0)}
            </span>
            {showMore ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>

          <div id="sidebar-more-tools">
            {showMore && MORE_CATEGORIES.map(renderCategory)}
          </div>

          {/* Special pages */}
          <div className="sidebar-divider" />
          <h2 className="sidebar-section-label">Research Resources</h2>
          <a
            href="#how-this-works"
            className={`sidebar-htw-link ${currentPage === 'how-this-works' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'how-this-works' ? 'page' : undefined}
          >
            <HelpCircle size={16} aria-hidden="true" />
            How This Works
          </a>
          <a
            href="#tri-agency-policy"
            className={`sidebar-htw-link ${currentPage === 'tri-agency-policy' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'tri-agency-policy' ? 'page' : undefined}
          >
            <BookOpen size={16} aria-hidden="true" />
            Tri-Agency RDM Policy
          </a>
          <a
            href="#grants-identifiers"
            className={`sidebar-htw-link ${currentPage === 'grants-identifiers' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'grants-identifiers' ? 'page' : undefined}
          >
            <BadgeCheck size={16} aria-hidden="true" />
            Grants &amp; Identifiers
          </a>
          <a
            href="#data-classification"
            className={`sidebar-htw-link ${currentPage === 'data-classification' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'data-classification' ? 'page' : undefined}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Classify Your Data
          </a>
          <a
            href="#storage-calculator"
            className={`sidebar-htw-link ${currentPage === 'storage-calculator' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'storage-calculator' ? 'page' : undefined}
          >
            <HardDrive size={16} aria-hidden="true" />
            Research Storage Calculator
          </a>
          <a
            href="#lakehead-dataverse"
            className={`sidebar-htw-link ${currentPage === 'lakehead-dataverse' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'lakehead-dataverse' ? 'page' : undefined}
          >
            <Database size={16} aria-hidden="true" />
            Lakehead Dataverse
          </a>
          <a
            href="#drac-services"
            className={`sidebar-htw-link ${currentPage === 'drac-services' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'drac-services' ? 'page' : undefined}
          >
            <Globe size={16} aria-hidden="true" />
            DRAC Services
          </a>
          <a
            href="#acrobat-alternative"
            className={`sidebar-htw-link ${currentPage === 'acrobat-alternative' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'acrobat-alternative' ? 'page' : undefined}
          >
            <CircleDollarSign size={16} aria-hidden="true" />
            Adobe Acrobat Alternative
          </a>
          <a
            href="#accessibility"
            className={`sidebar-htw-link ${currentPage === 'accessibility' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
            aria-current={currentPage === 'accessibility' ? 'page' : undefined}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Accessibility Statement
          </a>
        </div>

        {/* Sister-site link — RS Toolkit (Research Security) */}
        <div className="sidebar-sister">
          <a
            href="https://rs.rdmtoolkit.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-sister-link"
          >
            <span className="sidebar-sister-wordmark">
              <span className="sidebar-sister-rs">RS</span>
              <span className="sidebar-sister-toolkit">Toolkit</span>
            </span>
            <span className="sidebar-sister-sub">Research Security</span>
            <ArrowUpRight size={14} strokeWidth={2.5} className="sidebar-sister-icon" aria-hidden="true" />
            <span className="visually-hidden"> (opens in new tab)</span>
          </a>
        </div>

        {/* Pinned CTA — Request a Tool */}
        <div className="sidebar-cta on-gold-surface">
          <a
            href="#request-a-tool"
            className="sidebar-cta-card"
            onClick={onClose}
          >
            <span className="sidebar-cta-kicker">Missing something?</span>
            <span className="sidebar-cta-title">
              Request a Tool
              <ArrowUpRight size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
          </a>
        </div>
      </nav>
    </>
  );
}
