import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Loader2, Trash2Icon } from "lucide-react";
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
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete items. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2Icon className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Delete {recordIds.length} {itemLabel}?
          </DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to delete {recordIds.length} selected{" "}
            {itemLabel}? This action cannot be undone and all associated data
            will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2Icon className="w-4 h-4 mr-2" />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
