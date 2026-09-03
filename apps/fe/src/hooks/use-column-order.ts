import { useCallback, useMemo, useState } from "react";

// Mirrors how TanStack derives a column id, which the board columns rely on:
// the dynamic field columns carry an explicit id, the fixed ones only a key.
const columnId = (column: { id?: string }) =>
  column.id ?? String((column as { accessorKey?: string }).accessorKey);

// Column order is a per-user view preference, so it stays in localStorage
// beside the column sizing and visibility each board already keeps there.
export function useColumnOrder(
  storageKey: string,
  columns: readonly { id?: string }[]
) {
  const [savedOrder, setSavedOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const onColumnOrderChange = useCallback(
    (next: string[]) => {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedOrder(next);
    },
    [storageKey]
  );

  // A stored order goes stale the moment a column is added or deleted, so it is
  // reconciled against the live column ids during render rather than persisted.
  const columnOrder = useMemo(() => {
    const live = columns.map(columnId);
    const kept = savedOrder.filter((id) => live.includes(id));
    return [...kept, ...live.filter((id) => !kept.includes(id))];
  }, [columns, savedOrder]);

  return { columnOrder, onColumnOrderChange };
}
