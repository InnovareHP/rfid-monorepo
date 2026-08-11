import {
  OptionalTag,
  RequiredLegend,
  RequiredMark,
} from "@/components/field-marks";
import { PageHeader } from "@/components/page-header";
import { SettingsPageSkeleton } from "@/components/skeletons/page-skeletons";
import {
  getOwnAvailability,
  getOwnBookingPage,
  getOwnBookings,
  replaceOwnAvailability,
  updateOwnBookingPage,
} from "@/services/booking/booking-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  Copy,
  Eye,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BookingListTable } from "./booking-list-table";
import { TimezoneSelect } from "./timezone-select";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const numberField = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) =>
        Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max,
      `Must be a whole number between ${min} and ${max}`
    );

const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  locationType: z.enum(["VIDEO", "IN_PERSON", "BOTH"]),
  locationLabel: z.string().optional(),
  preferredProvider: z.enum(["GOOGLE", "OUTLOOK"]),
  durationMinutes: numberField(5, 480),
  timezone: z.string().min(1, "Timezone is required"),
  bufferBeforeMinutes: numberField(0, 120),
  bufferAfterMinutes: numberField(0, 120),
  minNoticeHours: numberField(0, 168),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

type DayRow = { enabled: boolean; startTime: string; endTime: string };

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function defaultDayRows(): DayRow[] {
  return DAY_LABELS.map((_, i) => ({
    enabled: i >= 1 && i <= 5,
    startTime: "09:00",
    endTime: "17:00",
  }));
}

function dayRowsFromRules(
  rules: { dayOfWeek: number; startMinute: number; endMinute: number }[]
): DayRow[] {
  return defaultDayRows().map((row, dayOfWeek) => {
    const rule = rules.find((r) => r.dayOfWeek === dayOfWeek);
    if (!rule) return { ...row, enabled: false };
    return {
      enabled: true,
      startTime: minutesToTime(rule.startMinute),
      endTime: minutesToTime(rule.endMinute),
    };
  });
}

export function BookingSettingsPage() {
  const { team } = useParams({ strict: false }) as { team: string };
  const queryClient = useQueryClient();
  const [days, setDays] = useState<DayRow[]>(defaultDayRows());

  const pageQuery = useQuery({
    queryKey: ["booking-page"],
    queryFn: getOwnBookingPage,
  });

  const availabilityQuery = useQuery({
    queryKey: ["booking-availability"],
    queryFn: getOwnAvailability,
  });

  const bookingsQuery = useQuery({
    queryKey: ["bookings"],
    queryFn: () => getOwnBookings(),
  });

  // Both tiles are counted off data already on screen rather than a new endpoint.
  const upcomingCount = (bookingsQuery.data?.data ?? []).filter(
    (booking) =>
      booking.status === "CONFIRMED" && new Date(booking.startTime) > new Date()
  ).length;

  const weeklyHours = Math.round(
    (availabilityQuery.data ?? []).reduce(
      (total, rule) => total + (rule.endMinute - rule.startMinute),
      0
    ) / 60
  );

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    values: pageQuery.data
      ? {
          title: pageQuery.data.title,
          description: pageQuery.data.description ?? "",
          locationType: pageQuery.data.locationType,
          locationLabel: pageQuery.data.locationLabel ?? "",
          preferredProvider:
            pageQuery.data.preferredProvider ??
            (pageQuery.data.calendars.outlook &&
            !pageQuery.data.calendars.google
              ? "OUTLOOK"
              : "GOOGLE"),
          durationMinutes: String(pageQuery.data.durationMinutes),
          timezone: pageQuery.data.timezone,
          bufferBeforeMinutes: String(pageQuery.data.bufferBeforeMinutes),
          bufferAfterMinutes: String(pageQuery.data.bufferAfterMinutes),
          minNoticeHours: String(pageQuery.data.minNoticeHours),
        }
      : undefined,
  });

  const [syncedAvailability, setSyncedAvailability] = useState(
    availabilityQuery.data
  );

  // Adopt newly loaded availability during render instead of in an effect
  if (availabilityQuery.data && availabilityQuery.data !== syncedAvailability) {
    setSyncedAvailability(availabilityQuery.data);
    setDays(dayRowsFromRules(availabilityQuery.data));
  }

  const updatePageMutation = useMutation({
    mutationFn: updateOwnBookingPage,
    onSuccess: () => {
      toast.success("Booking page updated");
      queryClient.invalidateQueries({ queryKey: ["booking-page"] });
    },
    onError: () => toast.error("Failed to update booking page"),
  });

  const availabilityMutation = useMutation({
    mutationFn: replaceOwnAvailability,
    onSuccess: () => {
      toast.success("Availability updated");
      queryClient.invalidateQueries({ queryKey: ["booking-availability"] });
    },
    onError: () => toast.error("Failed to update availability"),
  });

  const handleSaveAvailability = () => {
    const rules = days
      .map((row, dayOfWeek) => ({ ...row, dayOfWeek }))
      .filter((row) => row.enabled)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        startMinute: timeToMinutes(row.startTime),
        endMinute: timeToMinutes(row.endTime),
      }));

    if (rules.some((r) => r.startMinute >= r.endMinute)) {
      toast.error("Start time must be before end time for every enabled day");
      return;
    }

    availabilityMutation.mutate(rules);
  };

  const calendars = pageQuery.data?.calendars;
  const calendarConnected = Boolean(calendars?.google || calendars?.outlook);
  // The choice only means something when writing to either is possible.
  const canChooseProvider = Boolean(calendars?.google && calendars?.outlook);

  const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleCopyLink = () => {
    if (!pageQuery.data) return;
    navigator.clipboard.writeText(pageQuery.data.publicUrl);
    toast.success("Link copied");
  };

  if (pageQuery.isLoading) {
    return <SettingsPageSkeleton cards={3} className="mx-auto space-y-6 p-6" />;
  }

  return (
    <div className="mx-auto space-y-6 p-6">
      <PageHeader
        title="Booking Page"
        description="Configure your public scheduling link and availability."
      />

      {pageQuery.data && !calendarConnected && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-destructive">
              Your booking link is not taking bookings
            </p>
            <p className="text-muted-foreground">
              Bookings are written to your calendar, so a connected calendar is
              required. Until then your page shows no available times.
            </p>
            <Link
              to="/$team/integrations"
              params={{ team }}
              className="inline-block font-medium text-destructive underline"
            >
              Connect a calendar
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Link Status",
            value: !calendarConnected
              ? "No calendar"
              : pageQuery.data?.isActive
                ? "Active"
                : "Inactive",
          },
          { label: "Upcoming Bookings", value: String(upcomingCount) },
          { label: "Available Hours/Week", value: String(weeklyHours) },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="space-y-1.5">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="text-2xl font-semibold text-[#0d3185]">
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pageQuery.data && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">Your Public Booking Link</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2">
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {pageQuery.data.publicUrl}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={pageQuery.data.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Live
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_471px]">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
            <CardDescription>
              What invitees see on your booking page.
            </CardDescription>
            <RequiredLegend className="text-xs text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  updatePageMutation.mutate({
                    ...values,
                    durationMinutes: Number(values.durationMinutes),
                    bufferBeforeMinutes: Number(values.bufferBeforeMinutes),
                    bufferAfterMinutes: Number(values.bufferAfterMinutes),
                    minNoticeHours: Number(values.minNoticeHours),
                  })
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title
                        <RequiredMark />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Description
                        <OptionalTag />
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Meeting Type
                        <RequiredMark />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VIDEO">Video call</SelectItem>
                          <SelectItem value="IN_PERSON">In person</SelectItem>
                          <SelectItem value="BOTH">
                            Let the invitee choose
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Location
                        <OptionalTag />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canChooseProvider && (
                  <FormField
                    control={form.control}
                    name="preferredProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Meeting Link
                          <RequiredMark />
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GOOGLE">
                              Google Meet (Google Calendar)
                            </SelectItem>
                            <SelectItem value="OUTLOOK">
                              Microsoft Teams (Outlook Calendar)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Duration (minutes)
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={5} max={480} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Timezone
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <TimezoneSelect
                            value={field.value}
                            suggested={[field.value, visitorZone]}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bufferBeforeMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Buffer before
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={120} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bufferAfterMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Buffer after
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={120} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minNoticeHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Minimum notice (hours)
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={168} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={updatePageMutation.isPending}
                >
                  {updatePageMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability</CardTitle>
            <CardDescription>
              Hours you&apos;re available for bookings, in your booking page
              timezone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {days.map((row, dayOfWeek) => (
              <div
                key={dayOfWeek}
                className="flex flex-wrap items-center gap-3 rounded-md border border-input px-3 py-2"
              >
                <div className="flex w-18 shrink-0 items-center gap-2">
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(checked) =>
                      setDays((prev) =>
                        prev.map((r, i) =>
                          i === dayOfWeek ? { ...r, enabled: checked } : r
                        )
                      )
                    }
                  />
                  <span className="text-sm font-medium">
                    {DAY_LABELS[dayOfWeek]}
                  </span>
                </div>
                <Input
                  type="time"
                  className="w-32"
                  disabled={!row.enabled}
                  value={row.startTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((r, i) =>
                        i === dayOfWeek
                          ? { ...r, startTime: e.target.value }
                          : r
                      )
                    )
                  }
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="time"
                  className="w-32"
                  disabled={!row.enabled}
                  value={row.endTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((r, i) =>
                        i === dayOfWeek ? { ...r, endTime: e.target.value } : r
                      )
                    )
                  }
                />
              </div>
            ))}

            <Button
              className="w-full sm:w-auto"
              onClick={handleSaveAvailability}
              disabled={availabilityMutation.isPending}
            >
              {availabilityMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Availability
            </Button>
          </CardContent>
        </Card>
      </div>

      <BookingListTable />
    </div>
  );
}
