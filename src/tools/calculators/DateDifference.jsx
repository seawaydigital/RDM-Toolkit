import { useState, useMemo, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBusinessDays(start, end) {
  let count = 0;
  const d = new Date(start);
  const endDate = new Date(end);
  if (d > endDate) return 0;
  while (d <= endDate) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function dateDiffDetailed(start, end) {
  let s = new Date(start);
  let e = new Date(end);
  let negative = false;
  if (s > e) {
    [s, e] = [e, s];
    negative = true;
  }

  const totalMs = e.getTime() - s.getTime();
  const totalDays = Math.floor(totalMs / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(totalMs / 3600000);
  const totalMinutes = Math.floor(totalMs / 60000);
  const totalSeconds = Math.floor(totalMs / 1000);

  // Calculate years/months/days difference
  let years = e.getFullYear() - s.getFullYear();
  let months = e.getMonth() - s.getMonth();
  let days = e.getDate() - s.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(e.getFullYear(), e.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const businessDays = getBusinessDays(s, e);

  return {
    negative,
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    totalHours,
    totalMinutes,
    totalSeconds,
    businessDays,
  };
}

function addDaysToDate(dateStr, numDays) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + numDays);
  return d;
}

export default function DateDifference({ tool }) {
  const today = toDateString(new Date());
  const [mode, setMode] = useState('difference');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [baseDate, setBaseDate] = useState(today);
  const [daysToAdd, setDaysToAdd] = useState('0');
  const [addOrSubtract, setAddOrSubtract] = useState('add');

  const diff = useMemo(() => {
    if (!startDate || !endDate) return null;
    return dateDiffDetailed(startDate, endDate);
  }, [startDate, endDate]);

  const resultDate = useMemo(() => {
    if (!baseDate || daysToAdd === '') return null;
    const num = parseInt(daysToAdd, 10);
    if (isNaN(num)) return null;
    const days = addOrSubtract === 'add' ? num : -num;
    return addDaysToDate(baseDate, days);
  }, [baseDate, daysToAdd, addOrSubtract]);

  const handleSetToday = useCallback((setter) => {
    setter(toDateString(new Date()));
  }, []);

  return (
    <div>
      <InfoCard description="Calculate the difference between two dates in multiple units, or add and subtract days from a date. Shows business days (excludes weekends). All calculations happen locally in your browser." />

      <div className="date-diff-tabs">
        <button
          className={`date-diff-tab ${mode === 'difference' ? 'date-diff-tab--active' : ''}`}
          onClick={() => setMode('difference')}
        >
          Date Difference
        </button>
        <button
          className={`date-diff-tab ${mode === 'addsubtract' ? 'date-diff-tab--active' : ''}`}
          onClick={() => setMode('addsubtract')}
        >
          Add / Subtract Days
        </button>
      </div>

      {mode === 'difference' && (
        <div className="date-diff-panel">
          <div className="date-diff-inputs">
            <div className="date-diff-field">
              <label className="date-diff-label">Start Date</label>
              <div className="date-diff-input-row">
                <input
                  type="date"
                  className="date-diff-date-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <button className="date-diff-today-btn" onClick={() => handleSetToday(setStartDate)}>Today</button>
              </div>
            </div>
            <div className="date-diff-field">
              <label className="date-diff-label">End Date</label>
              <div className="date-diff-input-row">
                <input
                  type="date"
                  className="date-diff-date-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
                <button className="date-diff-today-btn" onClick={() => handleSetToday(setEndDate)}>Today</button>
              </div>
            </div>
          </div>

          {diff && (
            <div className="date-diff-results">
              {diff.negative && (
                <p className="date-diff-note">Note: Start date is after end date. Showing absolute difference.</p>
              )}
              <div className="date-diff-summary">
                <span className="date-diff-summary-main">
                  {diff.years > 0 && `${diff.years} year${diff.years !== 1 ? 's' : ''}, `}
                  {diff.months > 0 && `${diff.months} month${diff.months !== 1 ? 's' : ''}, `}
                  {diff.days} day{diff.days !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="date-diff-grid">
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.totalDays.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Total Days</span>
                </div>
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.totalWeeks.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Total Weeks</span>
                </div>
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.businessDays.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Business Days</span>
                </div>
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.totalHours.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Total Hours</span>
                </div>
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.totalMinutes.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Total Minutes</span>
                </div>
                <div className="date-diff-stat">
                  <span className="date-diff-stat-value">{diff.totalSeconds.toLocaleString()}</span>
                  <span className="date-diff-stat-label">Total Seconds</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'addsubtract' && (
        <div className="date-diff-panel">
          <div className="date-diff-inputs">
            <div className="date-diff-field">
              <label className="date-diff-label">Start Date</label>
              <div className="date-diff-input-row">
                <input
                  type="date"
                  className="date-diff-date-input"
                  value={baseDate}
                  onChange={e => setBaseDate(e.target.value)}
                />
                <button className="date-diff-today-btn" onClick={() => handleSetToday(setBaseDate)}>Today</button>
              </div>
            </div>
            <div className="date-diff-field">
              <label className="date-diff-label">Operation</label>
              <div className="date-diff-input-row">
                <select
                  className="date-diff-select"
                  value={addOrSubtract}
                  onChange={e => setAddOrSubtract(e.target.value)}
                >
                  <option value="add">Add (+)</option>
                  <option value="subtract">Subtract (&minus;)</option>
                </select>
                <input
                  type="number"
                  className="date-diff-number-input"
                  value={daysToAdd}
                  onChange={e => setDaysToAdd(e.target.value)}
                  min="0"
                  placeholder="Number of days"
                />
                <span className="date-diff-days-label">days</span>
              </div>
            </div>
          </div>

          {resultDate && !isNaN(resultDate.getTime()) && (
            <div className="date-diff-results">
              <div className="date-diff-result-date">
                <span className="date-diff-result-label">Resulting Date</span>
                <span className="date-diff-result-value">
                  {resultDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="date-diff-result-iso">
                  {toDateString(resultDate)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
