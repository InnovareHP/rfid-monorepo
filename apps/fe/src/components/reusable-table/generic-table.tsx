import { Button } from "@dashboard/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@dashboard/ui/components/scroll-area";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode; // custom renderer
  className?: string;
}

interface ReusableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function ReusableTable<T>({
  data,
  columns,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  totalCount,
  emptyMessage = "No records found",
  isLoading = false,
}: ReusableTableProps<T>) {
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 1;

  // Smart pagination: show max 7 page buttons with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="w-full border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      <ScrollArea>
        <Table className="border-0">
          <TableHeader>
            <TableRow className="border-b-2 border-gray-300 bg-blue-50 hover:bg-blue-50">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    "text-blue-900 font-semibold text-sm border-r border-gray-300 last:border-r-0 py-4",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-16 border-0"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-blue-700">Loading data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-16 border-0"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                      <svg
                        className="h-8 w-8 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">{emptyMessage}</p>
                      <p className="text-sm text-gray-500">No data available at the moment</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={cn(
                    "border-b border-gray-300 hover:bg-blue-50/50 transition-colors",
                    rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        "border-r border-gray-300 last:border-r-0 py-3 px-4 text-sm",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[col.key as string] ?? ""
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between px-4 py-4 bg-blue-50 border-t-2 border-gray-300">
          <div className="text-sm text-gray-700">
            <span className="font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalCount ?? data.length)}
            </span>
            <span className="text-gray-600"> of {totalCount ?? data.length} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-blue-300 hover:bg-blue-100"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx) => {
                if (page === '...') {
                  return (
                    <div
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-gray-500"
                    >
                      ...
                    </div>
                  );
                }

                const pageNum = page as number;
                const isActive = currentPage === pageNum;

                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      "w-8 h-8 p-0",
                      isActive
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        : "border-blue-300 hover:bg-blue-100"
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-blue-300 hover:bg-blue-100"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
