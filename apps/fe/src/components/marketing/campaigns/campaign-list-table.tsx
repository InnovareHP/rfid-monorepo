import type { MarketingCampaign } from "@/services/marketing/campaign-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Archive,
  LayoutTemplate,
  Mail,
  Pencil,
  SquareStack,
  Trash2,
} from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";
import { SortableHeader } from "../../reusable-table/sortable-header";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";

type CampaignListTableProps = {
  campaigns: MarketingCampaign[];
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleStatusSort: () => void;
  onEdit: (campaign: MarketingCampaign) => void;
  onArchive: (campaign: MarketingCampaign) => void;
  onDelete: (campaign: MarketingCampaign) => void;
};

export const CAMPAIGN_STATUS_TONES: Record<
  MarketingCampaign["status"],
  StatusTone
> = {
  DRAFT: "muted",
  ACTIVE: "success",
  COMPLETED: "success",
  ARCHIVED: "muted",
};

export const CAMPAIGN_STATUS_LABELS: Record<
  MarketingCampaign["status"],
  string
> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const CampaignListTable = ({
  campaigns,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onToggleStatusSort,
  onEdit,
  onArchive,
  onDelete,
}: CampaignListTableProps) => (
  <ReportTable
    rows={campaigns}
    isLoading={isLoading}
    emptyMessage="No campaigns yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[1000px]"
    columns={[
      {
        key: "name",
        header: "Campaign Title",
        className: "w-[20%]",
        render: (row: MarketingCampaign) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
      },
      {
        key: "status",
        header: <SortableHeader label="Status" onToggle={onToggleStatusSort} />,
        className: "w-[13%]",
        render: (row: MarketingCampaign) => (
          <StatusPill
            label={CAMPAIGN_STATUS_LABELS[row.status]}
            tone={CAMPAIGN_STATUS_TONES[row.status]}
          />
        ),
      },
      {
        key: "components",
        header: "Components",
        className: "w-[24%] text-gray-600",
        render: (row: MarketingCampaign) => (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <SquareStack className="size-4 text-gray-400" />
              {row._count?.forms ?? 0} Forms
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-4 text-gray-400" />
              {row._count?.blasts ?? 0} Blasts
            </span>
            <span className="flex items-center gap-1.5">
              <LayoutTemplate className="size-4 text-gray-400" />
              {row._count?.landingPages ?? 0} Pages
            </span>
          </div>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        className: "w-[15%] text-gray-600",
        render: (row: MarketingCampaign) => formatDateTime(row.createdAt),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        className: "w-[15%] text-gray-600",
        render: (row: MarketingCampaign) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[13%]",
        render: (row: MarketingCampaign) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-primary"
              aria-label="Edit campaign"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
            </Button>
            {row.status !== "ARCHIVED" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-primary"
                aria-label="Archive campaign"
                onClick={() => onArchive(row)}
              >
                <Archive className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-600"
              aria-label="Delete campaign"
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
