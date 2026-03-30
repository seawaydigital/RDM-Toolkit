import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

function syntaxHighlight(json) {
  // Returns an array of React elements with syntax coloring
  const lines = json.split('\n');
  return lines.map((line, i) => {
    const parts = [];
    let remaining = line;
    let key = 0;

    // Match JSON tokens: strings, numbers, booleans, null, braces/brackets, colons, commas
    const tokenRegex = /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],])/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(remaining)) !== null) {
      // Add any whitespace before this token
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
      }

      if (match[1]) {
        // String — check if it's a key (followed by colon)
        if (match[2]) {
          parts.push(<span key={key++} className="json-key">{match[1]}</span>);
          parts.push(<span key={key++} className="json-colon">{match[2]}</span>);
        } else {
          parts.push(<span key={key++} className="json-string">{match[1]}</span>);
        }
      } else if (match[3]) {
        parts.push(<span key={key++} className="json-number">{match[3]}</span>);
      } else if (match[4]) {
        parts.push(<span key={key++} className="json-boolean">{match[4]}</span>);
      } else if (match[5]) {
        parts.push(<span key={key++} className="json-null">{match[5]}</span>);
      } else if (match[6]) {
        parts.push(<span key={key++} className="json-bracket">{match[6]}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
    }

    return (
      <div key={i} className="json-formatter-line">
        <span className="json-formatter-line-num">{i + 1}</span>
        <span className="json-formatter-line-content">{parts.length > 0 ? parts : line}</span>
      </div>
    );
  });
}

export default function JSONFormatter({ tool }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState(null);

  const handleFormat = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(inputText);
      const indent = indentSize === 0 ? '\t' : indentSize;
      const formatted = JSON.stringify(parsed, null, indent);
      setOutputText(formatted);
      setHighlighted(syntaxHighlight(formatted));
    } catch (e) {
      const lineMatch = e.message.match(/position (\d+)/);
      let lineNum = null;
      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        const before = inputText.slice(0, pos);
        lineNum = (before.match(/\n/g) || []).length + 1;
      }
      setError(lineNum
        ? `Invalid JSON at line ${lineNum}: ${e.message}`
        : `Invalid JSON: ${e.message}`);
      setOutputText('');
      setHighlighted(null);
    }
  }, [inputText, indentSize]);

  const handleMinify = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(inputText);
      const minified = JSON.stringify(parsed);
      setOutputText(minified);
      setHighlighted(syntaxHighlight(minified));
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
      setOutputText('');
      setHighlighted(null);
    }
  }, [inputText]);

  const handleValidate = useCallback(() => {
    setError(null);
    setOutputText('');
    setHighlighted(null);
    try {
      JSON.parse(inputText);
      setError(null);
      setOutputText('__valid__');
    } catch (e) {
      const lineMatch = e.message.match(/position (\d+)/);
      let lineNum = null;
      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        const before = inputText.slice(0, pos);
        lineNum = (before.match(/\n/g) || []).length + 1;
      }
      setError(lineNum
        ? `Invalid JSON at line ${lineNum}: ${e.message}`
        : `Invalid JSON: ${e.message}`);
    }
  }, [inputText]);

  const handleCopy = useCallback(async () => {
    if (!outputText || outputText === '__valid__') return;
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

  return (
    <div>
      <InfoCard description="Format, minify, and validate JSON using native browser APIs. Syntax errors are reported with line numbers. All processing happens locally in your browser." />

      {error && <ErrorCard message={error} />}

      {outputText === '__valid__' && (
        <div className="json-formatter-valid">
          Valid JSON
        </div>
      )}

      <textarea
        className="text-tool-textarea text-tool-textarea--mono"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); setHighlighted(null); setError(null); }}
        placeholder="Paste your JSON here..."
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
            <option value={0}>Tab</option>
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
          <button
            className="action-button"
            style={{ width: 'auto', margin: 0, background: 'var(--accent-green)', color: '#0F172A' }}
            onClick={handleValidate}
            disabled={!inputText.trim()}
          >
            Validate
          </button>
        </div>
      </div>

      {highlighted && outputText && outputText !== '__valid__' && (
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
