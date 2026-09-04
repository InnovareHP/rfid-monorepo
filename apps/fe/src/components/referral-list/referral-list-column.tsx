import { EditableCell } from "@/components/reusable-table/editable-cell";
import { RecordActions } from "@/components/reusable-table/record-actions";
import { createSelectColumn } from "../reusable-table/select-column";
import { type ColumnDef } from "@tanstack/react-table";
import { HistoryIcon } from "lucide-react";
import { UnreadDot } from "@/components/reusable-table/unread-dot";
import { ColumnHeader } from "../reusable-table/column-header";
import { CreateColumnModal } from "../reusable-table/create-column";

type ColumnType = {
  id: string;
  name: string;
  type: string;
  hasData?: boolean;
};

type ReferralRow = {
  id: string;
  recordName: string;
  [key: string]: any;
};

type SortState = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function generateReferralColumns(
  columnsFromApi: ColumnType[],
  onOpenMasterListView: (id: string) => void,
  sortState?: SortState,
  onSort?: (columnId: string, order: "asc" | "desc" | null) => void
): ColumnDef<ReferralRow>[] {
  const dynamicColumns: ColumnDef<ReferralRow>[] = columnsFromApi.map(
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
            moduleType="REFERRAL"
            canDelete={!col.hasData}
          />
        ) : (
          col.name
        ),
      accessorKey: col.name,
      cell: ({ row }) => {
        return (
          <EditableCell
            isReferral={true}
            id={row.original.id}
            fieldKey={col.id}
            fieldName={col.name}
            value={row.original[col.name] ?? ""}
            type={col.type}
            linkTargetId={(row.original as any).linkIds?.[col.name]}
            columns={columnsFromApi}
          />
        );
      },

      size: 180,
      minSize: 250,
    })
  );

  const selectColumn = createSelectColumn<ReferralRow>();

  const referralNameColumn: ColumnDef<ReferralRow> = {
    header: () =>
      onSort ? (
        <ColumnHeader
          columnId="recordName"
          columnName="Referrer"
          sortBy={sortState?.sortBy}
          sortOrder={sortState?.sortOrder}
          onSort={onSort}
          moduleType="REFERRAL"
          canDelete={false}
        />
      ) : (
        "Referrer"
      ),
    accessorKey: "record_name",
    size: 280,
    minSize: 150,
    cell: ({ row }) => (
      <div className="group flex items-center gap-2 w-full min-w-0">
        <UnreadDot unread={Boolean(row.original.has_notification)} />

        <div className="min-w-0 flex-1">
          <EditableCell
            isReferral={true}
            id={row.original.id}
            fieldName="Referrer"
            fieldKey="Record"
            value={row.original.recordName}
            type="TEXT"
          />
        </div>
        <RecordActions
          actions={[
            {
              label: "Open details",
              icon: HistoryIcon,
              onSelect: () => onOpenMasterListView(row.original.id),
            },
          ]}
        />
      </div>
    ),
  };

  const createNewColumn: ColumnDef<ReferralRow> = {
    header: () => <CreateColumnModal isReferral={true} />,
    accessorKey: "create_column",
    enableResizing: false,
    size: 200,
  };

  return [selectColumn, referralNameColumn, ...dynamicColumns, createNewColumn];
}
