import type { MarketingCampaign } from "@/services/marketing/campaign-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Archive, Pencil, Trash2 } from "lucide-react";

type CampaignListTableProps = {
  campaigns: MarketingCampaign[];
  onEdit: (campaign: MarketingCampaign) => void;
  onArchive: (campaign: MarketingCampaign) => void;
  onDelete: (campaign: MarketingCampaign) => void;
};

const STATUS_VARIANT: Record<MarketingCampaign["status"], "default" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  COMPLETED: "default",
  ARCHIVED: "outline",
};

export const CampaignListTable = ({
  campaigns,
  onEdit,
  onArchive,
  onDelete,
}: CampaignListTableProps) => {
  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        No campaigns yet. Create one to group forms and blasts together.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white divide-y divide-gray-100">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {campaign.name}
              </span>
              <Badge variant={STATUS_VARIANT[campaign.status]}>
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="mt-1 text-xs text-gray-500 truncate">
                {campaign.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(campaign)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {campaign.status !== "ARCHIVED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive(campaign)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onDelete(campaign)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
