import { useState, useCallback } from 'react';
import { RotateCw, GripVertical, X } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

function SortablePageCard({ page, onRotate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rotate-page-card">
      <div
        className="rotate-page-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </div>
      <div className="rotate-page-thumb-wrapper">
        {page.thumbnail ? (
          <img
            src={page.thumbnail}
            alt={`Page ${page.originalIndex}`}
            className="rotate-page-thumbnail"
            style={{ transform: `rotate(${page.rotation}deg)` }}
          />
        ) : (
          <div
            className="thumbnail-placeholder"
            style={{ transform: `rotate(${page.rotation}deg)` }}
          />
        )}
      </div>
      <div className="rotate-page-footer">
        <span className="rotate-page-label">{page.originalIndex}</span>
        <button
          className="rotate-page-btn"
          onClick={() => onRotate(page.id)}
          aria-label={`Rotate page ${page.originalIndex}`}
          title="Rotate 90° clockwise"
        >
          <RotateCw size={14} />
        </button>
      </div>
    </div>
  );
}

export default function RotateReorderPages({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const hasChanges = pages.some(
    (p, i) => p.originalIndex !== i + 1 || p.rotation !== 0
  );

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setResult(null);
    setPages([]);

    const isValid = await validatePDFHeader(selectedFile);
    if (!isValid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    try {
      const rawBytes = await selectedFile.arrayBuffer();
      const bytesCopy = new Uint8Array(rawBytes).slice();

      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(bytesCopy, { PDFDocument });
      if (isEncrypted) {
        setError('__encrypted__');
        return;
      }

      const count = pdfDoc.getPageCount();
      setFile(selectedFile);
      setFileBytes(bytesCopy);

      // Initialize page state
      const initial = Array.from({ length: count }, (_, i) => ({
        id: `page-${i + 1}`,
        originalIndex: i + 1,
        rotation: 0,
        thumbnail: null,
      }));
      setPages(initial);

      // Render thumbnails progressively
      const pdfJsDoc = await loadPdfDocument(bytesCopy.slice());
      renderAllThumbnails(pdfJsDoc, (pageNum, dataUrl) => {
        setPages(prev =>
          prev.map(p =>
            p.originalIndex === pageNum ? { ...p, thumbnail: dataUrl } : p
          )
        );
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Something went wrong while reading the PDF. Please try a different file.');
    }
  }, []);

  const handleRotate = useCallback((id) => {
    setPages(prev =>
      prev.map(p =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPages(prev => {
        const oldIndex = prev.findIndex(p => p.id === active.id);
        const newIndex = prev.findIndex(p => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleResetOrder = useCallback(() => {
    setPages(prev =>
      [...prev].sort((a, b) => a.originalIndex - b.originalIndex)
    );
  }, []);

  const handleResetRotations = useCallback(() => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
  }, []);

  const handleSave = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc: srcDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setError('__encrypted__');
        return;
      }
      const newDoc = await PDFDocument.create();

      const indices = pages.map(p => p.originalIndex - 1);
      const copiedPages = await newDoc.copyPages(srcDoc, indices);

      copiedPages.forEach((copiedPage, i) => {
        const pageState = pages[i];
        if (pageState.rotation !== 0) {
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees(currentRotation + pageState.rotation));
        }
        newDoc.addPage(copiedPage);
      });

      const savedBytes = await newDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(file.name, 'rotated', 'pdf');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: savedBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while processing the PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file, pages]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setError(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setResult(null);
    setError(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />
        <ResultPanel
          filename={result.filename}
          originalSize={result.originalSize}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div>
      <InfoCard
        description="Lets you visually rotate and rearrange pages in a PDF before saving. Useful for fixing scanned documents that came out in the wrong orientation or order."
      />

      {error === '__encrypted__' ? (
        <EncryptedPDFError onNavigate={navigateTo} />
      ) : error ? (
        <ErrorCard title="Error" message={error} />
      ) : null}

      {!file && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF file here or click to browse"
        />
      )}

      {file && pages.length > 0 && (
        <>
          <div className="tool-file-preview">
            <span className="tool-file-name">{file.name}</span>
            <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
              <X size={14} />
              Remove
            </button>
          </div>

          {/* Toolbar */}
          <div className="rotate-toolbar">
            <button
              className="rotate-toolbar-btn"
              onClick={handleResetOrder}
            >
              Reset Order
            </button>
            <button
              className="rotate-toolbar-btn"
              onClick={handleResetRotations}
            >
              Reset All Rotations
            </button>
          </div>

          {/* Page grid */}
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="thumbnail-grid">
                {pages.map(page => (
                  <SortablePageCard
                    key={page.id}
                    page={page}
                    onRotate={handleRotate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <ActionButton
            label="Save Changes"
            onClick={handleSave}
            disabled={!hasChanges}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
