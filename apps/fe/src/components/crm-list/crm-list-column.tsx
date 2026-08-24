import { EditableCell } from "@/components/reusable-table/editable-cell";
import type { CrmModuleType } from "@/services/board/board-module-service";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import { ColumnHeader } from "../reusable-table/column-header";
import { CreateColumnModal } from "../reusable-table/create-column";
import { RelatedRecords } from "./related-records";

type ColumnType = {
  id: string;
  name: string;
  type: string;
};

export type CrmRow = {
  id: string;
  recordName: string;
  // Returned by getAllBoards on every flat row; the export range filters on it.
  createdAt?: string;
  [key: string]: any;
};

type SortState = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function generateCrmColumns(
  moduleType: CrmModuleType,
  nameLabel: string,
  columnsFromApi: ColumnType[],
  sortState?: SortState,
  onSort?: (columnId: string, order: "asc" | "desc" | null) => void
): ColumnDef<CrmRow>[] {
  const dynamicColumns: ColumnDef<CrmRow>[] = columnsFromApi.map((col) => ({
    id: col.id,
    header: () =>
      onSort ? (
        <ColumnHeader
          columnId={col.id}
          columnName={col.name}
          sortBy={sortState?.sortBy}
          sortOrder={sortState?.sortOrder}
          onSort={onSort}
          moduleType={moduleType}
        />
      ) : (
        col.name
      ),
    accessorKey: col.name,
    cell: ({ row }) => (
      <EditableCell
        moduleType={moduleType}
        id={row.original.id}
        fieldKey={col.id}
        fieldName={col.name}
        value={row.original[col.name] ?? ""}
        type={col.type}
        linkTargetId={row.original.linkIds?.[col.name]}
      />
    ),
    size: 180,
    minSize: 250,
  }));

  const selectColumn: ColumnDef<CrmRow> = {
    id: "select",
    header: () => "Select",
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 80,
  };

  const nameColumn: ColumnDef<CrmRow> = {
    header: () =>
      onSort ? (
        <ColumnHeader
          columnId="recordName"
          columnName={nameLabel}
          sortBy={sortState?.sortBy}
          sortOrder={sortState?.sortOrder}
          onSort={onSort}
          moduleType={moduleType}
        />
      ) : (
        nameLabel
      ),
    accessorKey: "record_name",
    size: 280,
    minSize: 150,
    cell: ({ row }) => (
      <div className="group flex items-center gap-2 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <EditableCell
            moduleType={moduleType}
            id={row.original.id}
            fieldName="recordName"
            fieldKey="Record"
            value={row.original.recordName}
            type="TEXT"
          />
        </div>
        <div className="hover-reveal shrink-0">
          <RelatedRecords recordId={row.original.id} />
        </div>
      </div>
    ),
  };

  const createNewColumn: ColumnDef<CrmRow> = {
    header: () => (
      <CreateColumnModal
        moduleType={moduleType}
        queryKey={boardQueryKey(moduleType)}
      />
    ),
    accessorKey: "create_column",
    enableResizing: false,
    size: 200,
  };

  return [selectColumn, nameColumn, ...dynamicColumns, createNewColumn];
}
