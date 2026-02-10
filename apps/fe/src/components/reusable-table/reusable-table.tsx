import { cn } from "@/lib/utils";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
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
import {
  type ColumnDef,
  flexRender,
  type Table as ReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDown,
  Loader2,
  MoreHorizontalIcon,
  Trash2Icon,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../loader";
import AddRow from "./add-row";

type Props<T> = {
  table: ReactTable<T>;
  columns: ColumnDef<{ id: string; name: string; type: string }>[];
  isFetchingList: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  setActivePage: () => void;
  onAdd: (value: string) => void;
  onDelete: (ids: string[]) => void;
  isReferral?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  isError?: boolean;
};

const ReusableTable = <T extends { id: string }>({
  table,
  columns,
  isFetchingList,
  onLoadMore,
  hasMore = false,
  onAdd,
  onDelete,
  isReferral = false,
  emptyMessage = "No data found.",
  errorMessage = "Failed to load data. Please try again.",
  isError = false,
}: Props<T>) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelected = selectedRows.length > 0;
  const selectedIds = selectedRows.map((r) => r.original.id);
  const totalRows = table.getRowModel().rows.length;

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedIds);
      setDeleteDialogOpen(false);
      table.resetRowSelection();
      toast.success(`Successfully deleted ${selectedIds.length} item(s).`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete items. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
    <Card className="border border-gray-300 shadow-md">
      <CardContent className="relative p-0">
        <ScrollArea className="relative w-full">
          <Loader
            isLoading={isFetchingList && totalRows === 0}
            text="Loading data..."
          />

          {hasSelected && (
            <div className="flex items-center gap-3 m-4 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {selectedIds.length}
                </div>
                <span className="text-sm font-semibold text-blue-900">
                  {selectedIds.length === 1 ? "item" : "items"} selected
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-9 hover:bg-blue-100 text-blue-700 hover:text-blue-900"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 bg-white hover:bg-blue-50 border-blue-400"
                      aria-label="More Options"
                    >
                      <MoreHorizontalIcon className="h-4 w-4 mr-1" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
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
          <Table className="border border-gray-300">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b-2 border-gray-300 bg-blue-50"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      className="text-blue-900 text-center font-semibold border-r border-gray-300 last:border-r-0 py-4 text-sm tracking-wide"
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isError ? (
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
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    className={cn(
                      "border-b border-gray-300 hover:bg-blue-50/50 transition-all duration-150 group",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50",
                      row.getIsSelected() &&
                        "bg-blue-100 hover:bg-blue-100 border-blue-400"
                    )}
                    key={row.id}
                    data-selected={row.getIsSelected()}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "border-r border-gray-300 last:border-r-0 px-6 py-4 text-sm",
                          cellIndex === 0 && "font-medium text-gray-900"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-20 bg-gray-50 border-t border-gray-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                        <svg
                          className="h-10 w-10 text-blue-600"
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
                          Add your first entry to get started and see your data
                          here.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <ScrollBar orientation="horizontal" />
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

        <div className="flex items-center justify-between p-4 bg-blue-50 border-t-2 border-gray-300">
          <div className="flex items-center gap-3">
            <AddRow isReferral={isReferral} onAdd={onAdd} />
          </div>

          <div className="flex items-center gap-2 text-sm">
            {isFetchingList && totalRows === 0 ? (
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Loading...</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-white rounded-md border-2 border-blue-300 shadow-sm">
                <span className="font-semibold text-blue-900">{totalRows}</span>
                <span className="text-gray-700 ml-1">
                  {totalRows === 1 ? "entry" : "entries"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2Icon className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-center text-xl">
                Delete {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "item" : "items"}?
              </DialogTitle>
              <DialogDescription className="text-center">
                Are you sure you want to delete {selectedIds.length} selected{" "}
                {selectedIds.length === 1 ? "item" : "items"}? This action
                cannot be undone and all associated data will be permanently
                removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2Icon className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default React.memo(ReusableTable) as typeof ReusableTable;
