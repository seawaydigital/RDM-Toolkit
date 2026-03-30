import { useState, useMemo, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import { Copy, Check } from 'lucide-react';

function getRelativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const absDiff = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  if (seconds < 60) return `${prefix}${seconds} second${seconds !== 1 ? 's' : ''}${suffix}`;
  if (minutes < 60) return `${prefix}${minutes} minute${minutes !== 1 ? 's' : ''}${suffix}`;
  if (hours < 24) return `${prefix}${hours} hour${hours !== 1 ? 's' : ''}${suffix}`;
  if (days < 7) return `${prefix}${days} day${days !== 1 ? 's' : ''}${suffix}`;
  if (weeks < 5) return `${prefix}${weeks} week${weeks !== 1 ? 's' : ''}${suffix}`;
  if (months < 12) return `${prefix}${months} month${months !== 1 ? 's' : ''}${suffix}`;
  return `${prefix}${years} year${years !== 1 ? 's' : ''}${suffix}`;
}

function detectTimestampType(val) {
  const num = Number(val);
  if (isNaN(num)) return null;
  if (num > 1e12) return 'ms';
  return 's';
}

function formatLocalDateTime(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

export default function TimestampConverter({ tool }) {
  const [mode, setMode] = useState('toDate');
  const [timestampInput, setTimestampInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const handleNow = useCallback(() => {
    if (mode === 'toDate') {
      setTimestampInput(String(Math.floor(Date.now() / 1000)));
    } else {
      setDateInput(formatLocalDateTime(new Date()));
    }
  }, [mode]);

  const timestampResult = useMemo(() => {
    if (!timestampInput.trim()) return null;
    const type = detectTimestampType(timestampInput.trim());
    if (!type) return null;
    const num = Number(timestampInput.trim());
    const ms = type === 'ms' ? num : num * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return null;

    return {
      detectedType: type === 'ms' ? 'Milliseconds' : 'Seconds',
      seconds: Math.floor(ms / 1000),
      milliseconds: ms,
      iso8601: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      relative: getRelativeTime(date),
      date,
    };
  }, [timestampInput]);

  const dateResult = useMemo(() => {
    if (!dateInput.trim()) return null;
    const date = new Date(dateInput.trim());
    if (isNaN(date.getTime())) return null;
    return {
      seconds: Math.floor(date.getTime() / 1000),
      milliseconds: date.getTime(),
      iso8601: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      relative: getRelativeTime(date),
      date,
    };
  }, [dateInput]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* ignore */ }
  }, []);

  const renderResultRow = (label, value, fieldKey) => (
    <div className="timestamp-result-row" key={fieldKey}>
      <span className="timestamp-result-label">{label}</span>
      <div className="timestamp-result-value-row">
        <code className="timestamp-result-value">{value}</code>
        <button
          className="timestamp-copy-btn"
          onClick={() => handleCopy(String(value), fieldKey)}
          title="Copy"
          aria-label={`Copy ${label}`}
        >
          {copiedField === fieldKey ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <InfoCard description="Convert between Unix timestamps and human-readable dates. Auto-detects seconds versus milliseconds. Shows ISO 8601, UTC, local time, and relative time. All processing happens locally in your browser." />

      <div className="timestamp-tabs">
        <button
          className={`timestamp-tab ${mode === 'toDate' ? 'timestamp-tab--active' : ''}`}
          onClick={() => setMode('toDate')}
        >
          Timestamp &rarr; Date
        </button>
        <button
          className={`timestamp-tab ${mode === 'toTimestamp' ? 'timestamp-tab--active' : ''}`}
          onClick={() => setMode('toTimestamp')}
        >
          Date &rarr; Timestamp
        </button>
      </div>

      <div className="timestamp-panel">
        {mode === 'toDate' && (
          <>
            <div className="timestamp-input-group">
              <label className="timestamp-label">Unix Timestamp</label>
              <div className="timestamp-input-row">
                <input
                  type="text"
                  className="timestamp-input"
                  value={timestampInput}
                  onChange={e => setTimestampInput(e.target.value)}
                  placeholder="e.g. 1700000000 or 1700000000000"
                  spellCheck={false}
                />
                <button className="timestamp-now-btn" onClick={handleNow}>Now</button>
              </div>
              {timestampResult && (
                <span className="timestamp-detected">
                  Detected: {timestampResult.detectedType}
                </span>
              )}
            </div>

            {timestampResult && (
              <div className="timestamp-results">
                {renderResultRow('ISO 8601', timestampResult.iso8601, 'iso')}
                {renderResultRow('UTC', timestampResult.utc, 'utc')}
                {renderResultRow('Local Time', timestampResult.local, 'local')}
                {renderResultRow('Relative', timestampResult.relative, 'relative')}
                {renderResultRow('Seconds', timestampResult.seconds, 'seconds')}
                {renderResultRow('Milliseconds', timestampResult.milliseconds, 'milliseconds')}
              </div>
            )}
          </>
        )}

        {mode === 'toTimestamp' && (
          <>
            <div className="timestamp-input-group">
              <label className="timestamp-label">Date / Time</label>
              <div className="timestamp-input-row">
                <input
                  type="datetime-local"
                  className="timestamp-input"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  step="1"
                />
                <button className="timestamp-now-btn" onClick={handleNow}>Now</button>
              </div>
            </div>

            {dateResult && (
              <div className="timestamp-results">
                {renderResultRow('Unix (seconds)', dateResult.seconds, 'ts-seconds')}
                {renderResultRow('Unix (milliseconds)', dateResult.milliseconds, 'ts-ms')}
                {renderResultRow('ISO 8601', dateResult.iso8601, 'ts-iso')}
                {renderResultRow('UTC', dateResult.utc, 'ts-utc')}
                {renderResultRow('Relative', dateResult.relative, 'ts-relative')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
