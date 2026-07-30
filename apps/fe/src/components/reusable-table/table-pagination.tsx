import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const PAGE_SIZES = [10, 25, 50, 100];

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  selectedCount: number;
  label?: string;
  pageSize?: number;
  setCurrentPage: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function TablePagination({
  currentPage,
  totalPages,
  totalCount,
  selectedCount,
  label,
  pageSize,
  setCurrentPage,
  onPageSizeChange,
}: TablePaginationProps) {
  const lastPage = Math.max(totalPages, 1);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= lastPage;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {label ?? `${selectedCount} of ${totalCount} row(s) selected.`}
      </span>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden text-muted-foreground whitespace-nowrap sm:inline">
              Rows per page
            </span>
            <Select
              value={String(pageSize ?? PAGE_SIZES[0])}
              onValueChange={(size) => onPageSizeChange(Number(size))}
            >
              <SelectTrigger className="h-8 w-[72px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-muted-foreground whitespace-nowrap">
          Page {currentPage} of {lastPage}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="First page"
            disabled={isFirstPage}
            onClick={() => setCurrentPage(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous page"
            disabled={isFirstPage}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next page"
            disabled={isLastPage}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Last page"
            disabled={isLastPage}
            onClick={() => setCurrentPage(lastPage)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
