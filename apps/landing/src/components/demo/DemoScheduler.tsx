import { CalendarCheck2, Mail, Video } from "lucide-react";
import { useState } from "react";
import {
  bookDemo,
  createDemoRequest,
  fetchAvailableDays,
  fetchSlots,
  readAttribution,
  type BookedDemo,
  type DemoRequestPayload,
  type DemoRequestResult,
} from "./demo-api";
import { monthKey, todayKey } from "./demo-dates";
import { DemoRequestForm } from "./DemoRequestForm";
import { DemoSlotPicker } from "./DemoSlotPicker";

const PANEL =
  "rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8";

// Two steps on one page: the request is saved before a time is picked, so a
// prospect who never reaches the calendar is still a lead we can follow up.
export function DemoScheduler() {
  const [request, setRequest] = useState<DemoRequestResult | null>(null);
  const [booked, setBooked] = useState<BookedDemo | null>(null);
  const [date, setDate] = useState(todayKey);
  const [month, setMonth] = useState(() => monthKey(todayKey()));
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [pending, setPending] = useState<
    "submit" | "days" | "slots" | "book" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (cause: unknown, fallback: string) =>
    setError(cause instanceof Error ? cause.message : fallback);

  const loadSlots = async (requestId: string, nextDate: string) => {
    setPending("slots");
    setError(null);
    try {
      setSlots(await fetchSlots(requestId, nextDate));
    } catch (cause) {
      setSlots([]);
      fail(cause, "Could not load times.");
    } finally {
      setPending((current) => (current === "slots" ? null : current));
    }
  };

  // Days first, then the earliest open one: landing on a month whose days are
  // all taken should still show a usable calendar rather than an empty column.
  const loadMonth = async (requestId: string, nextMonth: string) => {
    setPending("days");
    setError(null);
    try {
      const days = await fetchAvailableDays(requestId, nextMonth);
      setAvailableDays(days);

      const firstOpen = days.find((day) => day >= todayKey());
      if (!firstOpen) {
        setSlots([]);
        return;
      }

      setDate(firstOpen);
      await loadSlots(requestId, firstOpen);
    } catch (cause) {
      setAvailableDays([]);
      setSlots([]);
      fail(cause, "Could not load the calendar.");
    } finally {
      setPending((current) => (current === "days" ? null : current));
    }
  };

  const submit = async (payload: DemoRequestPayload) => {
    setPending("submit");
    setError(null);
    try {
      const result = await createDemoRequest({
        ...payload,
        ...readAttribution(),
      });
      setRequest(result);

      if (result.id && result.acceptingBookings) {
        await loadMonth(result.id, month);
      }
    } catch (cause) {
      fail(cause, "Could not send that.");
    } finally {
      setPending((current) => (current === "submit" ? null : current));
    }
  };

  const pick = async (startTime: string) => {
    if (!request?.id) return;

    setPending("book");
    setError(null);
    try {
      setBooked(await bookDemo(request.id, startTime));
    } catch (cause) {
      fail(cause, "Could not book that time.");
      // The slot list is stale the moment a booking fails on a conflict.
      await loadSlots(request.id, date);
    } finally {
      setPending((current) => (current === "book" ? null : current));
    }
  };

  if (booked) {
    return (
      <div className={PANEL}>
        <div className="space-y-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-success/10">
            <CalendarCheck2 className="size-5 text-success" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">You are booked</h2>
            <p className="text-sm font-medium">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZoneName: "short",
              }).format(new Date(booked.startTime))}
            </p>
          </div>

          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" />
            A calendar invite is on its way to your inbox, with a link to
            reschedule if you need it.
          </p>

          {booked.meetingUrl && (
            <a
              href={booked.meetingUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
            >
              <Video className="size-4" />
              Join link
            </a>
          )}
        </div>
      </div>
    );
  }

  // A request with no host, or a host with no connected calendar, still saved
  // the lead — say so rather than showing an empty calendar.
  if (request && !request.acceptingBookings) {
    return (
      <div className={PANEL}>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            Thanks, we have your request
          </h2>
          <p className="text-sm text-muted-foreground">
            Online scheduling is unavailable right now, so we will email you to
            arrange a time.
          </p>
        </div>
      </div>
    );
  }

  if (request?.id) {
    const requestId = request.id;

    return (
      <div className={PANEL}>
        <DemoSlotPicker
          date={date}
          month={month}
          availableDays={availableDays}
          slots={slots}
          hostName={request.hostName}
          durationMinutes={request.durationMinutes}
          isLoadingDays={pending === "days"}
          isLoadingSlots={pending === "slots"}
          isBooking={pending === "book"}
          error={error}
          onDateChange={(next) => {
            setDate(next);
            void loadSlots(requestId, next);
          }}
          onMonthChange={(next) => {
            setMonth(next);
            void loadMonth(requestId, next);
          }}
          onPick={(startTime) => void pick(startTime)}
        />
      </div>
    );
  }

  return (
    <div className={PANEL}>
      <DemoRequestForm
        isSubmitting={pending === "submit"}
        error={error}
        onSubmit={(payload) => void submit(payload)}
      />
    </div>
  );
}
