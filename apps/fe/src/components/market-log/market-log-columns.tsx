import { createSelectColumn } from "@/components/reusable-table/select-column";
import type { MarketingReportRow } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { LogRowDelete } from "../log-shared/log-page-shell";

export const TOUCHPOINT_LABELS: Record<string, string> = {
  IN_PERSON_MEETING: "In Person",
  LINKED_IN: "LinkedIn",
  FACEBOOK: "Facebook",
  TEXT: "Text",
  EMAIL: "Email",
  PHONE: "Phone",
  OTHER: "Other",
};

export function marketLogColumns(
  onDelete: (id: string) => void,
  isDeleting: boolean
): ColumnDef<MarketingReportRow>[] {
  return [
    createSelectColumn<MarketingReportRow>(56),
    {
      id: "facility",
      header: "Facility",
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.facility}
        </span>
      ),
    },
    {
      id: "touchpoint",
      header: "Touchpoints",
      size: 220,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.touchpoints.map((tp) => (
            <Badge key={tp} variant="secondary" className="text-xs font-medium">
              {TOUCHPOINT_LABELS[tp] ?? tp}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "talkedTo",
      header: "Talked To",
      size: 180,
      cell: ({ row }) => row.original.talkedTo,
    },
    {
      id: "reasonForVisit",
      header: "Reason for Visit",
      size: 240,
      cell: ({ row }) => (
        <span
          className="block truncate text-muted-foreground"
          title={row.original.reasonForVisit ?? ""}
        >
          {row.original.reasonForVisit || "—"}
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
      id: "actions",
      header: "",
      size: 64,
      enableHiding: false,
      enableResizing: false,
      cell: ({ row }) => (
        <LogRowDelete
          entityLabel="marketing activity"
          disabled={isDeleting}
          onDelete={() => onDelete(row.original.id)}
        />
      ),
    },
  ];
}
