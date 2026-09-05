// One csv writer for every server side export. Matches papaparse defaults,
// which produced these files while the browser assembled them: CRLF rows, and
// a field quoted only when it contains a delimiter, a quote or a newline.
const QUOTE_IF = /[",\r\n]/;

// Excel and Sheets evaluate a cell that opens with one of these, so a value
// like =HYPERLINK(...) runs on whoever opens the export. Only text is guarded:
// a number keeps its minus sign because it never reaches the parser as a
// formula. Prefixing an apostrophe is the standard fix and Excel hides it.
const FORMULA_START = /^[=+\-@\t\r]/;

// A LOCATION or TIMELINE value arrives as an object, and the default
// stringification would write "[object Object]" into the cell.
const text = (value: unknown): string => {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    case "object":
      return JSON.stringify(value);
    default:
      return "";
  }
};

export const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw = text(value);
  const rendered =
    typeof value === "string" && FORMULA_START.test(raw) ? `'${raw}` : raw;
  if (!QUOTE_IF.test(rendered)) return rendered;
  return `"${rendered.replace(/"/g, '""')}"`;
};

// A paged export writes the header once and sends later pages as rows only.
export const csvRows = (
  headers: string[],
  rows: Record<string, unknown>[]
): string =>
  rows.map((row) => headers.map((h) => cell(row[h])).join(",")).join("\r\n");

export const toCsv = (
  headers: string[],
  rows: Record<string, unknown>[]
): string =>
  rows.length === 0
    ? headers.map(cell).join(",")
    : [headers.map(cell).join(","), csvRows(headers, rows)].join("\r\n");

// Excel reads a UTF-8 csv as latin-1 without it, which mangles every accented name.
const BOM = "\uFEFF";

export const csvFile = (
  headers: string[],
  rows: Record<string, unknown>[]
): string => BOM + toCsv(headers, rows);

// A ceiling so one request cannot pull an unbounded result set into memory.
// Above this the caller has to narrow the date range.
export const EXPORT_ROW_LIMIT = 50_000;

// One page of a client-looped export. Small enough that no single response
// holds the whole board, large enough that 50k rows is fifty requests.
export const EXPORT_PAGE_LIMIT = 1_000;

// The date only ends of a picker range. The read paths apply a window only when
// both ends are set, and an end date parsed at midnight would drop that day's
// own rows.
export const exportWindow = (from?: string, to?: string) => {
  if (!from && !to) return null;

  return {
    from: from ? new Date(from).toISOString() : new Date(0).toISOString(),
    to: to
      ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`).toISOString()
      : new Date().toISOString(),
  };
};

export const csvFilename = (prefix: string) =>
  `${prefix}_${new Date().toISOString().split("T")[0]}.csv`;
