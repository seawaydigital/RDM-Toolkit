import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFNumber, PDFString } from '@cantoo/pdf-lib';
import {
  X,
  Type,
  CheckSquare,
  Circle,
  ChevronDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MousePointer,
  PenLine,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderPageThumbnail, loadPdfDocument, loadPdfLibDocument } from '../../utils/pdfThumbnails';

const DESCRIPTION =
  'Turn a flat PDF into a fillable form. Add text fields, checkboxes, radio buttons, dropdowns, and signature boxes by clicking on the page. Everything runs in your browser — your file is never uploaded.';

const LIMITATIONS = [
  'Only works on flat PDFs without existing form fields',
  'Visual layout (background graphics, lines, labels) is preserved as-is',
  'Signature boxes use the standard PDF signature widget — recipients sign in Adobe Reader\u2019s Fill & Sign or with a digital ID. For drawn signatures inside this app, use Sign PDF.',
];

const FIELD_TYPES = [
  { id: 'text', label: 'Text Field', icon: Type, defaultW: 160, defaultH: 24 },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, defaultW: 18, defaultH: 18 },
  { id: 'radio', label: 'Radio Button', icon: Circle, defaultW: 18, defaultH: 18 },
  { id: 'dropdown', label: 'Dropdown', icon: ChevronDown, defaultW: 160, defaultH: 24 },
  { id: 'signature', label: 'Signature', icon: PenLine, defaultW: 220, defaultH: 60 },
];

const MIN_FIELD_W = 12;
const MIN_FIELD_H = 12;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultName(type, count) {
  const prefix =
    type === 'text' ? 'Text'
    : type === 'checkbox' ? 'Check'
    : type === 'radio' ? 'Radio'
    : type === 'signature' ? 'Signature'
    : 'Dropdown';
  return `${prefix}${count + 1}`;
}

export default function FillablePDFForm({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [fields, setFields] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [hasFormFields, setHasFormFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.9);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoFit, setAutoFit] = useState(true);

  const pageWrapRef = useRef(null);
  const dragStateRef = useRef(null);
  const pageColumnRef = useRef(null);
  const editorRef = useRef(null);

  const firstPage = pages[0];
  const isLandscape = firstPage ? firstPage.pdfWidth > firstPage.pdfHeight : false;

  // Fit-to-width: measure available width in the page column and set zoom.
  useEffect(() => {
    if (!autoFit) return;
    const col = pageColumnRef.current;
    const page = pages[currentPageIdx];
    if (!col || !page) return;

    const measure = () => {
      const available = col.clientWidth - 48;
      if (available <= 0) return;
      const fit = available / page.pdfWidth;
      const clamped = Math.max(0.4, Math.min(2.5, fit));
      setPreviewScale(clamped);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(col);
    return () => ro.disconnect();
  }, [autoFit, pages, currentPageIdx, fullscreen, isLandscape]);

  // Escape exits fullscreen / cancels placement.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (activeTool) setActiveTool(null);
        else if (fullscreen) setFullscreen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool, fullscreen]);

  // Lock body scroll while in fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setHasFormFields(false);
    setResult(null);
    setPages([]);
    setFields([]);
    setSelectedFieldId(null);
    setActiveTool(null);

    const valid = await validatePDFHeader(f);
    if (!valid) {
      setError('The selected file does not appear to be a valid PDF.');
      return;
    }

    try {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf).slice();

      const { pdfDoc, isEncrypted } = await loadPdfLibDocument(bytes, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      const existingForm = pdfDoc.getForm().getFields();
      if (existingForm.length > 0) {
        setHasFormFields(true);
        setFile(f);
        return;
      }

      const pdfJsDoc = await loadPdfDocument(bytes.slice());
      const total = pdfJsDoc.numPages;
      const pageData = [];

      for (let i = 1; i <= total; i++) {
        const p = await pdfJsDoc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        const thumb = await renderPageThumbnail(pdfJsDoc, i, 1.5);
        pageData.push({
          pdfWidth: vp.width,
          pdfHeight: vp.height,
          thumbnail: thumb,
        });
      }
      pdfJsDoc.destroy();

      setFile(f);
      setFileBytes(bytes);
      setPages(pageData);
      setCurrentPageIdx(0);
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to read the PDF. The file may be corrupted.');
    }
  }, []);

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setFields([]);
    setSelectedFieldId(null);
    setActiveTool(null);
    setError(null);
    setEncryptedError(false);
    setHasFormFields(false);
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    handleRemoveFile();
    setResult(null);
  }

  // Page-area click → place a new field of the active type
  function handlePageClick(e) {
    if (!activeTool) return;
    const wrap = pageWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const page = pages[currentPageIdx];
    const cssToPdfX = page.pdfWidth / rect.width;
    const cssToPdfY = page.pdfHeight / rect.height;

    const def = FIELD_TYPES.find(t => t.id === activeTool);
    const widthPt = def.defaultW;
    const heightPt = def.defaultH;

    // Center field at click point, in PDF coords
    let xPt = cssX * cssToPdfX - widthPt / 2;
    // CSS y grows downward; PDF y grows upward — flip and offset by height
    let yPt = page.pdfHeight - cssY * cssToPdfY - heightPt / 2;

    xPt = Math.max(0, Math.min(page.pdfWidth - widthPt, xPt));
    yPt = Math.max(0, Math.min(page.pdfHeight - heightPt, yPt));

    const sameTypeOnPage = fields.filter(fd => fd.type === activeTool).length;
    const newField = {
      id: uid(),
      type: activeTool,
      pageIdx: currentPageIdx,
      x: xPt,
      y: yPt,
      width: widthPt,
      height: heightPt,
      name: defaultName(activeTool, sameTypeOnPage),
      defaultValue: '',
      options: activeTool === 'radio' || activeTool === 'dropdown' ? ['Option 1', 'Option 2'] : null,
      groupName: activeTool === 'radio' ? 'RadioGroup1' : null,
      multiline: false,
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setActiveTool(null);
  }

  // Field interactions: drag to move, drag corner to resize
  function startDrag(e, field, mode) {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldId(field.id);
    const wrap = pageWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const page = pages[currentPageIdx];
    const cssToPdfX = page.pdfWidth / rect.width;
    const cssToPdfY = page.pdfHeight / rect.height;

    dragStateRef.current = {
      mode,
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
      origW: field.width,
      origH: field.height,
      cssToPdfX,
      cssToPdfY,
      pageW: page.pdfWidth,
      pageH: page.pdfHeight,
    };
  }

  useEffect(() => {
    function onMove(e) {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dxPt = (e.clientX - ds.startX) * ds.cssToPdfX;
      const dyPt = (e.clientY - ds.startY) * ds.cssToPdfY;

      setFields(prev =>
        prev.map(fd => {
          if (fd.id !== ds.fieldId) return fd;
          if (ds.mode === 'move') {
            const newX = Math.max(0, Math.min(ds.pageW - fd.width, ds.origX + dxPt));
            const newY = Math.max(0, Math.min(ds.pageH - fd.height, ds.origY - dyPt));
            return { ...fd, x: newX, y: newY };
          }
          if (ds.mode === 'resize') {
            const newW = Math.max(MIN_FIELD_W, Math.min(ds.pageW - ds.origX, ds.origW + dxPt));
            const newH = Math.max(MIN_FIELD_H, Math.min(ds.origY + ds.origH, ds.origH + dyPt));
            const newY = ds.origY + ds.origH - newH;
            return { ...fd, width: newW, height: newH, y: newY };
          }
          return fd;
        })
      );
    }
    function onUp() {
      dragStateRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function updateField(id, patch) {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  function deleteField(id) {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  async function handleGenerate() {
    if (!fileBytes || fields.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { pdfDoc, isEncrypted: enc } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (enc) {
        setEncryptedError(true);
        return;
      }

      const form = pdfDoc.getForm();
      const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const docPages = pdfDoc.getPages();

      // Group radios by groupName so they form a single group
      const radioGroups = new Map();

      const usedNames = new Set();
      function uniqueName(base) {
        let name = base.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (!name) name = 'field';
        let candidate = name;
        let n = 1;
        while (usedNames.has(candidate)) {
          candidate = `${name}_${n++}`;
        }
        usedNames.add(candidate);
        return candidate;
      }

      for (const fd of fields) {
        const page = docPages[fd.pageIdx];
        if (!page) continue;
        const opts = {
          x: fd.x,
          y: fd.y,
          width: fd.width,
          height: fd.height,
          borderColor: rgb(0.4, 0.4, 0.4),
          borderWidth: 1,
        };

        if (fd.type === 'text') {
          const tf = form.createTextField(uniqueName(fd.name));
          if (fd.multiline) tf.enableMultiline();
          if (fd.defaultValue) tf.setText(fd.defaultValue);
          tf.addToPage(page, { ...opts, font: helv });
        } else if (fd.type === 'checkbox') {
          const cb = form.createCheckBox(uniqueName(fd.name));
          cb.addToPage(page, opts);
        } else if (fd.type === 'dropdown') {
          const dd = form.createDropdown(uniqueName(fd.name));
          dd.addOptions(fd.options || []);
          if (fd.defaultValue && fd.options?.includes(fd.defaultValue)) {
            dd.select(fd.defaultValue);
          }
          dd.addToPage(page, { ...opts, font: helv });
        } else if (fd.type === 'radio') {
          const groupKey = fd.groupName || 'RadioGroup';
          let entry = radioGroups.get(groupKey);
          if (!entry) {
            entry = {
              group: form.createRadioGroup(uniqueName(groupKey)),
              count: 0,
            };
            radioGroups.set(groupKey, entry);
          }
          entry.count += 1;
          const optionLabel = fd.defaultValue || `Option ${entry.count}`;
          entry.group.addOptionToPage(optionLabel, page, opts);
        } else if (fd.type === 'signature') {
          // Real /Sig AcroForm widget — Adobe Reader's Fill & Sign and digital
          // signature workflows recognize this. pdf-lib has no high-level
          // signature API, so we register the widget directly.
          const ctx = pdfDoc.context;
          const acroForm = form.acroForm;

          const widgetDict = ctx.obj({
            Type: 'Annot',
            Subtype: 'Widget',
            FT: 'Sig',
            T: PDFString.of(uniqueName(fd.name)),
            Rect: [fd.x, fd.y, fd.x + fd.width, fd.y + fd.height],
            F: 4,
            P: page.ref,
            BS: ctx.obj({ W: 1, S: 'S' }),
            MK: ctx.obj({ BC: [0.4, 0.4, 0.4] }),
          });
          const widgetRef = ctx.register(widgetDict);

          acroForm.addField(widgetRef);
          acroForm.dict.set(PDFName.of('SigFlags'), PDFNumber.of(3));
          page.node.addAnnot(widgetRef);
        }
      }

      const outBytes = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        filename: buildOutputFilename(file.name, 'fillable', 'pdf'),
        originalSize: file.size,
        resultSize: outBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('Form generation failed:', e);
      setError('Something went wrong while generating the fillable PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="tool-container">
        <InfoCard description={DESCRIPTION} />
        <ResultPanel {...result} onStartOver={handleStartOver} />
      </div>
    );
  }

  if (hasFormFields) {
    return (
      <div className="tool-container">
        <InfoCard description={DESCRIPTION} limitations={LIMITATIONS} />
        <ErrorCard
          title="This PDF already has form fields"
          message="Adding new fields on top of an existing form would corrupt the file in Adobe Acrobat. Please export the source as a flat PDF first (e.g. open it, then File → Print → Save as PDF) and try again."
        />
        <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Choose a different file">
          <X size={14} />
          Choose a different file
        </button>
      </div>
    );
  }

  const page = pages[currentPageIdx];
  const fieldsOnPage = fields.filter(f => f.pageIdx === currentPageIdx);
  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="tool-container">
      <InfoCard description={DESCRIPTION} limitations={LIMITATIONS} />

      {encryptedError && <EncryptedPDFError onNavigate={navigateTo} />}
      {error && <ErrorCard title="Error" message={error} />}

      {!file && !encryptedError && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFilesSelected}
          label="Drop a PDF here or click to browse"
          sublabel="A flat PDF without existing form fields"
        />
      )}

      {file && page && (
        <div
          ref={editorRef}
          className={`ff-editor ${isLandscape ? 'ff-editor--landscape' : 'ff-editor--portrait'} ${fullscreen ? 'ff-editor--fullscreen' : ''}`}
        >
          <div className="ff-page-column" ref={pageColumnRef}>
            <div className="ff-toolbar">
              <button
                className={`ff-tool-btn ${activeTool === null ? 'ff-tool-btn--active' : ''}`}
                onClick={() => setActiveTool(null)}
                type="button"
                aria-label="Select / move tool"
              >
                <MousePointer size={16} />
                Select
              </button>
              {FIELD_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`ff-tool-btn ${activeTool === t.id ? 'ff-tool-btn--active' : ''}`}
                    onClick={() => {
                      setActiveTool(t.id);
                      setSelectedFieldId(null);
                    }}
                    type="button"
                  >
                    <Icon size={16} />
                    {t.label}
                  </button>
                );
              })}
              <div className="ff-toolbar-spacer" />
              <button
                className="ff-tool-btn"
                onClick={() => setFullscreen(f => !f)}
                type="button"
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
              >
                {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {fullscreen ? 'Exit' : 'Fullscreen'}
              </button>
              {!fullscreen && (
                <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                  <X size={14} />
                  Remove
                </button>
              )}
            </div>

            <div className="ff-page-meta">
              <button
                className="ff-page-nav"
                onClick={() => setCurrentPageIdx(i => Math.max(0, i - 1))}
                disabled={currentPageIdx === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="ff-page-meta-text">
                Page {currentPageIdx + 1} of {pages.length}
                {fieldsOnPage.length > 0 && ` — ${fieldsOnPage.length} field${fieldsOnPage.length === 1 ? '' : 's'}`}
              </span>
              <button
                className="ff-page-nav"
                onClick={() => setCurrentPageIdx(i => Math.min(pages.length - 1, i + 1))}
                disabled={currentPageIdx >= pages.length - 1}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <div className="ff-toolbar-spacer" />
              <label className="ff-zoom-label">
                <input
                  type="checkbox"
                  checked={autoFit}
                  onChange={e => setAutoFit(e.target.checked)}
                />
                Fit
              </label>
              <label className="ff-zoom-label">
                Zoom
                <input
                  type="range"
                  min={0.4}
                  max={2.5}
                  step={0.1}
                  value={previewScale}
                  onChange={e => {
                    setAutoFit(false);
                    setPreviewScale(Number(e.target.value));
                  }}
                />
                {Math.round(previewScale * 100)}%
              </label>
            </div>

            {activeTool && (
              <p className="ff-hint">
                Click on the page to drop a {FIELD_TYPES.find(t => t.id === activeTool).label.toLowerCase()}.
                Press Esc or click Select to cancel.
              </p>
            )}

            <div className="ff-page-shell">
              <div
                ref={pageWrapRef}
                className={`ff-page-wrap ${activeTool ? 'ff-page-wrap--placing' : ''}`}
                onClick={handlePageClick}
                style={{
                  width: page.pdfWidth * previewScale,
                  height: page.pdfHeight * previewScale,
                }}
              >
                <img
                  src={page.thumbnail}
                  alt={`Page ${currentPageIdx + 1}`}
                  className="ff-page-img"
                  draggable={false}
                />
                {fieldsOnPage.map(fd => {
                  const cssX = (fd.x / page.pdfWidth) * (page.pdfWidth * previewScale);
                  const cssY = ((page.pdfHeight - fd.y - fd.height) / page.pdfHeight) * (page.pdfHeight * previewScale);
                  const cssW = (fd.width / page.pdfWidth) * (page.pdfWidth * previewScale);
                  const cssH = (fd.height / page.pdfHeight) * (page.pdfHeight * previewScale);
                  const isSelected = selectedFieldId === fd.id;
                  return (
                    <div
                      key={fd.id}
                      className={`ff-field ff-field--${fd.type} ${isSelected ? 'ff-field--selected' : ''}`}
                      style={{ left: cssX, top: cssY, width: cssW, height: cssH }}
                      onMouseDown={(e) => startDrag(e, fd, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldId(fd.id);
                        setActiveTool(null);
                      }}
                    >
                      <span className="ff-field-label">{fd.name}</span>
                      {isSelected && (
                        <>
                          <button
                            className="ff-field-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteField(fd.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label="Delete field"
                            type="button"
                          >
                            <Trash2 size={12} />
                          </button>
                          <div
                            className="ff-field-resize"
                            onMouseDown={(e) => startDrag(e, fd, 'resize')}
                            aria-label="Resize"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {!fullscreen && (
              <ActionButton
                label={`Generate Fillable PDF (${fields.length} field${fields.length === 1 ? '' : 's'})`}
                onClick={handleGenerate}
                disabled={fields.length === 0}
                loading={loading}
              />
            )}
          </div>

          <aside className="ff-side-rail">
            <div className="ff-side-rail-inner">
              {selectedField ? (
                <div className="ff-props">
                  <div className="ff-props-header">
                    <strong>Field properties</strong>
                    <button
                      className="ff-props-delete"
                      onClick={() => deleteField(selectedField.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                  <div className="ff-props-grid">
                    <label className="ff-prop">
                      <span>Field name</span>
                      <input
                        type="text"
                        value={selectedField.name}
                        onChange={e => updateField(selectedField.id, { name: e.target.value })}
                      />
                    </label>
                    {(selectedField.type === 'text' || selectedField.type === 'dropdown') && (
                      <label className="ff-prop">
                        <span>Default value</span>
                        <input
                          type="text"
                          value={selectedField.defaultValue}
                          onChange={e => updateField(selectedField.id, { defaultValue: e.target.value })}
                        />
                      </label>
                    )}
                    {selectedField.type === 'text' && (
                      <label className="ff-prop ff-prop--checkbox">
                        <input
                          type="checkbox"
                          checked={selectedField.multiline}
                          onChange={e => updateField(selectedField.id, { multiline: e.target.checked })}
                        />
                        <span>Multi-line</span>
                      </label>
                    )}
                    {selectedField.type === 'radio' && (
                      <>
                        <label className="ff-prop">
                          <span>Group name (radios sharing this name belong to one group)</span>
                          <input
                            type="text"
                            value={selectedField.groupName}
                            onChange={e => updateField(selectedField.id, { groupName: e.target.value })}
                          />
                        </label>
                        <label className="ff-prop">
                          <span>Option value</span>
                          <input
                            type="text"
                            value={selectedField.defaultValue}
                            onChange={e => updateField(selectedField.id, { defaultValue: e.target.value })}
                            placeholder="e.g. Yes"
                          />
                        </label>
                      </>
                    )}
                    {selectedField.type === 'dropdown' && (
                      <label className="ff-prop ff-prop--full">
                        <span>Options (one per line)</span>
                        <textarea
                          rows={4}
                          value={(selectedField.options || []).join('\n')}
                          onChange={e =>
                            updateField(selectedField.id, {
                              options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ff-rail-empty">
                  <p className="ff-rail-empty-title">No field selected</p>
                  <p className="ff-rail-empty-body">
                    Pick a field type from the toolbar and click anywhere on the page to drop it,
                    or click an existing field to edit its properties here.
                  </p>
                  {fields.length > 0 && (
                    <p className="ff-rail-empty-count">
                      {fields.length} field{fields.length === 1 ? '' : 's'} placed across the document.
                    </p>
                  )}
                </div>
              )}

              {fullscreen && (
                <div className="ff-rail-actions">
                  <ActionButton
                    label={`Generate (${fields.length})`}
                    onClick={handleGenerate}
                    disabled={fields.length === 0}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
