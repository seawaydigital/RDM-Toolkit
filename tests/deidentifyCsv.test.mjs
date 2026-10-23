import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, rowToCSV } from '../src/utils/deidentifyCsv.js';

// Audit C8: the parser split the file into lines before handling quotes, so a
// quoted line break moved the rest of the record (selected identifiers
// included) into column 0 of a new row, where de-identification skipped it.
test('a quoted line break stays inside its cell and later columns keep their positions', () => {
  const rows = parseCSV('id,notes,email\n1,"Met participant.\nFollow-up needed",jane.doe@example.org\n2,ok,sam.lee@example.org\n');
  assert.deepEqual(rows, [
    ['id', 'notes', 'email'],
    ['1', 'Met participant.\nFollow-up needed', 'jane.doe@example.org'],
    ['2', 'ok', 'sam.lee@example.org'],
  ]);
});

test('CRLF files parse the same way, with the quoted CRLF kept in the cell', () => {
  const rows = parseCSV('participant,address,phone\r\nP01,"123 Main St\r\nThunder Bay ON P7B 5E1",807-555-0101\r\n');
  assert.deepEqual(rows, [
    ['participant', 'address', 'phone'],
    ['P01', '123 Main St\r\nThunder Bay ON P7B 5E1', '807-555-0101'],
  ]);
});

test('escaped quotes and blank lines are handled', () => {
  const rows = parseCSV('a,b\n\n"say ""hi""",2\n\n');
  assert.deepEqual(rows, [['a', 'b'], ['say "hi"', '2']]);
});

test('an unclosed quote is refused instead of swallowing the rest of the file', () => {
  assert.throws(() => parseCSV('a,b\n"open,1\n2,3\n'), /quote/i);
});

test('a row wider or narrower than the header is refused, naming the row', () => {
  assert.throws(() => parseCSV('a,b\n1,2\n3,4,5\n'), /row 3 has 3 columns.*header has 2/i);
  assert.throws(() => parseCSV('a,b,c\n1,2,3\n4\n'), /row 3 has 1 column.*header has 3/i);
});

test('rowToCSV quotes carriage returns as well as line feeds, commas and quotes', () => {
  assert.equal(rowToCSV(['a\rb', 'c\nd', 'e,f', 'g"h', 'plain']), '"a\rb","c\nd","e,f","g""h",plain');
  const original = [['x', 'y'], ['line1\r\nline2', 'v']];
  assert.deepEqual(parseCSV(original.map(rowToCSV).join('\n')), original);
});
