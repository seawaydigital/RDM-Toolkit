import { useState, useCallback, useMemo } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ZoomIn, ZoomOut } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import { IMAGE_VALIDATION, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';

const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89, label: 'A4 (210 × 297 mm)' },
  Letter: { width: 612, height: 792, label: 'Letter (8.5 × 11 in)' },
};

const FIT_OPTIONS = [
  { value: 'fit', label: 'Fit to page (maintain aspect ratio)' },
  { value: 'original', label: 'Original size (centered on page)' },
];

function SortableImageItem({ item, index, onRemove, previewSize }) {
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
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    background: isDragging ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    opacity: isDragging ? 0.8 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex' }}>
        <GripVertical size={16} />
      </div>
      {item.thumbUrl && (
        <img
          src={item.thumbUrl}
          alt={item.file.name}
          style={{ width: previewSize / 2, height: previewSize / 2, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {index + 1}. {item.file.name}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {formatFileSize(item.file.size)}
          {item.dimensions && ` — ${item.dimensions.width} × ${item.dimensions.height}px`}
        </p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
        }}
        aria-label={`Remove ${item.file.name}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

let nextId = 1;

export default function ImageToPDF({ tool }) {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [fitMode, setFitMode] = useState('fit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [previewSize, setPreviewSize] = useState(200);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFilesSelected = useCallback((files) => {
    setError(null);

    const newItems = [];
    let loaded = 0;

    files.forEach((file) => {
      const id = `img-${nextId++}`;
      const thumbUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        newItems.push({
          id,
          file,
          thumbUrl,
          dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        });
        loaded++;
        if (loaded === files.length) {
          setImages(prev => [...prev, ...newItems]);
        }
      };
      img.onerror = () => {
        loaded++;
        URL.revokeObjectURL(thumbUrl);
        if (loaded === files.length) {
          if (newItems.length > 0) setImages(prev => [...prev, ...newItems]);
          else setError('One or more images could not be loaded.');
        }
      };
      img.src = thumbUrl;
    });
  }, []);

  const handleRemoveImage = useCallback((id) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setImages(prev => {
        const oldIndex = prev.findIndex(i => i.id === active.id);
        const newIndex = prev.findIndex(i => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.create();
      const pageDims = PAGE_SIZES[pageSize];

      for (const item of images) {
        const bytes = await item.file.arrayBuffer();
        let embeddedImage;

        if (item.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(bytes);
        } else if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        } else {
          // For WebP and other formats, convert to PNG via canvas first
          const pngBlob = await convertToPngBlob(item.file);
          const pngBytes = await pngBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedPng(pngBytes);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        const page = pdfDoc.addPage([pageDims.width, pageDims.height]);

        if (fitMode === 'fit') {
          // Scale to fit within page while maintaining aspect ratio
          const scaleX = pageDims.width / imgWidth;
          const scaleY = pageDims.height / imgHeight;
          const scale = Math.min(scaleX, scaleY);
          const drawWidth = imgWidth * scale;
          const drawHeight = imgHeight * scale;
          const x = (pageDims.width - drawWidth) / 2;
          const y = (pageDims.height - drawHeight) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
          });
        } else {
          // Original size, centered
          const x = (pageDims.width - imgWidth) / 2;
          const y = (pageDims.height - imgHeight) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: imgWidth,
            height: imgHeight,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = buildOutputFilename(images[0].file.name, 'as-pdf', 'pdf');

      setResult({
        filename,
        resultSize: pdfBytes.byteLength,
        downloadUrl: url,
      });
    } catch (err) {
      console.error('Image to PDF failed:', err);
      setError('Something went wrong while creating the PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [images, pageSize, fitMode]);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    images.forEach(item => {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    });
    setImages([]);
    setResult(null);
    setError(null);
    setPageSize('A4');
    setFitMode('fit');
  }, [result, images]);

  const totalSize = useMemo(() => images.reduce((sum, item) => sum + item.file.size, 0), [images]);

  const selectStyle = {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };

  if (result) {
    return (
      <div>
        <InfoCard description={tool.description} />
        <ResultPanel
          filename={result.filename}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div>
      <InfoCard description="Embeds one or more images into a PDF document, one image per page. Conversion runs entirely in your browser using pdf-lib." />

      {error && <ErrorCard title="Error" message={error} />}

      <DropZone
        accept=".jpg,.jpeg,.png,.webp"
        validationConfig={IMAGE_VALIDATION}
        onFilesSelected={handleFilesSelected}
        multiple
        label={images.length > 0 ? 'Drop more images to add' : 'Drop images here or click to browse'}
        sublabel="Accepts JPG, PNG, WebP"
      />

      {images.length > 0 && (
        <>
          <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
              {images.length} image{images.length !== 1 ? 's' : ''} — {formatFileSize(totalSize)} total — drag to reorder
            </p>
          </div>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.max(100, s - 50))} disabled={previewSize <= 100} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{previewSize}px</span>
            <button className="zoom-btn" onClick={() => setPreviewSize(s => Math.min(500, s + 50))} disabled={previewSize >= 500} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {images.map((item, index) => (
                  <SortableImageItem
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={handleRemoveImage}
                    previewSize={previewSize}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Options */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={e => setPageSize(e.target.value)}
                style={selectStyle}
              >
                {Object.entries(PAGE_SIZES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                Image Sizing
              </label>
              <select
                value={fitMode}
                onChange={e => setFitMode(e.target.value)}
                style={selectStyle}
              >
                {FIT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <ActionButton
            label={`Create PDF (${images.length} page${images.length !== 1 ? 's' : ''})`}
            onClick={handleConvert}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

function convertToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        blob => {
          canvas.remove();
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
