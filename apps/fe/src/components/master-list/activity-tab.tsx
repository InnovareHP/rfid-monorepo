import { boardQueryKey } from "@/lib/helper/board-query-key";
import { resolveFaxAutofill } from "@/lib/helper/fax-autofill";
import {
  createCalendarEvent,
  getCalendarConnectionStatus,
} from "@/services/calendar/calendar-service";
import {
  getFaxIntegrationStatus,
  sendFaxActivity,
} from "@/services/fax/fax-service";
import {
  completeActivity,
  createActivity,
  deleteActivity,
  getActivities,
  getGmailStatus,
  getOutlookStatus,
  getSpecificLead,
  updateLead,
  type Activity,
} from "@/services/lead/lead-service";
import {
  getSpecificReferral,
  updateReferral,
} from "@/services/referral/referral-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarIcon,
  Check,
  CornerDownLeft,
  Eye,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Send,
  StickyNote,
  Trash2,
  Users,
  X,
} from "lucide-react";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

const activityTypeConfig = {
  CALL: {
    icon: Phone,
    label: "Call",
    color: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/40",
  },
  EMAIL: {
    icon: Mail,
    label: "Email",
    color: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/30",
  },
  MEETING: {
    icon: Users,
    label: "Meeting",
    color: "bg-warning",
    badge: "bg-warning/10 text-warning border-warning/30",
  },
  NOTE: {
    icon: StickyNote,
    label: "Note",
    color: "bg-muted-foreground",
    badge: "bg-muted text-foreground border-border",
  },
  FAX: {
    icon: Printer,
    label: "Fax",
    color: "bg-info",
    badge: "bg-info/10 text-info border-info/30",
  },
};

const statusConfig = {
  PENDING: {
    badge: "bg-warning/10 text-warning border-warning/30",
    dot: "bg-warning",
  },
  COMPLETED: {
    badge: "bg-success/10 text-success border-success/30",
    dot: "bg-success",
  },
  CANCELLED: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};

type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "FAX";

const activitySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().optional(),
    activityType: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "FAX"]),
    dueDate: z.date().optional(),
    recipientEmail: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
    meetingEndDate: z.date().optional(),
    calendarProvider: z.enum(["google", "outlook"]).optional(),
    faxNumber: z.string().optional(),
    faxFile: z.instanceof(File).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.activityType !== "FAX") return;

    if (!values.faxNumber?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Fax number is required",
        path: ["faxNumber"],
      });
    }
    if (!values.faxFile) {
      ctx.addIssue({
        code: "custom",
        message: "Attach a document to fax",
        path: ["faxFile"],
      });
    }
  });

type FormValues = z.infer<typeof activitySchema>;

export function ActivityTab({
  recordId,
  enabled,
  moduleType,
}: {
  recordId: string;
  enabled: boolean;
  moduleType: "LEAD" | "REFERRAL";
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<ActivityType | "ALL">(
    "ALL"
  );
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "PENDING" | "COMPLETED" | "CANCELLED"
  >("ALL");

  const { data: gmailStatus } = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const { data: outlookStatus } = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const { data: calendarStatus } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: getCalendarConnectionStatus,
  });

  const { data: faxStatus } = useQuery({
    queryKey: ["fax-integration-status"],
    queryFn: getFaxIntegrationStatus,
  });

  const isReferral = moduleType === "REFERRAL";
  const { data: recordData } = useQuery({
    queryKey: [isReferral ? "referral" : "lead", recordId],
    queryFn: () =>
      isReferral
        ? getSpecificReferral(recordId, "REFERRAL")
        : getSpecificLead(recordId, "LEAD"),
    enabled: enabled && !!recordId,
  });
  const { faxFieldId, existingFax } = resolveFaxAutofill(
    recordData?.columns,
    recordData?.data
  );

  const hasCalendar =
    calendarStatus?.google?.connected || calendarStatus?.outlook?.connected;
  const hasFax = faxStatus?.connected === true;

  const {
    data: activitiesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["activities", recordId, typeFilter, statusFilter],
    enabled: enabled && !!recordId,
    queryFn: ({ pageParam = 1 }) =>
      getActivities(recordId, pageParam as number, 15, {
        activityType: typeFilter !== "ALL" ? typeFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      }),
    getNextPageParam: (lastPage, pages) => {
      const pageSize = 15;
      return lastPage.data.length === pageSize ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const hasActiveFilter = typeFilter !== "ALL" || statusFilter !== "ALL";

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity created");
      resetForm();
    },
    onError: () => toast.error("Failed to create activity"),
  });

  const faxWriteBackMutation = useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: string }) =>
      isReferral
        ? updateReferral(recordId, fieldId, value, undefined)
        : updateLead(recordId, fieldId, value, "LEAD"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [isReferral ? "referral" : "lead", recordId],
      });
      queryClient.invalidateQueries({
        queryKey: boardQueryKey(isReferral ? "REFERRAL" : "LEAD"),
      });
      queryClient.invalidateQueries({
        queryKey: [isReferral ? "referral-history" : "lead-history", recordId],
      });
    },
    onError: () =>
      toast.error("Fax sent, but failed to save the fax number to the record"),
  });

  const faxMutation = useMutation({
    mutationFn: sendFaxActivity,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Fax sent");
      if (faxFieldId && !existingFax && variables.faxNumber.trim()) {
        faxWriteBackMutation.mutate({
          fieldId: faxFieldId,
          value: variables.faxNumber.trim(),
        });
      }
      resetForm();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message ?? "Failed to send fax"),
  });

  const completeMutation = useMutation({
    mutationFn: ({
      activityId,
      data,
    }: {
      activityId: string;
      data?: {
        emailBody?: string;
        emailSubject?: string;
        recipientEmail?: string;
        send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
      };
    }) => completeActivity(activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity completed");
    },
    onError: () => toast.error("Failed to complete activity"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity deleted");
    },
    onError: () => toast.error("Failed to delete activity"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      description: "",
      activityType: "CALL",
      dueDate: undefined,
      recipientEmail: "",
      emailSubject: "",
      emailBody: "",
      sendVia: "AUTO",
      faxNumber: "",
      faxFile: undefined,
      meetingEndDate: undefined,
      calendarProvider: calendarStatus?.google?.connected
        ? "google"
        : calendarStatus?.outlook?.connected
          ? "outlook"
          : undefined,
    },
  });

  const { handleSubmit, watch, control, reset } = form;
  const watchActivityType = watch("activityType");

  // Prefill the record's fax number the moment FAX is picked, not in an effect
  const handleActivityTypeChange = (value: ActivityType) => {
    form.setValue("activityType", value);
    if (value === "FAX" && existingFax && !form.getValues("faxNumber")) {
      form.setValue("faxNumber", existingFax);
    }
  };

  const resetForm = () => {
    reset();
    setShowForm(false);
  };

  const onSubmit = async (data: FormValues) => {
    if (data.activityType === "FAX") {
      faxMutation.mutate({
        recordId: recordId,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        faxNumber: data.faxNumber!.trim(),
        file: data.faxFile!,
      });
      return;
    }

    if (
      data.activityType === "MEETING" &&
      data.calendarProvider &&
      data.dueDate
    ) {
      const startTime = data.dueDate.toISOString();
      const endTime = data.meetingEndDate
        ? data.meetingEndDate.toISOString()
        : new Date(data.dueDate.getTime() + 60 * 60 * 1000).toISOString();

      try {
        await createCalendarEvent({
          provider: data.calendarProvider,
          title: data.title.trim(),
          description: data.description?.trim(),
          startTime,
          endTime,
        });
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      } catch {
        toast.error("Failed to create calendar event");
      }
    }

    createMutation.mutate({
      recordId: recordId,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      activityType: data.activityType,
      dueDate: data.dueDate?.toISOString(),
      recipientEmail:
        data.activityType === "EMAIL"
          ? data.recipientEmail || undefined
          : undefined,
      emailSubject:
        data.activityType === "EMAIL"
          ? data.emailSubject || undefined
          : undefined,
      emailBody:
        data.activityType === "EMAIL" ? data.emailBody || undefined : undefined,
      send_via: data.activityType === "EMAIL" ? data.sendVia : undefined,
    });
  };

  const allActivities = activitiesData?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 w-full rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
      <div className="space-y-4">
        {/* Create Button / Form */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        ) : (
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-lg border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Create Activity
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Activity title *"
                            className="font-medium"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          handleActivityTypeChange(value as ActivityType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(activityTypeConfig)
                            .filter((key) => key !== "MEETING" || hasCalendar)
                            .filter((key) => key !== "FAX" || hasFax)
                            .map((key) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  {React.createElement(
                                    activityTypeConfig[key as ActivityType]
                                      .icon,
                                    {
                                      className: "h-3.5 w-3.5",
                                    }
                                  )}
                                  {
                                    activityTypeConfig[key as ActivityType]
                                      .label
                                  }
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
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="justify-start text-left font-normal"
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {field.value
                              ? field.value.toLocaleDateString()
                              : "Due date (optional)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchActivityType === "EMAIL" && (
                <div className="space-y-3 rounded-lg border bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Details
                  </p>

                  <FormField
                    control={control}
                    name="recipientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Recipient email *"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="emailSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Email subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="emailBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Email body"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="sendVia"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Send via" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">Auto-detect</SelectItem>
                            {gmailStatus?.connected && (
                              <SelectItem value="GMAIL">
                                Gmail ({gmailStatus.email})
                              </SelectItem>
                            )}
                            {outlookStatus?.connected && (
                              <SelectItem value="OUTLOOK">
                                Outlook ({outlookStatus.email})
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {watchActivityType === "FAX" && hasFax && (
                <div className="space-y-3 rounded-lg border bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fax Details
                  </p>

                  <FormField
                    control={control}
                    name="faxNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="Fax number (E.164, e.g. +15551234567) *"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="faxFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="file"
                            accept=".pdf,.tiff,.tif,.png,.jpg,.jpeg,.gif,.bmp"
                            onChange={(e) =>
                              field.onChange(e.target.files?.[0])
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <p className="text-xs text-muted-foreground">
                    The document is faxed immediately when you create this
                    activity (max 25 MB).
                  </p>
                </div>
              )}

              {watchActivityType === "MEETING" && hasCalendar && (
                <div className="space-y-3 rounded-lg border bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meeting Details
                  </p>

                  <FormField
                    control={control}
                    name="meetingEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {field.value
                                ? field.value.toLocaleDateString() +
                                  " " +
                                  field.value.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "End time (defaults to 1 hour)"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="calendarProvider"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select calendar" />
                          </SelectTrigger>
                          <SelectContent>
                            {calendarStatus?.google?.connected && (
                              <SelectItem value="google">
                                Google Calendar
                                {calendarStatus.google.email
                                  ? ` (${calendarStatus.google.email})`
                                  : ""}
                              </SelectItem>
                            )}
                            {calendarStatus?.outlook?.connected && (
                              <SelectItem value="outlook">
                                Outlook Calendar
                                {calendarStatus.outlook.email
                                  ? ` (${calendarStatus.outlook.email})`
                                  : ""}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || faxMutation.isPending}
                >
                  {faxMutation.isPending
                    ? "Sending fax..."
                    : createMutation.isPending
                      ? "Creating..."
                      : watchActivityType === "FAX"
                        ? "Send Fax"
                        : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Filters */}
        {!showForm && (allActivities.length > 0 || hasActiveFilter) && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as ActivityType | "ALL")
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {Object.entries(activityTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(
                  value as "ALL" | "PENDING" | "COMPLETED" | "CANCELLED"
                )
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Activity List */}
        {allActivities.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center text-muted-foreground font-medium">
              {hasActiveFilter ? "No matching activities" : "No activities yet"}
            </p>
            <p className="text-center text-muted-foreground text-sm mt-1">
              {hasActiveFilter
                ? "Try a different type or status filter"
                : "Create your first activity to start tracking interactions"}
            </p>
          </div>
        )}

        {allActivities.length > 0 && (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border"></div>

            <div className="space-y-4">
              {allActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onComplete={(id, data) =>
                    completeMutation.mutate({
                      activityId: id,
                      data: data as {
                        emailBody?: string;
                        emailSubject?: string;
                        recipientEmail?: string;
                        send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
                      },
                    })
                  }
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isCompleting={completeMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ActivityCard({
  activity,
  onComplete,
  onDelete,
  isCompleting,
  isDeleting,
}: {
  activity: Activity;
  onComplete: (
    id: string,
    data?: {
      emailBody?: string;
      emailSubject?: string;
      recipientEmail?: string;
      send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
    }
  ) => void;
  onDelete: (id: string) => void;
  isCompleting: boolean;
  isDeleting: boolean;
}) {
  const typeConfig = activityTypeConfig[activity.activityType];
  const status = statusConfig[activity.status];
  const Icon = typeConfig.icon;
  const isPending = activity.status === "PENDING";

  return (
    <div className="relative pl-12">
      <div
        className={`absolute left-0 flex size-10 items-center justify-center rounded-full border-4 border-background ${typeConfig.color}`}
      >
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>

      <div className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={`text-sm font-medium ${
                  activity.status === "COMPLETED"
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {activity.title}
              </p>
              <Badge
                variant="outline"
                className={`${typeConfig.badge} text-xs font-medium shrink-0`}
              >
                {typeConfig.label}
              </Badge>
              {activity.direction === "INBOUND" && (
                <Badge
                  variant="outline"
                  className="bg-info/10 text-info border-info/30 text-xs font-medium shrink-0"
                >
                  <CornerDownLeft className="h-3 w-3 mr-1" />
                  Reply
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`${status.badge} text-xs font-medium shrink-0`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} mr-1`}
                />
                {activity.status.charAt(0) +
                  activity.status.slice(1).toLowerCase()}
              </Badge>
            </div>

            {activity.description && (
              <p className="text-sm text-muted-foreground mt-1.5">
                {activity.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isPending && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs hover:bg-success/10 hover:text-success hover:border-success/30"
                onClick={() =>
                  onComplete(activity.id, {
                    emailBody: activity.emailBody ?? undefined,
                    emailSubject: activity.emailSubject || undefined,
                    recipientEmail: activity.recipientEmail || undefined,
                    send_via:
                      activity.activityType === "EMAIL"
                        ? activity.senderEmail?.includes("@gmail.com")
                          ? "GMAIL"
                          : "OUTLOOK"
                        : "AUTO",
                  })
                }
                disabled={isCompleting}
              >
                {activity.activityType === "EMAIL" ? (
                  <>
                    <Send className="h-3 w-3" />
                    Send
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Done
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(activity.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-medium">
            {activity.createdBy}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(activity.createdAt)}
          </span>

          {activity.dueDate && (
            <span
              className={`text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isPending && new Date(activity.dueDate) < new Date()
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <CalendarIcon className="h-3 w-3" />
              Due {new Date(activity.dueDate).toLocaleDateString()}
            </span>
          )}

          {activity.activityType === "EMAIL" && activity.recipientEmail && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {activity.recipientEmail}
            </span>
          )}

          {activity.activityType === "FAX" && activity.faxNumber && (
            <span className="text-xs text-info bg-info/10 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Printer className="h-3 w-3" />
              {activity.faxNumber}
            </span>
          )}

          {activity.faxSentAt && (
            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              Faxed {formatDateTime(activity.faxSentAt)}
            </span>
          )}

          {activity.emailSentAt && (
            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              Sent{activity.senderEmail ? ` via ${activity.senderEmail}` : ""}
            </span>
          )}

          {activity.openCount > 0 && (
            <span className="text-xs text-info bg-info/10 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Opened {activity.openCount}
              {activity.lastOpenedAt
                ? ` · ${formatDateTime(activity.lastOpenedAt)}`
                : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
