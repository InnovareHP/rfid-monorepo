import {
  MARKETING_IMPORT_BATCH_SIZE,
  normalizeKey,
  TOUCHPOINT_LABELS,
} from "@dashboard/shared";

export type MarketingImportKind = "logs" | "managers";

export type MarketingLogRow = {
  date: string;
  facility: string;
  talkedTo: string;
  touchpoints: string[];
  notes?: string;
};

export type AccountManagerRow = { facility: string; email: string };

export type RowError = { row: number; message: string };

export type ImportSummary = {
  ok: number;
  skipped: number;
  problems: RowError[];
};

export const IMPORT_HEADERS: Record<MarketingImportKind, string[]> = {
  logs: ["Date", "Facility", "Talked To", "Touchpoints", "Notes"],
  managers: ["Facility", "Account Manager Email"],
};

// The spreadsheet's own line number: rows start under a one-line header.
export const sheetLine = (index: number) => index + 2;

// Accepts the enum key or its label in any case; EMAIL_BLAST is server-only.
const TOUCHPOINTS = new Map(
  Object.entries(TOUCHPOINT_LABELS)
    .filter(([key]) => key !== "EMAIL_BLAST")
    .flatMap(([key, label]) => [
      [normalizeKey(key), key],
      [normalizeKey(label), key],
    ])
);

const pad = (value: number) => String(value).padStart(2, "0");

// A workbook date arrives as a local-midnight Date, a CSV date as text.
const toIsoDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text))
    ? text
    : null;
};

export function parseImportRows(
  kind: MarketingImportKind,
  headers: string[],
  rows: Record<string, unknown>[]
): { rows: (MarketingLogRow | AccountManagerRow)[]; errors: RowError[] } {
  const columns = IMPORT_HEADERS[kind].map((name) =>
    headers.find((header) => normalizeKey(header) === normalizeKey(name))
  );
  const absent = IMPORT_HEADERS[kind].filter((_, index) => !columns[index]);
  if (absent.length) {
    return {
      rows: [],
      errors: [{ row: 1, message: `Missing columns: ${absent.join(", ")}` }],
    };
  }

  const cells = (row: Record<string, unknown>) =>
    columns.map((column) => row[column!]);
  const text = (value: unknown) => String(value ?? "").trim();
  const errors: RowError[] = [];

  const parsed = rows.flatMap<MarketingLogRow | AccountManagerRow>(
    (row, index) => {
      const fail = (message: string): [] => {
        errors.push({ row: sheetLine(index), message });
        return [];
      };

      if (kind === "managers") {
        const [facility, email] = cells(row).map(text);
        if (!facility) return fail("Facility is empty");
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Email is not valid");
        return [{ facility, email: email.toLowerCase() }];
      }

      const [date, facility, talkedTo, touchpoints, notes] = cells(row);
      const isoDate = toIsoDate(date);
      if (!isoDate) return fail("Date must be YYYY-MM-DD");
      if (!text(facility)) return fail("Facility is empty");

      const names = text(touchpoints)
        .split(/[;,]/)
        .map(normalizeKey)
        .filter(Boolean);
      const keys = names.map((name) => TOUCHPOINTS.get(name));
      if (!keys.length || keys.some((key) => !key)) {
        return fail(
          `Touchpoints must be from: ${Object.values(TOUCHPOINT_LABELS).join(", ")}`
        );
      }

      return [
        {
          date: isoDate,
          facility: text(facility),
          talkedTo: text(talkedTo),
          touchpoints: [...new Set(keys as string[])],
          notes: text(notes) || undefined,
        },
      ];
    }
  );

  return { rows: parsed, errors };
}

export const toBatches = <T>(items: T[]) =>
  Array.from(
    { length: Math.ceil(items.length / MARKETING_IMPORT_BATCH_SIZE) },
    (_, index) =>
      items.slice(
        index * MARKETING_IMPORT_BATCH_SIZE,
        (index + 1) * MARKETING_IMPORT_BATCH_SIZE
      )
  );
