import { useState, useMemo, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';

export default function FindReplace({ tool }) {
  const [inputText, setInputText] = useState('');
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);

  const { matchCount, computedRegexError } = useMemo(() => {
    if (!findValue || !inputText) return { matchCount: 0, computedRegexError: null };
    try {
      let pattern = findValue;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const matches = inputText.match(regex);
      return { matchCount: matches ? matches.length : 0, computedRegexError: null };
    } catch (e) {
      return { matchCount: 0, computedRegexError: `Invalid regex: ${e.message}` };
    }
  }, [inputText, findValue, caseSensitive, useRegex, wholeWord]);

  const handleReplaceAll = useCallback(() => {
    if (!findValue || !inputText) return;
    try {
      let pattern = findValue;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const result = inputText.replace(regex, replaceValue);
      setOutputText(result);
    } catch {
      // Error already shown via matchCount memo
    }
  }, [inputText, findValue, replaceValue, caseSensitive, useRegex, wholeWord]);

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
      <InfoCard description="Find and replace text with support for case-sensitive matching, whole-word matching, and regular expressions. All processing happens in your browser — your text is never sent anywhere." />

      {computedRegexError && <ErrorCard message={computedRegexError} />}

      <textarea
        className="text-tool-textarea"
        value={inputText}
        onChange={e => { setInputText(e.target.value); setOutputText(''); }}
        placeholder="Paste or type your text here..."
        rows={10}
        spellCheck={false}
      />

      <div className="find-replace-controls">
        <div className="find-replace-fields">
          <div className="find-replace-field">
            <label className="find-replace-label">Find</label>
            <input
              type="text"
              className="find-replace-input"
              value={findValue}
              onChange={e => { setFindValue(e.target.value); setOutputText(''); }}
              placeholder="Search text or pattern..."
            />
          </div>
          <div className="find-replace-field">
            <label className="find-replace-label">Replace with</label>
            <input
              type="text"
              className="find-replace-input"
              value={replaceValue}
              onChange={e => setReplaceValue(e.target.value)}
              placeholder="Replacement text..."
            />
          </div>
        </div>

        <div className="find-replace-options">
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
              checked={useRegex}
              onChange={e => setUseRegex(e.target.checked)}
            />
            <span>Regex</span>
          </label>
          <label className="text-tool-toggle">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={e => setWholeWord(e.target.checked)}
            />
            <span>Whole word</span>
          </label>
        </div>

        <div className="find-replace-actions">
          <span className="find-replace-match-count">
            {findValue ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : ''}
          </span>
          <button
            className="action-button"
            style={{ width: 'auto', margin: 0 }}
            onClick={handleReplaceAll}
            disabled={!findValue || !inputText || matchCount === 0}
          >
            Replace All
          </button>
        </div>
      </div>

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
