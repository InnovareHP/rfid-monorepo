import {
  cancelBooking,
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
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Separator } from "@dashboard/ui/components/separator";
import { Switch } from "@dashboard/ui/components/switch";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link as LinkIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const numberField = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max,
      `Must be a whole number between ${min} and ${max}`
    );

const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  locationLabel: z.string().optional(),
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

export function BookingSettingsPage() {
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

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    values: pageQuery.data
      ? {
          title: pageQuery.data.title,
          description: pageQuery.data.description ?? "",
          locationLabel: pageQuery.data.locationLabel ?? "",
          durationMinutes: String(pageQuery.data.durationMinutes),
          timezone: pageQuery.data.timezone,
          bufferBeforeMinutes: String(pageQuery.data.bufferBeforeMinutes),
          bufferAfterMinutes: String(pageQuery.data.bufferAfterMinutes),
          minNoticeHours: String(pageQuery.data.minNoticeHours),
        }
      : undefined,
  });

  useEffect(() => {
    if (!availabilityQuery.data) return;
    const next = defaultDayRows().map((row, dayOfWeek) => {
      const rule = availabilityQuery.data.find(
        (r) => r.dayOfWeek === dayOfWeek
      );
      if (!rule) return { ...row, enabled: false };
      return {
        enabled: true,
        startTime: minutesToTime(rule.startMinute),
        endTime: minutesToTime(rule.endMinute),
      };
    });
    setDays(next);
  }, [availabilityQuery.data]);

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

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: () => toast.error("Failed to cancel booking"),
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

  const handleCopyLink = () => {
    if (!pageQuery.data) return;
    navigator.clipboard.writeText(pageQuery.data.publicUrl);
    toast.success("Link copied");
  };

  if (pageQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Page</h1>
        <p className="text-sm text-muted-foreground">
          Configure your public scheduling link and availability.
        </p>
      </div>

      {pageQuery.data && (
        <Card>
          <CardContent className="flex items-center justify-between gap-2 pt-6">
            <div className="flex items-center gap-2 min-w-0">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">
                {pageQuery.data.publicUrl}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>
            What invitees see on your booking page.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationLabel">Location</Label>
              <Input id="locationLabel" {...form.register("locationLabel")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  {...form.register("durationMinutes")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="America/New_York"
                  {...form.register("timezone")}
                />
                {form.formState.errors.timezone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.timezone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bufferBeforeMinutes">Buffer before</Label>
                <Input
                  id="bufferBeforeMinutes"
                  type="number"
                  min={0}
                  max={120}
                  {...form.register("bufferBeforeMinutes")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bufferAfterMinutes">Buffer after</Label>
                <Input
                  id="bufferAfterMinutes"
                  type="number"
                  min={0}
                  max={120}
                  {...form.register("bufferAfterMinutes")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minNoticeHours">Minimum notice (hours)</Label>
                <Input
                  id="minNoticeHours"
                  type="number"
                  min={0}
                  max={168}
                  {...form.register("minNoticeHours")}
                />
              </div>
            </div>

            <Button type="submit" disabled={updatePageMutation.isPending}>
              {updatePageMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </form>
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
            <div key={dayOfWeek} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-24 shrink-0">
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

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading bookings...
            </div>
          ) : (bookingsQuery.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No bookings yet.
            </p>
          ) : (
            bookingsQuery.data?.data.map((booking) => (
              <div key={booking.id}>
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {booking.inviteeName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.startTime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {booking.status}
                    </p>
                  </div>
                  {booking.status === "CONFIRMED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(booking.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <Separator />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
