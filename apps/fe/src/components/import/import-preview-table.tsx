const MAX_PREVIEW_ROWS = 5;

type Props = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export function ImportPreviewTable({ headers, rows }: Props) {
  const preview = rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, index) => (
            <tr
              key={index}
              className="border-t border-border transition-colors hover:bg-muted"
            >
              {headers.map((header) => (
                <td key={header} className="whitespace-nowrap px-3 py-2">
                  {row[header] === null || row[header] === undefined
                    ? ""
                    : String(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-2 text-xs text-muted-foreground">
        Showing first {preview.length} rows only.
      </p>
    </div>
  );
}
