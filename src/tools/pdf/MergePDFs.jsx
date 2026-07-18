import { useState, useCallback, useRef } from 'react';
import { GripVertical, X, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PDFDocument } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument, pdfHasFormFields } from '../../utils/pdfThumbnails';
import { FormFieldsNotice } from '../../components/ui/ToolCaveats';

function SortableFileCard({ item, onRemove, index, thumbSize }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const thumbH = Math.round(thumbSize * 1.414); // A4 aspect ratio

  return (
    <div ref={setNodeRef} style={style} className={`merge-file-card${item.encrypted ? ' merge-file-card--encrypted' : ''}`}>
      {/* Order badge */}
      <span className="merge-file-order">{index + 1}</span>

      {/* Remove button */}
      <button
        className="merge-file-remove"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.name}`}
      >
        <X size={14} />
      </button>

      {/* Drag handle + thumbnail */}
      <button
        className="merge-file-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <div
          className="merge-file-thumb-wrap"
          style={{ width: thumbSize, height: thumbH }}
        >
          {item.thumbnail
            ? <img src={item.thumbnail} alt="" className="merge-file-thumbnail" />
            : <div className="merge-file-thumb-placeholder"><AlertTriangle size={20} /></div>
          }
        </div>
        <GripVertical size={14} className="merge-file-grip-icon" />
      </button>

      {/* Info */}
      <div className="merge-file-info">
        <p className="merge-file-name" title={item.name}>{item.name}</p>
        <p className="merge-file-meta">
          {item.pageCount != null ? `${item.pageCount}p` : ''}
          {item.pageCount != null && ' · '}
          {formatFileSize(item.size)}
        </p>
        {item.encrypted && (
          <p className="merge-file-encrypted">
            <AlertTriangle size={12} /> Encrypted
          </p>
        )}
        {item.hasFormFields && (
          <p className="merge-file-formfields">
            <AlertTriangle size={12} /> Form fields
          </p>
        )}
      </div>
    </div>
  );
}

export default function MergePDFs({ tool, navigateTo }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [thumbSize, setThumbSize] = useState(110);
  const idCounter = useRef(0);

  const validFileCount = files.filter(f => !f.encrypted).length;

  const handleFilesSelected = useCallback(async (selectedFiles) => {
    setError(null);
    const newItems = [];

    for (const file of selectedFiles) {
      const isValid = await validatePDFHeader(file);
      if (!isValid) {
        setError('One or more files are not valid PDFs and were skipped.');
        continue;
      }

      const id = `file-${++idCounter.current}`;
      const item = {
        id,
        name: file.name,
        size: file.size,
        file,
        thumbnail: null,
        pageCount: null,
        encrypted: false,
        hasFormFields: false,
      };

      try {
        const bytes = await file.arrayBuffer();
        const uint8 = new Uint8Array(bytes);
        const { pdfDoc, isEncrypted } = await loadPdfLibDocument(uint8, { PDFDocument });
        if (isEncrypted) {
          item.encrypted = true;
        } else {
          item.pageCount = pdfDoc.getPageCount();
          // Advisory form-field scan — updates the card + notice when it
          // completes. Must be kicked off before the thumbnail render below
          // transfers this buffer to the pdfjs worker (pdfHasFormFields
          // copies the bytes synchronously at call time).
          pdfHasFormFields(uint8).then(has => {
            if (has) {
              setFiles(prev => prev.map(f => (f.id === id ? { ...f, hasFormFields: true } : f)));
            }
          });
        }

        if (!item.encrypted) {
          try {
            const pdfJsDoc = await loadPdfDocument(new Uint8Array(bytes));
            item.thumbnail = await renderPageThumbnail(pdfJsDoc, 1);
            pdfJsDoc.destroy();
          } catch (e) {
            console.error('Thumbnail rendering failed:', e);
            // Thumbnail failure is non-critical
          }
        }
      } catch (e) {
        console.error('PDF file load failed:', e);
        // Load failure — skip silently, file may be corrupt
        setError('One or more files could not be read and were skipped.');
        continue;
      }

      newItems.push(item);
    }

    setFiles(prev => [...prev, ...newItems]);
  }, []);

  const handleRemove = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFiles(prev => {
        const oldIndex = prev.findIndex(f => f.id === active.id);
        const newIndex = prev.findIndex(f => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleMerge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const merged = await PDFDocument.create();
      const validFiles = files.filter(f => !f.encrypted);

      for (const item of validFiles) {
        const bytes = await item.file.arrayBuffer();
        const { pdfDoc: donor } = await loadPdfLibDocument(new Uint8Array(bytes), { PDFDocument });
        const pages = await merged.copyPages(donor, donor.getPageIndices());
        for (const page of pages) {
          merged.addPage(page);
        }
      }

      const mergedBytes = await merged.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Build filename incorporating all source names
      const baseNames = validFiles.map(f =>
        f.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '-')
      );
      const combined = baseNames.length <= 3
        ? baseNames.join('-')
        : `${baseNames[0]}-${baseNames[1]}-and-${baseNames.length - 2}-more`;
      const filename = `${combined}-merged.pdf`;

      setResult({
        filename,
        originalSize: validFiles.reduce((sum, f) => sum + f.size, 0),
        resultSize: mergedBytes.byteLength,
        downloadUrl: url,
      });
    } catch {
      setError('Something went wrong while merging the PDFs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [files]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFiles([]);
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
        description="Combines multiple PDF files into a single document in the order you choose. All merging happens in your browser using pdf-lib — your documents are never sent anywhere. Useful for compiling reports, consolidating research materials, or bundling submission documents."
      />

      {error === '__encrypted__' ? (
        <EncryptedPDFError onNavigate={navigateTo} />
      ) : error ? (
        <ErrorCard title="Error" message={error} />
      ) : null}

      <DropZone
        accept=".pdf"
        validationConfig={PDF_VALIDATION}
        multiple
        onFilesSelected={handleFilesSelected}
        label="Drop PDF files here or click to browse"
        sublabel="You can add multiple files"
      />

      {files.length > 0 && (
        <>
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(70, s - 20))} disabled={thumbSize <= 70} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(220, s + 20))} disabled={thumbSize >= 220} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="merge-file-grid">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={files.map(f => f.id)} strategy={rectSortingStrategy}>
                {files.map((item, i) => (
                  <SortableFileCard key={item.id} item={item} index={i} onRemove={handleRemove} thumbSize={thumbSize} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      {files.some(f => f.hasFormFields) && (
        <FormFieldsNotice
          action="merging"
          filenames={files.filter(f => f.hasFormFields).map(f => f.name)}
        />
      )}

      <ActionButton
        label={`Merge ${validFileCount} PDF${validFileCount !== 1 ? 's' : ''}`}
        onClick={handleMerge}
        disabled={validFileCount < 2}
        loading={loading}
      />
    </div>
  );
}
