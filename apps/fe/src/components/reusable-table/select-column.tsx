import { Checkbox } from "@dashboard/ui/components/checkbox";
import type { ColumnDef } from "@tanstack/react-table";

// Every board shares one select column so the header checkbox, the row
// checkbox, and the sizing stay identical across modules.
export function createSelectColumn<T>(size = 80): ColumnDef<T> {
  return {
    id: "select",
    // Selection only ever covers loaded rows: the boards page server-side and
    // a header that claimed the unloaded remainder would lie about the count
    // the bulk actions act on.
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all loaded rows"
      />
    ),
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
    size,
  };
}
