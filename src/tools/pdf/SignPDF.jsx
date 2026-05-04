import { useState, useCallback, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Draw or type a signature and place it anywhere on a PDF page \u2014 entirely in your browser. Your document and signature are never uploaded or transmitted.';

const DISCLAIMER =
  'This tool produces a visual signature embedded as an image overlay. It does NOT create a legally certified digital signature under eIDAS, the ESIGN Act, or similar regulations. For legally binding digital signatures, use a qualified certificate-based signing service.';

const SIG_MODES = ['Draw', 'Type', 'Upload Image'];

const CHECKERBOARD_CSS = `repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px`;

function dataUrlToBytes(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  if (!meta || !data || !meta.startsWith('data:')) {
    throw new Error('Invalid signature image data.');
  }
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/* ------------------------------------------------------------------ */
/*  Drawing canvas (transparent background)                            */
/* ------------------------------------------------------------------ */
function DrawCanvas({ penColour, penSize, onSignatureChange }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  }

  function draw(e) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = penColour;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Canvas already has transparent background - export as PNG with alpha preserved
    onSignatureChange(canvasRef.current.toDataURL('image/png'));
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange(null);
  }

  return (
    <div className="sign-draw">
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        className="sign-draw-canvas"
        style={{ background: CHECKERBOARD_CSS }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button className="sign-clear-btn" onClick={clearCanvas} type="button">Clear</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typed signature (transparent background)                           */
/* ------------------------------------------------------------------ */
function TypeSignature({ onSignatureChange }) {
  const [text, setText] = useState('');
  const [sigFontSize, setSigFontSize] = useState(48);
  const [sigColour, setSigColour] = useState('#000000');
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Clear to transparent - no white fill
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (text.trim()) {
      ctx.fillStyle = sigColour;
      ctx.font = `italic ${sigFontSize}px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 20, canvas.height / 2);
      onSignatureChange(canvas.toDataURL('image/png'));
    } else {
      onSignatureChange(null);
    }
  }, [text, sigFontSize, sigColour, onSignatureChange]);

  return (
    <div className="sign-type">
      <input
        type="text"
        className="sign-type-input"
        placeholder="Type your signature"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="sign-type-controls">
        <label className="sign-type-label">
          Size
          <input type="range" min={24} max={72} value={sigFontSize} onChange={(e) => setSigFontSize(Number(e.target.value))} />
          <span>{sigFontSize}px</span>
        </label>
        <label className="sign-type-label">
          Colour
          <input type="color" value={sigColour} onChange={(e) => setSigColour(e.target.value)} />
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        className="sign-type-preview"
        style={{ background: CHECKERBOARD_CSS }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function SignPDF({ tool, navigateTo }) {
  /* Step 1: Signature creation */
  const [sigMode, setSigMode] = useState(0);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [penColour, setPenColour] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [uploadedSigUrl, setUploadedSigUrl] = useState(null);

  /* Step 2: Upload PDF */
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});

  /* Step 3: Select page */
  const [selectedPage, setSelectedPage] = useState(null);

  /* Step 4: Place signature */
  const [pagePreview, setPagePreview] = useState(null);
  const [sigPosPercent, setSigPosPercent] = useState({ x: 50, y: 80 });
  const [sigSizePercent, setSigSizePercent] = useState(30);
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const previewRef = useRef(null);

  /* Common state */
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [thumbSize, setThumbSize] = useState(160);

  const activeSigUrl = sigMode === 2 ? uploadedSigUrl : signatureDataUrl;

  /* ---- file upload (Step 2) ---- */
  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setPagePreview(null);
    setSelectedPage(null);
    try {
      const valid = await validatePDFHeader(f);
      if (!valid) {
        setError('The selected file does not appear to be a valid PDF.');
        return;
      }
      const bytes = await f.arrayBuffer();
      const uint8 = new Uint8Array(bytes).slice();

      const { isEncrypted } = await loadPdfLibDocument(uint8, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      const pdfJsDoc = await loadPdfDocument(uint8.slice());
      const count = pdfJsDoc.numPages;
      setFile(f);
      setFileBytes(uint8);
      setPageCount(count);
      setSelectedPage(count); // default last page
      setThumbnails({});
      await renderAllThumbnails(pdfJsDoc, (num, url) => {
        setThumbnails((prev) => ({ ...prev, [num]: url }));
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to load PDF. The file may be corrupted or in an unsupported format.');
    }
  }, []);

  /* ---- render large page preview for placement (Step 4) ---- */
  async function loadPagePreview(pageNum) {
    try {
      const pdfJsDoc = await loadPdfDocument(fileBytes.slice());
      // Render at scale 1.5 for a large, detailed preview
      const preview = await renderPageThumbnail(pdfJsDoc, pageNum, 1.5);
      setPagePreview(preview);
      pdfJsDoc.destroy();
    } catch (e) {
      console.error('Page preview rendering failed:', e);
      setError('Failed to render page preview.');
    }
  }

  /* ---- when user selects a page ---- */
  function handlePageSelect(num) {
    setSelectedPage(num);
  }

  /* ---- proceed from page selection to placement ---- */
  async function handleGoToPlacement() {
    if (!selectedPage) return;
    await loadPagePreview(selectedPage);
    setStep(4);
  }

  /* ---- signature drag & resize on preview ---- */
  const dragMode = useRef(null); // 'move' | 'resize'
  const dragStart = useRef({ x: 0, y: 0, origPos: null, origSize: 0 });

  function getEventPct(e) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  function handlePreviewMouseDown(e) {
    e.preventDefault();
    const pct = getEventPct(e);
    dragMode.current = 'move';
    dragStart.current = { x: pct.x, y: pct.y, origPos: { ...sigPosPercent }, origSize: sigSizePercent };
    setIsDraggingSig(true);
    setSigPosPercent({ x: Math.max(0, Math.min(100, pct.x)), y: Math.max(0, Math.min(100, pct.y)) });
  }

  function handleResizeMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const pct = getEventPct(e);
    dragMode.current = 'resize';
    dragStart.current = { x: pct.x, y: pct.y, origPos: { ...sigPosPercent }, origSize: sigSizePercent };
    setIsDraggingSig(true);
  }

  function handlePreviewMouseMove(e) {
    if (!isDraggingSig) return;
    const pct = getEventPct(e);

    if (dragMode.current === 'resize') {
      // Distance from centre determines width — aspect ratio is locked via CSS
      const dx = pct.x - sigPosPercent.x;
      const newSize = Math.max(5, Math.min(80, Math.abs(dx) * 2));
      setSigSizePercent(newSize);
    } else {
      setSigPosPercent({
        x: Math.max(0, Math.min(100, pct.x)),
        y: Math.max(0, Math.min(100, pct.y)),
      });
    }
  }

  function handlePreviewMouseUp() {
    setIsDraggingSig(false);
    dragMode.current = null;
  }

  /* ---- image upload for signature ---- */
  function handleSigImageUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a PNG, JPG, or WebP image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedSigUrl(reader.result);
    reader.readAsDataURL(f);
  }

  /* ---- embed signature into PDF ---- */
  async function handleEmbed() {
    setProcessing(true);
    setError(null);
    try {
      const pdfDoc = await PDFDocument.load(fileBytes.slice());
      const page = pdfDoc.getPages()[selectedPage - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const sigBytes = dataUrlToBytes(activeSigUrl);

      // Always embed as PNG to preserve transparency / alpha channel
      let sigImage;
      if (activeSigUrl.includes('image/png')) {
        sigImage = await pdfDoc.embedPng(sigBytes);
      } else {
        // For JPG/WebP uploads, convert to PNG via canvas to preserve alpha
        const img = new Image();
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        img.src = activeSigUrl;
        await loadPromise;

        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const ctx = cvs.getContext('2d');
        // Do NOT fill background - keep transparent
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = cvs.toDataURL('image/png');
        const pngBytes = dataUrlToBytes(pngDataUrl);
        sigImage = await pdfDoc.embedPng(pngBytes);
        cvs.remove();
      }

      const sigDrawWidth = (sigSizePercent / 100) * pageWidth;
      const sigAspect = sigImage.height / sigImage.width;
      const sigDrawHeight = sigDrawWidth * sigAspect;

      const x = (sigPosPercent.x / 100) * pageWidth - sigDrawWidth / 2;
      const y = (1 - sigPosPercent.y / 100) * pageHeight - sigDrawHeight / 2;

      page.drawImage(sigImage, {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: sigDrawWidth,
        height: sigDrawHeight,
      });

      const outputBytes = await pdfDoc.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({
        filename: buildOutputFilename(file.name, 'signed', 'pdf'),
        originalSize: file.size,
        resultSize: outputBytes.byteLength,
        downloadUrl: url,
      });
    } catch (err) {
      if (err?.message?.toLowerCase().includes('encrypted') || err?.message?.toLowerCase().includes('password')) {
        setEncryptedError(true);
      } else {
        setError('Something went wrong while embedding the signature. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setSelectedPage(null);
    setPagePreview(null);
    setSigPosPercent({ x: 50, y: 80 });
    setSigSizePercent(30);
    setError(null);
    setEncryptedError(false);
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    handleRemoveFile();
    setSigMode(0);
    setSignatureDataUrl(null);
    setPenColour('#000000');
    setPenSize(3);
    setUploadedSigUrl(null);
    setStep(1);
    setResult(null);
  }

  /* ---- step labels ---- */
  const STEPS = [
    '1. Create Signature',
    '2. Upload PDF',
    '3. Select Page',
    '4. Place Signature',
  ];

  /* ---- render result ---- */
  if (result) {
    return (
      <div>
        <InfoCard
          description={DESCRIPTION}
          limitations={[
            'This is a visual signature only — not a legally certified digital signature',
            'Does not add cryptographic verification or audit trail',
            "Check your jurisdiction's requirements for legally binding signatures",
          ]}
        />
        <ResultPanel {...result} onStartOver={handleStartOver} />
      </div>
    );
  }

  return (
    <div>
      <InfoCard
        description={DESCRIPTION}
        limitations={[
          'This is a visual signature only — not a legally certified digital signature',
          'Does not add cryptographic verification or audit trail',
          "Check your jurisdiction's requirements for legally binding signatures",
        ]}
      />

      <div className="info-card" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: 'var(--space-lg)' }}>
        <p className="info-card-description" style={{ fontSize: 13 }}>{DISCLAIMER}</p>
      </div>

      {encryptedError && <EncryptedPDFError onNavigate={navigateTo} />}
      {error && <ErrorCard title="Error" message={error} />}

      {/* Step indicator */}
      <div className="sign-steps-indicator">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          let className = 'sign-step-dot';
          if (step === stepNum) className += ' sign-step-dot--active';
          else if (step > stepNum) className += ' sign-step-dot--done';
          return <span key={label} className={className}>{label}</span>;
        })}
      </div>

      {/* ===== STEP 1: Create signature ===== */}
      {step === 1 && (
        <>
          <h3 className="sign-section-title">Create Your Signature</h3>

          <div className="sign-mode-tabs">
            {SIG_MODES.map((mode, idx) => (
              <button
                key={mode}
                className={`sign-mode-tab ${sigMode === idx ? 'sign-mode-tab--active' : ''}`}
                onClick={() => setSigMode(idx)}
              >
                {mode}
              </button>
            ))}
          </div>

          {sigMode === 0 && (
            <div className="sign-draw-wrapper">
              <div className="sign-draw-controls">
                <label className="sign-colour-label">
                  Pen Colour
                  <input type="color" value={penColour} onChange={(e) => setPenColour(e.target.value)} />
                </label>
                <label className="sign-colour-label">
                  Pen Size
                  <input type="range" min={1} max={8} step={0.5} value={penSize} onChange={(e) => setPenSize(Number(e.target.value))} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 28, textAlign: 'center' }}>{penSize}px</span>
                </label>
              </div>
              <DrawCanvas penColour={penColour} penSize={penSize} onSignatureChange={setSignatureDataUrl} />
            </div>
          )}

          {sigMode === 1 && (
            <TypeSignature onSignatureChange={setSignatureDataUrl} />
          )}

          {sigMode === 2 && (
            <div className="sign-upload-wrapper">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleSigImageUpload}
                className="sign-upload-input"
              />
              {uploadedSigUrl && (
                <img
                  src={uploadedSigUrl}
                  alt="Uploaded signature"
                  className="sign-upload-preview"
                  style={{ background: CHECKERBOARD_CSS }}
                />
              )}
            </div>
          )}

          {/* Signature preview */}
          {activeSigUrl && (
            <div className="sign-sig-preview">
              <p className="sign-sig-preview-label">Your signature:</p>
              <img
                src={activeSigUrl}
                alt="Signature preview"
                className="sign-sig-preview-img"
                style={{ background: CHECKERBOARD_CSS }}
              />
            </div>
          )}

          <div className="sign-step-nav">
            <span />
            <button
              className="sign-next-btn"
              onClick={() => setStep(2)}
              disabled={!activeSigUrl}
            >
              Next: Upload PDF <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ===== STEP 2: Upload PDF ===== */}
      {step === 2 && (
        <>
          <h3 className="sign-section-title">Upload Your PDF</h3>

          {/* Compact signature preview */}
          {activeSigUrl && (
            <div className="sign-sig-preview sign-sig-preview--compact">
              <img
                src={activeSigUrl}
                alt="Your signature"
                className="sign-sig-preview-img"
                style={{ background: CHECKERBOARD_CSS, maxHeight: 60 }}
              />
              <button className="sign-back-btn" onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Change Signature
              </button>
            </div>
          )}

          {!file && !encryptedError && (
            <DropZone
              accept=".pdf"
              validationConfig={PDF_VALIDATION}
              onFilesSelected={handleFilesSelected}
              label="Drop a PDF here or click to browse"
              sublabel="Single PDF file"
            />
          )}

          {file && (
            <>
              <div className="tool-file-preview">
                <span className="tool-file-name">{file.name}</span>
                <span className="tool-file-size">{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                  <X size={14} />
                  Remove
                </button>
              </div>

              <div className="sign-step-nav">
                <button className="sign-back-btn" onClick={() => setStep(1)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  className="sign-next-btn"
                  onClick={() => setStep(3)}
                >
                  Next: Select Page <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== STEP 3: Select page ===== */}
      {step === 3 && (
        <>
          <h3 className="sign-section-title">Select the Page to Sign</h3>
          <p className="sign-section-subtitle">Click a page thumbnail to select it (default: last page)</p>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(80, s - 40))} disabled={thumbSize <= 80} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="sign-page-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
              <div
                key={num}
                className={`sign-page-card ${selectedPage === num ? 'sign-page-card--selected' : ''}`}
                onClick={() => handlePageSelect(num)}
              >
                {thumbnails[num] ? (
                  <img src={thumbnails[num]} alt={`Page ${num}`} className="sign-page-thumb" draggable={false} />
                ) : (
                  <div className="sign-page-placeholder">Loading...</div>
                )}
                <span className="sign-page-num">{num}</span>
              </div>
            ))}
          </div>

          <div className="sign-step-nav">
            <button className="sign-back-btn" onClick={() => setStep(2)}>
              <ChevronLeft size={14} /> Back
            </button>
            <button
              className="sign-next-btn"
              onClick={handleGoToPlacement}
              disabled={!selectedPage}
            >
              Next: Place Signature <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ===== STEP 4: Place signature on page ===== */}
      {step === 4 && (
        <>
          <h3 className="sign-section-title">Place Your Signature on Page {selectedPage}</h3>
          <p className="sign-section-subtitle">Click to position. Drag corner handles to resize (aspect ratio locked).</p>

          {pagePreview ? (
            <div
              ref={previewRef}
              className="sign-placement-container"
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              onTouchStart={handlePreviewMouseDown}
              onTouchMove={(e) => { e.preventDefault(); handlePreviewMouseMove(e); }}
              onTouchEnd={handlePreviewMouseUp}
            >
              <img
                src={pagePreview}
                alt={`Page ${selectedPage} preview`}
                className="sign-placement-page"
                draggable={false}
              />
              {activeSigUrl && (
                <div
                  className="sign-transform-box"
                  style={{
                    left: `${sigPosPercent.x}%`,
                    top: `${sigPosPercent.y}%`,
                    width: `${sigSizePercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img
                    src={activeSigUrl}
                    alt="Signature"
                    className="sign-transform-img"
                    draggable={false}
                  />
                  {/* Corner resize handles */}
                  <div className="sign-resize-handle sign-resize-handle--tl" onMouseDown={handleResizeMouseDown} onTouchStart={handleResizeMouseDown} />
                  <div className="sign-resize-handle sign-resize-handle--tr" onMouseDown={handleResizeMouseDown} onTouchStart={handleResizeMouseDown} />
                  <div className="sign-resize-handle sign-resize-handle--bl" onMouseDown={handleResizeMouseDown} onTouchStart={handleResizeMouseDown} />
                  <div className="sign-resize-handle sign-resize-handle--br" onMouseDown={handleResizeMouseDown} onTouchStart={handleResizeMouseDown} />
                </div>
              )}
            </div>
          ) : (
            <div className="sign-placement-hint">
              <p>Loading page preview...</p>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
            Current size: {sigSizePercent.toFixed(0)}% of page width
          </p>

          <div className="sign-step-nav">
            <button className="sign-back-btn" onClick={() => setStep(3)}>
              <ChevronLeft size={14} /> Back to Page Selection
            </button>
            <ActionButton
              label="Embed Signature"
              onClick={handleEmbed}
              disabled={!activeSigUrl || !pagePreview || processing}
              loading={processing}
            />
          </div>
        </>
      )}
    </div>
  );
}
