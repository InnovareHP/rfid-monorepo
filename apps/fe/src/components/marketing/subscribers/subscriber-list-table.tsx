import type { EmailSubscriber } from "@/services/marketing/subscriber-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { MailCheck, MailX, Trash2 } from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";

const SUBSCRIBER_STATUS_TONES: Record<
  EmailSubscriber["status"],
  StatusTone
> = {
  SUBSCRIBED: "success",
  UNSUBSCRIBED: "muted",
};

const SUBSCRIBER_STATUS_LABELS: Record<
  EmailSubscriber["status"],
  string
> = {
  SUBSCRIBED: "Subscribed",
  UNSUBSCRIBED: "Unsubscribed",
};

const SOURCE_LABELS: Record<EmailSubscriber["source"], string> = {
  FORM: "Form",
  MANUAL: "Added manually",
  IMPORT: "Import",
  BLAST: "Email link",
};

type SubscriberListTableProps = {
  subscribers: EmailSubscriber[];
  canEdit: boolean;
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleStatus: (subscriber: EmailSubscriber) => void;
  onDelete: (subscriber: EmailSubscriber) => void;
};

export const SubscriberListTable = ({
  subscribers,
  canEdit,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onToggleStatus,
  onDelete,
}: SubscriberListTableProps) => (
  <ReportTable
    rows={subscribers}
    isLoading={isLoading}
    emptyMessage="No subscribers yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[850px]"
    columns={[
      {
        key: "email",
        header: "Email",
        className: "w-[28%]",
        render: (row: EmailSubscriber) => (
          <span className="font-medium text-foreground">{row.email}</span>
        ),
      },
      {
        key: "name",
        header: "Name",
        className: "w-[18%] text-muted-foreground",
        render: (row: EmailSubscriber) => row.name || "—",
      },
      {
        key: "status",
        header: "Status",
        className: "w-[16%]",
        render: (row: EmailSubscriber) => (
          <StatusPill
            label={SUBSCRIBER_STATUS_LABELS[row.status]}
            tone={SUBSCRIBER_STATUS_TONES[row.status]}
          />
        ),
      },
      {
        key: "source",
        header: "Source",
        className: "w-[14%] text-muted-foreground",
        render: (row: EmailSubscriber) => SOURCE_LABELS[row.source],
      },
      {
        key: "subscribedAt",
        header: "Added",
        className: "w-[14%] text-muted-foreground",
        render: (row: EmailSubscriber) => formatDateTime(row.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[10%]",
        render: (row: EmailSubscriber) =>
          canEdit ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                aria-label={
                  row.status === "SUBSCRIBED" ? "Unsubscribe" : "Resubscribe"
                }
                onClick={() => onToggleStatus(row)}
              >
                {row.status === "SUBSCRIBED" ? (
                  <MailX className="size-4" />
                ) : (
                  <MailCheck className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete subscriber"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null,
      },
    ]}
  />
);
