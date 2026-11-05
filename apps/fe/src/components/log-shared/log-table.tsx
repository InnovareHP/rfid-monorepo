import ReusableTable from "@/components/reusable-table/reusable-table";
import type { Table } from "@tanstack/react-table";

type LogPageMeta = { page: number; limit: number };

type LogTableProps<T extends { id: string }> = {
  table: Table<T>;
  isLoading: boolean;
  totalCount: number;
  meta: LogPageMeta;
  onMetaChange: (meta: LogPageMeta) => void;
  onDelete: (ids: string[]) => Promise<unknown>;
  onColumnOrderChange: (columnIds: string[]) => void;
  emptyMessage: string;
};

export function LogTable<T extends { id: string }>({
  table,
  isLoading,
  totalCount,
  meta,
  onMetaChange,
  onDelete,
  onColumnOrderChange,
  emptyMessage,
}: LogTableProps<T>) {
  return (
    <ReusableTable
      table={table}
      columns={table.getAllLeafColumns()}
      isFetchingList={isLoading}
      onLoadMore={() => {}}
      hasMore={false}
      setActivePage={() => {}}
      onDelete={onDelete}
      totalCount={totalCount}
      totalPages={Math.ceil(totalCount / meta.limit)}
      currentPage={meta.page}
      setCurrentPage={(page) => onMetaChange({ ...meta, page })}
      pageSize={meta.limit}
      onPageSizeChange={(limit) => onMetaChange({ page: 1, limit })}
      emptyMessage={emptyMessage}
      enableColumnReorder
      onColumnOrderChange={onColumnOrderChange}
      enableBulkEmail={false}
    />
  );
}
