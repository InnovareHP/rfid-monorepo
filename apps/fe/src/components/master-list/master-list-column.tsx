import { EditableCell } from "@/components/reusable-table/editable-cell";
import { RecordActions } from "@/components/reusable-table/record-actions";
import { createSelectColumn } from "../reusable-table/select-column";
import { type ColumnDef } from "@tanstack/react-table";
import type { User } from "better-auth";
import { Bell, HistoryIcon, SearchIcon } from "lucide-react";
import { ColumnHeader } from "../reusable-table/column-header";
import { CreateColumnModal } from "../reusable-table/create-column";

type ColumnType = {
  id: string;
  name: string;
  type: string;
  hasData?: boolean;
};

type LeadRow = {
  id: string;
  recordName: string;
  assignedTo: string;
  user: User;
  [key: string]: any;
};

type SortState = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function generateLeadColumns(
  columnsFromApi: ColumnType[],
  onOpenAnalyzeDialog: (recordId: string) => void,
  onOpenMasterListView: (recordId: string) => void,
  sortState?: SortState,
  onSort?: (columnId: string, order: "asc" | "desc" | null) => void,
  canUseAi?: boolean
): ColumnDef<LeadRow>[] {
  const filteredApiColumns = columnsFromApi.filter(
    (col) => col.name !== "History" && col.type !== "TIMELINE"
  );
  const dynamicColumns: ColumnDef<LeadRow>[] = filteredApiColumns.map(
    (col) => ({
      id: col.id,
      header: () =>
        onSort ? (
          <ColumnHeader
            columnId={col.id}
            columnName={col.name}
            sortBy={sortState?.sortBy}
            sortOrder={sortState?.sortOrder}
            onSort={onSort}
            canDelete={!col.hasData}
          />
        ) : (
          col.name
        ),
      accessorKey: col.name,
      cell: ({ row }) => (
        <EditableCell
          id={row.original.id}
          fieldKey={col.id}
          fieldName={col.name}
          value={row.original[col.name] ?? ""}
          type={col.type}
          linkTargetId={(row.original as any).linkIds?.[col.name]}
          columns={columnsFromApi}
        />
      ),
      size: 180,
      minSize: 80,
    })
  );

  const selectColumn = createSelectColumn<LeadRow>(100);

  const OrganizerColumn: ColumnDef<LeadRow> = {
    header: () =>
      onSort ? (
        <ColumnHeader
          columnId="recordName"
          columnName="Facility"
          sortBy={sortState?.sortBy}
          sortOrder={sortState?.sortOrder}
          onSort={onSort}
          canDelete={false}
        />
      ) : (
        "Facility"
      ),
    accessorKey: "Facility",
    size: 280,
    minSize: 150,
    cell: ({ row }) => (
      <div className="group flex items-center gap-2 w-full min-w-0">
        {row.original.has_notification && (
          <div className="relative flex items-center justify-center shrink-0 animate-bounce">
            <Bell className="h-4 w-4 text-red-500 fill-red-500 drop-shadow-md" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-lg"></span>
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <EditableCell
            id={row.original.id}
            fieldName="Organization"
            fieldKey="Record"
            value={row.original.recordName}
            type="TEXT"
          />
        </div>
        <RecordActions
          actions={[
            {
              label: "View history",
              icon: HistoryIcon,
              onSelect: () => onOpenMasterListView(row.original.id),
            },
            // Analyze calls an ai-gated endpoint, so plans without it lose the action.
            ...(canUseAi
              ? [
                  {
                    label: "Analyze",
                    icon: SearchIcon,
                    onSelect: () => onOpenAnalyzeDialog(row.original.id),
                  },
                ]
              : []),
          ]}
        />
      </div>
    ),
  };

  const AssignedToColumn: ColumnDef<LeadRow> = {
    header: () =>
      onSort ? (
        <ColumnHeader
          columnId="assigned_to"
          columnName="Account Manager"
          sortBy={sortState?.sortBy}
          sortOrder={sortState?.sortOrder}
          onSort={onSort}
          canDelete={false}
        />
      ) : (
        "Account Manager"
      ),
    accessorKey: "assigned_to",
    size: 200,
    minSize: 100,
    cell: ({ row }) => (
      <EditableCell
        id={row.original.id}
        fieldName="account_manager"
        fieldKey="ASSIGNED_TO"
        value={row.original.assignedTo}
        type="ASSIGNED_TO"
      />
    ),
  };

  const createNewColumn: ColumnDef<LeadRow> = {
    header: () => <CreateColumnModal />,
    id: "create_column",
    accessorKey: "create_column",
    enableResizing: false,
    size: 200,
  };

  return [
    selectColumn,
    OrganizerColumn,
    AssignedToColumn,
    ...dynamicColumns,
    createNewColumn,
  ];
}
