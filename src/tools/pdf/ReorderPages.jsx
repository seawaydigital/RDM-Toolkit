import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument, pdfHasFormFields } from '../../utils/pdfThumbnails';
import { FormFieldsNotice } from '../../components/ui/ToolCaveats';

const DESCRIPTION =
  'Rearranges the pages of a PDF into any order you choose. Drag thumbnails to reposition pages, or type a custom page order directly. Your PDF is processed entirely in your browser.';

/* ------------------------------------------------------------------ */
/*  Sortable thumbnail card                                           */
/* ------------------------------------------------------------------ */
function SortableCard({ id, originalPage, position, thumbUrl, selected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  function handleClick(e) {
    onSelect(id, e.shiftKey);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`reorder-card ${selected ? 'reorder-card--selected' : ''}`}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {thumbUrl ? (
        <img src={thumbUrl} alt={`Page ${originalPage}`} className="reorder-card-thumb" draggable={false} />
      ) : (
        <div className="reorder-card-placeholder">Loading...</div>
      )}
      <span className="reorder-card-badge-original">{originalPage}</span>
      <span className="reorder-card-badge-position">{position}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ReorderPages({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [hasFormFields, setHasFormFields] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [order, setOrder] = useState([]); // array of page ids like "page-1", "page-2"
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inputMode, setInputMode] = useState('drag'); // 'drag' | 'manual'
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [singlePageMsg, setSinglePageMsg] = useState(false);
  const [thumbSize, setThumbSize] = useState(160);

  const originalOrder = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => `page-${i + 1}`),
    [pageCount],
  );

  const orderUnchanged = useMemo(
    () => order.length > 0 && order.every((id, i) => id === originalOrder[i]),
    [order, originalOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* helpers */
  const pageNum = (id) => parseInt(id.replace('page-', ''), 10);

  /* ---- file upload ---- */
  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setResult(null);
    setSinglePageMsg(false);
    setHasFormFields(false);
    try {
      const valid = await validatePDFHeader(f);
      if (!valid) {
        setError('The selected file does not appear to be a valid PDF.');
        return;
      }
      const bytes = await f.arrayBuffer();
      const uint8 = new Uint8Array(bytes).slice();

      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(uint8, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      const count = pdfDoc.getPageCount();
      if (count < 2) {
        setFile(f);
        setFileBytes(uint8);
        setPageCount(count);
        setSinglePageMsg(true);
        return;
      }

      setFile(f);
      setFileBytes(uint8);
      setPageCount(count);

      // Advisory form-field scan (copies bytes synchronously — safe to run
      // before the thumbnail render below slices this buffer).
      pdfHasFormFields(uint8).then(setHasFormFields);

      const ids = Array.from({ length: count }, (_, i) => `page-${i + 1}`);
      setOrder(ids);
      setManualInput(ids.map((_, i) => i + 1).join(', '));

      /* thumbnails */
      const pdfJsDoc = await loadPdfDocument(uint8.slice());
      setThumbnails({});
      await renderAllThumbnails(pdfJsDoc, (num, url) => {
        setThumbnails((prev) => ({ ...prev, [num]: url }));
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to load PDF. The file may be corrupted or in an unsupported format.');
    }
  }, []);

  /* ---- drag end ---- */
  function handleDragEnd(event) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id);
        const newIndex = prev.indexOf(over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        setManualInput(next.map((id) => pageNum(id)).join(', '));
        return next;
      });
    }
  }

  /* ---- selection ---- */
  function handleSelect(id, shift) {
    setSelectedIds((prev) => {
      const next = new Set(shift ? prev : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /* ---- toolbar actions ---- */
  function resetOrder() {
    setOrder([...originalOrder]);
    setManualInput(originalOrder.map((_, i) => i + 1).join(', '));
    setSelectedIds(new Set());
  }

  function reverseOrder() {
    setOrder((prev) => {
      const reversed = [...prev].reverse();
      setManualInput(reversed.map((id) => pageNum(id)).join(', '));
      return reversed;
    });
    setSelectedIds(new Set());
  }

  function moveSelectedToFront() {
    if (selectedIds.size === 0) return;
    setOrder((prev) => {
      const sel = prev.filter((id) => selectedIds.has(id));
      const rest = prev.filter((id) => !selectedIds.has(id));
      const next = [...sel, ...rest];
      setManualInput(next.map((id) => pageNum(id)).join(', '));
      return next;
    });
  }

  function moveSelectedToBack() {
    if (selectedIds.size === 0) return;
    setOrder((prev) => {
      const sel = prev.filter((id) => selectedIds.has(id));
      const rest = prev.filter((id) => !selectedIds.has(id));
      const next = [...rest, ...sel];
      setManualInput(next.map((id) => pageNum(id)).join(', '));
      return next;
    });
  }

  /* ---- manual input ---- */
  function handleManualChange(e) {
    const val = e.target.value;
    setManualInput(val);
    setManualError(null);

    const parts = val
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const nums = parts.map(Number);

    if (parts.some((s) => isNaN(Number(s)) || !Number.isInteger(Number(s)))) {
      setManualError('Only whole numbers separated by commas are allowed.');
      return;
    }

    const outOfRange = nums.filter((n) => n < 1 || n > pageCount);
    if (outOfRange.length > 0) {
      setManualError(`Page numbers out of range: ${outOfRange.join(', ')}. Must be 1\u2013${pageCount}.`);
      return;
    }

    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    if (dupes.length > 0) {
      setManualError(`Duplicate pages: ${[...new Set(dupes)].join(', ')}.`);
      return;
    }

    const missing = [];
    for (let i = 1; i <= pageCount; i++) {
      if (!nums.includes(i)) missing.push(i);
    }
    if (missing.length > 0) {
      setManualError(`Missing pages: ${missing.join(', ')}.`);
      return;
    }

    if (nums.length !== pageCount) {
      setManualError(`Expected ${pageCount} pages, got ${nums.length}.`);
      return;
    }
  }

  function applyManualOrder() {
    if (manualError) return;
    const nums = manualInput
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number);
    if (nums.length !== pageCount) return;
    setOrder(nums.map((n) => `page-${n}`));
    setSelectedIds(new Set());
  }

  /* ---- process ---- */
  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const { pdfDoc: srcDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setEncryptedError(true);
        return;
      }
      const destDoc = await PDFDocument.create();
      const pageIndices = order.map((id) => pageNum(id) - 1);
      const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => destDoc.addPage(p));
      const outputBytes = await destDoc.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({
        filename: buildOutputFilename(file.name, 'reordered', 'pdf'),
        originalSize: file.size,
        resultSize: outputBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while reordering the PDF pages. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setOrder([]);
    setSelectedIds(new Set());
    setManualInput('');
    setManualError(null);
    setError(null);
    setEncryptedError(false);
    setSinglePageMsg(false);
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setThumbnails({});
    setOrder([]);
    setSelectedIds(new Set());
    setManualInput('');
    setManualError(null);
    setResult(null);
    setError(null);
    setEncryptedError(false);
    setSinglePageMsg(false);
  }

  /* ---- render ---- */
  if (result) {
    return (
      <div className="tool-container">
        <InfoCard description={DESCRIPTION} />
        <ResultPanel {...result} onStartOver={handleStartOver} />
      </div>
    );
  }

  return (
    <div className="tool-container">
      <InfoCard description={DESCRIPTION} />

      {encryptedError && <EncryptedPDFError onNavigate={navigateTo} />}
      {error && <ErrorCard title="Error" message={error} />}

      {!file && !encryptedError && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFilesSelected}
          label="Drop a PDF here or click to browse"
          sublabel="Single PDF file"
        />
      )}

      {singlePageMsg && (
        <div className="reorder-message">
          <p>This PDF has only one page. Reordering requires at least two pages.</p>
          <button className="reorder-startover-btn" onClick={handleStartOver}>Choose a different file</button>
        </div>
      )}

      {file && pageCount >= 2 && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {/* Mode toggle */}
          <div className="reorder-mode-tabs">
            <button
              className={`reorder-mode-tab ${inputMode === 'drag' ? 'reorder-mode-tab--active' : ''}`}
              onClick={() => setInputMode('drag')}
            >
              Drag to Reorder
            </button>
            <button
              className={`reorder-mode-tab ${inputMode === 'manual' ? 'reorder-mode-tab--active' : ''}`}
              onClick={() => setInputMode('manual')}
            >
              Type Page Order
            </button>
          </div>

          {inputMode === 'drag' && (
            <>
              {/* Toolbar */}
              <div className="reorder-toolbar">
                <button className="reorder-toolbar-btn" onClick={resetOrder}>Reset to Original Order</button>
                <button className="reorder-toolbar-btn" onClick={reverseOrder}>Reverse All Pages</button>
                <button
                  className="reorder-toolbar-btn"
                  onClick={moveSelectedToFront}
                  disabled={selectedIds.size === 0}
                >
                  Move Selected to Front
                </button>
                <button
                  className="reorder-toolbar-btn"
                  onClick={moveSelectedToBack}
                  disabled={selectedIds.size === 0}
                >
                  Move Selected to Back
                </button>
              </div>
              <p className="reorder-hint">Shift-click to select multiple pages.</p>

              {/* Zoom + Grid */}
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(100, s - 40))} disabled={thumbSize <= 100} aria-label="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-label">{thumbSize}px</span>
                <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={order} strategy={rectSortingStrategy}>
                  <div className="reorder-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
                    {order.map((id, idx) => (
                      <SortableCard
                        key={id}
                        id={id}
                        originalPage={pageNum(id)}
                        position={idx + 1}
                        thumbUrl={thumbnails[pageNum(id)]}
                        selected={selectedIds.has(id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {inputMode === 'manual' && (
            <div className="reorder-manual">
              <label className="reorder-manual-label">
                Enter page order (comma-separated, e.g. "3, 1, 2, 5, 4"):
              </label>
              <textarea
                className="reorder-manual-input"
                value={manualInput}
                onChange={handleManualChange}
                rows={3}
              />
              {manualError && <p className="reorder-manual-error">{manualError}</p>}
              <button
                className="reorder-toolbar-btn"
                onClick={applyManualOrder}
                disabled={!!manualError || manualInput.trim().length === 0}
              >
                Apply Order
              </button>
            </div>
          )}

          {hasFormFields && <FormFieldsNotice action="reordering" />}

          <ActionButton
            label="Reorder Pages"
            onClick={handleProcess}
            disabled={orderUnchanged || processing}
            loading={processing}
          />
        </>
      )}
    </div>
  );
}
