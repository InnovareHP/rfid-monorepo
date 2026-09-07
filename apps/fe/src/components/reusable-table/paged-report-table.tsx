import { useState } from "react";
import { ReportTable, type ReportColumn } from "./report-table";

const DEFAULT_PAGE_SIZE = 10;

type PagedReportTableProps<T> = {
  columns: ReportColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  tableClassName?: string;
};

// Pages rows the API already returned in full, so a long breakdown stays readable.
export function PagedReportTable<T>({
  columns,
  rows,
  isLoading,
  emptyMessage,
  tableClassName,
}: PagedReportTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return (
    <ReportTable
      columns={columns}
      rows={rows.slice(start, start + pageSize)}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      tableClassName={tableClassName}
      currentPage={currentPage}
      pageSize={pageSize}
      totalCount={rows.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
}
