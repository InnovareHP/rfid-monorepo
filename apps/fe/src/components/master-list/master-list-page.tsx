import { useColumnOrder } from "@/hooks/use-column-order";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { generateLeadColumns } from "@/components/master-list/master-list-column";
import {
  ExportCsvButton,
  type ExportRange,
} from "@/components/export-csv-button";
import ReusableTable from "@/components/reusable-table/reusable-table";
import { downloadCSVBlob } from "@/lib/fe-helpers";
import { useEntitlement } from "@/hooks/use-entitlement";
import { can } from "@/lib/permissions";
import {
  deleteLead,
  exportBoardCsv,
  getLeads,
} from "@/services/lead/lead-service";
import { type LeadRow } from "@dashboard/shared";
import type { Member } from "better-auth/plugins/organization";
import { PageHeader } from "@/components/page-header";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import {
  KanbanSquare,
  ScanLine,
  Settings,
  TableProperties,
} from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { AnalyzeLeadDialog } from "./analyze-cell";
import ColumnFilter from "./column-filter";
import KanbanView from "@/components/kanban/kanban-view";
import { MasterListFilters } from "./master-list-filter";
import { KanbanSettingsDialog } from "@/components/kanban/kanban-settings-dialog";
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
  const [openKanbanSettings, setOpenKanbanSettings] = useState(false);
  const queryClient = useQueryClient();

  // The org id already rides in the route context, so this avoids a per-mount
  // auth fetch and the undefined first render that flickered role-gated UI.
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canConfigureKanban = can(memberData?.role, {
    field: ["configure"],
  });
  const entitlement = useEntitlement(activeOrganizationId);
  const canUseAi = entitlement.has("ai");

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

  const [syncedQuery, setSyncedQuery] = useState(routeSearch.q);

  // Adopt a new route query during render instead of in an effect
  if (routeSearch.q && routeSearch.q !== syncedQuery) {
    setSyncedQuery(routeSearch.q);
    setFilterMeta((prev) => ({ ...prev, search: routeSearch.q }));
  }

  const { data, refetch, isLoading } = useQuery({
    queryKey: [...boardQueryKey("LEAD"), filterMeta],
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
        handleSort,
        canUseAi
      ),
    [data?.columns, filterMeta.sortBy, filterMeta.sortOrder, canUseAi]
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

  const { columnOrder, onColumnOrderChange } = useColumnOrder(
    "master-list-column-order",
    columns
  );

  const table = useReactTable({
    data: rows as LeadRow[],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing, columnVisibility, columnOrder },
    onColumnSizingChange: handleColumnSizingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (data: any) => deleteLead(data, "LEAD"),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey("LEAD") });
      const previous = queryClient.getQueriesData({ queryKey: boardQueryKey("LEAD") });
      queryClient.setQueriesData({ queryKey: boardQueryKey("LEAD") }, (old: any) => {
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
      toast.error("Failed to delete facilities.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    },
  });

  const handleDeleteLeads = (columnIds: string[]) => {
    deleteLeadMutation.mutate(columnIds);
  };

  const handleExportCSV = async (range: ExportRange) => {
    if (rows.length === 0) {
      toast.error("No facilities available to export.");
      return;
    }

    const { blob, filename } = await exportBoardCsv(
      { ...filterMeta, boardDateFrom: range.from, boardDateTo: range.to },
      "LEAD"
    );

    downloadCSVBlob(blob, filename);
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
    // The table instance is reference-stable, so columns has to be a dependency
    // or this list stays frozen at whatever existed before the API answered.
  }, [table, columns]);

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
    <div className="page-style">
      <div className="space-y-6">
        {/* Header Section */}
        {canUseAi && (
          <>
            <AnalyzeLeadDialog
              recordId={selectedRecordId}
              open={openAnalyzeDialog}
              setOpen={setOpenAnalyzeDialog}
            />
            <SmartScanDialog open={openSmartScan} setOpen={setOpenSmartScan} />
          </>
        )}

        <KanbanSettingsDialog
          open={openKanbanSettings}
          setOpen={setOpenKanbanSettings}
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
        <PageHeader
          title="Master Marketing List"
          description="Visualize, filter, and export your facility marketing database."
        >
          <Button
            variant="outline"
            onClick={() => setView(view === "table" ? "kanban" : "table")}
            className="flex items-center gap-2"
          >
            {view === "table" ? (
              <KanbanSquare className="h-4 w-4" />
            ) : (
              <TableProperties className="h-4 w-4" />
            )}
            {view === "table" ? "Kanban" : "Table"}
          </Button>
          {view === "kanban" && canConfigureKanban && (
            <Button
              variant="outline"
              onClick={() => setOpenKanbanSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Kanban Settings
            </Button>
          )}

          <ColumnFilter tableColumns={tableColumns as any} />

          <ExportCsvButton
            onExport={handleExportCSV}
            className="flex items-center gap-2"
          />
          {canUseAi && (
            <Button
              onClick={() => setOpenSmartScan(true)}
              className="flex items-center gap-2"
            >
              <ScanLine className="h-4 w-4" />
              Smart Scan
            </Button>
          )}
        </PageHeader>

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
              enableColumnReorder
              onColumnOrderChange={onColumnOrderChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
