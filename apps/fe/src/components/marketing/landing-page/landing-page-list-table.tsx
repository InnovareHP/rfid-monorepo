import type { MarketingLandingPage } from "@/services/marketing/landing-page-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Pencil, Trash2 } from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";
import { SortableHeader } from "../../reusable-table/sortable-header";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";

export const LANDING_PAGE_STATUS_TONES: Record<
  MarketingLandingPage["status"],
  StatusTone
> = {
  DRAFT: "muted",
  PUBLISHED: "success",
};

export const LANDING_PAGE_STATUS_LABELS: Record<
  MarketingLandingPage["status"],
  string
> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

type LandingPageListTableProps = {
  pages: MarketingLandingPage[];
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleStatusSort: () => void;
  onEdit: (page: MarketingLandingPage) => void;
  onDelete: (page: MarketingLandingPage) => void;
};

export const LandingPageListTable = ({
  pages,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onToggleStatusSort,
  onEdit,
  onDelete,
}: LandingPageListTableProps) => (
  <ReportTable
    rows={pages}
    isLoading={isLoading}
    emptyMessage="No landing pages yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[1000px]"
    columns={[
      {
        key: "name",
        header: "Page",
        className: "w-[26%]",
        render: (row: MarketingLandingPage) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
      },
      {
        key: "status",
        header: <SortableHeader label="Status" onToggle={onToggleStatusSort} />,
        className: "w-[14%]",
        render: (row: MarketingLandingPage) => (
          <StatusPill
            label={LANDING_PAGE_STATUS_LABELS[row.status]}
            tone={LANDING_PAGE_STATUS_TONES[row.status]}
          />
        ),
      },
      {
        key: "sections",
        header: "Section",
        className: "w-[15%] text-gray-600",
        render: (row: MarketingLandingPage) =>
          `${row.sections.length} sections`,
      },
      {
        key: "createdAt",
        header: "Created",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingLandingPage) => formatDateTime(row.createdAt),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        className: "w-[16%] text-gray-600",
        render: (row: MarketingLandingPage) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[13%]",
        render: (row: MarketingLandingPage) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-primary"
              aria-label="Edit landing page"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-600"
              aria-label="Delete landing page"
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
