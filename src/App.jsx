import { useState, useEffect, useCallback, useRef, Suspense, lazy, Component } from 'react';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import HomePage from './components/home/HomePage';
import HowThisWorks from './components/pages/HowThisWorks';
import RequestATool from './components/pages/RequestATool';
import DataClassification from './components/pages/DataClassification';
import StorageCalculator from './components/pages/StorageCalculator';
import RelatedTools from './components/ui/RelatedTools';
import ToolSkeleton from './components/ui/ToolSkeleton';
import { ALL_TOOLS } from './data/toolRegistry';
import { useRecentTools } from './hooks/useRecentTools';
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
  xml: 'xml-yaml-formatter',
  yaml: 'xml-yaml-formatter',
  yml: 'xml-yaml-formatter',
  md: 'markdown-preview',
};

// PDF tool IDs — if already on one, stay on it for PDF drops
const PDF_TOOLS = new Set([
  'merge-pdfs', 'split-pdf', 'compress-pdf', 'rotate-pages', 'reorder-pages',
  'add-page-numbers', 'sign-pdf', 'password-protect-pdf', 'remove-pdf-password',
  'extract-images-from-pdf', 'pdf-watermark', 'pdf-redaction', 'pdf-page-delete', 'pdf-to-images',
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
  'base64-tool': lazy(() => import('./tools/text/Base64Tool.jsx')),
  'csv-encoding-fixer': lazy(() => import('./tools/text/CSVEncodingFixer.jsx')),
  'xml-yaml-formatter': lazy(() => import('./tools/text/XMLYAMLFormatter.jsx')),
  'markdown-preview': lazy(() => import('./tools/text/MarkdownPreview.jsx')),
  'text-case-converter': lazy(() => import('./tools/text/TextCaseConverter.jsx')),
  'line-number-adder': lazy(() => import('./tools/text/LineNumberAdder.jsx')),
  'whitespace-cleaner': lazy(() => import('./tools/text/WhitespaceCleaner.jsx')),
  'bibtex-formatter': lazy(() => import('./tools/text/BibTeXFormatter.jsx')),
  'data-anonymizer': lazy(() => import('./tools/research/DataAnonymizer.jsx')),
  // Privacy & Security Tools
  'strip-file-metadata': lazy(() => import('./tools/privacy/StripFileMetadata.jsx')),
  'sha256-hasher': lazy(() => import('./tools/privacy/SHA256Hasher.jsx')),
  'magic-byte-checker': lazy(() => import('./tools/privacy/MagicByteChecker.jsx')),
  'encrypt-decrypt-text': lazy(() => import('./tools/privacy/EncryptDecryptText.jsx')),
  'qr-code-generator': lazy(() => import('./tools/privacy/QRCodeGenerator.jsx')),
  'password-generator': lazy(() => import('./tools/privacy/PasswordGenerator.jsx')),
  'checksum-verifier': lazy(() => import('./tools/privacy/ChecksumVerifier.jsx')),
  'encoding-detector': lazy(() => import('./tools/privacy/EncodingDetector.jsx')),
  // Calculators
  'unit-converter': lazy(() => import('./tools/calculators/UnitConverter.jsx')),
  'date-difference': lazy(() => import('./tools/calculators/DateDifference.jsx')),
  'timestamp-converter': lazy(() => import('./tools/calculators/TimestampConverter.jsx')),
  'file-size-converter': lazy(() => import('./tools/calculators/FileSizeConverter.jsx')),
  // Developer Tools
  'regex-tester': lazy(() => import('./tools/developer/RegexTester.jsx')),
  'uuid-generator': lazy(() => import('./tools/developer/UUIDGenerator.jsx')),
};

const PAGES = new Set(['how-this-works', 'request-a-tool', 'data-classification', 'storage-calculator']);

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
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ToolErrorFallback({ onReset }) {
  return (
    <div className="error-card" role="alert">
      <div className="error-card-header">
        <strong>Tool Error</strong>
      </div>
      <p className="error-card-message">
        Something went wrong loading this tool. Please try again.
      </p>
      <button className="action-button" onClick={onReset} style={{ marginTop: '16px', maxWidth: '200px' }}>
        Try Again
      </button>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [errorResetKey, setErrorResetKey] = useState(0);
  const [globalDropActive, setGlobalDropActive] = useState(false);
  const dragCounterRef = useRef(0);
  const { addRecentTool } = useRecentTools();

  const currentToolId = route.toolId;
  const currentPage = route.page;

  useEffect(() => {
    function onHashChange() {
      const newRoute = getRouteFromHash();
      setRoute(newRoute);
      setErrorResetKey(k => k + 1);
      // Track recently used tools on every navigation (sidebar clicks, hash changes, etc.)
      if (newRoute.toolId) addRecentTool(newRoute.toolId);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [addRecentTool]);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      <Topbar
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        showMenuButton={isMobile}
        onLogoClick={goHome}
        currentPage={currentPage}
        onNavigate={navigateTo}
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
          {currentToolId && ToolComponent && (
            <ErrorBoundary
              resetKey={errorResetKey}
              fallback={<ToolErrorFallback onReset={() => setErrorResetKey(k => k + 1)} />}
            >
              <Suspense fallback={<ToolSkeleton />}>
                <div className="tool-header">
                  <h1 className="tool-title">{currentTool?.name}</h1>
                </div>
                <ToolComponent
                  tool={currentTool}
                  navigateTo={navigateTo}
                />
                <RelatedTools toolId={currentToolId} onNavigate={navigateTo} />
              </Suspense>
            </ErrorBoundary>
          )}
          {currentToolId && !ToolComponent && (
            <div className="tool-placeholder">
              <h1 className="tool-title">{currentTool?.name || 'Unknown Tool'}</h1>
              <p className="tool-placeholder-text">This tool is coming soon.</p>
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
    </div>
  );
}
