import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, ShieldCheck, HardDrive, MoreHorizontal, BookOpen, Globe, CircleDollarSign, Database, ArrowUpRight, BadgeCheck, Accessibility, ListChecks, GraduationCap } from 'lucide-react';
import { PRIMARY_CATEGORIES, MORE_CATEGORIES, CATEGORIES } from '../../data/toolRegistry';
import { STAGES, WORKFLOWS, stepHash } from '../../data/workflows';
import { PROJECT } from '../../data/institutionConfig';

const BROWSE_MODES = [
  { id: 'type', label: 'By file type' },
  { id: 'task', label: 'By task' },
];

const TASK_STAGES = STAGES
  .map(stage => ({ ...stage, workflows: WORKFLOWS.filter(w => w.stage === stage.id) }))
  .filter(stage => stage.workflows.length > 0);

export default function Sidebar({
  currentToolId, currentPage, activeTask, browseMode = 'type', onBrowseModeChange,
  onNavigate, isOpen, onClose,
}) {
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

  function handleTaskClick(workflow) {
    onNavigate(stepHash(workflow, 1));
    if (onClose) onClose();
  }

  // Arrow keys move between the two modes, as in a native radio group.
  function handleModeKeyDown(e) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = browseMode === 'type' ? 'task' : 'type';
    onBrowseModeChange?.(next);
    e.currentTarget.parentElement.querySelector(`[data-mode="${next}"]`)?.focus();
  }

  function renderTaskMode() {
    return (
      <div className="sidebar-tasks">
        {TASK_STAGES.map(stage => (
          <div key={stage.id} className="sidebar-task-stage">
            <p className="sidebar-task-stage-label">{stage.label}</p>
            <ul className="sidebar-tool-list">
              {stage.workflows.map(w => (
                <li key={w.id}>
                  <button
                    type="button"
                    className={`sidebar-tool-item ${activeTask?.id === w.id ? 'sidebar-tool-item--active' : ''}`}
                    aria-current={activeTask?.id === w.id ? 'true' : undefined}
                    onClick={() => handleTaskClick(w)}
                  >
                    {w.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <a href="#tasks" className="sidebar-tasks-all" onClick={onClose}>
          See every task explained
        </a>
      </div>
    );
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
          {/* Browse mode — tools grouped by file type, or common tasks */}
          <div className="sidebar-mode" role="radiogroup" aria-label="Browse tools">
            {BROWSE_MODES.map(mode => {
              const checked = browseMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  data-mode={mode.id}
                  className={`sidebar-mode-btn ${checked ? 'sidebar-mode-btn--active' : ''}`}
                  onClick={() => onBrowseModeChange?.(mode.id)}
                  onKeyDown={handleModeKeyDown}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {browseMode === 'task' ? renderTaskMode() : (
            <>
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
            </>
          )}

          {/* Special pages */}
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Research Resources</div>
          <a
            href="#tasks"
            className={`sidebar-htw-link ${currentPage === 'tasks' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <ListChecks size={16} />
            Common Tasks
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
            href="#thesis"
            className={`sidebar-htw-link ${currentPage === 'thesis' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <GraduationCap size={16} />
            Thesis &amp; Dissertation
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
          <a
            href="#accessibility"
            className={`sidebar-htw-link ${currentPage === 'accessibility' ? 'sidebar-htw-link--active' : ''}`}
            onClick={onClose}
          >
            <Accessibility size={16} />
            Accessibility
          </a>
        </div>

        {/* Sister-site link — RS Toolkit (Research Security) */}
        <div className="sidebar-sister">
          <a
            href={PROJECT.rsToolkitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-sister-link"
          >
            <span className="sidebar-sister-wordmark">
              <span className="sidebar-sister-rs">RS</span>
              <span className="sidebar-sister-toolkit">Toolkit</span>
            </span>
            <span className="sidebar-sister-sub">Research Security</span>
            <ArrowUpRight size={14} strokeWidth={2.5} className="sidebar-sister-icon" />
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
