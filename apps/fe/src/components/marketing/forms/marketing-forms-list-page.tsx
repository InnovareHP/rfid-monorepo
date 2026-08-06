import { PageHeader } from "@/components/PageHeader";
import { KpiStatTile } from "@/components/analytics/charts/kpi-stat-tile";
import {
  FORM_STATUS_LABELS,
  FormListTable,
} from "@/components/marketing/forms/form-list-table";
import { getBoardFieldsByModule } from "@/services/marketing/blast-service";
import {
  createForm,
  deleteForm,
  getForms,
  type MarketingForm,
} from "@/services/marketing/form-service";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { FileText, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const FORMS_KEY = ["marketing-forms"];

const MODULE_TYPES = ["LEAD", "REFERRAL", "CONTACT", "COMPANY"] as const;

const createFormSchema = z.object({
  name: z.string().trim().min(1, "Form name is required"),
  moduleType: z.enum(MODULE_TYPES),
  fieldIds: z.array(z.string()).min(1, "Select at least one field"),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

export const MarketingFormsListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusSort, setStatusSort] = useState<"asc" | "desc">("asc");

  const { data: forms = [], isLoading } = useQuery({
    queryKey: FORMS_KEY,
    queryFn: getForms,
  });

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { name: "", moduleType: "LEAD", fieldIds: [] },
  });

  const moduleType = form.watch("moduleType");
  const fieldIds = form.watch("fieldIds");

  const { data: boardFields = [] } = useQuery({
    queryKey: ["board-fields-by-module", moduleType],
    queryFn: () => getBoardFieldsByModule(moduleType),
    enabled: createOpen,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      createForm({
        name: values.name,
        moduleType: values.moduleType,
        fieldMappings: values.fieldIds.map((fieldId) => ({
          fieldId,
          label: boardFields.find((field) => field.id === fieldId)?.name ?? "",
          required: false,
        })),
      }),
    onSuccess: (created: MarketingForm) => {
      toast.success("Form created");
      queryClient.invalidateQueries({ queryKey: FORMS_KEY });
      setCreateOpen(false);
      form.reset();
      navigate({
        to: "/$team/marketing/forms/$formId",
        params: { team, formId: created.id },
      });
    },
    onError: () => toast.error("Failed to create form"),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: MarketingForm) => deleteForm(target.id),
    onMutate: async (target: MarketingForm) => {
      await queryClient.cancelQueries({ queryKey: FORMS_KEY });
      const previous = queryClient.getQueryData<MarketingForm[]>(FORMS_KEY);

      queryClient.setQueryData<MarketingForm[]>(FORMS_KEY, (current = []) =>
        current.filter((row) => row.id !== target.id)
      );

      return { previous };
    },
    onError: (_error, _target, context) => {
      queryClient.setQueryData(FORMS_KEY, context?.previous);
      toast.error("Failed to delete form");
    },
    onSuccess: () => toast.success("Form deleted"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FORMS_KEY });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? forms.filter((row) => row.name.toLowerCase().includes(term))
      : forms;

    return [...matched].sort((a, b) => {
      const compared = FORM_STATUS_LABELS[a.status].localeCompare(
        FORM_STATUS_LABELS[b.status]
      );
      return statusSort === "asc" ? compared : -compared;
    });
  }, [forms, search, statusSort]);

  const publishedCount = forms.filter(
    (row) => row.status === "PUBLISHED"
  ).length;
  const totalSubmissions = forms.reduce(
    (sum, row) => sum + (row._count?.submissions ?? 0),
    0
  );

  const toggleField = (fieldId: string) => {
    form.setValue(
      "fieldIds",
      fieldIds.includes(fieldId)
        ? fieldIds.filter((id) => id !== fieldId)
        : [...fieldIds, fieldId],
      { shouldValidate: true, shouldDirty: true }
    );
  };

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
        title="Forms"
        description="Capture leads with public forms."
      />

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          New Form
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total Forms"
          value={forms.length.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Published"
          value={publishedCount.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Total Submissions"
          value={totalSubmissions.toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search forms...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-white sm:w-80"
      />

      <FormListTable
        forms={filtered.slice((page - 1) * pageSize, page * pageSize)}
        isLoading={isLoading}
        currentPage={page}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onToggleStatusSort={() =>
          setStatusSort((prev) => (prev === "asc" ? "desc" : "asc"))
        }
        onEdit={(row) =>
          navigate({
            to: "/$team/marketing/forms/$formId",
            params: { team, formId: row.id },
          })
        }
        onDelete={(row) => deleteMutation.mutate(row)}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogFormHeader
            icon={<FileText />}
            title="New Form"
            description="Name your form, pick which board it submits to, and select at least one field to capture."
          />

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createMutation.mutate(values)
              )}
            >
              <div className="space-y-4 px-6 py-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Form Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moduleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("fieldIds", []);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODULE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="fieldIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Fields</FormLabel>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
                        {boardFields.map((boardField) => (
                          <label
                            key={boardField.id}
                            className="flex items-center gap-2 px-1 py-1 text-sm"
                          >
                            <Checkbox
                              checked={fieldIds.includes(boardField.id)}
                              onCheckedChange={() => toggleField(boardField.id)}
                            />
                            {boardField.name}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFormFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-brand text-white hover:bg-brand/90"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Create Form
                </Button>
              </DialogFormFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
