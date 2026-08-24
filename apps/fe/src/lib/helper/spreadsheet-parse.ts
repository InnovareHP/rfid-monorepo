import {
  isValidHeader,
  normalizeHeader,
  normalizeOptionValue,
} from "@dashboard/shared";
import Papa from "papaparse";

export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ParsedWorkbook = { sheets: ParsedSheet[] };

export const ACCEPTED_IMPORT_FILES = ".csv,.xlsx";

// xlsx is a zip container, legacy xls is an OLE compound file.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const isWorkbookContent = async (file: File) => {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());

  return startsWith(head, ZIP_SIGNATURE) || startsWith(head, OLE_SIGNATURE);
};

const hasValue = (row: Record<string, unknown>) =>
  Object.values(row).some(
    (value) => value !== null && value !== undefined && String(value).trim()
  );

export async function parseSpreadsheet(file: File): Promise<ParsedWorkbook> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isWorkbook = await isWorkbookContent(file);

  if (extension === "xlsx" || extension === "xls") {
    if (!isWorkbook) {
      throw new Error(
        `"${file.name}" is not a readable Excel workbook. Re-save it as .xlsx and try again.`
      );
    }

    return parseWorkbook(file);
  }

  if (extension !== "csv") {
    throw new Error("Only .csv and .xlsx files can be imported.");
  }

  // Papaparse reads a renamed workbook as binary noise and reports success with
  // rows of garbage, so the content is what decides here, not the extension.
  if (isWorkbook) {
    throw new Error(
      `"${file.name}" is an Excel workbook saved with a .csv extension. Rename it to .xlsx and upload it again.`
    );
  }

  return parseCsv(file);
}

const parseCsv = (file: File): Promise<ParsedWorkbook> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const headers = (results.meta.fields ?? [])
          .map((header) => normalizeHeader(header ?? ""))
          .filter(isValidHeader);

        if (!headers.length) {
          reject(
            new Error("No valid column headers were detected in this CSV.")
          );
          return;
        }

        const rows = (results.data ?? [])
          .filter(Boolean)
          .map((row) =>
            Object.fromEntries(
              Object.entries(row)
                .map(([key, value]) => [normalizeHeader(key), value])
                .filter(([key]) => isValidHeader(String(key)))
            )
          )
          .filter(hasValue);

        resolve({ sheets: [{ name: file.name, headers, rows }] });
      },
      error: (error: Error) =>
        reject(new Error(error?.message ?? "Failed to parse the CSV file.")),
    });
  });

const parseWorkbook = async (file: File): Promise<ParsedWorkbook> => {
  // Lazy: the parser is only pulled into a chunk once a workbook is dropped.
  const XLSX = await import("xlsx");

  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
    type: "array",
    // Without this, dates arrive as Excel serial numbers like 45678.
    cellDates: true,
  });

  if (!workbook.SheetNames.length) {
    throw new Error(`"${file.name}" contains no sheets.`);
  }

  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return { name, headers: [], rows: [] };

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: true,
    });

    return { name, ...toSheetData(matrix) };
  });

  return { sheets };
};

// The used range's first row is the header row; everything below it is data.
const toSheetData = (matrix: unknown[][]) => {
  const [headerRow = [], ...bodyRows] = matrix;
  const built = buildHeaders(headerRow);

  const rows = bodyRows
    .map((row) =>
      Object.fromEntries(
        built.map(({ header }, index) => [header, normalizeCell(row?.[index])])
      )
    )
    .filter(hasValue);

  // A used range often runs past the last real column, leaving placeholder
  // headers over nothing. Named columns stay even when empty; guesses do not.
  const headers = built
    .filter(
      ({ header, isPlaceholder }) =>
        !isPlaceholder ||
        rows.some((row) => row[header] !== null && row[header] !== undefined)
    )
    .map(({ header }) => header);

  return { headers, rows };
};

const buildHeaders = (headerRow: unknown[]) => {
  const seen = new Set<string>();

  return headerRow.map((cell, index) => {
    const cleaned = normalizeHeader(
      cell === null || cell === undefined ? "" : String(cell)
    );

    // A merged cell leaves its neighbours blank, so the column takes a
    // positional name rather than collapsing into an empty key.
    const isPlaceholder = !isValidHeader(cleaned);
    const base = isPlaceholder ? `Column ${index + 1}` : cleaned;

    // Rows are keyed by header, so a duplicate would silently eat a column.
    let header = base;
    let suffix = 2;
    while (seen.has(header)) header = `${base} (${suffix++})`;

    seen.add(header);

    return { header, isPlaceholder };
  });
};

const pad = (value: number) => String(value).padStart(2, "0");

// Local getters, not toISOString: a midnight date shifted by the timezone
// offset lands on the previous day.
const toIsoDay = (value: Date) => {
  const day = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}`;

  if (!value.getHours() && !value.getMinutes() && !value.getSeconds()) {
    return day;
  }

  return `${day} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const normalizeCell = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toIsoDay(value);
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  return normalizeOptionValue(String(value)) || null;
};

// One sheet per run, never a merge. The first sheet with rows is the intent
// often enough to default to, and the picker overrides it.
export const pickDefaultSheet = (sheets: ParsedSheet[]) =>
  sheets.find((sheet) => sheet.headers.length && sheet.rows.length) ??
  sheets.find((sheet) => sheet.headers.length) ??
  sheets[0];
