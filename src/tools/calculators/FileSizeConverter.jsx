import { useState, useMemo } from 'react';
import InfoCard from '../../components/ui/InfoCard';

const DECIMAL_UNITS = [
  { id: 'B', label: 'Bytes (B)', factor: 1 },
  { id: 'KB', label: 'Kilobytes (KB)', factor: 1000 },
  { id: 'MB', label: 'Megabytes (MB)', factor: 1e6 },
  { id: 'GB', label: 'Gigabytes (GB)', factor: 1e9 },
  { id: 'TB', label: 'Terabytes (TB)', factor: 1e12 },
  { id: 'PB', label: 'Petabytes (PB)', factor: 1e15 },
];

const BINARY_UNITS = [
  { id: 'B_bin', label: 'Bytes (B)', factor: 1 },
  { id: 'KiB', label: 'Kibibytes (KiB)', factor: 1024 },
  { id: 'MiB', label: 'Mebibytes (MiB)', factor: Math.pow(1024, 2) },
  { id: 'GiB', label: 'Gibibytes (GiB)', factor: Math.pow(1024, 3) },
  { id: 'TiB', label: 'Tebibytes (TiB)', factor: Math.pow(1024, 4) },
  { id: 'PiB', label: 'Pebibytes (PiB)', factor: Math.pow(1024, 5) },
];

const ALL_INPUT_UNITS = [
  ...DECIMAL_UNITS,
  ...BINARY_UNITS.filter(u => u.id !== 'B_bin'),
];

function formatValue(num) {
  if (num === 0) return '0';
  const abs = Math.abs(num);
  if (abs >= 1e15 || (abs > 0 && abs < 0.001)) {
    return num.toExponential(4);
  }
  if (Number.isInteger(num) && abs < 1e15) return num.toLocaleString();
  return parseFloat(num.toFixed(4)).toString();
}

export default function FileSizeConverter({ tool }) {
  const [inputValue, setInputValue] = useState('1');
  const [inputUnit, setInputUnit] = useState('GB');

  const bytes = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 0) return null;
    const unit = ALL_INPUT_UNITS.find(u => u.id === inputUnit);
    if (!unit) return null;
    return num * unit.factor;
  }, [inputValue, inputUnit]);

  const decimalResults = useMemo(() => {
    if (bytes === null) return [];
    return DECIMAL_UNITS.map(u => ({
      ...u,
      value: formatValue(bytes / u.factor),
    }));
  }, [bytes]);

  const binaryResults = useMemo(() => {
    if (bytes === null) return [];
    return BINARY_UNITS.map(u => ({
      ...u,
      value: formatValue(bytes / u.factor),
    }));
  }, [bytes]);

  return (
    <div>
      <InfoCard description="Convert between file size units including bytes, KB, MB, GB, TB, and PB. Shows both decimal (SI) and binary (IEC) equivalents simultaneously. All calculations happen locally in your browser." />

      <div className="filesize-panel">
        <div className="filesize-input-group">
          <label className="filesize-label">Enter a file size</label>
          <div className="filesize-input-row">
            <input
              type="number"
              className="filesize-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Enter value"
              min="0"
            />
            <select
              className="filesize-select"
              value={inputUnit}
              onChange={e => setInputUnit(e.target.value)}
            >
              <optgroup label="Decimal (SI)">
                {DECIMAL_UNITS.map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </optgroup>
              <optgroup label="Binary (IEC)">
                {BINARY_UNITS.filter(u => u.id !== 'B_bin').map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {bytes !== null && (
          <div className="filesize-results">
            <div className="filesize-results-section">
              <h3 className="filesize-results-title">Decimal (SI) &mdash; base 1000</h3>
              <div className="filesize-results-grid">
                {decimalResults.map(r => (
                  <div key={r.id} className={`filesize-result-item ${r.id === inputUnit ? 'filesize-result-item--active' : ''}`}>
                    <span className="filesize-result-value">{r.value}</span>
                    <span className="filesize-result-unit">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="filesize-results-section">
              <h3 className="filesize-results-title">Binary (IEC) &mdash; base 1024</h3>
              <div className="filesize-results-grid">
                {binaryResults.map(r => (
                  <div key={r.id} className={`filesize-result-item ${r.id === inputUnit ? 'filesize-result-item--active' : ''}`}>
                    <span className="filesize-result-value">{r.value}</span>
                    <span className="filesize-result-unit">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
