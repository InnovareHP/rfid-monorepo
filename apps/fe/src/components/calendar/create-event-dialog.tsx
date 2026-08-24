import {
  createCalendarEvent,
  type CalendarConnectionStatus,
  type CalendarProvider,
} from "@/services/calendar/calendar-service";
import { Button } from "@dashboard/ui/components/button";
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
import { Switch } from "@dashboard/ui/components/switch";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const eventSchema = z
  .object({
    provider: z.enum(["google", "outlook"]),
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim(),
    allDay: z.boolean(),
    startDate: z.string().min(1, "Start is required"),
    endDate: z.string().min(1, "End is required"),
    location: z.string().trim(),
  })
  .refine((values) => new Date(values.endDate) >= new Date(values.startDate), {
    message: "End must be after start",
    path: ["endDate"],
  });

type EventFormValues = z.infer<typeof eventSchema>;

const toLocalInput = (date: Date) => date.toISOString().slice(0, 16);

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionStatus: CalendarConnectionStatus;
  defaultDate?: Date;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  connectionStatus,
  defaultDate,
}: CreateEventDialogProps) {
  const queryClient = useQueryClient();

  const connectedProviders: CalendarProvider[] = [];
  if (connectionStatus.google.connected) connectedProviders.push("google");
  if (connectionStatus.outlook.connected) connectedProviders.push("outlook");

  const start = defaultDate ?? new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      provider: connectedProviders[0] ?? "google",
      title: "",
      description: "",
      allDay: false,
      startDate: toLocalInput(start),
      endDate: toLocalInput(end),
      location: "",
    },
  });

  const allDay = form.watch("allDay");

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event created");
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Failed to create event");
    },
  });

  const onSubmit = (values: EventFormValues) => {
    createMutation.mutate({
      provider: values.provider,
      title: values.title,
      description: values.description || undefined,
      startTime: new Date(values.startDate).toISOString(),
      endTime: new Date(values.endDate).toISOString(),
      allDay: values.allDay,
      location: values.location || undefined,
    });
  };

  if (connectedProviders.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Connect a calendar account first to create events.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>
                Add a new event to your calendar
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {connectedProviders.length > 1 && (
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {connectionStatus.google.connected && (
                            <SelectItem value="google">
                              Google ({connectionStatus.google.email})
                            </SelectItem>
                          )}
                          {connectionStatus.outlook.connected && (
                            <SelectItem value="outlook">
                              Outlook ({connectionStatus.outlook.email})
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Event title" {...field} />
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
                        placeholder="Optional description"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>All day</FormLabel>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input
                          type={allDay ? "date" : "datetime-local"}
                          {...field}
                          value={allDay ? field.value.slice(0, 10) : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input
                          type={allDay ? "date" : "datetime-local"}
                          {...field}
                          value={allDay ? field.value.slice(0, 10) : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="size-4 animate-spin mr-1" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
