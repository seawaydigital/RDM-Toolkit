import { useState, useCallback } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import DOMPurify from 'dompurify';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';
import { buildOutputFilename } from '../../utils/filename';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Turndown instance — created once outside component
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
td.use(gfm);

// ---- Markdown renderer (duplicated from MarkdownPreview) ----

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInline(text) {
  text = text.replace(/`([^`]+)`/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:3px;font-size:0.85em;font-family:monospace">$1</code>');
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0"/>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--accent-primary);text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  return text;
}

function renderMarkdown(md) {
  let html = md;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return `<pre style="background:var(--bg-tertiary);padding:12px 16px;border-radius:6px;overflow-x:auto;font-size:0.85rem;line-height:1.5;margin:12px 0"><code>${escaped}</code></pre>`;
  });

  const lines = html.split('\n');
  const result = [];
  let inList = null;
  let inBlockquote = false;
  let blockquoteLines = [];

  function flushBlockquote() {
    if (blockquoteLines.length > 0) {
      result.push(`<blockquote style="border-left:3px solid var(--border);padding:8px 16px;margin:12px 0;color:var(--text-secondary);background:var(--bg-secondary);border-radius:0 6px 6px 0">${blockquoteLines.join('<br/>')}</blockquote>`);
      blockquoteLines = [];
      inBlockquote = false;
    }
  }

  function flushList() {
    if (inList) {
      result.push(`</${inList}>`);
      inList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('<pre ') || line.includes('</pre>')) {
      flushBlockquote();
      flushList();
      result.push(line);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushBlockquote();
      flushList();
      result.push('<hr style="border:none;border-top:1px solid var(--border);margin:20px 0"/>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(processInline(line.replace(/^>\s?/, '')));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = { 1: '1.6rem', 2: '1.3rem', 3: '1.1rem', 4: '1rem', 5: '0.9rem', 6: '0.85rem' };
      const margins = { 1: '24px 0 12px', 2: '20px 0 10px', 3: '16px 0 8px', 4: '14px 0 6px', 5: '12px 0 4px', 6: '10px 0 4px' };
      result.push(`<h${level} style="font-size:${sizes[level]};font-weight:700;margin:${margins[level]};color:var(--text-primary)">${processInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^(\s*)[-*+]\s+/.test(line)) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        result.push('<ul style="margin:8px 0;padding-left:24px">');
      }
      result.push(`<li style="margin:4px 0">${processInline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      continue;
    }

    if (/^(\s*)\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        result.push('<ol style="margin:8px 0;padding-left:24px">');
      }
      result.push(`<li style="margin:4px 0">${processInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }

    flushList();

    if (line.trim() === '') {
      result.push('<div style="height:8px"></div>');
      continue;
    }

    result.push(`<p style="margin:6px 0;line-height:1.65">${processInline(line)}</p>`);
  }

  flushBlockquote();
  flushList();

  return result.join('\n');
}

// ---- Helpers ----

function readFileAs(file, type) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    type === 'text' ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
  });
}

function csvToMarkdown(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';
  const parseRow = row => {
    const cells = [];
    let inQuote = false, cell = '';
    for (const ch of row) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };
  const escapeCell = cell => cell.replace(/\|/g, '\\|');
  const rows = lines.map(parseRow);
  const header = '| ' + rows[0].map(escapeCell).join(' | ') + ' |';
  const divider = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
  const body = rows.slice(1).map(r => '| ' + r.map(escapeCell).join(' | ') + ' |').join('\n');
  return [header, divider, body].filter(Boolean).join('\n');
}

function stripRtf(rtf) {
  return rtf
    .replace(/\{[^{}]*\}/g, '')
    .replace(/\\[a-z]+\d*[ ]?/gi, '')
    .replace(/\\\*/g, '')
    .replace(/[{}\\]/g, '')
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function postProcess(md, mode) {
  if (mode === 'preserve') return md;
  // AI-friendly: linearise tables, remove images, collapse whitespace
  return md
    .replace(/^\|.*\|$/gm, line =>
      line.replace(/\|/g, '').replace(/\s*-+\s*/g, '').trim()
    )
    .replace(/^-{3,}$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '[image]')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- Core conversion pipeline ----

async function convertFile(file, mode) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File is too large. Maximum size is 50 MB.');
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const supported = ['pdf', 'html', 'htm', 'csv', 'txt', 'md', 'rtf', 'json'];
  if (!supported.includes(ext)) {
    throw new Error('Unsupported file type. Accepted: PDF, HTML, CSV, TXT, MD, RTF, JSON. DOCX and XLSX are intentionally disabled until safer browser parsers are available.');
  }

  let md = '';

  if (ext === 'md') {
    md = await readFileAs(file, 'text');

  } else if (ext === 'txt') {
    const text = await readFileAs(file, 'text');
    const html = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    md = td.turndown(html);

  } else if (ext === 'html' || ext === 'htm') {
    const text = await readFileAs(file, 'text');
    md = td.turndown(text);

  } else if (ext === 'pdf') {
    const buf = await readFileAs(file, 'arraybuffer');
    let pdfDoc;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
      pdfDoc = await loadingTask.promise;
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
        throw new Error('This PDF is password-protected. Remove the password first using the Remove PDF Password tool.');
      }
      throw err;
    }

    let html = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();

      const lines = new Map();
      let maxFontSize = 0;
      content.items.forEach(item => {
        if (!item.str.trim()) return;
        const y = Math.round(item.transform[5] / 5) * 5;
        if (!lines.has(y)) lines.set(y, { text: '', fontSize: item.height || 12 });
        lines.get(y).text += item.str + ' ';
        if (item.height > maxFontSize) maxFontSize = item.height;
      });

      const sorted = [...lines.entries()].sort((a, b) => b[0] - a[0]);
      const bodyFontSize = maxFontSize > 0 ? maxFontSize * 0.7 : 12;

      sorted.forEach(([, line]) => {
        const text = line.text.trim();
        if (!text) return;
        if (line.fontSize > bodyFontSize * 1.2) {
          html += `<h2>${escapeHtml(text)}</h2>`;
        } else {
          html += `<p>${escapeHtml(text)}</p>`;
        }
      });

      if (i < pdfDoc.numPages) html += '<hr>';
    }

    md = td.turndown(html);

  } else if (ext === 'csv') {
    const text = await readFileAs(file, 'text');
    md = csvToMarkdown(text);

  } else if (ext === 'rtf') {
    const text = await readFileAs(file, 'text');
    const plain = stripRtf(text);
    const html = plain.split('\n\n').map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    md = td.turndown(html);

  } else if (ext === 'json') {
    const text = await readFileAs(file, 'text');
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    md = '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
  }

  return postProcess(md, mode);
}

// ---- Component ----

const ACCEPTED = '.pdf,.html,.htm,.csv,.txt,.md,.rtf,.json';

export default function FileToMarkdown() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  const handleFileDrop = useCallback((files) => {
    const f = Array.isArray(files) ? files[0] : files;
    if (!f) return;
    setFile(f);
    setMarkdown('');
    setError(null);
    setCopied(false);
    setActiveTab('preview');
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await convertFile(file, mode);
      if (!result || !result.trim()) {
        setError('The file appears to be empty or contained no extractable text.');
        return;
      }
      setMarkdown(result);
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred during conversion.');
    } finally {
      setLoading(false);
    }
  }, [file, mode]);

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [markdown]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const name = file
      ? buildOutputFilename(file.name, 'converted', 'md')
      : 'converted.md';
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setMarkdown('');
    setError(null);
    setCopied(false);
    setLoading(false);
    setActiveTab('preview');
  }, []);

  const sanitizedPreview = markdown
    ? DOMPurify.sanitize(renderMarkdown(markdown), {
        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','strong','em','del','code','pre',
          'ul','ol','li','blockquote','hr','a','img','br','div','table','thead','tbody','tr','th','td'],
        ALLOWED_ATTR: ['href','src','alt','target','rel'],
        ALLOW_DATA_ATTR: false,
        FORCE_BODY: true,
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      })
    : '';

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <h2>File to Markdown</h2>
        <p className="tool-page-meta">
          Convert text-shaped documents to clean Markdown for use with AI tools. All processing happens in your browser — no files are uploaded.
        </p>
      </div>

      <InfoCard
        description="Accepts PDF, HTML, CSV, TXT, MD, RTF and JSON files. DOCX and XLSX are intentionally disabled until safer browser parsers are available. Output can be AI-friendly (clean plain text) or preserve full Markdown formatting."
      />

      {error && <ErrorCard message={error} />}

      {!markdown && (
        <DropZone
          onFilesSelected={handleFileDrop}
          accept={ACCEPTED}
        />
      )}

      {file && !markdown && !loading && (
        <div className="ftm-controls">
          <div className="ftm-mode-toggle">
            <button
              className={`ftm-mode-btn${mode === 'ai' ? ' ftm-mode-btn--active' : ''}`}
              onClick={() => setMode('ai')}
            >
              AI-friendly
            </button>
            <button
              className={`ftm-mode-btn${mode === 'preserve' ? ' ftm-mode-btn--active' : ''}`}
              onClick={() => setMode('preserve')}
            >
              Preserve formatting
            </button>
          </div>
          <p className="ftm-mode-desc">
            {mode === 'ai'
              ? 'Tables and images are simplified for cleaner AI input.'
              : 'Full Markdown structure — tables, headings, bold, italic.'}
          </p>
        </div>
      )}

      {file && !markdown && (
        <ActionButton label="Convert to Markdown" onClick={handleConvert} loading={loading} disabled={loading} />
      )}

      {markdown && (
        <div className="ftm-output">
          <div className="split-tabs">
            <button
              className={`split-tab${activeTab === 'preview' ? ' split-tab--active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button
              className={`split-tab${activeTab === 'raw' ? ' split-tab--active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw Markdown
            </button>
          </div>

          {activeTab === 'preview' && (
            <div
              className="ftm-preview"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          )}
          {activeTab === 'raw' && (
            <pre className="ftm-raw">{markdown}</pre>
          )}

          <div className="ftm-actions">
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="text-tool-copy-btn" onClick={handleDownload}>
              <Download size={14} /> Download .md
            </button>
            <button className="text-tool-copy-btn" onClick={handleReset}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
