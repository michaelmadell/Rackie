// Minimal CSV reading and writing (RFC 4180: quoted fields, "" for a quote, CRLF or LF).

/** Parses CSV text into rows of cells. Handles a UTF-8 BOM and semicolon-separated files (Excel in some locales). */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // Drop completely blank lines (common at the end of files saved by Excel).
  return rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => r.map(unguard));
}

// Spreadsheets run cells starting with = + - @ as formulas, so exported text that
// starts with one of those gets a leading apostrophe, which is removed again on import.
const FORMULA_START = /^[=+\-@]/;
const guard = (v: string) => (FORMULA_START.test(v) ? `'${v}` : v);
const unguard = (v: string) => (v.startsWith("'") && FORMULA_START.test(v.slice(1)) ? v.slice(1) : v);

const quote = (v: string) => (/[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Rows to CSV text. Starts with a BOM so Excel reads it as UTF-8 (› and × display correctly). */
export function toCsv(rows: (string | number | undefined)[][]): string {
  return '\uFEFF' + rows.map((r) => r.map((v) => quote(guard(v === undefined ? '' : String(v)))).join(',')).join('\r\n') + '\r\n';
}