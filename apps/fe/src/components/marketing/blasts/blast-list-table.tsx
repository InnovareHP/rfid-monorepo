import type { MarketingBlast } from "@/services/marketing/blast-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Pencil, Send, Trash2, Users } from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";
import { SortableHeader } from "../../reusable-table/sortable-header";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";

type BlastListTableProps = {
  blasts: MarketingBlast[];
  canSend: boolean;
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleStatusSort: () => void;
  onEdit: (blast: MarketingBlast) => void;
  onSend: (blast: MarketingBlast) => void;
  onDelete: (blast: MarketingBlast) => void;
};

export const BLAST_STATUS_TONES: Record<MarketingBlast["status"], StatusTone> =
  {
    DRAFT: "muted",
    SCHEDULED: "muted",
    SENDING: "info",
    SENT: "success",
    FAILED: "danger",
  };

export const BLAST_STATUS_LABELS: Record<MarketingBlast["status"], string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
  FAILED: "Failed",
};

export const BlastListTable = ({
  blasts,
  canSend,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onToggleStatusSort,
  onEdit,
  onSend,
  onDelete,
}: BlastListTableProps) => (
  <ReportTable
    rows={blasts}
    isLoading={isLoading}
    emptyMessage="No blasts yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[950px]"
    columns={[
      {
        key: "name",
        header: "Campaign Title",
        className: "w-[22%]",
        render: (row: MarketingBlast) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
      },
      {
        key: "status",
        header: <SortableHeader label="Status" onToggle={onToggleStatusSort} />,
        className: "w-[14%]",
        render: (row: MarketingBlast) => (
          <StatusPill
            label={BLAST_STATUS_LABELS[row.status]}
            tone={BLAST_STATUS_TONES[row.status]}
          />
        ),
      },
      {
        key: "audience",
        header: "Audience",
        className: "w-[19%] text-gray-600",
        render: (row: MarketingBlast) => (
          <span className="flex items-center gap-1.5 text-sm">
            <Users className="size-4 text-gray-400" />
            {(row._count?.recipients ?? 0).toLocaleString()} recipients
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingBlast) => formatDateTime(row.createdAt),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingBlast) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[13%]",
        render: (row: MarketingBlast) => (
          <div className="flex items-center gap-1">
            {row.status === "DRAFT" && canSend && (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-primary"
                aria-label="Send blast"
                onClick={() => onSend(row)}
              >
                <Send className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-primary"
              aria-label="Edit blast"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
            </Button>
            {row.status === "DRAFT" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete blast"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ]}
  />
);
