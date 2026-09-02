import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  ExportCsvButton,
  type ExportRange,
} from "@/components/export-csv-button";
import ReusableTable from "@/components/reusable-table/reusable-table";
import { downloadCSVBlob } from "@/lib/fe-helpers";
import { exportBoardCsv } from "@/services/lead/lead-service";
import {
  deleteReferral,
  getReferral,
} from "@/services/referral/referral-service";
import type { LeadRow, ReferralRow } from "@dashboard/shared";
import { PageHeader } from "@/components/page-header";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { KanbanSquare, Plus, Settings, TableProperties } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import KanbanView from "@/components/kanban/kanban-view";
import { KanbanSettingsDialog } from "@/components/kanban/kanban-settings-dialog";
import { can } from "@/lib/permissions";
import type { Member } from "better-auth/plugins/organization";
import ColumnFilter from "../master-list/column-filter";
import { MasterListFilters } from "../master-list/master-list-filter";
import { MasterListView } from "../master-list/master-list-view";
import { generateReferralColumns } from "./referral-list-column";
import { ReferralStatsStrip } from "./referral-stats-strip";

interface RouteContext {
  activeOrganizationId: string;
}

export default function ReferralListPage() {
  const ctx = useRouteContext({ from: "__root__" }) as RouteContext;
  const activeOrganizationId = ctx?.activeOrganizationId ?? "";

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [openMasterListView, setOpenMasterListView] = useState(false);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [openKanbanSettings, setOpenKanbanSettings] = useState(false);
  const queryClient = useQueryClient();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canConfigureKanban = can(memberData?.role, { field: ["configure"] });
  const [filterMeta, setFilterMeta] = useState<{
    boardDateFrom: null | Date;
    boardDateTo: null | Date;
    filter: Record<string, string>;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({
    boardDateFrom: null,
    boardDateTo: null,
    filter: {},
    limit: 10,
  });

  const { data, refetch, isFetching } = useQuery({
    queryKey: [...boardQueryKey("REFERRAL"), filterMeta],
    queryFn: () => getReferral(filterMeta),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
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

  const VISIBILITY_KEY = "referral-list-column-visibility";
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
    data: rows as ReferralRow[],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing, columnVisibility },
    onColumnSizingChange: handleColumnSizingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
  });

  const deleteReferralMutation = useMutation({
    mutationFn: deleteReferral,
    onMutate: async (columnIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey("REFERRAL") });
      const previous = queryClient.getQueriesData({ queryKey: boardQueryKey("REFERRAL") });
      queryClient.setQueriesData({ queryKey: boardQueryKey("REFERRAL") }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((r: ReferralRow) => !columnIds.includes(r.id)),
        };
      });
      return { previous };
    },
    onError: (_err, _ids, context: any) => {
      context?.previous?.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as any, data)
      );
      toast.error("Failed to delete referral.");
    },
  });

  const handleDeleteReferrals = (columnIds: string[]) => {
    deleteReferralMutation.mutate(columnIds);
  };

  const handleExportCSV = async (range: ExportRange) => {
    if (rows.length === 0) {
      toast.error("No leads available to export.");
      return;
    }

    const { blob, filename } = await exportBoardCsv(
      { ...filterMeta, boardDateFrom: range.from, boardDateTo: range.to },
      "REFERRAL"
    );

    downloadCSVBlob(blob, filename);
    toast.success("CSV download started.");
  };

  const tableColumns = useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.id !== "create_column")
      .map((column) => {
        const accessorKey = (column.columnDef as any).accessorKey as
          | string
          | undefined;
        // The name column's accessorKey is a placeholder ("record_name"),
        // not the user-facing label; every other column's accessorKey is
        // already the real field name.
        const label =
          accessorKey === "record_name"
            ? "Referral Liaison"
            : (accessorKey ?? column.id ?? "Unnamed Column");

        return {
          label,
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
        {/* Header Section */}
        <KanbanSettingsDialog
          open={openKanbanSettings}
          setOpen={setOpenKanbanSettings}
          moduleType="REFERRAL"
        />

        <PageHeader
          title="Referral Logs"
          description="Manage your referrals and export data for reporting."
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
          {view === "table" && (
            <ColumnFilter tableColumns={tableColumns as any} />
          )}
          <ExportCsvButton
            onExport={handleExportCSV}
            className="flex items-center gap-2"
          />
        </PageHeader>

        <ReferralStatsStrip
          dateFrom={filterMeta.boardDateFrom}
          dateTo={filterMeta.boardDateTo}
        />

        <MasterListFilters
          columns={data?.columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isReferral={true}
          actions={
            <Link
              to="/$team/referral-list/create"
              params={{ team: activeOrganizationId }}
            >
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Referral
              </Button>
            </Link>
          }
        />

        {view === "kanban" ? (
          <KanbanView
            moduleType="REFERRAL"
            onCardOpen={(recordId) => {
              setSelectedRecordId(recordId);
              setOpenMasterListView(true);
            }}
          />
        ) : (
        <ReusableTable
          table={table}
          columns={columns}
          isFetchingList={isFetching}
          onLoadMore={() => {}}
          hasMore={false}
          setActivePage={() => {}}
          onDelete={handleDeleteReferrals}
          onRowOpen={(recordId) => {
            setSelectedRecordId(recordId);
            setOpenMasterListView(true);
          }}
          totalCount={data?.pagination.count ?? 0}
          isReferral={true}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={filterMeta.limit}
          onPageSizeChange={(size) =>
            setFilterMeta((prev) => ({ ...prev, limit: size, page: 1 }) as any)
          }
        />
        )}
      </div>
    </div>
  );
}
