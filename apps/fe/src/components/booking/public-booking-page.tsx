import {
  OptionalTag,
  RequiredLegend,
  RequiredMark,
} from "@/components/field-marks";
import { EmbedShell } from "@/components/embed-shell";
import { PublicShell } from "@/components/public-shell";
import { useEmbedAutoHeight } from "@/hooks/use-embed-auto-height";
import type { BookingLocation } from "@/services/booking/booking-public-service";
import {
  createPublicBooking,
  getPublicBookingPage,
  getPublicBookingSlots,
} from "@/services/booking/booking-public-service";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingPageSkeleton, SlotListSkeleton } from "./booking-skeleton";
import { SlotPicker } from "./slot-picker";
import { TimezoneSelect } from "./timezone-select";
import { getApiErrorMessage } from "@/lib/helper/helper";

const inviteeSchema = z.object({
  inviteeName: z.string().min(1, "Name is required"),
  inviteeEmail: z.email("Invalid email address"),
  inviteeNotes: z.string().optional(),
});

type InviteeFormValues = z.infer<typeof inviteeSchema>;

const toIsoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export function PublicBookingPage({
  slug,
  boardId,
  embed = false,
}: {
  slug: string;
  boardId?: string;
  embed?: boolean;
}) {
  // An embed drops the branded frame and reports its height to the host page.
  const Shell = embed ? EmbedShell : PublicShell;
  useEmbedAutoHeight(embed);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [location, setLocation] = useState<BookingLocation | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [collectingDetails, setCollectingDetails] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    title: string;
    startTime: string;
    hostName: string;
    meetingUrl: string | null;
  } | null>(null);

  const date = toIsoDate(selectedDate);

  const pageQuery = useQuery({
    queryKey: ["public-booking-page", slug],
    queryFn: () => getPublicBookingPage(slug),
  });

  const slotsQuery = useQuery({
    queryKey: ["public-booking-slots", slug, date],
    queryFn: () => getPublicBookingSlots(slug, date),
    enabled: Boolean(pageQuery.data),
  });

  const form = useForm<InviteeFormValues>({
    resolver: zodResolver(inviteeSchema),
    defaultValues: { inviteeName: "", inviteeEmail: "", inviteeNotes: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (values: InviteeFormValues) =>
      createPublicBooking(slug, {
        startTime: selectedSlot as string,
        inviteeName: values.inviteeName,
        inviteeEmail: values.inviteeEmail,
        inviteeNotes: values.inviteeNotes || undefined,
        locationType:
          location ??
          (pageQuery.data?.locationType === "IN_PERSON"
            ? "IN_PERSON"
            : "VIDEO"),
        boardId,
      }),
    onSuccess: (booking) => {
      if (!pageQuery.data || !selectedSlot) return;
      setConfirmed({
        title: pageQuery.data.title,
        startTime: selectedSlot,
        hostName: pageQuery.data.hostName,
        meetingUrl: booking.meetingUrl ?? null,
      });
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error, "Failed to book this slot"));
    },
  });

  if (confirmed) {
    return (
      <Shell>
        <BookingConfirmation {...confirmed} />
      </Shell>
    );
  }

  if (pageQuery.isLoading) {
    return (
      <Shell>
        <BookingPageSkeleton />
      </Shell>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <Shell>
        <p className="rounded-[10px] bg-white px-6 py-4 text-muted-foreground shadow-lg">
          This booking page is not available.
        </p>
      </Shell>
    );
  }

  const page = pageQuery.data;

  if (!page.acceptingBookings) {
    return (
      <Shell>
        <div className="max-w-md rounded-[10px] bg-white px-6 py-5 text-center shadow-lg">
          <p className="font-semibold text-brand">{page.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {page.hostName} is not accepting bookings right now. Please reach
            out directly to arrange a time.
          </p>
        </div>
      </Shell>
    );
  }

  const canChooseLocation = page.locationType === "BOTH";
  const activeLocation: BookingLocation =
    location ?? (page.locationType === "IN_PERSON" ? "IN_PERSON" : "VIDEO");

  // Suggested zones head the picker: the page's own zone plus the visitor's.
  const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = Array.from(new Set([page.timezone, visitorZone]));
  const activeZone = timezone ?? page.timezone;

  const locationHint =
    activeLocation === "VIDEO"
      ? "A link will be sent after booking."
      : (page.locationLabel ?? "Location shared after booking.");

  const selectedLabel =
    selectedSlot &&
    new Date(selectedSlot).toLocaleString("en-US", {
      timeZone: activeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <Shell>
      <div className="flex w-full max-w-6xl overflow-hidden rounded-[10px] bg-white shadow-lg max-lg:flex-col">
        <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#f4f9ff] p-6 sm:p-8 lg:w-[396px]">
          <div className="flex items-center space-x-4">
            {page.organizationLogo && (
              <img
                src={page.organizationLogo}
                alt={page.organizationName ?? "Organization"}
                className="h-10 w-auto max-w-[192px] self-start object-contain"
              />
            )}
            {page.organizationName && (
              <p className="text-lg font-semibold text-brand">
                {page.organizationName}
              </p>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-brand sm:text-[40px] sm:leading-[50px]">
            {page.title}
          </h1>

          <p className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <Clock className="h-5 w-5" />
            {page.durationMinutes} minutes
          </p>

          {page.description && (
            <p className="text-base leading-[25px] text-foreground">
              {page.description}
            </p>
          )}

          <div className="mt-2 flex rounded-[10px] bg-card p-2.5">
            {(["VIDEO", "IN_PERSON"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!canChooseLocation}
                onClick={() => setLocation(mode)}
                className={cn(
                  "h-8 flex-1 rounded-md text-sm font-bold transition-colors",
                  activeLocation === mode
                    ? "bg-primary text-primary-foreground"
                    : "font-semibold text-muted-foreground",
                  !canChooseLocation && "cursor-default"
                )}
              >
                {mode === "VIDEO" ? "Video Call" : "In Person"}
              </button>
            ))}
          </div>

          <p className="text-sm leading-[25px] text-muted-foreground">
            {locationHint}
          </p>

          <div className="mt-2 space-y-2">
            <Label htmlFor="booking-timezone" className="text-foreground">
              Your Timezone
            </Label>
            <TimezoneSelect
              id="booking-timezone"
              value={activeZone}
              suggested={zones}
              onChange={(value) => {
                setTimezone(value);
                setSelectedSlot(null);
              }}
            />
          </div>
        </aside>

        <section className="flex flex-1 flex-col p-4 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-brand sm:text-2xl">
            {collectingDetails ? "Your Details" : "Select Date and Time"}
          </h2>

          {collectingDetails ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  bookMutation.mutate(values)
                )}
                className=" space-y-4"
              >
                <RequiredLegend className="text-sm text-[#807f7f]" />

                <FormField
                  control={form.control}
                  name="inviteeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name
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
                  name="inviteeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inviteeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Notes
                        <OptionalTag />
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCollectingDetails(false)}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={bookMutation.isPending}>
                    {bookMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirm Booking
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <div className="flex overflow-hidden rounded-xl relative border max-md:flex-col">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  month={selectedDate}
                  onMonthChange={setSelectedDate}
                  disabled={{ before: startOfToday() }}
                  onSelect={(next) => {
                    if (!next) return;
                    setSelectedDate(next);
                    setSelectedSlot(null);
                  }}
                  className="flex-1"
                />

                {slotsQuery.isLoading ? (
                  <SlotListSkeleton />
                ) : (
                  <SlotPicker
                    slots={slotsQuery.data ?? []}
                    selected={selectedSlot}
                    timezone={activeZone}
                    onSelect={setSelectedSlot}
                  />
                )}
              </div>

              <div className="mt-4 flex flex-col items-stretch gap-3 border-t pt-5 sm:flex-row sm:items-center sm:gap-4">
                <p className="flex-1 text-sm font-medium text-foreground">
                  {selectedSlot ? (
                    <>
                      Your meeting will be booked for{" "}
                      <span className="font-semibold text-primary">
                        {selectedLabel}.
                      </span>
                    </>
                  ) : (
                    "Pick a date and time to continue."
                  )}
                </p>
                <Button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setCollectingDetails(true)}
                >
                  Confirm
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
