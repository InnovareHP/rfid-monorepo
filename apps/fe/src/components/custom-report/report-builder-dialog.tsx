import { useModules } from "@/hooks/use-modules";
import { createReport } from "@/services/report/report-service";
import { getModuleColumns } from "@/services/board/board-module-service";
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
import { FileBarChart } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Null means every record, so the option carries "0" and is mapped back.
const RANGES = [
  { value: "0", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  moduleId: z.string().min(1, "Pick a module"),
  columnIds: z.array(z.string()).min(1, "Pick at least one column"),
  range: z.string(),
  filterFieldId: z.string(),
  filterValue: z.string(),
});

type BuilderValues = z.infer<typeof schema>;

type ReportBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportBuilderDialog({
  open,
  onOpenChange,
}: ReportBuilderDialogProps) {
  const queryClient = useQueryClient();
  const { data: modules = [] } = useModules();

  const form = useForm<BuilderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      moduleId: "",
      columnIds: [],
      range: "90",
      filterFieldId: "",
      filterValue: "",
    },
  });

  const moduleId = form.watch("moduleId");
  const columnIds = form.watch("columnIds");
  const moduleKey = modules.find((m) => m.id === moduleId)?.key;

  const { data: columns = [] } = useQuery({
    queryKey: ["module-columns", moduleKey],
    queryFn: () => getModuleColumns(moduleKey!),
    enabled: Boolean(moduleKey),
  });

  const saveMutation = useMutation({
    mutationFn: (values: BuilderValues) =>
      createReport({
        name: values.name,
        moduleId: values.moduleId,
        columnIds: values.columnIds,
        filter:
          values.filterFieldId && values.filterValue
            ? { [values.filterFieldId]: values.filterValue }
            : {},
        rangeDays: values.range === "0" ? null : Number(values.range),
      }),
    onSuccess: () => {
      toast.success("Report saved");
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save report"),
  });

  const toggleColumn = (fieldId: string) =>
    form.setValue(
      "columnIds",
      columnIds.includes(fieldId)
        ? columnIds.filter((id) => id !== fieldId)
        : [...columnIds, fieldId],
      { shouldValidate: true }
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogFormHeader
          icon={<FileBarChart />}
          title="New Report"
          description="Pick a module, the columns to show, and how far back to look."
        />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report name</FormLabel>
                    <FormControl>
                      <Input placeholder="Won leads this quarter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        // Columns belong to a module, so the selection cannot carry over.
                        form.setValue("columnIds", []);
                        form.setValue("filterFieldId", "");
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {columns.length > 0 && (
                <FormField
                  control={form.control}
                  name="columnIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Columns</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {columns.map((column) => (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={columnIds.includes(column.id)}
                              onCheckedChange={() => toggleColumn(column.id)}
                            />
                            {column.name}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date range</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {columnIds.length > 0 && (
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="filterFieldId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Filter (optional)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="No filter" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {columns
                              .filter((column) => columnIds.includes(column.id))
                              .map((column) => (
                                <SelectItem key={column.id} value={column.id}>
                                  {column.name}
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
                    name="filterValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Equals</FormLabel>
                        <FormControl>
                          <Input placeholder="Won" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Save report
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
