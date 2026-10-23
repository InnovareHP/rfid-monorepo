import { useColumnOrder } from "@/hooks/use-column-order";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type OnChangeFn,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";

const readStored = <V>(key: string, fallback: V): V => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

// Sizing and visibility are per-user view preferences, kept in localStorage like the boards.
function usePersistedTableState<V>(key: string, fallback: V) {
  const [value, setValue] = useState<V>(() => readStored(key, fallback));
  const onChange: OnChangeFn<V> = (updater) =>
    setValue((prev) => {
      const next = functionalUpdate(updater, prev);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  return [value, onChange] as const;
}

export function useLogTable<T extends { id: string }>(
  storageKey: string,
  data: T[],
  columns: ColumnDef<T>[]
) {
  const [columnSizing, onColumnSizingChange] =
    usePersistedTableState<ColumnSizingState>(`${storageKey}-sizing`, {});
  const [columnVisibility, onColumnVisibilityChange] =
    usePersistedTableState<VisibilityState>(`${storageKey}-visibility`, {});
  const { columnOrder, onColumnOrderChange } = useColumnOrder(
    `${storageKey}-order`,
    columns
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    columnResizeMode: "onChange",
    state: { columnSizing, columnVisibility, columnOrder },
    onColumnSizingChange,
    onColumnVisibilityChange,
  });

  const hideableColumns = table.getAllLeafColumns().map((column) => ({
    label:
      typeof column.columnDef.header === "string"
        ? column.columnDef.header
        : column.id,
    accessorFn: column.id,
    getCanHide: column.getCanHide,
    getIsVisible: column.getIsVisible,
    toggleVisibility: column.toggleVisibility,
  }));

  return { table, hideableColumns, onColumnOrderChange };
}

type LogPage = { data: { id: string }[]; total?: number };

// Every cached page under the key is patched, since the key carries the filter and a row can sit in any of them.
export function useLogDelete(
  queryKey: string,
  deleteFn: (ids: string[]) => Promise<unknown>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFn,
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: [queryKey] });
      const previous = queryClient.getQueriesData({ queryKey: [queryKey] });

      queryClient.setQueriesData<LogPage>({ queryKey: [queryKey] }, (old) => {
        if (!Array.isArray(old?.data)) return old;
        const data = old.data.filter((row) => !ids.includes(row.id));
        return {
          ...old,
          data,
          total: Math.max(0, (old.total ?? 0) - (old.data.length - data.length)),
        };
      });

      return { previous };
    },
    onError: (_error, _ids, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
}
