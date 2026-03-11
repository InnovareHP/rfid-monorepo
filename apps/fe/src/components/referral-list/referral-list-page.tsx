import ReusableTable from "@/components/reusable-table/reusable-table";
import { exportToCSV } from "@/lib/fe-helpers";
import {
  deleteReferral,
  getReferral,
} from "@/services/referral/referral-service";
import type { LeadRow, ReferralRow } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ColumnFilter from "../master-list/column-filter";
import { MasterListFilters } from "../master-list/master-list-filter";
import { MasterListView } from "../master-list/master-list-view";
import { generateReferralColumns } from "./referral-list-column";

interface RouteContext {
  activeOrganizationId: string;
}

export default function ReferralListPage() {
  const ctx = useRouteContext({ from: "__root__" }) as RouteContext;
  const activeOrganizationId = ctx?.activeOrganizationId ?? "";
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [openMasterListView, setOpenMasterListView] = useState(false);
  const queryClient = useQueryClient();
  const [filterMeta, setFilterMeta] = useState<{
    dateFrom: null | string;
    dateTo: null | string;
    filter: Record<string, string>;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({
    dateFrom: null,
    dateTo: null,
    filter: {},
    limit: 10,
  });

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["referrals", filterMeta],
    queryFn: () => getReferral(filterMeta),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const rows = data?.data ?? [];

  const handleSort = (columnId: string, order: "asc" | "desc" | null) => {
    setFilterMeta((prev) => ({
      ...prev,
      sortBy: order ? columnId : undefined,
      sortOrder: order ?? undefined,
    }));
  };

  const columns = useMemo(
    () =>
      generateReferralColumns(
        data?.columns ?? [],
        (recordId: string) => {
          setSelectedRecordId(recordId);
          setOpenMasterListView(true);
        },
        { sortBy: filterMeta.sortBy, sortOrder: filterMeta.sortOrder },
        handleSort
      ),
    [data?.columns, filterMeta.sortBy, filterMeta.sortOrder]
  ) as {
    id: string;
    name: string;
    type: string;
  }[];

  const STORAGE_KEY = "referral-list-column-sizing";
  const [columnSizing, setColumnSizing] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleColumnSizingChange = useCallback((updater: any) => {
    setColumnSizing((prev: any) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 300);
      return next;
    });
  }, []);

  const table = useReactTable({
    data: rows as ReferralRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing },
    onColumnSizingChange: handleColumnSizingChange,
  });

  // const addReferralMutation = useMutation({
  //   mutationFn: createReferral,
  //   onMutate: async (newReferral) => {
  //     await queryClient.cancelQueries({ queryKey: ["referrals", filterMeta] });
  //     const previousData = queryClient.getQueryData(["referrals", filterMeta]);
  //     queryClient.setQueryData(["referrals", filterMeta], (old: any) => {
  //       if (!old) return old;
  //       return {
  //         ...old,
  //         pages: [
  //           {
  //             ...old.pages[0],
  //             data: [newReferral[0], ...old.pages[0].data],
  //           },
  //           ...old.pages.slice(1),
  //         ],
  //       };
  //     });
  //     return { previousData };
  //   },
  //   onError: (_err, _newLead, context: any) => {
  //     queryClient.setQueryData(["referrals", filterMeta], context.previousData);
  //     toast.error("Failed to add lead.");
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries({ queryKey: ["referrals", filterMeta] });
  //   },
  // });

  const deleteReferralMutation = useMutation({
    mutationFn: deleteReferral,
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: ["referrals", filterMeta] });
      const previousData = queryClient.getQueryData(["referrals", filterMeta]);
      queryClient.setQueryData(["referrals", filterMeta], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((r: ReferralRow) => !columnIds.includes(r.id)),
        };
      });
      return { previousData };
    },
    onError: (_err, _ids, context: any) => {
      queryClient.setQueryData(["referrals", filterMeta], context.previousData);
      toast.error("Failed to delete leads.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", filterMeta] });
    },
  });

  const handleDeleteReferrals = (columnIds: string[]) => {
    deleteReferralMutation.mutate(columnIds);
  };

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No leads available to export.");
      return;
    }

    const limit = 100;
    let offset = 0;
    let allData: ReferralRow[] = [];

    let total = 0;
    let columns: any[] = [];

    do {
      const res = await getReferral({
        ...filterMeta,
        limit,
        offset,
      });

      if (offset === 0) {
        total = res.pagination.count;
        columns = res.columns;
      }

      columns = res.columns;
      allData = [...allData, ...res.data];
      offset += res.data.length;
    } while (offset < total);

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(allData, columns, `Referral_List_${timestamp}`, [], true);
    toast.success("CSV download started.");
  };

  const tableColumns = useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.id !== "create_column")
      .map((column) => {
        const header = column.columnDef.header;
        let columnLabel = column.id || "Unnamed Column"; // Default to column id

        if (typeof header === "string") {
          columnLabel = header;
        } else if (typeof header === "function") {
          const renderedHeader = header({
            column,
            header: column.columnDef.header as unknown as Header<
              unknown,
              unknown
            >,
            table,
          });

          if (React.isValidElement(renderedHeader)) {
            const props = renderedHeader.props as {
              children: string | string[];
            };
            if (typeof props.children === "string") {
              columnLabel = props.children;
            } else if (Array.isArray(props.children)) {
              columnLabel = props.children
                .map((child) => (typeof child === "string" ? child : ""))
                .join("");
            }
          }
        }

        return {
          label: columnLabel, // Extracted column name
          accessorFn: column.id,
          getCanHide: column.getCanHide,
          getIsVisible: column.getIsVisible,
          toggleVisibility: column.toggleVisibility,
        };
      });
  }, [table]);

  const totalPages = Math.ceil(
    (data?.pagination.count ?? 0) / filterMeta.limit
  );
  const currentPage = data?.pagination.page ?? 1;
  const setCurrentPage = (page: number) => {
    setFilterMeta((prev) => ({
      ...prev,
      page: page,
    }));
  };
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="space-y-6">
        <MasterListView
          open={openMasterListView}
          setOpen={setOpenMasterListView}
          leadId={selectedRecordId ?? ""}
          isReferral={true}
          hasNotification={
            selectedRecordId
              ? (data?.data.find((r: LeadRow) => r.id === selectedRecordId)
                  ?.has_notification ?? false)
              : false
          }
          initialTab="history"
        />
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Referral
              </h1>
              <p className="text-gray-500 mt-1">
                Manage your referrals and export data for reporting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="flex items-center gap-2 border-gray-300 hover:bg-white hover:text-primary transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <ColumnFilter tableColumns={tableColumns as any} />
              <Link
                to="/$team/referral-list/create"
                className="flex items-center gap-2 shadow-sm"
                params={{ team: activeOrganizationId }}
              >
                <Button
                  variant="default"
                  className="flex items-center gap-2 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Referral
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white">
          <MasterListFilters
            columns={data?.columns ?? []}
            filterMeta={filterMeta}
            refetch={refetch}
            setFilterMeta={setFilterMeta}
            isReferral={true}
          />
        </div>

        <ReusableTable
          table={table}
          columns={columns}
          isFetchingList={isFetching}
          onLoadMore={() => {}}
          hasMore={false}
          setActivePage={() => {}}
          onAdd={() => {}}
          onDelete={handleDeleteReferrals}
          isReferral={true}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
}
