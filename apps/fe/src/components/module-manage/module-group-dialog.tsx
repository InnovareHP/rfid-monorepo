import { MODULE_GROUPS_KEY } from "@/hooks/use-module-groups";
import { MODULES_KEY } from "@/hooks/use-modules";
import { NAV_KEY } from "@/hooks/use-nav-data";
import { createModuleGroup } from "@/services/module/module-group-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormBody,
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
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Matches CreateModuleGroupSchema on the API, so a name too long is refused
// here rather than coming back as a 400.
const schema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(40),
});

type FormValues = z.infer<typeof schema>;

type ModuleGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Opened from the sidebar and from the modules settings page, so it owns the
// mutation rather than taking one: both callers want the same invalidations.
export function ModuleGroupDialog({
  open,
  onOpenChange,
}: ModuleGroupDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => createModuleGroup(values.name.trim()),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: MODULE_GROUPS_KEY });
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      queryClient.invalidateQueries({ queryKey: NAV_KEY });
      toast.success(`${group.name} created`);
      form.reset();
      onOpenChange(false);
    },
    // A duplicate name is the server's call to make, so its message is shown
    // rather than a generic one.
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not create that group."
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent variant="shell" className="sm:max-w-md">
        <DialogFormHeader
          icon={<FolderPlus />}
          title="New group"
          description="A folder for the sidebar. It changes nothing about the records inside its modules."
        />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values)
            )}
          >
            <DialogFormBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group name</FormLabel>
                    <FormControl>
                      <Input autoFocus maxLength={40} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogFormBody>

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Spinner className="size-4" />}
                Create group
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
