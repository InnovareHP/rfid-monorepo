import { formatCapitalize, formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormBody,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Spinner } from "@dashboard/ui/components/spinner";
import { ArrowRight, RotateCcw } from "lucide-react";
import { HistoryDetailField } from "./history-detail-field";

interface RestoreHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyItem: {
    id: string;
    leadId: string;
    action: string;
    entityType: string;
    oldValue?: string;
    newValue?: string;
    createdAt: string;
    createdBy: string;
  } | null;
  onConfirm: (
    leadId: string,
    historyId: string,
    eventType: string
  ) => Promise<void>;
  isRestoring: boolean;
}

export function RestoreHistoryModal({
  open,
  onOpenChange,
  historyItem,
  onConfirm,
  isRestoring,
}: RestoreHistoryModalProps) {
  if (!historyItem) return null;

  const handleConfirm = async () => {
    await onConfirm(historyItem.leadId, historyItem.id, historyItem.action);
    onOpenChange(false);
  };

  const isDelete = historyItem.action.toLowerCase() === "delete";
  const isUpdate = historyItem.action.toLowerCase() === "update";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isRestoring) onOpenChange(next);
      }}
    >
      <DialogContent variant="shell" className="sm:max-w-2xl">
        <DialogFormHeader
          icon={<RotateCcw />}
          iconClassName="bg-warning text-warning-foreground"
          title="Restore History"
          description={`Are you sure you want to restore this ${formatCapitalize(historyItem.action)} action?`}
        />

        <DialogFormBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
            <HistoryDetailField
              label="Action Type"
              value={formatCapitalize(historyItem.action)}
            />
            <HistoryDetailField label="Entity Type" value={historyItem.entityType} />
            <HistoryDetailField label="Changed By" value={historyItem.createdBy} />
            <HistoryDetailField
              label="Changed At"
              value={formatDateTime(historyItem.createdAt)}
            />
          </div>

          {isUpdate && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="mb-2 text-xs font-semibold text-primary">
                This will revert the change:
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-destructive/10 px-2 py-1 font-mono text-destructive">
                  {historyItem.oldValue || "(empty)"}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="rounded bg-success/10 px-2 py-1 font-mono text-success">
                  {historyItem.newValue || "(empty)"}
                </span>
              </div>
              <p className="mt-2 text-xs text-primary">
                Restoring will change it back to:{" "}
                <span className="font-semibold">
                  {historyItem.oldValue || "(empty)"}
                </span>
              </p>
            </div>
          )}

          {isDelete && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="mb-2 text-xs font-semibold text-destructive">
                This will restore a deleted record
              </p>
              <p className="text-xs text-destructive">
                The {historyItem.entityType} that was deleted will be restored
                with its previous data.
              </p>
            </div>
          )}
        </DialogFormBody>

        <DialogFormFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isRestoring}>
            {isRestoring ? (
              <>
                <Spinner size="sm" className="mr-2 text-current" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 size-4" />
                Restore
              </>
            )}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
