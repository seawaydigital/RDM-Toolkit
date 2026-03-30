import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

function highlightXML(xml) {
  const lines = xml.split('\n');
  return lines.map((line, i) => {
    const parts = [];
    let key = 0;
    let remaining = line;
    const tokenRegex = /(<\/?[\w:-]+)|(\s[\w:-]+=)|("(?:[^"\\]|\\.)*")|(\/>|>|<)|(<!--[\s\S]*?-->)/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
      }
      if (match[5]) {
        parts.push(<span key={key++} style={{ color: '#6A9955' }}>{match[5]}</span>);
      } else if (match[1]) {
        parts.push(<span key={key++} style={{ color: '#569CD6' }}>{match[1]}</span>);
      } else if (match[2]) {
        parts.push(<span key={key++} style={{ color: '#9CDCFE' }}>{match[2]}</span>);
      } else if (match[3]) {
        parts.push(<span key={key++} style={{ color: '#CE9178' }}>{match[3]}</span>);
      } else if (match[4]) {
        parts.push(<span key={key++} style={{ color: '#569CD6' }}>{match[4]}</span>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
    }

    return (
      <div key={i} style={{ display: 'flex', lineHeight: '1.6' }}>
        <span style={{ color: 'var(--text-muted)', minWidth: '3em', textAlign: 'right', paddingRight: '1em', userSelect: 'none', opacity: 0.5 }}>{i + 1}</span>
        <span style={{ flex: 1 }}>{parts.length > 0 ? parts : line}</span>
      </div>
    );
  });
}

function highlightYAML(yaml) {
  const lines = yaml.split('\n');
  return lines.map((line, i) => {
    const parts = [];
    let key = 0;

    const keyMatch = line.match(/^(\s*)([\w./-]+)(\s*:\s*)(.*)/);
    const commentMatch = line.match(/^(\s*)(#.*)/);
    const dashMatch = line.match(/^(\s*)(- )(.*)/);

    if (commentMatch) {
      parts.push(<span key={key++}>{commentMatch[1]}</span>);
      parts.push(<span key={key++} style={{ color: '#6A9955' }}>{commentMatch[2]}</span>);
    } else if (keyMatch) {
      parts.push(<span key={key++}>{keyMatch[1]}</span>);
      parts.push(<span key={key++} style={{ color: '#9CDCFE' }}>{keyMatch[2]}</span>);
      parts.push(<span key={key++} style={{ color: '#569CD6' }}>{keyMatch[3]}</span>);
      const val = keyMatch[4];
      if (/^(true|false|null|~)$/i.test(val.trim())) {
        parts.push(<span key={key++} style={{ color: '#569CD6' }}>{val}</span>);
      } else if (/^-?\d+(\.\d+)?$/.test(val.trim())) {
        parts.push(<span key={key++} style={{ color: '#B5CEA8' }}>{val}</span>);
      } else if (/^["']/.test(val.trim())) {
        parts.push(<span key={key++} style={{ color: '#CE9178' }}>{val}</span>);
      } else {
        parts.push(<span key={key++} style={{ color: '#CE9178' }}>{val}</span>);
      }
    } else if (dashMatch) {
      parts.push(<span key={key++}>{dashMatch[1]}</span>);
      parts.push(<span key={key++} style={{ color: '#569CD6' }}>{dashMatch[2]}</span>);
      parts.push(<span key={key++} style={{ color: '#CE9178' }}>{dashMatch[3]}</span>);
    } else {
      parts.push(<span key={key++}>{line}</span>);
    }

    return (
      <div key={i} style={{ display: 'flex', lineHeight: '1.6' }}>
        <span style={{ color: 'var(--text-muted)', minWidth: '3em', textAlign: 'right', paddingRight: '1em', userSelect: 'none', opacity: 0.5 }}>{i + 1}</span>
        <span style={{ flex: 1 }}>{parts}</span>
      </div>
    );
  });
}

function formatXML(xml, indent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(errorNode.textContent.split('\n')[0]);
  }

  const pad = ' '.repeat(indent);

  function serialize(node, level) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? pad.repeat(level) + text + '\n' : '';
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return pad.repeat(level) + '<!--' + node.textContent + '-->\n';
    }
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      return pad.repeat(level) + '<?' + node.target + ' ' + node.data + '?>\n';
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) {
      return '';
    }

    if (node.nodeType === Node.DOCUMENT_NODE) {
      let result = '';
      if (xml.trim().startsWith('<?xml')) {
        result = '<?xml version="1.0" encoding="UTF-8"?>\n';
      }
      for (const child of node.childNodes) {
        result += serialize(child, 0);
      }
      return result;
    }

    let line = pad.repeat(level) + '<' + node.tagName;
    for (const attr of node.attributes) {
      line += ` ${attr.name}="${attr.value}"`;
    }

    const children = Array.from(node.childNodes).filter(c =>
      c.nodeType !== Node.TEXT_NODE || c.textContent.trim() !== ''
    );

    if (children.length === 0) {
      return line + ' />\n';
    }

    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      return line + '>' + children[0].textContent.trim() + '</' + node.tagName + '>\n';
    }

    let result = line + '>\n';
    for (const child of children) {
      result += serialize(child, level + 1);
    }
    result += pad.repeat(level) + '</' + node.tagName + '>\n';
    return result;
  }

  return serialize(doc, 0).trimEnd();
}

function minifyXML(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(errorNode.textContent.split('\n')[0]);
  }
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc).replace(/>\s+</g, '><').trim();
}

function formatYAML(yaml, indent) {
  const pad = ' '.repeat(indent);
  const lines = yaml.split('\n');
  const result = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // Detect current indentation level in multiples of any whitespace
    const leadingMatch = line.match(/^(\s*)/);
    const leading = leadingMatch ? leadingMatch[1] : '';
    // Estimate level from leading spaces (using 2 as base)
    const rawLevel = leading.length > 0 ? Math.round(leading.length / 2) : 0;
    result.push(pad.repeat(rawLevel) + trimmed);
  }

  return result.join('\n');
}

function minifyYAML(yaml) {
  return yaml.split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim() !== '')
    .join('\n');
}

export default function XMLYAMLFormatter({ tool }) {
  const [mode, setMode] = useState('xml');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState(null);

  const handleFormat = useCallback(() => {
    setError(null);
    try {
      let formatted;
      if (mode === 'xml') {
        formatted = formatXML(inputText, indentSize);
        setHighlighted(highlightXML(formatted));
      } else {
        formatted = formatYAML(inputText, indentSize);
        setHighlighted(highlightYAML(formatted));
      }
      setOutputText(formatted);
    } catch (e) {
      setError(`Invalid ${mode.toUpperCase()}: ${e.message}`);
      setOutputText('');
      setHighlighted(null);
    }
  }, [inputText, indentSize, mode]);

  const handleMinify = useCallback(() => {
    setError(null);
    try {
      let minified;
      if (mode === 'xml') {
        minified = minifyXML(inputText);
        setHighlighted(highlightXML(minified));
      } else {
        minified = minifyYAML(inputText);
        setHighlighted(highlightYAML(minified));
      }
      setOutputText(minified);
    } catch (e) {
      setError(`Invalid ${mode.toUpperCase()}: ${e.message}`);
      setOutputText('');
      setHighlighted(null);
    }
  }, [inputText, mode]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = outputText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputText]);

  const tabStyle = (active) => ({
    padding: '8px 20px',
    border: 'none',
    background: active ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    borderRadius: '6px 6px 0 0',
    transition: 'background 0.15s',
  });

  return (
    <div>
      <InfoCard description="Format, minify, and validate XML and YAML. Uses the browser's built-in DOMParser for XML. All processing happens locally in your browser." />

      {error && <ErrorCard message={error} />}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        <button style={tabStyle(mode === 'xml')} onClick={() => { setMode('xml'); setOutputText(''); setHighlighted(null); setError(null); }}>XML</button>
        <button style={tabStyle(mode === 'yaml')} onClick={() => { setMode('yaml'); setOutputText(''); setHighlighted(null); setError(null); }}>YAML</button>
      </div>

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setHighlighted(null); setError(null); }}
        placeholder={mode === 'xml' ? 'Paste your XML here...' : 'Paste your YAML here...'}
        rows={12}
        spellCheck={false}
      />

      <div className="json-formatter-toolbar">
        <div className="json-formatter-indent">
          <label className="find-replace-label">Indent:</label>
          <select
            value={indentSize}
            onChange={e => setIndentSize(Number(e.target.value))}
            className="json-formatter-select"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <div className="json-formatter-buttons">
          <button
            className="action-button"
            style={{ width: 'auto', margin: 0 }}
            onClick={handleFormat}
            disabled={!inputText.trim()}
          >
            Format
          </button>
          <button
            className="action-button"
            style={{ width: 'auto', margin: 0, background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            onClick={handleMinify}
            disabled={!inputText.trim()}
          >
            Minify
          </button>
        </div>
      </div>

      {highlighted && outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">Result</span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="json-formatter-output">
            {highlighted}
          </div>
        </div>
      )}
    </div>
  );
}
