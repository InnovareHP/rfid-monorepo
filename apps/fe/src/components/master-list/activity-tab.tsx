"use client";

import {
  completeActivity,
  createActivity,
  deleteActivity,
  getActivities,
  getGmailStatus,
  getOutlookStatus,
  type Activity,
} from "@/services/lead/lead-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import { Form } from "@dashboard/ui/components/form";
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
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  StickyNote,
  Trash2,
  Users,
  X,
} from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const activityTypeConfig = {
  CALL: {
    icon: Phone,
    label: "Call",
    color: "from-blue-500 to-cyan-600",
    badge: "bg-blue-50 text-blue-700 border-blue-300",
  },
  EMAIL: {
    icon: Mail,
    label: "Email",
    color: "from-purple-500 to-indigo-600",
    badge: "bg-purple-50 text-purple-700 border-purple-300",
  },
  MEETING: {
    icon: Users,
    label: "Meeting",
    color: "from-amber-500 to-orange-600",
    badge: "bg-amber-50 text-amber-700 border-amber-300",
  },
  NOTE: {
    icon: StickyNote,
    label: "Note",
    color: "from-gray-500 to-slate-600",
    badge: "bg-gray-50 text-gray-700 border-gray-300",
  },
};

const statusConfig = {
  PENDING: {
    badge: "bg-yellow-50 text-yellow-700 border-yellow-300",
    dot: "bg-yellow-500",
  },
  COMPLETED: {
    badge: "bg-green-50 text-green-700 border-green-300",
    dot: "bg-green-500",
  },
  CANCELLED: {
    badge: "bg-red-50 text-red-700 border-red-300",
    dot: "bg-red-500",
  },
};

type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE";

type FormValues = {
  title: string;
  description?: string;
  activityType: ActivityType;
  dueDate?: Date;
  recipientEmail?: string;
  emailSubject?: string;
  emailBody?: string;
  sendVia?: "AUTO" | "GMAIL" | "OUTLOOK";
};

export function ActivityTab({
  recordId,
  enabled,
}: {
  recordId: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);

  const { data: gmailStatus } = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const { data: outlookStatus } = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const {
    data: activitiesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["activities", recordId],
    enabled: enabled && !!recordId,
    queryFn: ({ pageParam = 1 }) =>
      getActivities(recordId, pageParam as number),
    getNextPageParam: (lastPage, pages) => {
      const pageSize = 15;
      return lastPage.data.length === pageSize ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity created");
      resetForm();
    },
    onError: () => toast.error("Failed to create activity"),
  });

  const completeMutation = useMutation({
    mutationFn: ({
      activityId,
      data,
    }: {
      activityId: string;
      data?: {
        email_body?: string;
        email_subject?: string;
        recipient_email?: string;
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
    defaultValues: {
      title: "",
      description: "",
      activityType: "CALL",
      dueDate: undefined,
      recipientEmail: "",
      emailSubject: "",
      emailBody: "",
      sendVia: "AUTO",
    },
  });

  const { handleSubmit, watch, control, reset } = form;
  const watchActivityType = watch("activityType");

  const resetForm = () => {
    reset();
    setShowForm(false);
  };

  const onSubmit = (data: FormValues) => {
    if (!data.title.trim()) return;

    createMutation.mutate({
      record_id: recordId,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      activity_type: data.activityType,
      due_date: data.dueDate?.toISOString(),
      recipient_email:
        data.activityType === "EMAIL"
          ? data.recipientEmail || undefined
          : undefined,
      email_subject:
        data.activityType === "EMAIL"
          ? data.emailSubject || undefined
          : undefined,
      email_body:
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
              className="h-24 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse"
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
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        ) : (
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
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
                  <Controller
                    control={control}
                    name="title"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Activity title *"
                        className="font-medium"
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name="activityType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(activityTypeConfig).map((key) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {React.createElement(
                                activityTypeConfig[key as ActivityType].icon,
                                {
                                  className: "h-3.5 w-3.5",
                                }
                              )}
                              {activityTypeConfig[key as ActivityType].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
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
                  )}
                />
              </div>

              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                )}
              />

              {watchActivityType === "EMAIL" && (
                <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    Email Details
                  </p>

                  <Controller
                    control={control}
                    name="recipientEmail"
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        placeholder="Recipient email *"
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="emailSubject"
                    render={({ field }) => (
                      <Input {...field} placeholder="Email subject" />
                    )}
                  />

                  <Controller
                    control={control}
                    name="emailBody"
                    render={({ field }) => (
                      <Textarea {...field} placeholder="Email body" rows={3} />
                    )}
                  />

                  <Controller
                    control={control}
                    name="sendVia"
                    render={({ field }) => (
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
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Activity List */}
        {allActivities.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-gray-100 mb-3">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-center text-gray-500 font-medium">
              No activities yet
            </p>
            <p className="text-center text-gray-400 text-sm mt-1">
              Create your first activity to start tracking interactions
            </p>
          </div>
        )}

        {allActivities.length > 0 && (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-orange-400 to-red-500"></div>

            <div className="space-y-4">
              {allActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onComplete={(id, data) =>
                    completeMutation.mutate({
                      activityId: id,
                      data: data as {
                        email_body?: string;
                        email_subject?: string;
                        recipient_email?: string;
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
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              className="hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 font-semibold"
            >
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
      email_body?: string;
      email_subject?: string;
      recipient_email?: string;
      send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
    }
  ) => void;
  onDelete: (id: string) => void;
  isCompleting: boolean;
  isDeleting: boolean;
}) {
  const typeConfig = activityTypeConfig[activity.activity_type];
  const status = statusConfig[activity.status];
  const Icon = typeConfig.icon;
  const isPending = activity.status === "PENDING";

  return (
    <div className="relative pl-12 group">
      <div
        className={`absolute left-0 w-10 h-10 rounded-full bg-gradient-to-br ${typeConfig.color} flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-amber-300 p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={`text-sm font-bold ${
                  activity.status === "COMPLETED"
                    ? "text-gray-400 line-through"
                    : "text-gray-900"
                }`}
              >
                {activity.title}
              </p>
              <Badge
                variant="outline"
                className={`${typeConfig.badge} text-xs font-semibold shrink-0`}
              >
                {typeConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={`${status.badge} text-xs font-semibold shrink-0`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} mr-1`}
                />
                {activity.status.charAt(0) +
                  activity.status.slice(1).toLowerCase()}
              </Badge>
            </div>

            {activity.description && (
              <p className="text-sm text-gray-600 mt-1.5">
                {activity.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isPending && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300 font-semibold"
                onClick={() =>
                  onComplete(activity.id, {
                    email_body: activity.email_body ?? undefined,
                    email_subject: activity.email_subject || undefined,
                    recipient_email: activity.recipient_email || undefined,
                    send_via:
                      activity.activity_type === "EMAIL"
                        ? activity.sender_email?.includes("@gmail.com")
                          ? "GMAIL"
                          : "OUTLOOK"
                        : "AUTO",
                  })
                }
                disabled={isCompleting}
              >
                {activity.activity_type === "EMAIL" ? (
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
              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(activity.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">
            {activity.created_by}
          </span>
          <span className="text-xs text-gray-400">
            {formatDateTime(activity.created_at)}
          </span>

          {activity.due_date && (
            <span
              className={`text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isPending && new Date(activity.due_date) < new Date()
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <CalendarIcon className="h-3 w-3" />
              Due {new Date(activity.due_date).toLocaleDateString()}
            </span>
          )}

          {activity.activity_type === "EMAIL" && activity.recipient_email && (
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {activity.recipient_email}
            </span>
          )}

          {activity.email_sent_at && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" />
              Sent{activity.sender_email ? ` via ${activity.sender_email}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
