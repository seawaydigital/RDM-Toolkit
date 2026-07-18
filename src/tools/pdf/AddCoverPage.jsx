import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { loadPdfLibDocument, pdfHasFormFields } from '../../utils/pdfThumbnails';
import { FormFieldsNotice } from '../../components/ui/ToolCaveats';

const DESCRIPTION =
  'Design and prepend a professional cover page to any PDF — set a title, author, department, date, and colour scheme. Everything runs entirely in your browser with no uploads.';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getTextHex(bgHex) {
  return hexLuminance(bgHex) > 0.4 ? '#1A1A1A' : '#F1F5F9';
}

function getMetaHex(bgHex) {
  return hexLuminance(bgHex) > 0.4 ? '#555555' : '#94A3B8';
}

const ACCENT_PRESETS = ['#00427A', '#FFC20E', '#10B981', '#EF4444', '#8B5CF6', '#0F172A'];

async function buildCoverPdf(fields, options) {
  const { width, height, accentColor, bgColor, layout } = options;
  const { title, subtitle, author, department, institution, date } = fields;

  const coverDoc = await PDFDocument.create();
  const page = coverDoc.addPage([width, height]);

  const fontRegular = await coverDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);

  const accentRgb = hexToRgb(accentColor);
  const bgRgb = hexToRgb(bgColor);
  const textRgb = hexToRgb(getTextHex(bgColor));
  const metaRgb = hexToRgb(getMetaHex(bgColor));

  // Full-page background
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgRgb });

  const metaItems = [author, department, institution, date].filter(Boolean);

  if (layout === 'centered') {
    // Top + bottom accent bars
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: accentRgb });
    page.drawRectangle({ x: 0, y: 0, width, height: 8, color: accentRgb });

    // Title positioned at ~58% from bottom
    let currentY = height * 0.58;

    if (title) {
      const titleSize = 26;
      const lines = title.split('\n');
      for (const line of lines) {
        if (!line.trim()) { currentY -= titleSize * 0.6; continue; }
        const textWidth = fontBold.widthOfTextAtSize(line, titleSize);
        const x = Math.max(40, (width - textWidth) / 2);
        page.drawText(line, { x, y: currentY, size: titleSize, font: fontBold, color: textRgb });
        currentY -= titleSize * 1.4;
      }
      currentY -= 6;
    }

    if (subtitle) {
      const subSize = 13;
      const subWidth = fontRegular.widthOfTextAtSize(subtitle, subSize);
      page.drawText(subtitle, {
        x: Math.max(40, (width - subWidth) / 2),
        y: currentY,
        size: subSize,
        font: fontRegular,
        color: metaRgb,
      });
      currentY -= subSize * 1.4;
    }

    // Horizontal rule
    const ruleY = currentY - 14;
    const ruleWidth = width * 0.55;
    page.drawLine({
      start: { x: (width - ruleWidth) / 2, y: ruleY },
      end: { x: (width + ruleWidth) / 2, y: ruleY },
      thickness: 1,
      color: accentRgb,
    });

    // Meta lines
    let metaY = ruleY - 22;
    const metaSize = 11;
    for (const item of metaItems) {
      const itemWidth = fontRegular.widthOfTextAtSize(item, metaSize);
      page.drawText(item, {
        x: Math.max(40, (width - itemWidth) / 2),
        y: metaY,
        size: metaSize,
        font: fontRegular,
        color: metaRgb,
      });
      metaY -= metaSize * 1.7;
    }
  } else {
    // Left-ruled layout
    const barW = 10;
    page.drawRectangle({ x: 0, y: 0, width: barW, height, color: accentRgb });

    const leftMargin = barW + 36;
    const maxTextWidth = width - leftMargin - 44;
    let currentY = height * 0.58;

    if (title) {
      const titleSize = 26;
      const lines = title.split('\n');
      for (const line of lines) {
        if (!line.trim()) { currentY -= titleSize * 0.6; continue; }
        page.drawText(line, {
          x: leftMargin,
          y: currentY,
          size: titleSize,
          font: fontBold,
          color: textRgb,
          maxWidth: maxTextWidth,
        });
        currentY -= titleSize * 1.4;
      }
      currentY -= 6;
    }

    if (subtitle) {
      const subSize = 13;
      page.drawText(subtitle, {
        x: leftMargin,
        y: currentY,
        size: subSize,
        font: fontRegular,
        color: metaRgb,
        maxWidth: maxTextWidth,
      });
      currentY -= subSize * 1.4;
    }

    // Horizontal rule
    const ruleY = currentY - 14;
    const ruleWidth = maxTextWidth * 0.85;
    page.drawLine({
      start: { x: leftMargin, y: ruleY },
      end: { x: leftMargin + ruleWidth, y: ruleY },
      thickness: 1,
      color: accentRgb,
    });

    let metaY = ruleY - 22;
    const metaSize = 11;
    for (const item of metaItems) {
      page.drawText(item, {
        x: leftMargin,
        y: metaY,
        size: metaSize,
        font: fontRegular,
        color: metaRgb,
        maxWidth: maxTextWidth,
      });
      metaY -= metaSize * 1.7;
    }
  }

  return coverDoc;
}

export default function AddCoverPage({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });

  // Content fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [department, setDepartment] = useState('');
  const [institution, setInstitution] = useState('Lakehead University');
  const [useAutoDate, setUseAutoDate] = useState(true);
  const [manualDate, setManualDate] = useState(todayString());

  // Appearance
  const [accentColor, setAccentColor] = useState('#00427A');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [layout, setLayout] = useState('centered');

  // UI state
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [hasFormFields, setHasFormFields] = useState(false);

  const dateDisplay = useAutoDate ? todayString() : manualDate;
  const textColor = getTextHex(bgColor);
  const metaColor = getMetaHex(bgColor);

  const handleFilesSelected = useCallback(async ([f]) => {
    setError(null);
    setEncryptedError(false);
    setResult(null);
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

      setFile(f);
      setFileBytes(uint8);
      setPageCount(pdfDoc.getPageCount());

      // Advisory form-field scan (copies bytes synchronously).
      pdfHasFormFields(uint8).then(setHasFormFields);

      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      setPageSize({ width, height });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to load PDF. The file may be corrupted or in an unsupported format.');
    }
  }, []);

  async function handleGenerate() {
    setProcessing(true);
    setError(null);
    try {
      const fields = { title, subtitle, author, department, institution, date: dateDisplay };
      const options = { ...pageSize, accentColor, bgColor, layout };

      const coverDoc = await buildCoverPdf(fields, options);

      const { pdfDoc: uploadedDoc, isEncrypted } = await loadPdfLibDocument(fileBytes, { PDFDocument });
      if (isEncrypted) {
        setEncryptedError(true);
        return;
      }

      const finalDoc = await PDFDocument.create();

      const [coverPage] = await finalDoc.copyPages(coverDoc, [0]);
      finalDoc.addPage(coverPage);

      const srcPages = await finalDoc.copyPages(uploadedDoc, uploadedDoc.getPageIndices());
      srcPages.forEach(p => finalDoc.addPage(p));

      const outputBytes = await finalDoc.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        filename: buildOutputFilename(file.name, 'with-cover', 'pdf'),
        originalSize: file.size,
        resultSize: outputBytes.byteLength,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('Cover page generation failed:', e);
      setError('Something went wrong while generating the cover page. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setPageSize({ width: 612, height: 792 });
    setError(null);
    setEncryptedError(false);
  }

  function handleStartOver() {
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    handleRemoveFile();
    setResult(null);
  }

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
          sublabel="The cover page will be prepended as page 1"
        />
      )}

      {file && (
        <div className="acp-layout">

          {/* ── Left column: fields + options ────────────────────────────── */}
          <div className="acp-left">

            {/* File chip */}
            <div className="acp-file-info">
              <span className="acp-file-name">📄 {file.name}</span>
              <span className="acp-file-meta">{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
              <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
                <X size={14} />
                Remove
              </button>
            </div>

            {/* Cover page content */}
            <div className="acp-section">
              <h3 className="acp-section-title">Cover Page Content</h3>

              <label className="acp-label" htmlFor="acp-title">Title</label>
              <textarea
                id="acp-title"
                className="acp-textarea"
                rows={2}
                placeholder="e.g. Research Data Management Plan"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <label className="acp-label" htmlFor="acp-subtitle">
                Subtitle <span className="acp-optional">(optional)</span>
              </label>
              <input
                id="acp-subtitle"
                type="text"
                className="acp-input"
                placeholder="e.g. Doctoral Thesis — 2025"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
              />

              <label className="acp-label" htmlFor="acp-author">
                Author / PI <span className="acp-optional">(optional)</span>
              </label>
              <input
                id="acp-author"
                type="text"
                className="acp-input"
                placeholder="e.g. Dr. Jane Smith"
                value={author}
                onChange={e => setAuthor(e.target.value)}
              />

              <label className="acp-label" htmlFor="acp-department">
                Department <span className="acp-optional">(optional)</span>
              </label>
              <input
                id="acp-department"
                type="text"
                className="acp-input"
                placeholder="e.g. Faculty of Science and Environmental Studies"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />

              <label className="acp-label" htmlFor="acp-institution">
                Institution <span className="acp-optional">(optional)</span>
              </label>
              <input
                id="acp-institution"
                type="text"
                className="acp-input"
                placeholder="e.g. Lakehead University"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
              />

              <label className="acp-label">Date</label>
              <div className="acp-date-row">
                <label className="acp-radio-label">
                  <input
                    type="radio"
                    name="acp-date-mode"
                    checked={useAutoDate}
                    onChange={() => setUseAutoDate(true)}
                  />
                  Today ({todayString()})
                </label>
                <label className="acp-radio-label">
                  <input
                    type="radio"
                    name="acp-date-mode"
                    checked={!useAutoDate}
                    onChange={() => setUseAutoDate(false)}
                  />
                  Custom
                </label>
              </div>
              {!useAutoDate && (
                <input
                  type="date"
                  className="acp-input acp-date-input"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                />
              )}
            </div>

            {/* Appearance */}
            <div className="acp-section">
              <h3 className="acp-section-title">Appearance</h3>

              <div className="acp-appearance-row">
                <div className="acp-appearance-group">
                  <label className="acp-label" htmlFor="acp-accent">Accent colour</label>
                  <div className="acp-color-row">
                    <input
                      id="acp-accent"
                      type="color"
                      className="acp-color-input"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                    />
                    <span className="acp-color-hex">{accentColor.toUpperCase()}</span>
                  </div>
                  <div className="acp-color-presets">
                    {ACCENT_PRESETS.map(c => (
                      <button
                        key={c}
                        className={`acp-color-swatch${accentColor === c ? ' acp-color-swatch--active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setAccentColor(c)}
                        aria-label={`Set accent colour to ${c}`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div className="acp-appearance-group">
                  <label className="acp-label">Background</label>
                  <div className="acp-bg-buttons">
                    <button
                      className={`acp-bg-btn${bgColor === '#FFFFFF' ? ' acp-bg-btn--active' : ''}`}
                      onClick={() => setBgColor('#FFFFFF')}
                    >
                      ☀ White
                    </button>
                    <button
                      className={`acp-bg-btn${bgColor === '#0A1628' ? ' acp-bg-btn--active' : ''}`}
                      onClick={() => setBgColor('#0A1628')}
                    >
                      🌙 Dark
                    </button>
                  </div>
                </div>
              </div>

              <label className="acp-label" style={{ marginTop: 'var(--space-sm)' }}>Layout</label>
              <div className="acp-layout-buttons">
                <button
                  className={`acp-layout-btn${layout === 'centered' ? ' acp-layout-btn--active' : ''}`}
                  onClick={() => setLayout('centered')}
                >
                  <span className="acp-layout-icon" aria-hidden="true">⠿</span>
                  Centred
                </button>
                <button
                  className={`acp-layout-btn${layout === 'left-ruled' ? ' acp-layout-btn--active' : ''}`}
                  onClick={() => setLayout('left-ruled')}
                >
                  <span className="acp-layout-icon" aria-hidden="true">▋</span>
                  Left-ruled
                </button>
              </div>
            </div>

            {hasFormFields && <FormFieldsNotice action="adding a cover page" />}

            <ActionButton
              label="Generate PDF with Cover Page"
              onClick={handleGenerate}
              disabled={processing || !file}
              loading={processing}
            />
          </div>

          {/* ── Right column: live preview ────────────────────────────────── */}
          <div className="acp-right">
            <p className="acp-preview-label">Live Preview</p>
            <div
              className="acp-preview"
              style={{ background: bgColor, color: textColor }}
            >
              {layout === 'centered' ? (
                <>
                  <div className="acp-preview-bar" style={{ background: accentColor }} />
                  <div className="acp-preview-body acp-preview-body--centered">
                    {title
                      ? <p className="acp-preview-title">{title}</p>
                      : <p className="acp-preview-title acp-preview-placeholder">Your Title Here</p>
                    }
                    {subtitle && (
                      <p className="acp-preview-subtitle" style={{ color: metaColor }}>{subtitle}</p>
                    )}
                    <hr className="acp-preview-rule" style={{ borderColor: accentColor }} />
                    <div className="acp-preview-meta-block" style={{ color: metaColor }}>
                      {author && <p className="acp-preview-meta">{author}</p>}
                      {department && <p className="acp-preview-meta">{department}</p>}
                      {institution && <p className="acp-preview-meta">{institution}</p>}
                      <p className="acp-preview-meta">{dateDisplay}</p>
                    </div>
                  </div>
                  <div className="acp-preview-bar" style={{ background: accentColor }} />
                </>
              ) : (
                <div
                  className="acp-preview-left-ruled"
                  style={{ borderLeftColor: accentColor }}
                >
                  <div className="acp-preview-body acp-preview-body--left">
                    {title
                      ? <p className="acp-preview-title">{title}</p>
                      : <p className="acp-preview-title acp-preview-placeholder">Your Title Here</p>
                    }
                    {subtitle && (
                      <p className="acp-preview-subtitle" style={{ color: metaColor }}>{subtitle}</p>
                    )}
                    <hr className="acp-preview-rule acp-preview-rule--left" style={{ borderColor: accentColor }} />
                    <div className="acp-preview-meta-block" style={{ color: metaColor }}>
                      {author && <p className="acp-preview-meta">{author}</p>}
                      {department && <p className="acp-preview-meta">{department}</p>}
                      {institution && <p className="acp-preview-meta">{institution}</p>}
                      <p className="acp-preview-meta">{dateDisplay}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
