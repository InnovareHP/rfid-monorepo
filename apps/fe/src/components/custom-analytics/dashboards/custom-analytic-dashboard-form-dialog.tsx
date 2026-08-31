import {
  createDashboard,
  updateDashboard,
  type CustomAnalyticDashboard,
  type CustomAnalyticDashboardDetail,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Charts are added from inside the dashboard, so creating one only names it.
const dashboardFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});

type DashboardFormValues = z.infer<typeof dashboardFormSchema>;

const emptyValues: DashboardFormValues = { name: "" };

type CustomAnalyticDashboardFormDialogProps = {
  open: boolean;
  dashboard: CustomAnalyticDashboard | CustomAnalyticDashboardDetail | null;
  onOpenChange: (open: boolean) => void;
  // A new dashboard opens straight away, which is where charts are added.
  onCreated?: (dashboardId: string) => void;
};

export function CustomAnalyticDashboardFormDialog({
  open,
  dashboard,
  onOpenChange,
  onCreated,
}: CustomAnalyticDashboardFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<DashboardFormValues>({
    resolver: zodResolver(dashboardFormSchema),
    values: dashboard ? { name: dashboard.name } : emptyValues,
  });

  const saveMutation = useMutation({
    mutationFn: (values: DashboardFormValues) =>
      dashboard ? updateDashboard(dashboard.id, values) : createDashboard(values),
    onSuccess: (saved) => {
      toast.success(dashboard ? "Dashboard renamed" : "Dashboard created");
      queryClient.invalidateQueries({ queryKey: ["custom-analytic-dashboards"] });
      if (dashboard) {
        queryClient.invalidateQueries({
          queryKey: ["custom-analytic-dashboard", dashboard.id],
        });
        // The view page renders off the run key, so edited membership only
        // reaches the charts once this prefix is invalidated too.
        queryClient.invalidateQueries({
          queryKey: ["custom-analytic-dashboard-run", dashboard.id],
        });
        // Membership changes can change which chart is first on the list card.
        queryClient.invalidateQueries({
          queryKey: ["custom-analytic-dashboard-preview", dashboard.id],
        });
      } else {
        // `values` never changes for a create, so RHF would keep the last
        // input on the next open without an explicit reset.
        form.reset(emptyValues);
        onCreated?.(saved.id);
      }
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to save dashboard";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogFormHeader
          icon={<LayoutTemplate />}
          title={dashboard ? "Rename Dashboard" : "New Dashboard"}
          description="Name the page; add charts to it once it opens."
        />

        <Form {...form}>
          <div className="space-y-4 px-6 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dashboard name</FormLabel>
                  <FormControl>
                    <Input placeholder="Referral overview" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>

        <DialogFormFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={saveMutation.isPending}
            onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            {saveMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {dashboard ? "Save Changes" : "Create Dashboard"}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
