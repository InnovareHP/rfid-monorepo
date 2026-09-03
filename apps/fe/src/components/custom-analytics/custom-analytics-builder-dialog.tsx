import {
  Dialog,
  DialogContent,
  DialogFormBody,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { ChartSpline } from "lucide-react";
import { CustomAnalyticsBuilderForm } from "./custom-analytics-builder-form";

type CustomAnalyticsBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomAnalyticsBuilderDialog({
  open,
  onOpenChange,
}: CustomAnalyticsBuilderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="shell" className="sm:max-w-2xl">
        <DialogFormHeader
          icon={<ChartSpline />}
          title="New Chart"
          description="Pick a module, a metric, and how to group it."
        />

        {/* Mounted only while open, so a cancelled draft never survives into
            the next opening the way a persistent form's defaults would. */}
        {open && (
          <DialogFormBody>
            <CustomAnalyticsBuilderForm
              onCancel={() => onOpenChange(false)}
              onSaved={() => onOpenChange(false)}
              renderFooter={(actions) => (
                <DialogFormFooter>{actions}</DialogFormFooter>
              )}
            />
          </DialogFormBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
