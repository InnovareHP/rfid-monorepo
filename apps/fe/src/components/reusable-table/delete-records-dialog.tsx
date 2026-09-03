import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Spinner } from "@dashboard/ui/components/spinner";
import { getRecordLinkCounts } from "@/services/board/board-module-service";
import { moduleLabel } from "@/lib/helper/module-route";
import { useQuery } from "@tanstack/react-query";
import { Link2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DeleteRecordsDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  recordIds: string[];
  onDelete: (ids: string[]) => void;
  onDeleted: () => void;
};

export function DeleteRecordsDialog({
  open,
  setOpen,
  recordIds,
  onDelete,
  onDeleted,
}: DeleteRecordsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const itemLabel = recordIds.length === 1 ? "item" : "items";

  // A link never blocks the delete, so this is shown for judgement only.
  const { data: linkCounts } = useQuery({
    queryKey: ["record-link-counts", recordIds],
    queryFn: () => getRecordLinkCounts(recordIds),
    enabled: open && recordIds.length > 0,
    staleTime: 1000 * 60,
  });

  const linkSummary = Object.entries(linkCounts?.byModule ?? {})
    .map(([key, count]) => `${count} ${moduleLabel(key)}`)
    .join(", ");

  const handleDelete = async () => {
    if (recordIds.length === 0) return;

    setIsDeleting(true);
    try {
      await onDelete(recordIds);
      setOpen(false);
      onDeleted();
      toast.success(`Successfully deleted ${recordIds.length} item(s).`);
    } catch {
      toast.error("Failed to delete items. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent variant="shell" className="sm:max-w-lg">
        <DialogFormHeader
          icon={<Trash2Icon />}
          iconClassName="bg-destructive text-destructive-foreground"
          title={`Delete ${recordIds.length} ${itemLabel}?`}
          description={`Are you sure you want to delete ${recordIds.length} selected ${itemLabel}?`}
        />

        {linkCounts && linkCounts.total > 0 && (
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            <Link2Icon className="mt-0.5 size-4 shrink-0" />
            <span>
              {linkSummary} still {linkCounts.total === 1 ? "links" : "link"} to
              this. Those records keep the link, and the cell reads blank while
              this is deleted.
            </span>
          </div>
        )}

        <DialogFormFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" className="mr-2 text-current" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
