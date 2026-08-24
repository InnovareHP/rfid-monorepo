import { Button } from "@dashboard/ui/components/button";
import { ScrollArea, ScrollBar } from "@dashboard/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { cn } from "@dashboard/ui/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
  tableClassName?: string;
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
  tableClassName,
}: ReusableTableProps<T>) {
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 1;

  // Smart pagination: show max 7 page buttons with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-card shadow-sm">
      <ScrollArea>
        <Table className={cn("border-0 w-full", tableClassName)}>
          <TableHeader>
            <TableRow className="border-b border-border bg-table-header hover:bg-table-header">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    "text-left text-sm font-semibold text-foreground px-4 py-3",
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-primary">
                      Loading data...
                    </p>
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
                    <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/30">
                      <svg
                        className="h-8 w-8 text-primary"
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
                      <p className="font-semibold text-foreground">
                        {emptyMessage}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        No data available at the moment
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="border-b border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        "px-4 py-3 text-sm",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[
                              col.key as string
                            ] ?? ""
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
        <div className="flex flex-col gap-3 px-4 py-3 bg-muted/50 border-t border-border sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-foreground">
            <span className="font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalCount ?? data.length)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              of {totalCount ?? data.length} entries
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-primary/40 hover:bg-primary/15"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="hidden gap-1 sm:flex">
              {getPageNumbers().map((page, idx) => {
                if (page === "...") {
                  return (
                    <div
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground"
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
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        : "border-primary/40 hover:bg-primary/15"
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
              className="border-primary/40 hover:bg-primary/15"
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
