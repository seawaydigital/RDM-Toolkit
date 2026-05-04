import { useState, useEffect, useCallback, useRef, Suspense, lazy, Component } from 'react';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import HomePage from './components/home/HomePage';
import HowThisWorks from './components/pages/HowThisWorks';
import RequestATool from './components/pages/RequestATool';
import DataClassification from './components/pages/DataClassification';
import StorageCalculator from './components/pages/StorageCalculator';
import TriAgencyPolicy from './components/pages/TriAgencyPolicy';
import DRACServices from './components/pages/DRACServices';
import AcrobatAlternative from './components/pages/AcrobatAlternative';
import LakeheadDataverse from './components/pages/LakeheadDataverse';
import GrantsAndIdentifiers from './components/pages/GrantsAndIdentifiers';
import RelatedTools from './components/ui/RelatedTools';
import HowItWorks from './components/ui/HowItWorks';
import ToolSkeleton from './components/ui/ToolSkeleton';
import FeedbackModal from './components/ui/FeedbackModal';
import WelcomeTour, { hasDismissedTour } from './components/ui/WelcomeTour';
import { ALL_TOOLS } from './data/toolRegistry';
import { useRecentTools } from './hooks/useRecentTools';
import { useUsageLog } from './hooks/useUsageLog';
import { setDroppedFiles } from './utils/droppedFile';

// Map file extensions to tool IDs for global drop routing
const EXT_TO_TOOL = {
  pdf: 'compress-pdf',
  jpg: 'compress-image',
  jpeg: 'compress-image',
  png: 'compress-image',
  webp: 'compress-image',
  zip: 'extract-zip',
  csv: 'csv-encoding-fixer',
  json: 'json-formatter',
  md: 'markdown-preview',
};

// PDF tool IDs — if already on one, stay on it for PDF drops
const PDF_TOOLS = new Set([
  'merge-pdfs', 'split-pdf', 'compress-pdf', 'rotate-pages', 'reorder-pages',
  'add-page-numbers', 'sign-pdf', 'password-protect-pdf', 'remove-pdf-password',
  'extract-images-from-pdf', 'pdf-watermark', 'pdf-redaction', 'pdf-page-delete', 'pdf-to-images', 'add-cover-page',
  'pdf-page-inspector', 'fillable-pdf-form',
]);

// Lazy-loaded tool components — Phase 2+ will populate these
const toolComponents = {
  // PDF Tools
  'merge-pdfs': lazy(() => import('./tools/pdf/MergePDFs.jsx')),
  'split-pdf': lazy(() => import('./tools/pdf/SplitPDF.jsx')),
  'compress-pdf': lazy(() => import('./tools/pdf/CompressPDF.jsx')),
  'rotate-pages': lazy(() => import('./tools/pdf/RotatePages.jsx')),
  'reorder-pages': lazy(() => import('./tools/pdf/ReorderPages.jsx')),
  'add-page-numbers': lazy(() => import('./tools/pdf/AddPageNumbers.jsx')),
  'sign-pdf': lazy(() => import('./tools/pdf/SignPDF.jsx')),
  'password-protect-pdf': lazy(() => import('./tools/pdf/PasswordProtectPDF.jsx')),
  'remove-pdf-password': lazy(() => import('./tools/pdf/RemovePDFPassword.jsx')),
  'extract-images-from-pdf': lazy(() => import('./tools/pdf/ExtractImagesFromPDF.jsx')),
  'pdf-watermark': lazy(() => import('./tools/pdf/PDFWatermark.jsx')),
  'pdf-redaction': lazy(() => import('./tools/pdf/PDFRedaction.jsx')),
  'pdf-page-delete': lazy(() => import('./tools/pdf/PDFPageDelete.jsx')),
  'pdf-to-images': lazy(() => import('./tools/pdf/PDFToImages.jsx')),
  'add-cover-page': lazy(() => import('./tools/pdf/AddCoverPage.jsx')),
  'pdf-page-inspector': lazy(() => import('./tools/pdf/PdfPageInspector.jsx')),
  'fillable-pdf-form': lazy(() => import('./tools/pdf/FillablePDFForm.jsx')),
  // Image Tools
  'compress-image': lazy(() => import('./tools/images/CompressImage.jsx')),
  'convert-image-format': lazy(() => import('./tools/images/ConvertImageFormat.jsx')),
  'resize-image': lazy(() => import('./tools/images/ResizeImage.jsx')),
  'strip-image-metadata': lazy(() => import('./tools/images/StripImageMetadata.jsx')),
  'image-to-pdf': lazy(() => import('./tools/images/ImageToPDF.jsx')),
  'image-cropper': lazy(() => import('./tools/images/ImageCropper.jsx')),
  // Archive Tools
  'create-zip': lazy(() => import('./tools/archives/CreateZIP.jsx')),
  'extract-zip': lazy(() => import('./tools/archives/ExtractZIP.jsx')),
  'file-size-analyser': lazy(() => import('./tools/archives/FileSizeAnalyser.jsx')),
  // Text & Data Tools
  'word-counter': lazy(() => import('./tools/text/WordCounter.jsx')),
  'find-replace': lazy(() => import('./tools/text/FindReplace.jsx')),
  'remove-duplicate-lines': lazy(() => import('./tools/text/RemoveDuplicateLines.jsx')),
  'text-diff': lazy(() => import('./tools/text/TextDiff.jsx')),
  'csv-diff': lazy(() => import('./tools/text/CSVDiff.jsx')),
  'json-formatter': lazy(() => import('./tools/text/JSONFormatter.jsx')),
  'csv-json-converter': lazy(() => import('./tools/text/CSVJSONConverter.jsx')),
  'csv-encoding-fixer': lazy(() => import('./tools/text/CSVEncodingFixer.jsx')),
  'markdown-preview': lazy(() => import('./tools/text/MarkdownPreview.jsx')),
  'whitespace-cleaner': lazy(() => import('./tools/text/WhitespaceCleaner.jsx')),
  'bibtex-formatter': lazy(() => import('./tools/text/BibTeXFormatter.jsx')),
  'to-markdown': lazy(() => import('./tools/text/FileToMarkdown.jsx')),
  'data-anonymizer': lazy(() => import('./tools/research/DataAnonymizer.jsx')),
  // Privacy & Security Tools
  'strip-file-metadata': lazy(() => import('./tools/privacy/StripFileMetadata.jsx')),
  'sha256-hasher': lazy(() => import('./tools/privacy/SHA256Hasher.jsx')),
  'magic-byte-checker': lazy(() => import('./tools/privacy/MagicByteChecker.jsx')),
  'encrypt-decrypt-text': lazy(() => import('./tools/privacy/EncryptDecryptText.jsx')),
  'password-generator': lazy(() => import('./tools/privacy/PasswordGenerator.jsx')),
  'checksum-verifier': lazy(() => import('./tools/privacy/ChecksumVerifier.jsx')),
  'encoding-detector': lazy(() => import('./tools/privacy/EncodingDetector.jsx')),
};

const PAGES = new Set(['how-this-works', 'request-a-tool', 'data-classification', 'storage-calculator', 'tri-agency-policy', 'drac-services', 'acrobat-alternative', 'lakehead-dataverse', 'grants-identifiers']);

// Friendly titles for page routes (tools use tool.name from the registry).
// Hoisted to module scope so the object isn't rebuilt on every render.
const PAGE_TITLES = {
  'how-this-works': 'How this works',
  'data-classification': 'Classify your data',
  'storage-calculator': 'Research storage calculator',
  'tri-agency-policy': 'Tri-Agency RDM Policy',
  'grants-identifiers': 'Grants and identifiers',
  'lakehead-dataverse': 'Lakehead Dataverse',
  'drac-services': 'DRAC services',
  'acrobat-alternative': 'Adobe Acrobat alternative',
  'request-a-tool': 'Request a tool',
};

function getRouteFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return { page: null, toolId: null };
  if (PAGES.has(hash)) return { page: hash, toolId: null };
  const tool = ALL_TOOLS.find(t => t.id === hash);
  return { page: null, toolId: tool ? tool.id : null };
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function classifyError(error) {
  if (!error) return 'unknown';
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  if (!navigator.onLine) return 'offline';
  if (msg.includes('failed to fetch dynamically imported module') || msg.includes('loading chunk') || msg.includes('importing a module script failed')) {
    return 'chunk-load';
  }
  if (name === 'quotaexceedederror' || msg.includes('quotaexceeded')) return 'storage-full';
  if (msg.includes('out of memory') || name === 'rangeerror') return 'out-of-memory';
  return 'unknown';
}

function errorCopyFor(category) {
  switch (category) {
    case 'offline':
      return {
        headline: "You're offline and this tool isn't cached yet",
        explanation: "This tool's code hasn't been downloaded to your device yet. Connect to the internet, reload the page once, and every tool will work offline from then on.",
      };
    case 'chunk-load':
      return {
        headline: "Couldn't load this tool's code",
        explanation: "This usually happens after the site is updated — your browser is holding on to an older version. A hard refresh (Ctrl+Shift+R or ⌘+Shift+R) almost always fixes it.",
      };
    case 'storage-full':
      return {
        headline: 'Your browser is out of storage space',
        explanation: 'This tool tried to save something locally but your browser storage is full. Clearing other site data or using a fresh browser profile will help.',
      };
    case 'out-of-memory':
      return {
        headline: 'The file is too large for your browser to handle',
        explanation: "Try a smaller file, or split it first. Large PDFs (200+ pages) and very high-resolution images can push past your browser's memory limit.",
      };
    default:
      return {
        headline: 'This tool ran into an error',
        explanation: "Your files are still safe — nothing left your browser. Try again, and if the error keeps happening, tell us what you were doing so we can fix it.",
      };
  }
}

function ToolErrorFallback({ onReset, onReportProblem, error }) {
  const [showDetail, setShowDetail] = useState(false);
  const category = classifyError(error);
  const { headline, explanation } = errorCopyFor(category);

  return (
    <div className="error-card error-card--tool" role="alert">
      <div className="error-card-header">
        <strong>{headline}</strong>
      </div>
      <p className="error-card-message">{explanation}</p>

      {error && (
        <div className="error-card-detail">
          <button
            type="button"
            onClick={() => setShowDetail(v => !v)}
            className="error-card-detail-toggle"
          >
            {showDetail ? 'Hide technical details' : 'Show technical details'}
          </button>
          {showDetail && (
            <pre className="error-card-detail-pre">
              {error.message}{error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      )}

      <div className="error-card-actions">
        <button className="action-button error-card-action-primary" onClick={onReset}>
          Try Again
        </button>
        {category === 'chunk-load' && (
          <button
            type="button"
            className="action-button action-button--secondary"
            onClick={() => window.location.reload()}
          >
            Hard refresh
          </button>
        )}
        {onReportProblem && (
          <button
            type="button"
            className="error-card-report-btn"
            onClick={() => onReportProblem(error)}
          >
            Report this problem
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [errorResetKey, setErrorResetKey] = useState(0);
  const [globalDropActive, setGlobalDropActive] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState(null);
  const [tourOpen, setTourOpen] = useState(() => !hasDismissedTour());
  const dragCounterRef = useRef(0);
  const { addRecentTool } = useRecentTools();
  const { logEvent, grantConsent, exportLog } = useUsageLog();

  const currentToolId = route.toolId;
  const currentPage = route.page;

  const buildFeedbackContext = useCallback((error) => ({
    toolId: currentToolId,
    page: currentPage,
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    errorMessage: error?.message || null,
    errorStack: error?.stack || null,
  }), [currentToolId, currentPage]);

  const openFeedback = useCallback((error) => {
    setFeedbackContext(buildFeedbackContext(error));
  }, [buildFeedbackContext]);

  const closeFeedback = useCallback(() => setFeedbackContext(null), []);

  const handleToolError = useCallback((error) => {
    logEvent('tool_error', {
      toolId: currentToolId,
      name: error?.name || 'Error',
      message: (error?.message || '').slice(0, 200),
    });
  }, [currentToolId, logEvent]);

  const handleTourClose = useCallback(() => setTourOpen(false), []);

  // Helper: compute a friendly page title and update document.title + the live region.
  const announceRoute = useCallback((newRoute) => {
    const tool = newRoute.toolId ? ALL_TOOLS.find(t => t.id === newRoute.toolId) : null;
    const title = tool
      ? tool.name
      : (newRoute.page ? (PAGE_TITLES[newRoute.page] || 'Home') : 'Home');
    document.title = `${title} — RDM Toolkit`;
    setRouteAnnouncement(`${title}, page loaded`);
  }, []);

  useEffect(() => {
    function onHashChange() {
      const newRoute = getRouteFromHash();
      setRoute(newRoute);
      setErrorResetKey(k => k + 1);
      announceRoute(newRoute);
      // Track recently used tools on every navigation (sidebar clicks, hash changes, etc.)
      if (newRoute.toolId) {
        addRecentTool(newRoute.toolId);
        logEvent('tool_open', { toolId: newRoute.toolId });
      } else if (newRoute.page) {
        logEvent('page_open', { page: newRoute.page });
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [addRecentTool, announceRoute, logEvent]);

  // Announce the initial route on first mount so direct-URL arrivals get a title + live-region read.
  useEffect(() => {
    announceRoute(getRouteFromHash());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fires once on mount only

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isMobile, sidebarOpen]);

  // Task 3 — Ctrl+K / Cmd+K opens search
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('rdm:open-search'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Task 4 — Global drag-and-drop overlay
  useEffect(() => {
    function onDragEnter(e) {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setGlobalDropActive(true);
      }
    }

    function onDragOver(e) {
      e.preventDefault();
    }

    function onDragLeave() {
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setGlobalDropActive(false);
      }
    }

    function onDrop(e) {
      e.preventDefault();
      dragCounterRef.current = 0;
      setGlobalDropActive(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      let targetToolId = EXT_TO_TOOL[ext] || 'file-size-analyser';

      // If dropping a PDF and already on a PDF tool, stay on current tool
      if (ext === 'pdf' && PDF_TOOLS.has(currentToolId)) {
        targetToolId = currentToolId;
      }

      setDroppedFiles(Array.from(files));
      window.location.hash = targetToolId;
    }

    document.body.addEventListener('dragenter', onDragEnter);
    document.body.addEventListener('dragover', onDragOver);
    document.body.addEventListener('dragleave', onDragLeave);
    document.body.addEventListener('drop', onDrop);

    return () => {
      document.body.removeEventListener('dragenter', onDragEnter);
      document.body.removeEventListener('dragover', onDragOver);
      document.body.removeEventListener('dragleave', onDragLeave);
      document.body.removeEventListener('drop', onDrop);
    };
  }, [currentToolId]);

  const navigateTo = useCallback((toolId) => {
    window.location.hash = toolId;
    // Track recently used tools (pages like 'how-this-works' are not tool IDs)
    const isTool = ALL_TOOLS.some(t => t.id === toolId);
    if (isTool) addRecentTool(toolId);
  }, [addRecentTool]);

  const goHome = useCallback(() => {
    window.location.hash = '';
    setRoute({ page: null, toolId: null });
  }, []);

  const currentTool = currentToolId ? ALL_TOOLS.find(t => t.id === currentToolId) : null;
  const ToolComponent = currentToolId ? toolComponents[currentToolId] : null;

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {/* Route-change live region — screen readers announce page transitions (Task 1.6). */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
        id="route-announcer"
      >
        {routeAnnouncement}
      </div>
      <Topbar
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        showMenuButton={isMobile}
        onLogoClick={goHome}
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenFeedback={() => openFeedback(null)}
      />
      <div className="app-body">
        <Sidebar
          currentToolId={currentToolId}
          currentPage={currentPage}
          onNavigate={navigateTo}
          isOpen={isMobile ? sidebarOpen : true}
          onClose={() => setSidebarOpen(false)}
        />
        <MainContent>
          {!currentToolId && !currentPage && <HomePage onNavigate={navigateTo} />}
          {currentPage === 'how-this-works' && <HowThisWorks />}
          {currentPage === 'request-a-tool' && <RequestATool />}
          {currentPage === 'data-classification' && <DataClassification />}
          {currentPage === 'storage-calculator' && <StorageCalculator />}
          {currentPage === 'tri-agency-policy' && <TriAgencyPolicy />}
          {currentPage === 'drac-services' && <DRACServices />}
          {currentPage === 'acrobat-alternative' && <AcrobatAlternative />}
          {currentPage === 'lakehead-dataverse' && <LakeheadDataverse />}
          {currentPage === 'grants-identifiers' && <GrantsAndIdentifiers />}
          {currentToolId && ToolComponent && (
            <ErrorBoundary
              resetKey={errorResetKey}
              onError={handleToolError}
              fallback={(err) => (
                <ToolErrorFallback
                  onReset={() => setErrorResetKey(k => k + 1)}
                  onReportProblem={openFeedback}
                  error={err}
                />
              )}
            >
              <Suspense fallback={<ToolSkeleton />}>
                <div className="tool-page">
                  <header className="tool-header">
                    {currentTool?.categoryLabel && (
                      <div className="tool-header-kicker">
                        <span className="tool-header-emoji" aria-hidden="true">{currentTool.categoryEmoji}</span>
                        {currentTool.categoryLabel}
                      </div>
                    )}
                    <h1 className="tool-title">{currentTool?.name}</h1>
                    {currentTool?.description && (
                      <p className="tool-header-lede">{currentTool.description}</p>
                    )}
                  </header>
                  <ToolComponent
                    tool={currentTool}
                    navigateTo={navigateTo}
                  />
                  <HowItWorks toolId={currentToolId} />
                  <RelatedTools toolId={currentToolId} onNavigate={navigateTo} />
                </div>
              </Suspense>
            </ErrorBoundary>
          )}
          {currentToolId && !ToolComponent && (
            <div className="tool-page">
              <header className="tool-header">
                {currentTool?.categoryLabel && (
                  <div className="tool-header-kicker">
                    <span className="tool-header-emoji" aria-hidden="true">{currentTool.categoryEmoji}</span>
                    {currentTool.categoryLabel}
                  </div>
                )}
                <h1 className="tool-title">{currentTool?.name || 'Unknown Tool'}</h1>
              </header>
              <div className="tool-placeholder">
                <p className="tool-placeholder-text">This tool is coming soon.</p>
              </div>
            </div>
          )}
        </MainContent>
      </div>

      {/* Task 4 — Global file drop overlay */}
      {globalDropActive && (
        <div className="global-drop-overlay" aria-hidden="true">
          <div className="global-drop-inner">
            <span className="global-drop-icon">&#128229;</span>
            <p className="global-drop-message">
              Drop your file to get started &mdash; we&apos;ll take you to the right tool
            </p>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={feedbackContext !== null}
        onClose={closeFeedback}
        context={feedbackContext || {}}
        log={exportLog()}
      />

      {tourOpen && (
        <WelcomeTour
          onClose={handleTourClose}
          onEnableUsageLog={grantConsent}
        />
      )}
    </div>
  );
}
