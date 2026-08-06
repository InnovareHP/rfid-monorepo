import type { MarketingForm } from "@/services/marketing/form-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Pencil, Trash2, UsersRound } from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";
import { SortableHeader } from "../../reusable-table/sortable-header";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";

export const FORM_STATUS_TONES: Record<MarketingForm["status"], StatusTone> = {
  DRAFT: "muted",
  PUBLISHED: "success",
};

export const FORM_STATUS_LABELS: Record<MarketingForm["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

type FormListTableProps = {
  forms: MarketingForm[];
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleStatusSort: () => void;
  onEdit: (form: MarketingForm) => void;
  onDelete: (form: MarketingForm) => void;
};

export const FormListTable = ({
  forms,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onToggleStatusSort,
  onEdit,
  onDelete,
}: FormListTableProps) => (
  <ReportTable
    rows={forms}
    isLoading={isLoading}
    emptyMessage="No forms yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[1000px]"
    columns={[
      {
        key: "name",
        header: "Form",
        className: "w-[24%]",
        render: (row: MarketingForm) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
      },
      {
        key: "status",
        header: <SortableHeader label="Status" onToggle={onToggleStatusSort} />,
        className: "w-[14%]",
        render: (row: MarketingForm) => (
          <StatusPill
            label={FORM_STATUS_LABELS[row.status]}
            tone={FORM_STATUS_TONES[row.status]}
          />
        ),
      },
      {
        key: "submissions",
        header: "Submissions",
        className: "w-[17%] text-gray-600",
        render: (row: MarketingForm) => (
          <span className="flex items-center gap-1.5 text-sm">
            <UsersRound className="size-4 text-gray-400" />
            {row._count?.submissions ?? 0} responses
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingForm) => formatDateTime(row.createdAt),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingForm) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[13%]",
        render: (row: MarketingForm) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-primary"
              aria-label="Edit form"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-600"
              aria-label="Delete form"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ]}
  />
);
