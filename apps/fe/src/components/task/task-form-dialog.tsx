import { useTaskLabels } from "@/hooks/use-tasks";
import { getLiaisons } from "@/services/options/options-service";
import {
  TASK_PRIORITY,
  type CreateTaskPayload,
  type TaskListDto,
  type TaskStatusDto,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarIcon,
  ClipboardCheck,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod/v3";
import { PRIORITY_CONFIG } from "./task-priority";

const TaskFormSchema = z.object({
  name: z.string().min(1, "Enter a task name"),
  description: z.string(),
  listId: z.string().min(1, "Select a list"),
  labelIds: z.array(z.string()),
  assigneeMemberIds: z.array(z.string()).min(1, "Select at least one assignee"),
  subtasks: z.array(z.object({ name: z.string() })),
  statusId: z.string(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]),
  startDate: z.string(),
  dueDate: z.string(),
});

type TaskFormValues = z.infer<typeof TaskFormSchema>;

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  lists: TaskListDto[];
  statuses: TaskStatusDto[];
  defaultListId?: string;
  parentTaskId?: string;
  submitting?: boolean;
  onSubmit: (payload: CreateTaskPayload, subtaskNames: string[]) => void;
};

const RequiredMark = () => <span className="text-red-500">*</span>;

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 border-b border-gray-200" />
    </div>
    {children}
  </section>
);

const DateField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between font-normal",
          !value && "text-muted-foreground"
        )}
      >
        {value ? format(new Date(value), "MMMM d, yyyy") : "Pick a Date"}
        <CalendarIcon className="size-4 opacity-60" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <Calendar
        mode="single"
        selected={value ? new Date(value) : undefined}
        onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
      />
    </PopoverContent>
  </Popover>
);

export const TaskFormDialog = ({
  open,
  onOpenChange,
  projectId,
  lists,
  statuses,
  defaultListId,
  parentTaskId,
  submitting,
  onSubmit,
}: TaskFormDialogProps) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(TaskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      listId: defaultListId ?? lists[0]?.id ?? "",
      labelIds: [],
      assigneeMemberIds: [],
      subtasks: [],
      statusId: statuses[0]?.id ?? "",
      priority: TASK_PRIORITY.NORMAL,
      startDate: "",
      dueDate: "",
    },
  });

  const subtaskFields = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  const labels = useTaskLabels().data ?? [];
  const membersQuery = useQuery({
    queryKey: ["member-options"],
    queryFn: () => getLiaisons(false),
    staleTime: 30 * 60 * 1000,
  });

  const memberOptions = (membersQuery.data ?? []).map((member) => ({
    label: member.value,
    value: member.id,
  }));
  const labelOptions = labels.map((label) => ({
    label: label.name,
    value: label.id,
  }));

  const handleSubmit = (values: TaskFormValues) => {
    onSubmit(
      {
        name: values.name,
        description: values.description || undefined,
        projectId,
        listId: values.listId,
        statusId: values.statusId || undefined,
        priority: values.priority,
        parentTaskId,
        assigneeMemberIds: values.assigneeMemberIds,
        labelIds: values.labelIds,
        startDate: values.startDate
          ? new Date(values.startDate).toISOString()
          : undefined,
        dueDate: values.dueDate
          ? new Date(values.dueDate).toISOString()
          : undefined,
      },
      values.subtasks.map((subtask) => subtask.name.trim()).filter(Boolean)
    );
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center gap-4 space-y-0 border-b border-gray-200 bg-brand/5 px-6 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <ClipboardCheck className="size-6" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="page-title text-2xl font-bold">
              {parentTaskId ? "New Subtask" : "New Task"}
            </DialogTitle>
            <DialogDescription>
              Create a task with status, priority, and schedule.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <Section title="Task Details">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Task Name <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Task Name" {...field} />
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
                        <Textarea
                          rows={4}
                          placeholder="Description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Assignment">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="listId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          List <RequiredMark />
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select list" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
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
                    name="labelIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tag/s</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={labelOptions}
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            placeholder="Add a tag..."
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="assigneeMemberIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Assignee/s <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={memberOptions}
                          defaultValue={field.value}
                          onValueChange={field.onChange}
                          placeholder="Add another assignee..."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              {!parentTaskId && (
                <Section title="Subtasks">
                  <div className="space-y-3">
                    {subtaskFields.fields.map((subtask, index) => (
                      <div key={subtask.id} className="flex items-center gap-3">
                        <Checkbox disabled className="size-5" />
                        <Input
                          placeholder="Subtask name"
                          {...form.register(`subtasks.${index}.name`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Remove subtask"
                          onClick={() => subtaskFields.remove(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed text-primary hover:text-primary"
                      onClick={() => subtaskFields.append({ name: "" })}
                    >
                      <Plus className="size-4" />
                      Add Subtasks
                    </Button>
                  </div>
                </Section>
              )}

              <Section title="Status & Priority">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="statusId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Status <RequiredMark />
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  {status.name}
                                </span>
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Priority <RequiredMark />
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(TASK_PRIORITY).map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "size-2.5 rounded-full",
                                      PRIORITY_CONFIG[priority].dotClassName
                                    )}
                                  />
                                  {PRIORITY_CONFIG[priority].label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              <Section title="Schedule">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DateField
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <DateField
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create Task
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
