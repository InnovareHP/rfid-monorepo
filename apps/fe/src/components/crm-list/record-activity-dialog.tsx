import { ActivityTab } from "@/components/master-list/activity-tab";
import type { CrmModuleType } from "@/services/board/board-module-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { History } from "lucide-react";
import { useState } from "react";

type RecordActivityDialogProps = {
  recordId: string;
  recordName: string;
  moduleType: CrmModuleType;
};

// Activity timeline for a CRM row: sent emails, opens, calls, notes.
export function RecordActivityDialog({
  recordId,
  recordName,
  moduleType,
}: RecordActivityDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <History className="h-3.5 w-3.5" />
        Activity
      </Button>
      <DialogContent variant="shell" className="max-w-3xl">
        <div className="shrink-0 border-b bg-table-header px-4 py-4 sm:px-6">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {recordName || "Activity"}
          </DialogTitle>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <ActivityTab
            recordId={recordId}
            enabled={open}
            moduleType={moduleType}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
