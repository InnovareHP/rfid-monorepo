import { FileTerminal } from "lucide-react";
import Papa from "papaparse";

// Excel and Sheets evaluate a cell that opens with one of these, so an exported
// record name would run as a formula. Same guard as the server export.
const FORMULA_START = /^[=+\-@\t\r]/;

const csvSafe = (value: unknown) =>
  typeof value === "string" && FORMULA_START.test(value) ? `'${value}` : value;

export const FILETYPE = {
  create: FileTerminal,
  update: FileTerminal,
  delete: FileTerminal,
};

// Rows keyed by the column names given. Board modules do not come through here
// any more - they export server side, which is the only path that can resolve
// the assignee and reach past the page the client is holding.
export function exportToCSV(
  data: Record<string, unknown>[],
  columns: string[],
  filename: string
) {
  if (!data || data.length === 0) return;

  const csvData = data.map((row) => {
    const formattedRow: Record<string, unknown> = {};

    columns.forEach((column) => {
      formattedRow[column] = csvSafe(row[column] ?? "");
    });

    return formattedRow;
  });

  const csv = Papa.unparse(csvData, { header: true });

  // Download Logic
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// Saves a csv the server already assembled. The browser only handles the
// download; nothing here reshapes or re-encodes the file.
export function downloadCSVBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// Downloads a header-only CSV used as an import template.
export function downloadCSVTemplate(headers: string[], filename: string) {
  const BOM = "﻿";
  const csv = Papa.unparse([headers]);
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
