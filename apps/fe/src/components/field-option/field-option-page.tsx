import { DeleteOptionDialog } from "@/components/reusable-table/delete-option-dialog";
import { ReusableTable } from "@/components/reusable-table/generic-table";
import { WriteGate } from "@/components/write-gate";
import { can } from "@/lib/permissions";
import { toFieldOptionsPage, type FieldOption } from "@/lib/helper/field-options";
import {
  createFieldOption,
  deleteFieldOption,
  getFieldOptions,
} from "@/services/options/options-service";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const addOptionSchema = z.object({
  optionNames: z
    .string()
    .trim()
    .min(1, "Enter at least one option")
    .refine(
      (v) =>
        v
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .every((s) => s.length <= 100),
      "Each option must be less than 100 characters"
    ),
});

type AddOptionFormData = z.infer<typeof addOptionSchema>;

const parseOptionNames = (raw: string): string[] => [
  ...new Set(
    raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  ),
];

// Options belong to a field, not to a module, so every module's option screen is
// this one page keyed by the field id in the route.
export default function FieldOptionPage({ fieldKey }: { fieldKey: string }) {
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filterMeta, setFilterMeta] = useState({ limit: 20, page: 1 });

  const queryClient = useQueryClient();
  const { memberData } = useRouteContext({ from: "/_team" }) as {
    memberData?: { role: string };
  };

  const canConfigure = can(memberData?.role, { field: ["configure"] });

  const form = useForm<AddOptionFormData>({
    resolver: zodResolver(addOptionSchema),
    defaultValues: {
      optionNames: "",
    },
  });

  const { data, isFetching } = useQuery({
    queryKey: ["field-options", fieldKey, filterMeta],
    queryFn: () => getFieldOptions(fieldKey, filterMeta.page, filterMeta.limit),
  });

  const optionsData = toFieldOptionsPage(data);
  const fieldLabel = optionsData.field;

  // Pickers elsewhere key on the field alone, so both caches are dropped
  const invalidateOptions = () => {
    queryClient.invalidateQueries({ queryKey: ["field-options", fieldKey] });
    queryClient.invalidateQueries({ queryKey: ["dropdown-options", fieldKey] });
    queryClient.invalidateQueries({
      queryKey: ["record-dropdown-options", fieldKey],
    });
  };

  const addOptionMutation = useMutation({
    mutationFn: async (optionNames: string[]) => {
      const results = await Promise.allSettled(
        optionNames.map((name) => createFieldOption(fieldKey, name))
      );
      return {
        added: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: ({ added, failed }) => {
      invalidateOptions();
      setAddDialogOpen(false);
      form.reset();
      if (failed > 0) {
        toast.warning(`Added ${added} option(s), ${failed} failed.`);
      } else {
        toast.success(`Added ${added} option(s).`);
      }
    },
    onError: () => {
      toast.error("Failed to add options.");
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: string) => deleteFieldOption(optionId),
    onSuccess: () => {
      invalidateOptions();
      setDeleteDialogId(null);
      toast.success("Option deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete option.");
    },
  });

  // Deleting an option is field configure, so the column is absent rather than
  // present and failing for a role that cannot use it.
  const columns = [
    {
      key: "value",
      header: fieldLabel ? `${fieldLabel} Options` : "Options",
      render: (row: FieldOption) => (
        <span className="font-medium text-foreground">{row.value}</span>
      ),
    },
    ...(canConfigure
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (row: FieldOption) => (
              <DeleteOptionDialog
                optionId={row.id}
                optionName={row.value}
                open={deleteDialogId === row.id}
                onOpenChange={(open) =>
                  setDeleteDialogId(open ? row.id : null)
                }
                onConfirm={() => deleteOptionMutation.mutate(row.id)}
                isPending={deleteOptionMutation.isPending}
              />
            ),
          },
        ]
      : []),
  ];

  const onSubmit = (formData: AddOptionFormData) => {
    addOptionMutation.mutate(parseOptionNames(formData.optionNames));
  };

  return (
    <div className="page-style">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title text-3xl font-bold tracking-tight">
            {fieldLabel ?? "Field"} Options
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage dropdown options for the {fieldLabel ?? "selected"} field.
          </p>
        </div>

        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) form.reset();
          }}
        >
          <WriteGate>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Option
              </Button>
            </DialogTrigger>
          </WriteGate>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Options</DialogTitle>
              <DialogDescription>
                Add one or more options for the {fieldLabel ?? "this"} field.
                Separate multiple options with a new line or comma.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="optionNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={"Option A\nOption B\nOption C"}
                          rows={5}
                          {...field}
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddDialogOpen(false);
                      form.reset();
                    }}
                    disabled={addOptionMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addOptionMutation.isPending}>
                    {addOptionMutation.isPending ? "Adding..." : "Add Options"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="p-6">
          <ReusableTable
            data={optionsData.data}
            columns={columns}
            isLoading={isFetching}
            emptyMessage="No options found for this field"
            currentPage={filterMeta.page}
            itemsPerPage={filterMeta.limit}
            onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
            totalCount={optionsData.total}
          />
        </div>
      </div>
    </div>
  );
}
