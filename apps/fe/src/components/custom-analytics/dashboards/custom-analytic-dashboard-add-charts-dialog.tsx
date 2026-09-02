import { getCustomAnalytics } from "@/services/custom-analytics/custom-analytics-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import { useQuery } from "@tanstack/react-query";
import { ChartSpline, Loader2 } from "lucide-react";
import { useState } from "react";

type CustomAnalyticDashboardAddChartsDialogProps = {
  open: boolean;
  // Charts already on the dashboard, which are not offered again.
  memberIds: string[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (analyticIds: string[]) => void;
};

export function CustomAnalyticDashboardAddChartsDialog({
  open,
  memberIds,
  isSaving,
  onOpenChange,
  onAdd,
}: CustomAnalyticDashboardAddChartsDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: analytics = [] } = useQuery({
    queryKey: ["custom-analytics"],
    queryFn: () => getCustomAnalytics(),
    enabled: open,
  });

  const options = analytics
    .filter((analytic) => !memberIds.includes(analytic.id))
    .map((analytic) => ({ label: analytic.name, value: analytic.id }));

  const close = () => {
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogFormHeader
          icon={<ChartSpline />}
          title="Add Charts"
          description="Pick saved charts to show on this dashboard."
        />

        <div className="space-y-4 px-6 py-5">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every saved chart is already on this dashboard.
            </p>
          ) : (
            <MultiSelect
              options={options}
              defaultValue={selected}
              onValueChange={setSelected}
              placeholder="Choose a chart..."
              variant="brand"
              animationConfig={{ badgeAnimation: "none" }}
              className="w-full"
            />
          )}
        </div>

        <DialogFormFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || isSaving}
            onClick={() => onAdd(selected)}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Add to Dashboard
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
