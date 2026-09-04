import { getFieldOptionUsage } from "@/services/options/options-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import { useQuery } from "@tanstack/react-query";
import { Trash } from "lucide-react";

type DeleteOptionDialogProps = {
  optionId: string;
  optionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
};

export function DeleteOptionDialog({
  optionId,
  optionName,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteOptionDialogProps) {
  // Usage never blocks the delete; records keep the value and the option can be
  // restored from the trash, so the count is only there to size the change.
  const { data: usage } = useQuery({
    queryKey: ["field-option-usage", optionId],
    queryFn: () => getFieldOptionUsage(optionId),
    enabled: open,
    staleTime: 1000 * 60,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Option</DialogTitle>
          <DialogDescription>
            Delete "{optionName}"? It moves to the trash and can be restored.
          </DialogDescription>
        </DialogHeader>
        {usage && usage.count > 0 && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {usage.count} record{usage.count === 1 ? "" : "s"} still hold this
            value. They keep showing it, but it drops out of the picker.
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
