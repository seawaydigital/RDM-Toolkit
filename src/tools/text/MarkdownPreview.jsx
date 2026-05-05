import { useState, useMemo, useCallback } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import DOMPurify from 'dompurify';
import InfoCard from '../../components/ui/InfoCard';

const SAMPLE_MARKDOWN = `# Markdown Preview

Welcome to the **Markdown Preview** tool. Type on the left, see the result on the right.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Inline \`code\` snippets
- Lists (ordered and unordered)

### Code Blocks

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Blockquotes

> The best way to predict the future is to invent it.
> — Alan Kay

### Ordered List

1. First item
2. Second item
3. Third item

---

That's it! Start editing to see your Markdown rendered live.`;

function parseMarkdown(md) {
  let html = md;

  // Code blocks (fenced) — must come before inline processing
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return `<pre style="background:var(--bg-tertiary);padding:12px 16px;border-radius:6px;overflow-x:auto;font-size:0.85rem;line-height:1.5;margin:12px 0"><code>${escaped}</code></pre>`;
  });

  // Process line by line for block elements
  const lines = html.split('\n');
  const result = [];
  let inList = null; // 'ul' or 'ol'
  let inBlockquote = false;
  let blockquoteLines = [];

  function flushBlockquote() {
    if (blockquoteLines.length > 0) {
      result.push(`<blockquote style="border-left:3px solid var(--accent-blue);padding:8px 16px;margin:12px 0;color:var(--text-secondary);background:var(--bg-secondary);border-radius:0 6px 6px 0">${blockquoteLines.join('<br/>')}</blockquote>`);
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
    let line = lines[i];

    // Skip lines that are part of a pre block (already processed)
    if (line.includes('<pre ') || line.includes('</pre>')) {
      flushBlockquote();
      flushList();
      result.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushBlockquote();
      flushList();
      result.push('<hr style="border:none;border-top:1px solid var(--border-primary);margin:20px 0"/>');
      continue;
    }

    // Blockquotes
    if (/^>\s?/.test(line)) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(processInline(line.replace(/^>\s?/, '')));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = { 1: '1.6rem', 2: '1.3rem', 3: '1.1rem', 4: '1rem', 5: '0.9rem', 6: '0.85rem' };
      const margins = { 1: '24px 0 12px', 2: '20px 0 10px', 3: '16px 0 8px', 4: '14px 0 6px', 5: '12px 0 4px', 6: '10px 0 4px' };
      result.push(`<h${level} style="font-size:${sizes[level]};font-weight:700;margin:${margins[level]};color:var(--text-primary)">${processInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^(\s*)[-*+]\s+/.test(line)) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        result.push('<ul style="margin:8px 0;padding-left:24px">');
      }
      result.push(`<li style="margin:4px 0">${processInline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
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

    // Empty lines become breaks
    if (line.trim() === '') {
      result.push('<div style="height:8px"></div>');
      continue;
    }

    // Regular paragraph
    result.push(`<p style="margin:6px 0;line-height:1.65">${processInline(line)}</p>`);
  }

  flushBlockquote();
  flushList();

  return result.join('\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInline(text) {
  // Inline code (must come before other inline processing)
  text = text.replace(/`([^`]+)`/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:3px;font-size:0.85em;font-family:monospace">$1</code>');
  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Images (must come before links so ![alt](url) isn't consumed by link regex)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0"/>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--accent-blue);text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  return text;
}

export default function MarkdownPreview({ tool }) {
  const [text, setText] = useState(SAMPLE_MARKDOWN);
  const [copied, setCopied] = useState(false);

  const renderedHTML = useMemo(() => DOMPurify.sanitize(parseMarkdown(text), {
    ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','strong','em','del','code','pre',
      'ul','ol','li','blockquote','hr','a','img','br'],
    ALLOWED_ATTR: ['href','src','alt','target','rel'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    // Block javascript: and data: URIs — only allow https/http/mailto/tel and relative paths
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  }), [text]);

  const handleCopyHTML = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = renderedHTML;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [renderedHTML]);

  const handleDownloadHTML = useCallback(() => {
    const full = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown Export</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1f2937}pre{background:#f3f4f6;padding:12px 16px;border-radius:6px;overflow-x:auto}code{background:#f3f4f6;padding:2px 6px;border-radius:3px;font-size:.9em}blockquote{border-left:3px solid #3b82f6;padding:8px 16px;margin:12px 0;color:#6b7280;background:#f9fafb}hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}a{color:#3b82f6}</style></head>\n<body>\n${renderedHTML}\n</body>\n</html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-export.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [renderedHTML]);

  return (
    <div>
      <InfoCard description="Live Markdown preview with a built-in parser. Supports headings, bold, italic, links, code blocks, lists, blockquotes, and horizontal rules. All processing happens locally in your browser." />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '8px' }}>
        <button className="text-tool-copy-btn" onClick={handleDownloadHTML}>
          <Download size={14} />
          Download HTML
        </button>
        <button className="text-tool-copy-btn" onClick={handleCopyHTML}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied HTML' : 'Copy HTML'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        minHeight: '500px',
      }}>
        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '6px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Markdown
          </div>
          <textarea
            aria-label="Markdown source"
            value={text}
            onChange={e => setText(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              color: 'var(--text-primary)',
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: '0.85rem',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none',
              minHeight: '460px',
            }}
          />
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '6px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Preview
          </div>
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              overflowY: 'auto',
              color: 'var(--text-primary)',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: '0.9rem',
              lineHeight: '1.6',
              minHeight: '460px',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        </div>
      </div>
    </div>
  );
}
