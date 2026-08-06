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
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingPageSkeleton, SlotListSkeleton } from "./booking-skeleton";
import { SlotPicker } from "./slot-picker";

const BRAND_WORDMARK = "/branding/Full/Refidly [Full] - White-no-bg.png";

const SHELL_GRADIENT =
  "bg-[linear-gradient(58deg,#01184d_0%,#0d3185_25.66%,#2c86d9_53.06%,#64d1f4_74.2%,#f5f5f5_100%)]";

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
}: {
  slug: string;
  boardId?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [location, setLocation] = useState<BookingLocation | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [collectingDetails, setCollectingDetails] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    title: string;
    startTime: string;
    hostName: string;
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
    onSuccess: () => {
      if (!pageQuery.data || !selectedSlot) return;
      setConfirmed({
        title: pageQuery.data.title,
        startTime: selectedSlot,
        hostName: pageQuery.data.hostName,
      });
    },
    onError: (error: Error) => {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? error.message)
        : error.message;
      toast.error(message || "Failed to book this slot");
    },
  });

  if (confirmed) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center p-6",
          SHELL_GRADIENT
        )}
      >
        <BookingConfirmation {...confirmed} />
      </div>
    );
  }

  if (pageQuery.isLoading) {
    return (
      <div
        className={cn(
          "flex min-h-screen flex-col items-center justify-center gap-10 p-6",
          SHELL_GRADIENT
        )}
      >
        <BookingPageSkeleton />
      </div>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center p-6",
          SHELL_GRADIENT
        )}
      >
        <p className="rounded-xl bg-white px-6 py-4 text-muted-foreground">
          This booking page is not available.
        </p>
      </div>
    );
  }

  const page = pageQuery.data;
  const canChooseLocation = page.locationType === "BOTH";
  const activeLocation: BookingLocation =
    location ?? (page.locationType === "IN_PERSON" ? "IN_PERSON" : "VIDEO");

  // Timezones are derived, not stored: the page's own zone plus the visitor's.
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
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-10 p-6  ",
        SHELL_GRADIENT
      )}
    >
      <div className="flex w-full max-w-6xl overflow-hidden rounded-[10px] bg-white shadow-lg max-lg:flex-col">
        <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#f4f9ff] p-8 lg:w-[396px]">
          {page.organizationLogo ? (
            <img
              src={page.organizationLogo}
              alt={page.organizationName ?? "Organization"}
              className="h-16 w-auto max-w-[192px] self-start object-contain"
            />
          ) : (
            page.organizationName && (
              <p className="text-lg font-semibold text-[#0d3185]">
                {page.organizationName}
              </p>
            )
          )}

          <h1 className="text-[40px] font-semibold leading-[50px] text-[#0d3185]">
            {page.title}
          </h1>

          <p className="flex items-center gap-2 text-base font-semibold text-[#807f7f]">
            <Clock className="h-5 w-5" />
            {page.durationMinutes} minutes
          </p>

          {page.description && (
            <p className="text-base leading-[25px] text-[#202020]">
              {page.description}
            </p>
          )}

          <div className="mt-2 flex rounded-[10px] bg-white p-2.5">
            {(["VIDEO", "IN_PERSON"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!canChooseLocation}
                onClick={() => setLocation(mode)}
                className={cn(
                  "h-8 flex-1 rounded-md text-sm font-bold transition-colors",
                  activeLocation === mode
                    ? "bg-[#005cb1] text-white"
                    : "font-semibold text-[#7584a8]",
                  !canChooseLocation && "cursor-default"
                )}
              >
                {mode === "VIDEO" ? "Video Call" : "In Person"}
              </button>
            ))}
          </div>

          <p className="text-sm leading-[25px] text-[#807f7f]">
            {locationHint}
          </p>

          <div className="mt-2 space-y-2">
            <Label htmlFor="booking-timezone" className="text-[#202020]">
              Your Timezone
            </Label>
            <Select
              value={activeZone}
              onValueChange={(value) => {
                setTimezone(value);
                setSelectedSlot(null);
              }}
            >
              <SelectTrigger id="booking-timezone" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col p-6">
          <h2 className="mb-4 text-2xl font-semibold text-[#0d3185]">
            {collectingDetails ? "Your Details" : "Select Date and Time"}
          </h2>

          {collectingDetails ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  bookMutation.mutate(values)
                )}
                className="max-w-md space-y-4"
              >
                <FormField
                  control={form.control}
                  name="inviteeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Notes (optional)</FormLabel>
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
                  <Button
                    type="submit"
                    className="bg-[#0d3185] hover:bg-[#0d3185]/90"
                    disabled={bookMutation.isPending}
                  >
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

              <div className="mt-4 flex items-center gap-4 border-t pt-5">
                <p className="flex-1 text-sm font-medium text-[#202020]">
                  {selectedSlot ? (
                    <>
                      Your meeting will be booked for{" "}
                      <span className="font-semibold text-[#005cb1]">
                        {selectedLabel}.
                      </span>
                    </>
                  ) : (
                    "Pick a date and time to continue."
                  )}
                </p>
                <Button
                  type="button"
                  className="bg-[#0d3185] hover:bg-[#0d3185]/90"
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

      <img
        src={BRAND_WORDMARK}
        alt="Refidly"
        className="h-[70px] w-[258px] object-contain"
      />
    </div>
  );
}
