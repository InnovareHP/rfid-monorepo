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
import { useEffect, useState } from "react";
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
}: {
  columns: { id: string; name: string; type: string }[];
  filterMeta: any;
  setFilterMeta: (meta: any) => void;
  isReferral?: boolean;
  isMileage?: boolean;
  isMarketing?: boolean;
  refetch: () => void;
  isExpense?: boolean;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Staging area for filters (not applied until user clicks Apply)
  const [pendingFilters, setPendingFilters] = useState<any>({
    filter: {},
    dateFrom: null,
    dateTo: null,
  });

  // Initialize pending filters from current filterMeta
  useEffect(() => {
    if (isExpense) {
      setPendingFilters({
        filter: filterMeta?.filter || {},
        dateFrom: filterMeta?.filter?.expenseDateFrom || null,
        dateTo: filterMeta?.filter?.expenseDateTo || null,
      });
    } else if (isMileage) {
      setPendingFilters({
        filter: filterMeta?.filter || {},
        dateFrom: filterMeta?.filter?.mileageDateFrom || null,
        dateTo: filterMeta?.filter?.mileageDateTo || null,
      });
    } else if (isMarketing) {
      setPendingFilters({
        filter: filterMeta?.filter || {},
        dateFrom: filterMeta?.filter?.marketingDateFrom || null,
        dateTo: filterMeta?.filter?.marketingDateTo || null,
      });
    }
  }, [isExpense, isMileage, isMarketing]);

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

    if (isReferral) {
      baseReset.referralDateFrom = null;
      baseReset.referralDateTo = null;
    } else if (!isMileage && !isMarketing && !isExpense) {
      baseReset.leadDateFrom = null;
      baseReset.leadDateTo = null;
    }

    setFilterMeta(baseReset);
    setSearchValue("");
    setPendingFilters({ filter: {}, dateFrom: null, dateTo: null });
    refetch();
    toast.info("Filters refreshed");
  };

  const handleReset = () => {
    const baseReset: any = {
      filter: {},
      limit: filterMeta?.limit || 20,
    };

    if (isReferral) {
      baseReset.referralDateFrom = null;
      baseReset.referralDateTo = null;
    } else if (!isMileage && !isMarketing && !isExpense) {
      baseReset.leadDateFrom = null;
      baseReset.leadDateTo = null;
    }

    setFilterMeta(baseReset);
    setSearchValue("");
    setPendingFilters({ filter: {}, dateFrom: null, dateTo: null });
    toast.info("Filters reset");
  };

  if (isMileage) {
    return (
      <>
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50 shadow-sm space-y-4">
          <div className="flex justify-start flex-wrap items-start gap-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {/* ONLY DATE RANGE SHOWN */}
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

            <Button onClick={handleApplyFilters} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </Button>

            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (isMarketing) {
    return (
      <>
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50 shadow-sm space-y-4">
          <div className="flex justify-start flex-wrap items-start gap-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {/* ONLY DATE RANGE SHOWN */}
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

            <Button onClick={handleApplyFilters} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </Button>

            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </>
    );
  }
  if (isExpense) {
    return (
      <>
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50 shadow-sm space-y-4">
          <div className="flex justify-start flex-wrap items-start gap-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {/* ONLY DATE RANGE SHOWN */}
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

            <Button onClick={handleApplyFilters} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </Button>

            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ⭐ NORMAL MODE (lead/referral)
  return (
    <>
      {/* === TOP BAR FILTERS === */}
      <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50 shadow-sm space-y-4">
        <div className="flex justify-start flex-wrap items-start gap-4">
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
                className="min-w-[200px]"
              />
              <Button variant="outline" onClick={handleSearch}>
                <SearchIcon className="h-4 w-4" />
              </Button>
            </ButtonGroup>
          </div>

          <Button onClick={handleRefresh} variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          {/* NORMAL DATE RANGE - Staged changes */}
          <DateRangeFilter
            from={
              isReferral
                ? filterMeta?.referralDateFrom
                : filterMeta?.leadDateFrom
            }
            to={
              isReferral ? filterMeta?.referralDateTo : filterMeta?.leadDateTo
            }
            onChange={(range) =>
              setFilterMeta((prev: any) => ({
                ...prev,
                ...(isReferral
                  ? {
                      referralDateFrom: range.from,
                      referralDateTo: range.to,
                    }
                  : {
                      leadDateFrom: range.from,
                      leadDateTo: range.to,
                    }),
              }))
            }
          />

          <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
            More Filters
          </Button>

          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* === FILTER SHEET === */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[350px] sm:w-[400px] p-4">
          <ScrollArea className="h-[calc(100vh-100px)]">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {columns && columns.length > 0 ? (
                columns
                  .filter((col) =>
                    ["TEXT", "EMAIL", "PHONE", "DROPDOWN"].includes(col.type)
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
