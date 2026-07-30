import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
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
import {
  type ColumnDef,
  flexRender,
  type Table as ReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDown,
  Loader2,
  MailIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { BulkEmailDialog } from "./bulk-email-dialog";
import { DeleteRecordsDialog } from "./delete-records-dialog";
import { TablePagination } from "./table-pagination";

type Props<T> = {
  table: ReactTable<T>;
  columns: ColumnDef<{ id: string; name: string; type: string }>[];
  isFetchingList: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  setActivePage: () => void;
  onDelete: (ids: string[]) => void;
  onRowOpen?: (id: string) => void;
  totalCount?: number;
  isReferral?: boolean;
  moduleType?: string;
  emptyMessage?: string;
  errorMessage?: string;
  isError?: boolean;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
};

const ReusableTable = <T extends { id: string }>({
  table,
  columns,
  isFetchingList,
  onLoadMore,
  hasMore = false,
  onDelete,
  onRowOpen,
  totalCount,
  isReferral = false,
  moduleType,
  emptyMessage = "No data found.",
  errorMessage = "Failed to load data. Please try again.",
  isError = false,
  totalPages,
  currentPage,
  setCurrentPage,
  pageSize,
  onPageSizeChange,
}: Props<T>) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelected = selectedRows.length > 0;
  const selectedIds = selectedRows.map((r) => r.original.id);
  const totalRows = table.getRowModel().rows.length;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error("Load more error:", error);
      toast.error("Failed to load more data.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearSelection = () => {
    table.resetRowSelection();
    toast.info("Selection cleared.");
  };

  return (
    <>
      {hasSelected && (
        <div className="flex items-center gap-3 m-4 p-4 bg-primary/10 border-2 border-primary/50 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {selectedIds.length}
            </div>
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.length === 1 ? "item" : "items"} selected
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-9 hover:bg-primary/15 text-primary hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-white hover:bg-primary/10 border-primary/50"
                  aria-label="More Options"
                >
                  <MoreHorizontalIcon className="h-4 w-4 mr-1" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                    <MailIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      <Card className="border border-gray-200 shadow-sm py-0 gap-0 overflow-hidden">
        <CardContent className="relative p-0">
          <ScrollArea className="relative w-full max-h-[calc(100vh-260px)]">
            <Table
              className="table-fixed w-full"
              style={{ minWidth: table.getCenterTotalSize() }}
            >
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-gray-200 bg-table-header hover:bg-table-header"
                  >
                    {headerGroup.headers.map((header, headerIndex) => {
                      const stickyLeft = headerIndex < 2;
                      const leftOffset =
                        headerIndex === 1
                          ? (headerGroup.headers[0]?.getSize() ?? 0)
                          : 0;
                      return (
                      <TableHead
                        className={cn(
                          "text-left text-sm font-semibold text-gray-900 px-4 py-3 group/header overflow-visible sticky top-0 bg-table-header",
                          stickyLeft ? "z-30" : "z-20"
                        )}
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          maxWidth: header.getSize(),
                          ...(stickyLeft
                            ? { position: "sticky", left: leftOffset }
                            : {}),
                        }}
                      >
                        <div className="overflow-hidden text-ellipsis">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </div>
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onDoubleClick={() => header.column.resetSize()}
                            className={cn(
                              "absolute -right-1 top-0 h-full w-2 cursor-col-resize select-none touch-none z-50",
                              header.column.getIsResizing()
                                ? "bg-primary"
                                : "opacity-0 group-hover/header:opacity-100 bg-gray-400"
                            )}
                            style={{ touchAction: "none" }}
                          />
                        )}
                      </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {isFetchingList && totalRows === 0 ? (
                  Array.from({ length: 8 }).map((_, rowIdx) => (
                    <TableRow
                      key={`skeleton-${rowIdx}`}
                      className="border-b border-gray-100 bg-white"
                    >
                      {table.getAllLeafColumns().map((col) => (
                        <TableCell
                          key={col.id}
                          style={{ width: col.getSize(), maxWidth: col.getSize() }}
                          className="px-4 py-3"
                        >
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-16 bg-red-50"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                          <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <p className="font-semibold text-red-900">
                          {errorMessage}
                        </p>
                        <p className="text-sm text-red-700">
                          Please refresh the page or contact support if the
                          problem persists.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const cells = row.getVisibleCells();
                    const col0Width = cells[0]?.column.getSize() ?? 0;
                    const isSelected = row.getIsSelected();
                    const rowBg = isSelected ? "bg-primary/10" : "bg-white";
                    return (
                    <TableRow
                      className={cn(
                        "border-b border-gray-100 transition-colors duration-150 group w-full",
                        rowBg,
                        isSelected
                          ? "border-primary/30 hover:bg-primary/10"
                          : "hover:bg-gray-50"
                      )}
                      key={row.id}
                      data-selected={isSelected}
                      onDoubleClick={(e) => {
                        if (!onRowOpen) return;
                        const target = e.target as HTMLElement;
                        if (
                          target.closest(
                            "button, input, select, textarea, a, [role='checkbox'], [role='combobox'], [role='dialog']"
                          )
                        )
                          return;
                        onRowOpen(row.original.id);
                      }}
                    >
                      {cells.map((cell, cellIndex) => {
                        const stickyLeft = cellIndex < 2;
                        const leftOffset = cellIndex === 1 ? col0Width : 0;
                        return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                            ...(stickyLeft
                              ? { position: "sticky", left: leftOffset, zIndex: 10 }
                              : {}),
                          }}
                          className={cn(
                            "px-4 py-3 text-sm overflow-hidden text-ellipsis",
                            cellIndex === 0 && "font-medium text-gray-900",
                            stickyLeft && rowBg,
                            stickyLeft && !isSelected && "group-hover:bg-gray-50"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                        );
                      })}
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-20 bg-gray-50 border-t border-gray-200"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/30">
                          <svg
                            className="h-10 w-10 text-primary"
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
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-900 text-lg">
                            {emptyMessage}
                          </p>
                          <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Add your first entry to get started and see your
                            data here.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          {hasMore && !isError && (
            <div className="flex w-full justify-center items-center mt-6 mb-4">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore || isFetchingList}
                className="flex gap-2 px-6 py-2.5 shadow-sm hover:shadow-md transition-all duration-200"
                size="default"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <>
                    <span>Load More</span>
                    <ArrowDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount ?? totalRows}
            selectedCount={selectedIds.length}
            pageSize={pageSize}
            setCurrentPage={setCurrentPage}
            onPageSizeChange={onPageSizeChange}
          />

          <DeleteRecordsDialog
            open={deleteDialogOpen}
            setOpen={setDeleteDialogOpen}
            recordIds={selectedIds}
            onDelete={onDelete}
            onDeleted={() => table.resetRowSelection()}
          />

          <BulkEmailDialog
            open={emailDialogOpen}
            setOpen={setEmailDialogOpen}
            recordIds={selectedIds}
            moduleType={moduleType ?? (isReferral ? "REFERRAL" : "LEAD")}
            onSent={() => table.resetRowSelection()}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default React.memo(ReusableTable) as typeof ReusableTable;
