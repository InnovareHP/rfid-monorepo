import { EditableCell } from "@/components/reusable-table/editable-cell";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import type { User } from "better-auth";
import { Bell, HistoryIcon, SearchIcon } from "lucide-react";
import { CreateColumnModal } from "../reusable-table/create-column";

type ColumnType = {
  id: string;
  name: string;
  type: string;
};

type LeadRow = {
  id: string;
  record_name: string;
  assigned_to: string;
  user: User;
  [key: string]: any;
};

export function generateLeadColumns(
  columnsFromApi: ColumnType[],
  onOpenAnalyzeDialog: (recordId: string) => void,
  onOpenMasterListView: (recordId: string) => void
): ColumnDef<LeadRow>[] {
  const filteredApiColumns = columnsFromApi.filter(
    (col) => col.name !== "History" && col.type !== "TIMELINE"
  );
  const dynamicColumns: ColumnDef<LeadRow>[] = filteredApiColumns.map(
    (col) => ({
      id: col.id,
      header: col.name,
      accessorKey: col.name,
      cell: ({ row }) => (
        <EditableCell
          id={row.original.id}
          fieldKey={col.id}
          fieldName={col.name}
          value={row.original[col.name] ?? ""}
          type={col.type}
        />
      ),
    })
  );

  const selectColumn: ColumnDef<LeadRow> = {
    id: "select",
    header: () => <div className="px-4">Select</div>,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const OrganizerColumn: ColumnDef<LeadRow> = {
    header: "Organization",
    accessorKey: "Organization",
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
            fieldKey="Lead"
            value={row.original.record_name}
            type="TEXT"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <div className="flex opacity-0 group-hover:opacity-100">
            <Button onClick={() => onOpenAnalyzeDialog(row.original.id)}>
              <SearchIcon /> Analyze
            </Button>
          </div>

          <div className="flex opacity-0 group-hover:opacity-100">
            <Button
              variant="outline"
              onClick={() => onOpenMasterListView(row.original.id)}
            >
              <HistoryIcon /> History
            </Button>
          </div>
        </div>
      </div>
    ),
  };

  const AssignedToColumn: ColumnDef<LeadRow> = {
    header: "Account Manager",
    accessorKey: "assigned_to",
    cell: ({ row }) => (
      <EditableCell
        id={row.original.id}
        fieldName="Account Manager"
        fieldKey="ASSIGNED_TO"
        value={row.original.assigned_to}
        type="ASSIGNED_TO"
      />
    ),
  };

  const createNewColumn: ColumnDef<LeadRow> = {
    header: () => <CreateColumnModal />,
    id: "create_column",
    accessorKey: "create_column",
  };

  return [
    selectColumn,
    OrganizerColumn,
    AssignedToColumn,
    ...dynamicColumns,
    createNewColumn,
  ];
}
