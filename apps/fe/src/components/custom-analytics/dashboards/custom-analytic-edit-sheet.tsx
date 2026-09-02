import { getCustomAnalytic } from "@/services/custom-analytics/custom-analytics-service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@dashboard/ui/components/sheet";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { CustomAnalyticsBuilderForm } from "../custom-analytics-builder-form";

type CustomAnalyticEditSheetProps = {
  // The chart being edited, or null to build a new one.
  analyticId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Set when the sheet is opened from a dashboard bound to one module.
  lockedModuleId?: string;
  // A new chart joins the dashboard it was created from.
  attachToDashboardId?: string;
  onSaved: () => void;
};

export function CustomAnalyticEditSheet({
  analyticId,
  open,
  onOpenChange,
  lockedModuleId,
  attachToDashboardId,
  onSaved,
}: CustomAnalyticEditSheetProps) {
  const { data: analytic, isPending } = useQuery({
    queryKey: ["custom-analytic", analyticId],
    queryFn: () => getCustomAnalytic(analyticId!),
    enabled: open && Boolean(analyticId),
  });

  const loading = Boolean(analyticId) && isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{analytic ? analytic.name : "New chart"}</SheetTitle>
          <SheetDescription>
            The dashboard stays behind this panel, so a change can be judged
            against the page it lands on.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {loading ? (
            <Spinner />
          ) : (
            // Remounted per chart so the form's defaultValues are rebuilt
            // rather than carried over from whichever tile was edited last.
            <CustomAnalyticsBuilderForm
              key={analyticId ?? "new"}
              analytic={analytic}
              lockedModuleId={lockedModuleId}
              attachToDashboardId={analyticId ? undefined : attachToDashboardId}
              onCancel={() => onOpenChange(false)}
              onSaved={onSaved}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
