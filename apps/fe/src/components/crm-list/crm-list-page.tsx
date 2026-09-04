import { WriteGate } from "@/components/write-gate";
import ReusableTable from "@/components/reusable-table/reusable-table";
import {
  deleteModuleRecords,
  getModuleRecords,
  type CrmModuleType,
} from "@/services/board/board-module-service";
import {
  ExportCsvButton,
  type ExportRange,
} from "@/components/export-csv-button";
import { downloadCSVBlob } from "@/lib/fe-helpers";
import { exportBoardCsv } from "@/services/lead/lead-service";
import { useColumnOrder } from "@/hooks/use-column-order";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { PageHeader } from "@/components/page-header";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteContext, useSearch } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ColumnFilter from "../master-list/column-filter";
import { generateCrmColumns, type CrmRow } from "./crm-list-column";

interface RouteContext {
  activeOrganizationId: string;
}

type CrmListPageProps = {
  moduleType: CrmModuleType;
  title: string;
  description: string;
  nameLabel: string;
  addLabel: string;
  createPath: string;
};

export default function CrmListPage({
  moduleType,
  title,
  description,
  nameLabel,
  addLabel,
  createPath,
}: CrmListPageProps) {
  const ctx = useRouteContext({ from: "__root__" }) as RouteContext;
  const activeOrganizationId = ctx?.activeOrganizationId ?? "";
  const queryClient = useQueryClient();
  const queryKey = boardQueryKey(moduleType);

  const routeSearch = useSearch({ strict: false }) as { q?: string };

  const [filterMeta, setFilterMeta] = useState<{
    filter: Record<string, string>;
    limit: number;
    page: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({ filter: {}, limit: 10, page: 1, search: undefined });

  const [syncedQuery, setSyncedQuery] = useState(routeSearch.q);

  // Adopt a new route query during render instead of in an effect
  if (routeSearch.q && routeSearch.q !== syncedQuery) {
    setSyncedQuery(routeSearch.q);
    setFilterMeta((prev) => ({ ...prev, search: routeSearch.q, page: 1 }));
  }

  const { data, isFetching } = useQuery({
    queryKey: [...queryKey, filterMeta],
    queryFn: () => getModuleRecords(moduleType, filterMeta),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const rows: CrmRow[] = data?.data ?? [];

  const handleSort = (columnId: string, order: "asc" | "desc" | null) => {
    setFilterMeta((prev) => ({
      ...prev,
      sortBy: order ? columnId : undefined,
      sortOrder: order ?? undefined,
    }));
  };

  const columns = useMemo(
    () =>
      generateCrmColumns(
        moduleType,
        nameLabel,
        data?.columns ?? [],
        { sortBy: filterMeta.sortBy, sortOrder: filterMeta.sortOrder },
        handleSort
      ),
    [
      moduleType,
      nameLabel,
      data?.columns,
      filterMeta.sortBy,
      filterMeta.sortOrder,
    ]
  );

  const SIZING_KEY = `${queryKey}-column-sizing`;
  const [columnSizing, setColumnSizing] = useState(() => {
    try {
      const saved = localStorage.getItem(SIZING_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleColumnSizingChange = useCallback(
    (updater: any) => {
      setColumnSizing((prev: any) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          localStorage.setItem(SIZING_KEY, JSON.stringify(next));
        }, 300);
        return next;
      });
    },
    [SIZING_KEY]
  );

  const VISIBILITY_KEY = `${queryKey}-column-visibility`;
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(VISIBILITY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleColumnVisibilityChange = useCallback(
    (updater: any) => {
      setColumnVisibility((prev: any) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        localStorage.setItem(VISIBILITY_KEY, JSON.stringify(next));
        return next;
      });
    },
    [VISIBILITY_KEY]
  );

  const { columnOrder, onColumnOrderChange } = useColumnOrder(
    `${queryKey}-column-order`,
    columns
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing, columnVisibility, columnOrder },
    onColumnSizingChange: handleColumnSizingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteModuleRecords(moduleType, ids),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueriesData({ queryKey });
      queryClient.setQueriesData({ queryKey }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((r: CrmRow) => !ids.includes(r.id)),
        };
      });
      return { previous };
    },
    onError: (_err, _ids, context: any) => {
      context?.previous?.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as any, data)
      );
      toast.error("Failed to delete records.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Server side like the lead and referral boards: the client only ever held
  // the current page, and it wrote the name and assignee columns from keys the
  // rows do not carry, so both came out blank.
  const handleExportCSV = async (range: ExportRange) => {
    if (rows.length === 0) {
      toast.error("No records available to export.");
      return;
    }

    const { blob, filename } = await exportBoardCsv(
      { ...filterMeta, boardDateFrom: range.from, boardDateTo: range.to },
      moduleType
    );

    downloadCSVBlob(blob, filename);
    toast.success("CSV download started.");
  };

  const tableColumns = useMemo(
    () =>
      table
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
              ? nameLabel
              : (accessorKey ?? column.id ?? "Unnamed Column");
          return {
            label,
            accessorFn: column.id,
            getCanHide: column.getCanHide,
            getIsVisible: column.getIsVisible,
            toggleVisibility: column.toggleVisibility,
          };
        }),
    [table, nameLabel]
  );

  const totalPages = Math.ceil(
    (data?.pagination?.count ?? 0) / filterMeta.limit
  );
  const currentPage = data?.pagination?.page ?? 1;
  const setCurrentPage = (page: number) =>
    setFilterMeta((prev) => ({ ...prev, page }));

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader title={title} description={description}>
          <ExportCsvButton
            variant="outline"
            onExport={handleExportCSV}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          />
          <ColumnFilter tableColumns={tableColumns as any} />
          <WriteGate>
            <Link to={createPath} params={{ team: activeOrganizationId }}>
              <Button className="flex items-center gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            </Link>
          </WriteGate>
        </PageHeader>

        <ReusableTable
          table={table}
          columns={columns as any}
          isFetchingList={isFetching}
          onLoadMore={() => {}}
          hasMore={false}
          setActivePage={() => {}}
          onDelete={(ids) => deleteMutation.mutate(ids)}
          totalCount={data?.pagination?.count ?? 0}
          moduleType={moduleType}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={filterMeta.limit}
          onPageSizeChange={(size) =>
            setFilterMeta((prev) => ({ ...prev, limit: size, page: 1 }))
          }
          enableColumnReorder
          onColumnOrderChange={onColumnOrderChange}
        />
      </div>
    </div>
  );
}
