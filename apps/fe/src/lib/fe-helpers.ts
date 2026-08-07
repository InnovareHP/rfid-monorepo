import type { OptionsResponse } from "@dashboard/shared";
import { FileTerminal } from "lucide-react";
import Papa from "papaparse";

export const FILETYPE = {
  create: FileTerminal,
  update: FileTerminal,
  delete: FileTerminal,
};

export function exportToCSV(
  data: any[],
  columns: any[],
  filename: string,
  users: OptionsResponse[] = [],
  isReferral: boolean = false
) {
  if (!data || data.length === 0) return;

  const validColumns = columns.filter((col) => col.name !== "History");

  const csvData = data.map((row) => {
    const formattedRow: any = {};

    if (!isReferral) {
      formattedRow["Organization"] = row["referral_name"] ?? "";
      formattedRow["Account Manager"] =
        users.find((user) => user.id === row["assigned_to"])?.value ?? "";
    }

    validColumns.forEach((col) => {
      formattedRow[col.name] = row[col.name] ?? "";
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
