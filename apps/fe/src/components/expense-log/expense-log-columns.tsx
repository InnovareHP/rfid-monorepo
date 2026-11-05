import { createSelectColumn } from "@/components/reusable-table/select-column";
import { formatCurrency } from "@/lib/helper/helper";
import { formatDateTime } from "@dashboard/shared";
import { ReceiptViewer } from "@dashboard/ui/components/receipt-viewer";
import type { ColumnDef } from "@tanstack/react-table";
import { LogRowDelete } from "../log-shared/log-page-shell";

export type ExpenseLogRow = {
  id: string;
  amount: number;
  description: string;
  notes: string | null;
  imageUrl: string;
  createdAt: string;
};

export function expenseLogColumns(
  onDelete: (id: string) => void,
  isDeleting: boolean
): ColumnDef<ExpenseLogRow>[] {
  return [
    createSelectColumn<ExpenseLogRow>(56),
    {
      id: "amount",
      header: "Amount",
      size: 140,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(row.original.amount ?? 0)}
        </span>
      ),
    },
    {
      id: "description",
      header: "Description",
      size: 280,
      cell: ({ row }) => (
        <span className="block truncate" title={row.original.description ?? ""}>
          {row.original.description}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      size: 220,
      cell: ({ row }) => (
        <span
          className="block truncate text-muted-foreground"
          title={row.original.notes ?? ""}
        >
          {row.original.notes || "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Logged",
      size: 180,
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "receipt",
      header: "Receipt",
      size: 150,
      cell: ({ row }) => (
        <ReceiptViewer url={row.original.imageUrl} label="View Receipt" />
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
          entityLabel="expense"
          disabled={isDeleting}
          onDelete={() => onDelete(row.original.id)}
        />
      ),
    },
  ];
}
