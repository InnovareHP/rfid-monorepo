import type { MarketingBlast } from "@/services/marketing/blast-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Pencil, Send, Trash2 } from "lucide-react";

type BlastListTableProps = {
  blasts: MarketingBlast[];
  canSend: boolean;
  onEdit: (blast: MarketingBlast) => void;
  onSend: (blast: MarketingBlast) => void;
  onDelete: (blast: MarketingBlast) => void;
};

const STATUS_VARIANT: Record<MarketingBlast["status"], "default" | "outline"> = {
  DRAFT: "outline",
  SCHEDULED: "outline",
  SENDING: "default",
  SENT: "default",
  FAILED: "outline",
};

export const BlastListTable = ({
  blasts,
  canSend,
  onEdit,
  onSend,
  onDelete,
}: BlastListTableProps) => {
  if (blasts.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        No blasts yet. Create one to email your audience.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white divide-y divide-gray-100">
      {blasts.map((blast) => (
        <div
          key={blast.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {blast.name}
              </span>
              <Badge variant={STATUS_VARIANT[blast.status]}>
                {blast.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {blast.subject}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {blast.status === "DRAFT" && canSend && (
              <Button variant="outline" size="sm" onClick={() => onSend(blast)}>
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(blast)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {blast.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => onDelete(blast)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
