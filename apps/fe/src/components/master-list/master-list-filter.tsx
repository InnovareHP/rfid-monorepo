import { Button } from "@dashboard/ui/components/button";
import { ButtonGroup } from "@dashboard/ui/components/button-group";
import { DateRangeFilter } from "@dashboard/ui/components/date-range-filter";
import { Input } from "@dashboard/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@dashboard/ui/components/sheet";

import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { Loader2, RefreshCcw, SearchIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FilterComponent } from "./filter-component";

export function MasterListFilters({
  columns,
  filterMeta,
  setFilterMeta,
  isReferral = false,
  isMileage = false,
  isMarketing = false,
  refetch,
  isExpense = false,
  actions,
}: {
  columns: { id: string; name: string; type: string }[];
  filterMeta: any;
  setFilterMeta: (meta: any) => void;
  isReferral?: boolean;
  isMileage?: boolean;
  isMarketing?: boolean;
  refetch: () => void;
  isExpense?: boolean;
  actions?: ReactNode;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Staging area for filters (not applied until user clicks Apply)
  const [pendingFilters, setPendingFilters] = useState<any>(() => {
    const dateKey = isExpense
      ? "expense"
      : isMileage
        ? "mileage"
        : isMarketing
          ? "marketing"
          : null;

    if (!dateKey) {
      return { filter: {}, recordName: "", dateFrom: null, dateTo: null };
    }

    return {
      filter: filterMeta?.filter || {},
      dateFrom: filterMeta?.filter?.[`${dateKey}DateFrom`] || null,
      dateTo: filterMeta?.filter?.[`${dateKey}DateTo`] || null,
    };
  });

  const updatePendingFilter = (key: string, value: any) => {
    setPendingFilters((prev: any) => ({
      ...prev,
      filter: {
        ...prev.filter,
        [key]: value || undefined, // Remove if empty
      },
    }));
  };

  const handleSearch = () => {
    if (!searchValue?.trim()) {
      toast.error("Please enter a search term");
      return;
    }
    setFilterMeta((prev: any) => ({
      ...prev,
      search: searchValue.trim(),
    }));
    toast.success("Search applied");
  };

  const handleApplyFilters = async () => {
    setIsApplying(true);
    try {
      const newFilters: any = {
        ...filterMeta,
        filter: {
          ...filterMeta.filter,
          ...pendingFilters.filter,
        },
      };

      const recordNameFilter = pendingFilters.recordName?.trim();
      if (recordNameFilter) {
        newFilters.search = recordNameFilter;
      } else if (filterMeta.search && pendingFilters.recordName === "") {
        delete newFilters.search;
      }

      if (isExpense) {
        newFilters.filter.expenseDateFrom = pendingFilters.dateFrom;
        newFilters.filter.expenseDateTo = pendingFilters.dateTo;
      } else if (isMileage) {
        newFilters.filter.mileageDateFrom = pendingFilters.dateFrom;
        newFilters.filter.mileageDateTo = pendingFilters.dateTo;
      } else if (isMarketing) {
        newFilters.filter.marketingDateFrom = pendingFilters.dateFrom;
        newFilters.filter.marketingDateTo = pendingFilters.dateTo;
      }

      setFilterMeta(newFilters);
      setIsSheetOpen(false);
      toast.success("Filters applied successfully");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRefresh = () => {
    const baseReset: any = {
      filter: {},
      limit: filterMeta?.limit || 20,
    };

    if (!isMileage && !isMarketing && !isExpense) {
      baseReset.boardDateFrom = null;
      baseReset.boardDateTo = null;
    }

    setFilterMeta(baseReset);
    setSearchValue("");
    setPendingFilters({
      filter: {},
      recordName: "",
      dateFrom: null,
      dateTo: null,
    });
    refetch();
    toast.info("Filters refreshed");
  };

  const handleReset = () => {
    const baseReset: any = {
      filter: {},
      limit: filterMeta?.limit || 20,
    };

    if (!isMileage && !isMarketing && !isExpense) {
      baseReset.boardDateFrom = null;
      baseReset.boardDateTo = null;
    }

    setFilterMeta(baseReset);
    setSearchValue("");
    setPendingFilters({
      filter: {},
      recordName: "",
      dateFrom: null,
      dateTo: null,
    });
    toast.info("Filters reset");
  };

  // Reports share one bar: pick a date range, refine in the sheet, refresh or reset.
  if (isMileage || isMarketing || isExpense) {
    const dateKey = isExpense ? "expense" : isMileage ? "mileage" : "marketing";

    // The report bar has no Apply button, so a completed range applies at once.
    const applyDateRange = (range: { from: Date | null; to: Date | null }) => {
      setPendingFilters((prev: any) => ({
        ...prev,
        dateFrom: range.from,
        dateTo: range.to,
      }));
      if (!range.from || !range.to) return;
      setFilterMeta((prev: any) => ({
        ...prev,
        filter: {
          ...prev.filter,
          [`${dateKey}DateFrom`]: range.from,
          [`${dateKey}DateTo`]: range.to,
        },
      }));
    };

    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter
            from={pendingFilters.dateFrom}
            to={pendingFilters.dateTo}
            onChange={applyDateRange}
          />

          <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
            Advanced Filters
          </Button>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              className="text-muted-foreground"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              Reset
            </Button>
          </div>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="right" className="w-full p-4 sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Date range
              </label>
              <DateRangeFilter
                from={pendingFilters.dateFrom}
                to={pendingFilters.dateTo}
                onChange={(range) =>
                  setPendingFilters((prev: any) => ({
                    ...prev,
                    dateFrom: range.from,
                    dateTo: range.to,
                  }))
                }
              />
            </div>

            <SheetFooter className="mt-6 gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Reset
              </Button>
              <Button
                className="flex-1"
                onClick={handleApplyFilters}
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Filters"
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ⭐ NORMAL MODE (lead/referral)
  return (
    <>
      {/* === TOP BAR FILTERS === */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH BAR */}
          <div className="w-auto">
            <ButtonGroup>
              <Input
                placeholder={
                  isReferral ? "Search referrals..." : "Search organization..."
                }
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full bg-white sm:min-w-[240px]"
              />
              <Button variant="outline" onClick={handleSearch}>
                <SearchIcon className="h-4 w-4" />
              </Button>
            </ButtonGroup>
          </div>

          {/* NORMAL DATE RANGE - Staged changes */}
          <DateRangeFilter
            from={filterMeta?.boardDateFrom}
            to={filterMeta?.boardDateTo}
            onChange={(range) =>
              setFilterMeta((prev: any) => ({
                ...prev,
                boardDateFrom: range.from,
                boardDateTo: range.to,
              }))
            }
          />

          <Button
            variant="outline"
            onClick={() => {
              setPendingFilters((prev: any) => ({
                ...prev,
                recordName: filterMeta?.search ?? "",
              }));
              setIsSheetOpen(true);
            }}
          >
            Advanced Filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            className="text-muted-foreground"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            Reset
          </Button>

          {actions}
        </div>
      </div>

      {/* === FILTER SHEET === */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full p-4 sm:w-[400px]">
          <ScrollArea className="h-[calc(100vh-100px)]">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  {isReferral ? "Referral Name" : "Facility"}
                </label>
                <Input
                  placeholder={`Filter by ${isReferral ? "referral name" : "facility"}`}
                  value={pendingFilters.recordName ?? ""}
                  onChange={(e) =>
                    setPendingFilters((prev: any) => ({
                      ...prev,
                      recordName: e.target.value,
                    }))
                  }
                />
              </div>

              {columns && columns.length > 0 ? (
                columns
                  .filter(
                    (col) =>
                      !["TIMELINE", "ASSIGNED_TO"].includes(col.type)
                  )
                  .map((col) => (
                    <div key={col.id || col.name} className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        {col.name}
                      </label>
                      <FilterComponent
                        col={col}
                        filterMeta={pendingFilters}
                        updateFilter={updatePendingFilter}
                      />
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No filterable columns available
                </p>
              )}
            </div>

            <SheetFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPendingFilters({
                    filter: {},
                    recordName: "",
                    dateFrom: null,
                    dateTo: null,
                  });
                  setIsSheetOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleApplyFilters}
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Filters"
                )}
              </Button>
            </SheetFooter>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
