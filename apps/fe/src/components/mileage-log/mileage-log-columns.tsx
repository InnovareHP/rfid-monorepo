import { createSelectColumn } from "@/components/reusable-table/select-column";
import { formatCurrency } from "@/lib/helper/helper";
import type { MileageLogRow } from "@dashboard/shared";
import { formatCapitalize } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { LogRowDelete } from "../log-shared/log-page-shell";

export function mileageLogColumns(
  onDelete: (id: string) => void,
  isDeleting: boolean
): ColumnDef<MileageLogRow>[] {
  return [
    createSelectColumn<MileageLogRow>(56),
    {
      id: "destination",
      header: "Destination",
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.destination}
        </span>
      ),
    },
    {
      id: "countiesMarketed",
      header: "Counties Marketed",
      size: 220,
      cell: ({ row }) => (
        <span
          className="block truncate text-muted-foreground"
          title={row.original.countiesMarketed ?? ""}
        >
          {row.original.countiesMarketed}
        </span>
      ),
    },
    {
      id: "totalMiles",
      header: "Miles",
      size: 120,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.totalMiles?.toLocaleString() ?? "—"}
        </span>
      ),
    },
    {
      id: "rateType",
      header: "Rate Type",
      size: 140,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-medium">
          {formatCapitalize(row.original.rateType)}
        </Badge>
      ),
    },
    {
      id: "ratePerMile",
      header: "Rate / Mile",
      size: 130,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(row.original.ratePerMile)}
        </span>
      ),
    },
    {
      id: "reimbursementAmount",
      header: "Reimbursement",
      size: 160,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(row.original.reimbursementAmount)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 64,
      enableHiding: false,
      enableResizing: false,
      cell: ({ row }) => (
        <LogRowDelete
          entityLabel="mileage entry"
          disabled={isDeleting}
          onDelete={() => onDelete(row.original.id)}
        />
      ),
    },
  ];
}
