import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { useIsMobile } from "@dashboard/ui/hooks/use-mobile";
import { cn } from "@dashboard/ui/lib/utils";
import {
  type ColumnDef,
  flexRender,
  type Table as ReactTable,
} from "@tanstack/react-table";
import {
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
import { TableEmptyState } from "./table-empty-state";
import { TableErrorState } from "./table-error-state";
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
  const isMobile = useIsMobile();
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
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 bg-primary/10 border-2 border-primary/50 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
              {selectedIds.length}
            </div>
            <span className="truncate text-sm font-semibold whitespace-nowrap text-foreground">
              {selectedIds.length === 1 ? "item" : "items"} selected
            </span>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
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
                  className="h-9 bg-card hover:bg-primary/10 border-primary/50"
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
      <Card className="border border-border shadow-sm py-0 gap-0 overflow-hidden">
        <CardContent className="relative p-0">
          {/* Native scroll, not Radix ScrollArea: ScrollArea defaults to
              type="hover", so on touch its scrollbars never show and panning a
              wide table is unreliable. The Table primitive's own container is
              switched to overflow-visible so this element owns both axes -- two
              nested scroll containers is what made the table look merely
              clipped. */}
          <div className="relative w-full max-h-[calc(100vh-260px)] overflow-auto overscroll-x-contain">
            <Table
              containerClassName="overflow-visible"
              className="table-fixed w-full"
              style={{ minWidth: table.getCenterTotalSize() }}
            >
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-border bg-table-header hover:bg-table-header"
                  >
                    {headerGroup.headers.map((header, headerIndex) => {
                      const stickyLeft = !isMobile && headerIndex < 2;
                      const leftOffset =
                        headerIndex === 1
                          ? (headerGroup.headers[0]?.getSize() ?? 0)
                          : 0;
                      return (
                      <TableHead
                        className={cn(
                          "text-left text-sm font-semibold text-foreground px-4 py-3 group/header overflow-visible sticky top-0 bg-table-header",
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
                                : "opacity-0 group-hover/header:opacity-100 bg-muted-foreground"
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
                      className="border-b border-border bg-card"
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
                      className="text-center py-16 bg-destructive/5"
                    >
                      <TableErrorState message={errorMessage} />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const cells = row.getVisibleCells();
                    const col0Width = cells[0]?.column.getSize() ?? 0;
                    const isSelected = row.getIsSelected();
                    const rowBg = isSelected ? "bg-primary/10" : "bg-card";
                    return (
                    <TableRow
                      className={cn(
                        "border-b border-border transition-colors duration-150 group w-full",
                        rowBg,
                        isSelected
                          ? "border-primary/30 hover:bg-primary/10"
                          : "hover:bg-muted/50"
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
                        const stickyLeft = !isMobile && cellIndex < 2;
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
                            cellIndex === 0 && "font-medium text-foreground",
                            stickyLeft && rowBg,
                            stickyLeft && !isSelected && "group-hover:bg-muted/50"
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
                      className="text-center py-20 bg-muted/50 border-t border-border"
                    >
                      <TableEmptyState message={emptyMessage} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
