// CSV parsing and serialising for De-identify Research Data.

/**
 * Parse CSV text into rows of cells. Quote state carries across line breaks,
 * so a quoted multi-line cell (survey free text, a two-line address) stays one
 * cell. Blank lines are skipped.
 *
 * Throws a user-facing Error when the input cannot be read unambiguously: an
 * unclosed quote, or a row with more or fewer cells than the header. A
 * misaligned row could put an identifier in a column the user did not select,
 * so it is refused rather than guessed at (security audit 2026-10-22, C8).
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const endRow = () => {
    row.push(cell);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    row = [];
    cell = '';
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += ch;
    }
  }
  if (inQuotes) {
    throw new Error('The file has a quoted cell that is never closed. Check for a stray " character.');
  }
  endRow();

  const width = rows[0]?.length ?? 0;
  const bad = rows.findIndex(r => r.length !== width);
  if (bad > 0) {
    const n = rows[bad].length;
    throw new Error(`Row ${bad + 1} has ${n} column${n === 1 ? '' : 's'}, but the header has ${width}. Fix the file so every row has the same number of columns.`);
  }
  return rows;
}

export function rowToCSV(row) {
  return row.map(cell => {
    if (/[",\r\n]/.test(cell)) {
      return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
  }).join(',');
}
