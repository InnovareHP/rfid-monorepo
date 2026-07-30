import { generateLeadColumns } from "@/components/master-list/master-list-column";
import ReusableTable from "@/components/reusable-table/reusable-table";
import { authClient } from "@/lib/auth-client";
import { exportToCSV } from "@/lib/fe-helpers";
import { deleteLead, getLeads } from "@/services/lead/lead-service";
import {
  isOrgAdmin,
  type LeadRow,
  type OptionsResponse,
} from "@dashboard/shared";
import type { Member } from "better-auth/plugins/organization";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import {
  Download,
  KanbanSquare,
  ScanLine,
  Settings,
  TableProperties,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { AnalyzeLeadDialog } from "./analyze-cell";
import ColumnFilter from "./column-filter";
import KanbanView from "./kanban-view";
import { MasterListFilters } from "./master-list-filter";
import { PipelineSettingsDialog } from "./pipeline-settings-dialog";
import { BoardStatsStrip } from "./board-stats-strip";
import { MasterListView } from "./master-list-view";
import { SmartScanDialog } from "./smart-scan-dialog";
import AddRow from "../reusable-table/add-row";

export default function MasterListPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [openAnalyzeDialog, setOpenAnalyzeDialog] = useState(false);
  const [openMasterListView, setOpenMasterListView] = useState(false);
  const [openSmartScan, setOpenSmartScan] = useState(false);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [openPipelineSettings, setOpenPipelineSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: organizationData } = authClient.useActiveOrganization();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    organizationData?.id,
  ]);
  const isOwner = isOrgAdmin(memberData?.role);

  const routeSearch = useSearch({ strict: false }) as { q?: string };

  const [filterMeta, setFilterMeta] = useState<{
    boardDateFrom: null | Date;
    boardDateTo: null | Date;
    filter: Record<string, string>;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({
    boardDateFrom: null,
    boardDateTo: null,
    filter: {},
    limit: 10,
    search: undefined,
  });

  useEffect(() => {
    if (!routeSearch.q) return;
    setFilterMeta((prev) => ({ ...prev, search: routeSearch.q }));
  }, [routeSearch.q]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["leads", filterMeta],
    queryFn: () => getLeads(filterMeta),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
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
      generateLeadColumns(
        data?.columns ?? [],
        (recordId: string) => {
          setSelectedRecordId(recordId);
          setOpenAnalyzeDialog(true);
        },
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

  const STORAGE_KEY = "master-list-column-sizing";
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

  const VISIBILITY_KEY = "master-list-column-visibility";
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(VISIBILITY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleColumnVisibilityChange = useCallback((updater: any) => {
    setColumnVisibility((prev: any) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(VISIBILITY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const table = useReactTable({
    data: rows as LeadRow[],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing, columnVisibility },
    onColumnSizingChange: handleColumnSizingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (data: any) => deleteLead(data, "LEAD"),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueriesData({ queryKey: ["leads"] });
      queryClient.setQueriesData({ queryKey: ["leads"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((r: LeadRow) => !ids.includes(r.id)),
        };
      });
      return { previous };
    },
    onError: (_err, _ids, context: any) => {
      context?.previous?.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as any, data)
      );
      toast.error("Failed to delete leads.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    },
  });

  const handleDeleteLeads = (columnIds: string[]) => {
    deleteLeadMutation.mutate(columnIds);
  };

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No leads available to export.");
      return;
    }

    const limit = 100;
    let offset = 0;
    let allData: LeadRow[] = [];

    let total = 0;
    let columns: any[] = [];
    let users: OptionsResponse[] =
      queryClient.getQueryData(["assigned-to-users"]) ?? [];

    do {
      const res = await getLeads({
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
    exportToCSV(allData, columns, `Master_Leads_${timestamp}`, users);
    toast.success("CSV download started.");
  };

  const tableColumns = useMemo(() => {
    return table
      .getAllColumns()
      .filter(
        (column: any) =>
          column.columnDef.accessorKey !== "create_column" &&
          column.id !== "assigned_to"
      )
      .map((column: any) => {
        const header = column.columnDef.accessorKey;
        let columnLabel = column.id || "Unnamed Column"; // Default to column id

        if (typeof header === "string") {
          columnLabel = header;
        } else if (typeof header === "function") {
          const renderedHeader = header({
            column,
            header: column.columnDef.header as unknown as Header<
              LeadRow,
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
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="space-y-6">
        {/* Header Section */}
        <AnalyzeLeadDialog
          recordId={selectedRecordId}
          open={openAnalyzeDialog}
          setOpen={setOpenAnalyzeDialog}
        />

        <SmartScanDialog open={openSmartScan} setOpen={setOpenSmartScan} />

        <PipelineSettingsDialog
          open={openPipelineSettings}
          setOpen={setOpenPipelineSettings}
        />

        <MasterListView
          open={openMasterListView}
          setOpen={setOpenMasterListView}
          leadId={selectedRecordId ?? ""}
          isReferral={false}
          hasNotification={
            selectedRecordId
              ? (data?.data.find((r: LeadRow) => r.id === selectedRecordId)
                  ?.has_notification ?? false)
              : false
          }
          initialTab="history"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight page-title">
              Master Marketing List
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Visualize, filter, and export your marketing leads database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setView(view === "table" ? "kanban" : "table")}
              className="flex items-center gap-2 border-gray-300 bg-white"
            >
              {view === "table" ? (
                <KanbanSquare className="h-4 w-4" />
              ) : (
                <TableProperties className="h-4 w-4" />
              )}
              {view === "table" ? "Pipeline" : "Table"}
            </Button>
            {view === "kanban" && isOwner && (
              <Button
                variant="outline"
                onClick={() => setOpenPipelineSettings(true)}
                className="flex items-center gap-2 border-gray-300 bg-white"
              >
                <Settings className="h-4 w-4" />
                Pipeline Settings
              </Button>
            )}

            <ColumnFilter tableColumns={tableColumns as any} />

            <Button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-brand text-white hover:bg-brand/90"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => setOpenSmartScan(true)}
              className="flex items-center gap-2 bg-brand text-white hover:bg-brand/90"
            >
              <ScanLine className="h-4 w-4" />
              Smart Scan
            </Button>
          </div>
        </div>

        {view === "table" && <BoardStatsStrip />}

        {view === "kanban" ? (
          <KanbanView
            onCardOpen={(recordId) => {
              setSelectedRecordId(recordId);
              setOpenMasterListView(true);
            }}
          />
        ) : (
          <>
            <MasterListFilters
              columns={data?.columns ?? []}
              filterMeta={filterMeta}
              refetch={refetch}
              setFilterMeta={setFilterMeta}
              actions={<AddRow />}
            />

            {/* Table Wrapper */}

            <ReusableTable
              table={table}
              columns={columns}
              isFetchingList={isLoading}
              onLoadMore={() => setCurrentPage(currentPage + 1)}
              hasMore={false}
              setActivePage={() => setCurrentPage(currentPage + 1)}
              onDelete={handleDeleteLeads}
              onRowOpen={(recordId) => {
                setSelectedRecordId(recordId);
                setOpenMasterListView(true);
              }}
              totalCount={data?.pagination.count ?? 0}
              totalPages={totalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={filterMeta.limit}
              onPageSizeChange={(size) =>
                setFilterMeta(
                  (prev) => ({ ...prev, limit: size, page: 1 }) as any
                )
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
