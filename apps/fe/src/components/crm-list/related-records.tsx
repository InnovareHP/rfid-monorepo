import {
  getRelatedRecords,
  type RelatedRecord,
} from "@/services/board/board-module-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { useState } from "react";

const MODULE_ROUTES: Record<string, string> = {
  LEAD: "/$team/master-list",
  REFERRAL: "/$team/referral-list",
  CONTACT: "/$team/contacts",
  COMPANY: "/$team/companies",
};

const MODULE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  REFERRAL: "Referral",
  CONTACT: "Contact",
  COMPANY: "Company",
};

export function RelatedRecords({ recordId }: { recordId: string }) {
  const [open, setOpen] = useState(false);

  const { data: related = [], isLoading } = useQuery({
    queryKey: ["related-records", recordId],
    queryFn: () => getRelatedRecords(recordId),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-gray-500"
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 className="h-3.5 w-3.5" />
          Related
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        ) : related.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">No related records</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {related.map((record: RelatedRecord) => (
              <Link
                key={record.id}
                to={
                  (MODULE_ROUTES[record.moduleType] ??
                    "/$team/master-list") as any
                }
                search={{ q: record.recordName } as any}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="truncate">{record.recordName}</span>
                <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-gray-400">
                  {MODULE_LABELS[record.moduleType] ?? record.moduleType}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
