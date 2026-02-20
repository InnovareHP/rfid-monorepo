type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Wrap in quotes if it contains commas, quotes, or newlines
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => escape(c.value(row))).join(",")
  );

  const csv = [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
