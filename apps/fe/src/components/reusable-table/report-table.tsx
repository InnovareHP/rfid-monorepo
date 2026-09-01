import { cn } from "@dashboard/ui/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { TablePagination } from "./table-pagination";

export type ReportColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
};

type ReportTableProps<T> = {
  columns: ReportColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  // A breakdown table renders every row at once, so it opts out of paging
  // rather than passing a page size the size picker cannot represent.
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  tableClassName?: string;
};

export const ReportChip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
    {children}
  </span>
);

export function ReportTable<T>({
  columns,
  rows,
  isLoading,
  emptyMessage = "No records found",
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  tableClassName,
}: ReportTableProps<T>) {
  const paginated = Boolean(onPageChange);
  const totalPages = Math.max(
    Math.ceil((totalCount ?? rows.length) / (pageSize || rows.length || 1)),
    1
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table
          className={cn("w-full border-collapse text-left", tableClassName)}
        >
          <thead>
            <tr className="border-b border-gray-200 bg-table-header">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-sm font-semibold whitespace-nowrap text-gray-900",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-primary">
                      Loading data...
                    </p>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-4 text-sm text-gray-700",
                        column.className
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated && (
        <TablePagination
          currentPage={currentPage ?? 1}
          totalPages={totalPages}
          totalCount={totalCount ?? rows.length}
          selectedCount={0}
          label=""
          pageSize={pageSize}
          setCurrentPage={onPageChange!}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
