import {
  setOrganizationEntitlement,
  type AdminOrganizationEntitlement,
} from "@/services/admin/admin-service";
import { PLAN_FEATURES } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Switch } from "@dashboard/ui/components/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Mirrors the API schema: a contract is all-or-nothing, so seats and label are
// only required once the switch is on.
const schema = z
  .object({
    isCustom: z.boolean(),
    label: z.string().trim().max(80),
    seats: z.number().int().min(1).max(10000),
    features: z.array(z.enum(PLAN_FEATURES)),
  })
  .superRefine((value, ctx) => {
    if (value.isCustom && !value.label) {
      ctx.addIssue({
        code: "custom",
        path: ["label"],
        message: "Name the contract so the audit log says what was granted",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type OrganizationEntitlementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  entitlement: AdminOrganizationEntitlement;
};

export function OrganizationEntitlementDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  entitlement,
}: OrganizationEntitlementDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isCustom: entitlement.isCustom,
      label: entitlement.isCustom ? entitlement.label : "",
      seats: entitlement.seats,
      features: entitlement.features.filter((feature): feature is
        (typeof PLAN_FEATURES)[number] =>
        PLAN_FEATURES.includes(feature as (typeof PLAN_FEATURES)[number])
      ),
    },
  });

  const isCustom = form.watch("isCustom");

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      setOrganizationEntitlement(
        orgId,
        values.isCustom
          ? {
              label: values.label,
              seats: values.seats,
              features: values.features,
            }
          : null
      ),
    onSuccess: (result) => {
      toast.success(
        result.isCustom
          ? `${orgName} now holds the ${result.label} contract`
          : `${orgName} reverted to the ${result.label} tier`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to change the entitlement"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entitlement for {orgName}</DialogTitle>
          <DialogDescription>
            A contract replaces the plan tier for every gate in the product.
            The change is written to the admin activity log.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="isCustom"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Custom contract</FormLabel>
                    <FormDescription>
                      Off hands this organization back to its plan tier.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isCustom && (
              <>
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Northwind pilot" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat cap</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10000}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features</FormLabel>
                      <FormDescription>
                        Exactly what the contract buys. Nothing else is granted.
                      </FormDescription>
                      <div className="mt-2 space-y-2">
                        {PLAN_FEATURES.map((feature) => (
                          <label
                            key={feature}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={field.value.includes(feature)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, feature]
                                    : field.value.filter((f) => f !== feature)
                                )
                              }
                            />
                            {feature}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save entitlement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
