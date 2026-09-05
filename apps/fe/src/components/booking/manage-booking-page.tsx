import {
  cancelManagedBooking,
  getManagedBooking,
  getPublicBookingSlots,
  rescheduleManagedBooking,
} from "@/services/booking/booking-public-service";
import { getApiErrorMessage } from "@/lib/helper/helper";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toLocalDateValue } from "@/lib/helper/local-date";

const today = () => toLocalDateValue(new Date());

// Times render in the invitee's own zone, which is what the booking recorded,
// so the page never asks them to convert.
const timeLabel = (iso: string, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));

const fullLabel = (iso: string, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(iso));

export function ManageBookingPage({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const [isPicking, setIsPicking] = useState(false);
  const [date, setDate] = useState(today);

  const { data: booking, isPending } = useQuery({
    queryKey: ["managed-booking", bookingId],
    queryFn: () => getManagedBooking(bookingId),
  });

  const { data: slots = [], isFetching: loadingSlots } = useQuery({
    queryKey: ["managed-booking-slots", booking?.slug, date],
    enabled: isPicking && !!booking?.slug,
    queryFn: () => getPublicBookingSlots(booking!.slug, date),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["managed-booking", bookingId] });

  const cancel = useMutation({
    mutationFn: () => cancelManagedBooking(bookingId),
    onSuccess: async () => {
      toast.success("Your booking is cancelled");
      await invalidate();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not cancel the booking")),
  });

  const reschedule = useMutation({
    mutationFn: (startTime: string) =>
      rescheduleManagedBooking(bookingId, startTime),
    onSuccess: async () => {
      setIsPicking(false);
      toast.success("Your booking has been moved");
      await invalidate();
    },
    onError: async (error) => {
      toast.error(getApiErrorMessage(error, "Could not move the booking"));
      // A conflict means the list we rendered is already stale.
      await queryClient.invalidateQueries({
        queryKey: ["managed-booking-slots"],
      });
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <CalendarX2 className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Booking not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This link may have expired. Check the most recent email you received.
        </p>
      </div>
    );
  }

  const isCancelled = booking.status === "CANCELLED";

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{booking.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isCancelled ? "This booking was cancelled." : "Confirmed for"}
            </p>
            {!isCancelled && (
              <p className="text-lg font-semibold">
                {fullLabel(booking.startTime, booking.timezone)}
              </p>
            )}
            {booking.hostName && (
              <p className="text-sm text-muted-foreground">
                With {booking.hostName}
                {booking.locationLabel ? ` — ${booking.locationLabel}` : ""}
              </p>
            )}
          </div>

          {!isCancelled && booking.meetingUrl && (
            <a
              href={booking.meetingUrl}
              className="inline-block text-sm font-medium text-primary underline"
            >
              Join link
            </a>
          )}

          {isCancelled ? (
            <p className="text-sm text-muted-foreground">
              Nothing further is needed. Book again any time.
            </p>
          ) : isPicking ? (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Pick a new date</span>
                <input
                  type="date"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  value={date}
                  min={today()}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">
                  Loading times...
                </p>
              ) : slots.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      variant="outline"
                      disabled={reschedule.isPending}
                      onClick={() => reschedule.mutate(slot)}
                    >
                      {timeLabel(slot, booking.timezone)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing free that day. Try another date.
                </p>
              )}

              <Button variant="ghost" onClick={() => setIsPicking(false)}>
                Keep my current time
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setIsPicking(true)}>Reschedule</Button>
              <Button
                variant="outline"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel booking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
