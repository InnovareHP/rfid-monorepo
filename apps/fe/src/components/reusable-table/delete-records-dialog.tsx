import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Spinner } from "@dashboard/ui/components/spinner";
import { Trash2Icon } from "lucide-react";
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
          description={`This permanently removes ${recordIds.length} selected ${itemLabel} and all associated data. This cannot be undone.`}
        />

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
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
