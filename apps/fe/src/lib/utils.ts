import { clsx, type ClassValue } from "clsx";
import Papa from "papaparse";
import { twMerge } from "tailwind-merge";
import type { OptionsResponse } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function formatCapitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function exportToCSV(
  data: any[],
  columns: any[],
  filename: string,
  users: OptionsResponse[] = [],
  isReferral: boolean = false
) {
  if (!data || data.length === 0) return;

  // 1. Filter out 'History' and prepare the list of columns to process
  const validColumns = columns.filter((col) => col.name !== "History");

  const csvData = data.map((row) => {
    // We create a new object starting with 'Organization'
    const formattedRow: any = {};

    if (!isReferral) {
      formattedRow["Organization"] = row["referral_name"] ?? "";
      formattedRow["Account Manager"] =
        users.find((user) => user.id === row["assigned_to"])?.value ?? "";
    }

    // 3. Map the rest of the columns
    validColumns.forEach((col) => {
      // Use the name directly as the key, as seen in your second image
      // (e.g., row["Number of Beds"], row["Address"])
      formattedRow[col.name] = row[col.name] ?? "";
    });

    return formattedRow;
  });

  // 4. Generate CSV string
  const csv = Papa.unparse(csvData, { header: true });

  // 5. Download Logic
  const BOM = "\uFEFF"; // Helps Excel with special characters
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

export const isValidHeader = (header: string) => {
  // remove normalized junk headers like _1, _2, �, �_1
  if (!header) return false;

  // Excel auto-generated headers
  if (/^_+\d+$/.test(header)) return false;

  // replacement characters
  if (header.includes("�")) return false;

  // headers that are only symbols
  if (!/[a-zA-Z0-9]/.test(header)) return false;

  return true;
};

export const normalizeHeader = (header: string) =>
  header
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const mapAIAnalysisToInsights = (analysis: {
  keyInsights: string[];
  strengths: string[];
  weaknesses: string[];
  actionableRecommendations: string[];
  engagementOptimizations: string[];
}) => {
  return [
    {
      title: "Key Insights",
      items: analysis.keyInsights,
    },
    {
      title: "Strengths",
      items: analysis.strengths,
    },
    {
      title: "Weaknesses",
      items: analysis.weaknesses,
    },
    {
      title: "Actionable Recommendations",
      items: analysis.actionableRecommendations,
    },
    {
      title: "Engagement Optimizations",
      items: analysis.engagementOptimizations,
    },
  ];
};
