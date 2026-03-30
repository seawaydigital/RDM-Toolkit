import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';

export default function RemoveDuplicateLines({ tool }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleRemoveDuplicates = useCallback(() => {
    const lines = inputText.split('\n');
    const seen = new Set();
    const result = [];
    let removed = 0;

    for (const line of lines) {
      let key = line;
      if (trimWhitespace) key = key.trim();
      if (!caseSensitive) key = key.toLowerCase();

      if (seen.has(key)) {
        removed++;
      } else {
        seen.add(key);
        result.push(line);
      }
    }

    setOutputText(result.join('\n'));
    setDuplicateCount(removed);
  }, [inputText, caseSensitive, trimWhitespace]);

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

  return (
    <div>
      <InfoCard description="Remove duplicate lines from text input. Preserves the first occurrence of each unique line. All processing happens in your browser — nothing is transmitted." />

      <textarea
        className="text-tool-textarea"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setDuplicateCount(null); setOutputText(''); }}
        placeholder="Paste your text with duplicate lines here..."
        rows={10}
        spellCheck={false}
      />

      <div className="text-tool-options">
        <label className="text-tool-toggle">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={e => setCaseSensitive(e.target.checked)}
          />
          <span>Case sensitive</span>
        </label>
        <label className="text-tool-toggle">
          <input
            type="checkbox"
            checked={trimWhitespace}
            onChange={e => setTrimWhitespace(e.target.checked)}
          />
          <span>Trim whitespace</span>
        </label>
      </div>

      <button
        className="action-button"
        onClick={handleRemoveDuplicates}
        disabled={!inputText.trim()}
      >
        Remove Duplicates
      </button>

      {duplicateCount !== null && (
        <div className="text-tool-summary">
          {duplicateCount === 0
            ? 'No duplicate lines found.'
            : `Removed ${duplicateCount} duplicate line${duplicateCount !== 1 ? 's' : ''}.`}
        </div>
      )}

      {outputText && (
        <div className="find-replace-output">
          <div className="find-replace-output-header">
            <span className="find-replace-output-title">Result</span>
            <button className="text-tool-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="text-tool-textarea"
            value={outputText}
            readOnly
            rows={10}
          />
        </div>
      )}
    </div>
  );
}
