import {
  createDropdownOption,
  getDropdownOptions,
} from "@/services/lead/lead-service";
import { deleteDropdownOption } from "@/services/options/options-service";
import type { LeadOptions } from "@dashboard/shared";
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
import { useParams } from "@tanstack/react-router";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ReusableTable } from "../reusable-table/generic-table";

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

export const parseOptionNames = (raw: string): string[] => [
  ...new Set(
    raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  ),
];

export default function LeadOption() {
  const params = useParams({
    from: "/_team/$team/master-list/leads/option/$option/",
  });
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const fieldKey = params.option;

  const form = useForm<AddOptionFormData>({
    resolver: zodResolver(addOptionSchema),
    defaultValues: {
      optionNames: "",
    },
  });

  const [filterMeta, setFilterMeta] = useState({
    limit: 20,
    page: 1,
  });

  const { data: optionsData = { data: [], total: 0 }, isFetching } = useQuery({
    queryKey: ["lead-options", fieldKey, filterMeta],
    queryFn: () =>
      getDropdownOptions(fieldKey, filterMeta.page, filterMeta.limit),
  });

  const addOptionMutation = useMutation({
    mutationFn: async (optionNames: string[]) => {
      const results = await Promise.allSettled(
        optionNames.map((name) => createDropdownOption(fieldKey, name))
      );
      return {
        added: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: ({ added, failed }) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-options", fieldKey],
      });
      queryClient.invalidateQueries({
        queryKey: ["dropdown-options", fieldKey],
      });
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
    mutationFn: (optionId: string) => deleteDropdownOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lead-options", fieldKey, filterMeta],
      });
      setDeleteDialogId(null);
      toast.success("Option deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete option.");
    },
  });

  const deleteOptionRender = (row: LeadOptions) => {
    const isOpen = deleteDialogId === row.id;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => setDeleteDialogId(open ? row.id : null)}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash className="h-4 w-4" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Option</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{row.value}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogId(null)}
              disabled={deleteOptionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOptionMutation.mutate(row.id)}
              disabled={deleteOptionMutation.isPending}
            >
              {deleteOptionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const columns = [
    {
      key: "value",
      header: optionsData.field ? `${optionsData.field} Options` : "Options",
      render: (row: LeadOptions) => (
        <span className="font-medium text-gray-900">{row.value}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: LeadOptions) => deleteOptionRender(row),
    },
  ];

  const onSubmit = (data: AddOptionFormData) => {
    addOptionMutation.mutate(parseOptionNames(data.optionNames));
  };

  const addOptionDialog = () => (
    <Dialog
      open={addDialogOpen}
      onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Options</DialogTitle>
          <DialogDescription>
            Add one or more options for the {optionsData.field ?? "this"}{" "}
            field. Separate multiple options with a new line or comma.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
  );

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {optionsData.field ?? "Field"} Options
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage dropdown options for the {optionsData.field ?? "selected"}{" "}
              field.
            </p>
          </div>

          <div className="flex items-center gap-3">{addOptionDialog()}</div>
        </div>

        {/* Table Wrapper */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6">
            <ReusableTable
              data={optionsData?.data ?? []}
              columns={columns}
              isLoading={isFetching}
              emptyMessage="No options found for this field"
              currentPage={filterMeta.page}
              itemsPerPage={filterMeta.limit}
              onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
              totalCount={optionsData?.total ?? 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
