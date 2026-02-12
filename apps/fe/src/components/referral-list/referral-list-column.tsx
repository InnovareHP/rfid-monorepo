import { EditableCell } from "@/components/reusable-table/editable-cell";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import { Bell } from "lucide-react";
import { MasterListView } from "../master-list/master-list-view";
import { CreateColumnModal } from "../reusable-table/create-column";

type ColumnType = {
  id: string;
  name: string;
  type: string;
};

type ReferralRow = {
  id: string;
  referral_name: string;
  [key: string]: any;
};

export function generateReferralColumns(
  columnsFromApi: ColumnType[]
): ColumnDef<ReferralRow>[] {
  const dynamicColumns: ColumnDef<ReferralRow>[] = columnsFromApi.map(
    (col) => ({
      header: col.name,
      accessorKey: col.name, // column name from API
      cell: ({ row }) => (
        <EditableCell
          isReferral={true}
          id={row.original.id}
          fieldKey={col.id}
          fieldName={col.name}
          value={row.original[col.name] ?? ""}
          type={col.type}
        />
      ),
    })
  );

  const selectColumn: ColumnDef<ReferralRow> = {
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

  const referralNameColumn: ColumnDef<ReferralRow> = {
    header: "Referral Name",
    accessorKey: "referral_name",
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
            fieldName="Referral Name"
            fieldKey="Referral Name"
            value={row.original.referral_name}
            type="TEXT"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <MasterListView
            leadId={row.original.id}
            isReferral={true}
            hasNotification={row.original.has_notification}
            initialTab="history"
          />
        </div>
      </div>
    ),
  };

  const createNewColumn: ColumnDef<ReferralRow> = {
    header: () => <CreateColumnModal isReferral={true} />,
    accessorKey: " create_column",
  };

  return [selectColumn, referralNameColumn, ...dynamicColumns, createNewColumn];
}
