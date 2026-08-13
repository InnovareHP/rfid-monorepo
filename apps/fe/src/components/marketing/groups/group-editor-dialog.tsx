import {
  createGroup,
  previewGroupMembers,
  updateGroup,
  type RecipientGroup,
} from "@/services/marketing/group-service";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useModules } from "@/hooks/use-modules";
import { GroupAudienceFilter } from "./group-audience-filter";
import { GroupMembersTable } from "./group-members-table";

const AUDIENCE_TYPES = [
  { value: "BOARD", label: "CRM records" },
  { value: "SUBSCRIBER", label: "Newsletter subscribers" },
] as const;

const groupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  moduleType: z.string().min(1),
  audienceType: z.enum(["BOARD", "SUBSCRIBER"]),
  filter: z.object({
    filter: z.record(z.string(), z.string()),
    search: z.string().optional(),
    boardDateFrom: z.string().optional(),
    boardDateTo: z.string().optional(),
  }),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

const emptyValues: GroupFormValues = {
  name: "",
  description: "",
  moduleType: "LEAD",
  audienceType: "BOARD",
  filter: { filter: {} },
};

type GroupEditorDialogProps = {
  open: boolean;
  group: RecipientGroup | null;
  onOpenChange: (open: boolean) => void;
};

export function GroupEditorDialog({
  open,
  group,
  onOpenChange,
}: GroupEditorDialogProps) {
  const queryClient = useQueryClient();

  const { data: modules = [] } = useModules();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    values: group
      ? {
          name: group.name,
          description: group.description ?? "",
          moduleType: group.moduleType,
          audienceType: group.audienceType,
          filter: group.filter,
        }
      : emptyValues,
  });

  const moduleType = form.watch("moduleType");
  const audienceType = form.watch("audienceType");
  const filter = form.watch("filter");
  // A subscriber group has no module or filter to describe - it is the list.
  const isSubscriberAudience = audienceType === "SUBSCRIBER";

  // Recipients are shown while the filter is built, not only after saving.
  const { data: preview, isFetching } = useQuery({
    queryKey: ["marketing-group-preview", moduleType, audienceType, filter],
    queryFn: () =>
      previewGroupMembers(
        { moduleType, audienceType, filter },
        { page: 1, limit: 25 }
      ),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (values: GroupFormValues) => {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        moduleType: values.moduleType,
        audienceType: values.audienceType,
        filter: values.filter,
      };
      return group ? updateGroup(group.id, payload) : createGroup(payload);
    },
    onSuccess: () => {
      toast.success(group ? "Group updated" : "Group created");
      queryClient.invalidateQueries({ queryKey: ["marketing-groups"] });
      if (group) {
        queryClient.invalidateQueries({
          queryKey: ["marketing-group", group.id],
        });
      }
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to save group";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogFormHeader
          icon={<Users />}
          title={group ? "Edit Group" : "New Group"}
          description="Pick who belongs to this group. Blasts choose groups, not filters."
        />

        <Form {...form}>
          <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Group Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Referring physicians" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audienceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUDIENCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isSubscriberAudience ? (
                <p className="rounded-lg border border-info/40 bg-table-header p-3 text-sm text-foreground">
                  This group is everyone on the newsletter list who has not
                  unsubscribed. There is nothing to filter.
                </p>
              ) : (
                <>
              <FormField
                control={form.control}
                name="moduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        // Field ids belong to a module, so the filter cannot carry over.
                        form.setValue("filter", { filter: {} });
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.key}>
                            {module.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filter"
                render={({ field }) => (
                  <FormItem>
                    <GroupAudienceFilter
                      moduleType={moduleType}
                      audienceFilter={field.value}
                      onChange={field.onChange}
                    />
                  </FormItem>
                )}
              />
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  Recipients in this group
                </h4>
                {isFetching && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <GroupMembersTable page={preview} />
            </div>
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
            className="bg-brand text-white hover:bg-brand/90"
            disabled={saveMutation.isPending}
            onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            {saveMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {group ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
